import Game from './Game';
import MainMenu from './MainMenu';
import Lobby from './Lobby';

export default class AppStateManager {
    constructor() {
        this.currentState = null;
        this.states = {
            mainMenu: MainMenu,
            game: Game,
            lobby: Lobby,
        }
        this.container = document.getElementById("app");

        this.isHost = false;
        this.username = "me";
        this.skinIndex = null;
        this.lobby = {
            players: [
                { username: "host", skinIndex: 0, isHost: true },
                { username: "player2", skinIndex: 2, isHost: false},
                { username: "player3", skinIndex: 5, },
                { username: "me", skinIndex: 3, },
            ],
            code: window.location.pathname
        };

        this.settings = {};

        this.init();
    }

    init() {
        if (this.lobby.code === "/") {
            this.switchState("mainMenu");
        } else {
            this.switchState("lobby");
        }
        // this.switchState("game")
    }

    switchState(state) {
        if (this.currentState !== null && this.currentState.cleanup()) {
            this.currentState.cleanup();
        }

        const StateClass = this.states[state];
        if (StateClass) {
            this.currentState = new StateClass(this, this.container);
            this.currentState.init();
        } else {
            console.error(`State ${state} not found`);
        }

    }

    setupContainer(containerName, classes) {
        const container = document.createElement("div");
        container.id = containerName;
        container.className = classes;
        this.container.appendChild(container);
        return container;
    }
}