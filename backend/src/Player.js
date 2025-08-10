export default class Player {
    #socket;
    #game;
    constructor(game, socket, username, isHost) {
        this.#game = game;
        this.#socket = socket;
        this.id = socket.id;
        this.username = username;
        this.isHost = isHost;
        this.skinIndex = this.pickRandomUnusedSkin();
        this.readyStatus = false;

        this.registerSocketHandlers(this.#socket);
    }

    registerSocketHandlers(socket) {
        socket.on("updateSkin", (skinIndex) => {
            this.skinIndex = skinIndex;
            this.#game.broadcastPlayerList();
        })

        socket.on("getPlayers", () => {
            socket.emit("getPlayers", this.#game.players);
        })

        socket.on("updateReadyStatus", (status) => {
            this.readyStatus = status;
            for (const [id, player] of Object.entries(this.#game.players)) {
                if (player.readyStatus === false) {
                    this.#game.broadcastPlayerList();
                    return;
                }
            }
            this.#game.startGame();
        })
    }

    pickRandomUnusedSkin() {
        const skins = [0, 1, 2, 3, 4, 5, 6, 7];
        let takenSkins = [];

        for (const [id, player] of Object.entries(this.#game.players)) {
            takenSkins.push(player.skinIndex);
        }
        const availableSkins = skins.filter(index => !takenSkins.includes(index));

        if (availableSkins.length === 0) {
            return skins[Math.floor(Math.random() * skins.length)];
        }

        return availableSkins[Math.floor(Math.random() * availableSkins.length)];
    }
}