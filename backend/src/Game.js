import Player from "./Player.js";
import Timer from "./Timer.js";
import BonusManager from "./BonusManager.js";
import {walls, WORLD} from "./mapData.js";
import {DEV_MODE, io} from "./server.js";
import {spawn} from 'child_process';
import path from 'path';
import {fileURLToPath} from 'url';

const fileName= fileURLToPath(import.meta.url);
const dirname = path.dirname(fileName);

const PYTHON_BIN = process.env.PYTHON_PATH || 'python'
const BOT_SCRIPT = path.join(dirname, "bots", "main.py");

let games = new Map();



export function regGameHandlers(socket) {
    const handlers = {
        "hostGame": ({ payload }) => {
            const game = new Game(io, socket);
            const player = game.addPlayer(socket, payload.username, true);

            games.set(game.id, game);

            game.isSingle = !!payload.isSingle;
            if (game.isSingle){
                game.gameKey = crypto.randomUUID().slice(0, 8);
            }

            socket.emit("hostGame", { gameId: game.id, player: player,gameKey: game.gameKey  });

            const botNum  = Number(payload.count || 0);
            const botDiff = Number(payload.difficulty || 1);
            console.log("bot num , bot dfff" , botNum,botDiff)
            if (game.isSingle && botNum > 0) {
                game.spawnBots(botNum, botDiff );
            }
        },
        "joinGame": ({ gameId, username, key }) => {
            const game = games.get(gameId);

            if (!game) {
                socket.emit("error", `Game with id ${gameId} not found`);
                return;
            }

            if (game.isSingle) {
                if (!key || key !== game.gameKey) {
                    return socket.emit("error", "Bot key invalid");
                }
            }

            if (Object.keys(game.players).length >= 4) {
                socket.emit("error", "Game lobby is full");
                return;
            }
            if (game.status !== Game.Status.LOBBY) {
                socket.emit("error", `Game has already started`);
                return;
            }
            if (game.usernameExists(username)) {
                socket.emit("error", `Player with name ${username} already exists`);
                return;
            }
                const player = game.addPlayer(socket, username);
                socket.emit("joinGame", { gameId: game.id, player: player });


        },
    }

    Object.entries(handlers).forEach(([event, handler]) => socket.on(event, handler));
}


function deleteGame(id) {
    games.delete(id);
}

//todo need import Bonuses, and remove from server

export default class Game {
    static Status = {
        LOBBY: "lobby",
        STARTED: "started",
        ENDED: "ended",
    };

    players = {};

    constructor(io, hostSocket) {
        this.io = io;
        this.id = crypto.randomUUID().substring(0, 8).toUpperCase(); // todo check for collision
        this.host = hostSocket;
        this.mapId = 0;
        this.isPaused = false;
        this.pauseId = null;
        this.status = Status.LOBBY;
        this.isSingle=false;
        this.gameKey=null;
        this.botProcesses=[];

        //timer
        this.timer = new Timer({
            io: this.io,
            roomId: this.id,
            onTimerEnd: (reason) => this.onTimerEnd(reason),
            updateEveryMs: 250,
        });

        //bonuses
        this.bonuses = new BonusManager({
            game: this,
            geometry: {world: WORLD, walls},
            spawnEveryMs: 5000,
            types: ['speed', 'vision', 'timeShift'],
            size: 28,
            attempts: 30,
        });
    }

    spawnBots(botNumber=0, botDiff=1){
        if (botNumber>3 || botNumber <0){
            return ;
        }
        if(botDiff<1 || botDiff>3){
            return;
        }

        for (let i =0; i<botNumber; i ++){
            const args = ["-u", BOT_SCRIPT, this.id, this.gameKey, String(botDiff)];

            const proc = spawn(PYTHON_BIN, args, {
                stdio: ["ignore", "pipe", "pipe"],
                env: {
                    ...process.env,
                    SERVER_URL: process.env.SERVER_URL || "http://localhost:8080",
                },
            });

            proc.stdout.on("data", d => console.log(`[bot ${proc.pid}] ${d.toString().trim()}`));
            proc.stderr.on("data", d => console.error(`[bot ${proc.pid} ERR] ${d.toString().trim()}`));
            proc.on("exit", (code, sig) => {
                console.log(`[bot ${proc.pid}] exit code=${code} sig=${sig}`);
                this.botProcesses = this.botProcesses.filter(p => p.pid !== proc.pid);
            });

            this.botProcesses ??= [];
            this.botProcesses.push(proc);
            console.log(`Spawned bot pid=${proc.pid} game=${this.id} diff=${botDiff}`);
        }
    }

    killBots() {
        if (!this.botProcesses) return;
        for (const p of this.botProcesses) {
            try { p.kill("SIGTERM"); } catch (e) { console.error("kill bot", e); }
        }
        this.botProcesses = [];
    }

    onTimerEnd(reason) {
        // handler for end of game
        this.endGame(reason);

    }

    assignRoles() {
        const playerIds = Object.keys(this.players);

        for (const p of Object.values(this.players)) {
            p.isCaught = false;
            p.type = 'player';
            p.flashOn = true;
            p.isMoving = false;
        }

        //todo here is mistake (cant test without bots)
        let seekerId = playerIds[Math.floor(Math.random() * playerIds.length)];
        /* get bot player */
        playerIds.forEach(id => {
            const player = this.players[id];
            if (id === seekerId) {
                player.role = "seeker";
                player.x = 1900;
                player.y = 1900;
            } else {
                player.role = "hider";
                player.x = Math.random() * 500 + 100;
                player.y = Math.random() * 500 + 100;
            }
        });
    }

    addPlayer(socket, username, isHost = false) {
        const player = new Player(this, socket, username, isHost);
        this.players[socket.id] = player;
        socket.join(this.id);

        this.registerSocketHandlers(socket);
        this.broadcast("newPlayer", player);

        this.bonuses.broadcastList(socket);

        return player;
    }

    usernameExists(username) {
        return Object.values(this.players).some(user => user.username.toLowerCase() === username.toLowerCase());
    }

    registerSocketHandlers(socket) {

        // Game/map
        socket.on("updateMap", (mapId) => {
            this.mapId = mapId;
            this.broadcast("updateMap", mapId);
        });

        socket.emit('room:init', {
            players: this.players,
            mapId: this.mapId,
            bonuses: this.bonuses.list(),
            timer: {
                remainingMs: this.timer?.remaining?.() ?? 0
            },
            paused: this.isPaused
        });

        socket.on("game:start", ({durationMs}) => {
                if (socket.id !== this.host.id) return;

                this.startGame(durationMs);
            }
        )

        socket.on("game:end", () => {
            if (socket.id !== this.host.id) return;
            this.endGame("manual");
        });

        socket.on("game:restart", () => {
            if (socket.id !== this.host.id) return;
            this.restartGame();
        });

        //player
        socket.on('move', ({x, y, facingAngle, isMoving, flashOn,isCaught}) => {
            if (this.isPaused) return;
            const p = this.players[socket.id];
            if (!p) return;

            p.x = x;
            p.y = y;
            p.facingAngle = facingAngle;
            p.isMoving = isMoving;
            p.flashOn = !!flashOn;
            p.isCaught = isCaught;

            socket.to(this.id).emit('playerMoved', {
                    id: socket.id, x, y, facingAngle, isMoving, flashOn: !!flashOn, isCaught: p.isCaught, role:p.role
                }
            );
        });

        socket.on("getPlayers", () => {
            socket.emit("getPlayers", this.players);
        })

        socket.on('disconnect', () => this.handleDisconnect(socket));
        socket.on("player:leave", () => this.handleDisconnect(socket));

        socket.on("catch", (playerId) => {
            const player = this.players[playerId];
            if (!player) return;
            if (player.isCaught) return;
            player.isCaught = true;
            this.broadcast("playerCaught", playerId);
            for (const id in this.players) {
                if (this.players[id].role === "hider" && !this.players[id].isCaught) {
                    return;
                }
            }
            console.log('end');
            this.endGame("seekerWon");
        });

        socket.on('bonus:pickup', (data) =>
            this.bonuses.handlePickup(socket, data)
        );

        //Time / Pause

        socket.on("game:pause", () => {
            if (this.isPaused) return;
            if (this.status === Status.ENDED || this.status === Status.LOBBY) return;
            this.pauseId = socket.id;
            this.pauseGame(socket.id);
        });

        socket.on("game:resume", () => {
            if (!this.isPaused) return;
            if (socket.id !== this.pauseId) return;
            this.pauseId = null;
            this.resumeGame(socket.id);
        });

    }

    handleDisconnect(socket) {
        if (socket.id === this.host.id) {
            this.endSession("Host disconnected");
            return;
        }

        delete this.players[socket.id];
        this.broadcast('playerDisconnected', socket.id);
        if (this.isPaused && this.pauseId === socket.id) {
            this.pauseId = null;
            this.resumeGame(this.host.id);
        }

        if (this.status === Status.LOBBY) {
            Object.values(this.players).forEach((player) => {
                player.readyStatus = false;
                this.broadcast("updateReadyStatus", { id: player.id, readyStatus: player.readyStatus });
            });
        }

        this.cleanupSocket(socket);
    }

    cleanupSocket(socket) {
        const keep = ["hostGame", "joinGame"];
        for (const event of socket.eventNames()) {
            if (!keep.includes(event)) {
                socket.removeAllListeners(event);
            }
        }
        socket.leave(this.id);
    }

    broadcastPlayerList() {
        this.broadcast("getPlayers", this.players);
    }

    //setting timer for game

    startGame(durationMs = 5 * 60000) {
        if (!DEV_MODE && Object.keys(this.players).length < 2) return;
        this.status = Status.STARTED;
        this.assignRoles();
        this.timer.start(durationMs);
        this.bonuses.start();
        this.broadcast("startGame", this.players);
    }

    pauseGame(byId) {
        this.isPaused = true;
        const byName = this.players[byId]?.username ?? byId;
        this.timer.pause();
        this.bonuses.stop();
        console.log(`Paused by ${byName}`)
        //todo need somthing for dashboard on game
        this.broadcast("dashboard:action", {byId, byName, action: "pause"})
    }

    resumeGame(byId) {
        this.isPaused = false;
        const byName = this.players[byId]?.username ?? byId;
        this.timer.resume();
        this.bonuses.start();
        console.log(`Resumed by ${byName}`)
        this.broadcast("dashboard:action", {byId, byName, action: "resume"})
    }

    endGame(reason) {
        this.reset();

        if (this.isSingle){
            // this.killBots();
            // this.isSingle=false;

            this.status = (reason === "manual") ? Game.Status.LOBBY : Game.Status.ENDED;
            this.broadcast("game:ended", {reason, players: this.players});
            return;
        }
        if (reason === "manual") {
            this.status = Status.LOBBY;
        } else {
            this.status = Status.ENDED;
        }
        this.broadcast("game:ended", {reason, players: this.players})
    }

    restartGame() {

        this.reset();
        if (this.isSingle){
            // this.killBots();
            if (Object.keys(this.players).length < 2) {
                this.broadcast("game:ended", { reason: "manual" });
                return;
            }
            this.startGame();
            return;
        }
        if (Object.keys(this.players).length < 2) {
            this.broadcast("game:ended", { reason: "manual" });
            return;
        }
        this.startGame();
    }

    reset() {
        Object.values(this.players).forEach((player) => player.readyStatus = false);
        this.timer.stopUpdate();
        this.bonuses.stop();
        this.bonuses.bonuses.clear();
        this.isPaused = false;
        this.pauseId = null;
    }

    async endSession(reason = null) {
        this.broadcast("session:end", { reason });

        if (this.isSingle){
            this.killBots();
            this.reset();
            const sockets = await this.io.in(this.id).fetchSockets();
            sockets.forEach((s) => this.cleanupSocket(s));
            deleteGame(this.id);
            return;
        }
        this.reset();
        const sockets = await this.io.in(this.id).fetchSockets();
        sockets.forEach((socket) => this.cleanupSocket(socket));
        deleteGame(this.id);
    }

    broadcast(message, data) {
        this.io.to(this.id).emit(message, data);
    }
}

const { Status } = Game;