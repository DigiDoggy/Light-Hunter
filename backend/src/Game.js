import Player from "./Player.js";
import Timer from "./Timer.js";
import BonusManager from "./BonusManager.js";
import { walls, WORLD } from "./mapData.js";

//todo need import Bonuses, and remove from server

export default class Game {
    players = {};
    constructor(io, hostSocket) {
        this.io = io;
        this.id = crypto.randomUUID().substring(0, 8).toUpperCase(); // todo check for collision
        this.host = hostSocket;
        this.mapId = 0;
        this.isPaused = false;

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
            geometry: { world: WORLD, walls },
            spawnEveryMs: 5000,
            types: ['speed', 'vision', 'timeShift'],
            size: 28,
            attempts: 30,
        });
    }

    onTimerEnd(reason){
        // handler for end of game
        this.bonuses.stop();
        this.broadcast("Game Over", {reason, players: this.players})
    }

    assignRoles() {
        const playerIds = Object.keys(this.players);
        const seekerId = playerIds[Math.floor(Math.random() * playerIds.length)];
        playerIds.forEach(id => {
            const player = this.players[id];
            if (id === seekerId) {
                player.role = "seeker";
                player.x = 1900;
                player.y = 1900;
            }
            else {
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

        socket.emit('room:init', {
            players: this.players,
            mapId: this.mapId,
            bonuses: this.bonuses.list(),
            timer: {
                remainingMs: this.timer?.remaining?.() ?? 0
            }
        });

        socket.on('move', ({ x, y, facingAngle, isMoving }) => {
            const p = this.players[socket.id];
            if (!p) return;

            p.x = x;
            p.y = y;
            p.facingAngle = facingAngle;
            p.isMoving = isMoving;

            socket.to(this.id).emit('playerMoved', {
                id: socket.id, x, y, facingAngle, isMoving
            });
        });

        socket.on("updateMap", (mapId) => {
            this.mapId = mapId;
            this.broadcast("updateMap", mapId);
        });

        socket.on('bonus:pickup', (payload) =>
            this.bonuses.handlePickup(socket, payload
            ));

        socket.on("getPlayers", () => {
            socket.emit("getPlayers", this.players);
        })

        socket.on('disconnect', () => {
            delete this.players[socket.id];
            this.broadcast('playerDisconnected', socket.id);
        });

        socket.on("catch", (playerId) => {
            const player = this.players[playerId];
            if (!player) return;
            player.isCaught = true;
            this.broadcast("playerCaught", playerId);
        });

        socket.on("game:start", ({durationMs}) =>{
                if(socket.id !==this.host.id)return;

                this.startGame(durationMs);
            }
        )
        socket.on("game:pause", () => {
            if (socket.id !== this.host.id) return;
            this.pauseGame(socket.id);
        });

        socket.on("game:resume", () => {
            if (socket.id !== this.host.id) return;
            this.resumeGame(socket.id);
        });

    }

    broadcastPlayerList() {
        this.broadcast("getPlayers", this.players);
    }

    //setting timer for game
    startGame(durationMs=5*60000) {
        this.assignRoles();

        this.broadcast("startGame", this.players);
        this.timer.start(durationMs)
        this.bonuses.start();
    }
    pauseGame(sockedId){
        this.isPaused = true;
        this.timer.pause();
        this.bonuses.stop();
        //todo need somthing for dashboard on game
        this.broadcast("dashboard:action", {by:sockedId, action:"pause"})
    }
    resumeGame(sockedId){
        this.isPaused = false;
        this.timer.resume();
        this.bonuses.start();
        this.broadcast("dashboard:action", {by:sockedId, action: "resume game"})
    }

    broadcast(message, data) {
        this.io.to(this.id).emit(message, data);
    }
}