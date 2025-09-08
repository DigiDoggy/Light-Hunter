import Player from "./Player.js";
import Timer from "./Timer.js";
import BonusManager from "./BonusManager.js";
import {walls, WORLD} from "./mapData.js";
import {DEV_MODE, io} from "./server.js";

let games = new Map();

export function regGameHandlers(socket) {
    const handlers = {
        "hostGame": ({ username }) => {
            const game = new Game(io, socket);
            const player = game.addPlayer(socket, username, true);
            games.set(game.id, game);
            socket.emit("hostGame", { gameId: game.id, player: player });
        },
        "joinGame": ({ gameId, username }) => {
            const game = games.get(gameId);
            if (!game) {
                socket.emit("error", `Game with id ${gameId} not found`);
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

    onTimerEnd(reason) {
        // handler for end of game
        this.endGame(reason);

    }

    assignRoles() {
        const playerIds = Object.keys(this.players);

        for (const p of Object.values(this.players)) {
            p.isCaught = false;
            p.type = 'player';
            p.flashOn = false;
            p.isMoving = false;
        }
        const seekerId = playerIds[Math.floor(Math.random() * playerIds.length)];
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
        console.log(this.players);
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
        socket.on('move', ({x, y, facingAngle, isMoving, flashOn}) => {
            if (this.isPaused) return;
            const p = this.players[socket.id];
            if (!p) return;

            p.x = x;
            p.y = y;
            p.facingAngle = facingAngle;
            p.isMoving = isMoving;
            p.flashOn = !!flashOn;

            socket.to(this.id).emit('playerMoved', {
                    id: socket.id, x, y, facingAngle, isMoving, flashOn: !!flashOn
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
        if (reason === "manual") {
            this.status = Status.LOBBY;
        } else {
            this.status = Status.ENDED;
        }
        this.broadcast("game:ended", {reason, players: this.players})
    }

    restartGame() {
        this.reset();
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