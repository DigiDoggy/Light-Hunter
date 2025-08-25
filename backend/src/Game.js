import Player from "./Player.js";

export default class Game {
    players = {};
    constructor(io, hostSocket) {
        this.io = io;
        this.id = crypto.randomUUID().substring(0, 8).toUpperCase(); // todo check for collision
        this.host = hostSocket;
        this.mapId = 0;
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

        return player;
    }

    usernameExists(username) {
        return Object.values(this.players).some(user => user.username.toLowerCase() === username.toLowerCase());
    }

    registerSocketHandlers(socket) {
        socket.on("updateMap", (mapId) => {
            this.mapId = mapId;
            this.broadcast("updateMap", mapId);
        });

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
    }

    broadcastPlayerList() {
        this.broadcast("getPlayers", this.players);
    }

    startGame() {
        this.assignRoles();

        this.broadcast("startGame", this.players);
    }

    broadcast(message, data) {
        this.io.to(this.id).emit(message, data);
    }
}