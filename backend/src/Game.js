import Player from "./Player.js";

export default class Game {
    players = {};
    constructor(io, hostSocket) {
        this.io = io;
        this.id = crypto.randomUUID().substring(0, 8).toUpperCase(); // todo check for collision
        this.host = hostSocket;
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
    }

    registerSocketHandlers(socket) {

    }

    broadcastPlayerList() {
        this.broadcastToRoom("getPlayers", this.players);
    }

    startGame() {
        this.broadcastToRoom("startGame");
    }

    broadcastToRoom(message, data) {
        this.io.to(this.id).emit(message, data);
    }
}