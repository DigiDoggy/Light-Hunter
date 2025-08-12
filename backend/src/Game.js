import Player from "./Player.js";

export default class Game {
    players = {};
    constructor(io, hostSocket) {
        this.io = io;
        this.id = crypto.randomUUID().substring(0, 8).toUpperCase(); // todo check for collision
        this.host = hostSocket;
        this.mapId = 0;
    }

    addPlayer(socket, username, isHost = false) {

        const player = new Player(this, socket, username, isHost);
        this.players[socket.id] = player;
        socket.join(this.id);

        this.registerSocketHandlers(socket);
        this.broadcastPlayerList();

        return player;
    }

    usernameExists(username) {
        console.log(username)
        return Object.values(this.players).some(user => user.username.toLowerCase() === username.toLowerCase());
    }c

    registerSocketHandlers(socket) {
        socket.on("updateMap", (mapId) => {
            this.mapId = mapId;
            this.broadcast("updateMap", mapId);
        });
    }

    broadcastPlayerList() {
        this.broadcast("getPlayers", this.players);
    }

    startGame() {
        this.broadcast("startGame");
    }

    broadcast(message, data) {
        this.io.to(this.id).emit(message, data);
    }
}