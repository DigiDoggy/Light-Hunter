import Game from './Game';
import MainMenu from './MainMenu';
import Lobby from './Lobby';
import { socket } from "./multiplayer.js"
import { Map1, allMaps } from "./map";

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
        this.username = null;
        this.skinIndex = null;
        this.readyStatus = false;
        this.players = [];
        this.selectedMap = Map1;

        this.gameId = null;

        this.settings = {};

        this.test = false;
        this.socket = socket;

        this.init();
    }

    init() {
        this.setGameId(window.location.pathname);
        this.switchState("mainMenu");
        // this.switchState("lobby");
        // this.switchState("game")
    }

    setGameId(gameId) {
        if (gameId[0] === "/") this.gameId = gameId.substring(1);
        else this.gameId = gameId;
    }

    switchState(state) {
        if (this.currentState) {
            this.currentState.cleanup();
            this.currentState = null;
        }

        this.container.innerHTML = "";

        const StateClass = this.states[state];
        if (StateClass) {
            this.currentState = new StateClass(this, this.container, socket);
            this.currentState.init();
        } else {
            console.error(`State ${state} not found`);
        }

    }

    updateMap(mapId) {
        allMaps.forEach((map) => {
            if (map.id === mapId) this.selectedMap = map;
        })
    }
}