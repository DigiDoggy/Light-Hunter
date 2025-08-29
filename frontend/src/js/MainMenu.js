import State from './State';
import {hostGame, joinGame} from "./multiplayer.js";
import "../css/menu.css";
import state from "./AppStateManager.js";
import audio from "./AudioManager.js";

export default class MainMenu extends State {
    init() {
        this.setupContainer("mainMenuContainer");
        this.registerSocketHandlers();
        this.render();
        audio.playMenuMusic();
    }

    registerSocketHandlers() {
        this.onSocket("hostGame", () => state.switchState("lobby"));
        this.onSocket("joinGame", () => state.switchState("lobby"));
        this.onSocket("error", (message) => this.error.textContent = message);
    }

    render() {
        // language=HTML
        this.container.innerHTML = `
            <div class="menu-frame">
                <h1 class="title">web-game</h1>
                <button id="host" class="menu-item">Host Game</button>
                <button id="join" class="menu-item">Join Game</button>
                <button id="settings" class="menu-item">Settings</button>
            </div>
        `;

        this.addEventListener(document.getElementById("host"), "click",() => {
            audio.playButtonClick();
            state.isHost = true;
            this.gameEntryDialog("host");
        })

        this.addEventListener(document.getElementById("join"), "click",() => {
            audio.playButtonClick();
            state.isHost = false;
            this.gameEntryDialog("join");
        })

        if (state.gameId) {
            this.gameEntryDialog("join")
        }

        // todo settings
    }

    gameEntryDialog(mode) {
        const frame = document.createElement("div");
        frame.className = "menu-frame game-entry-dialog";

        const darknessOverlay = document.createElement("div");
        darknessOverlay.id = "darknessOverlay";
        darknessOverlay.className = "darkness-overlay";
        this.container.appendChild(darknessOverlay);
        this.addEventListener(darknessOverlay, "click", () => {
            audio.playButtonClick(2);
            this.container.removeChild(frame);
            this.container.removeChild(darknessOverlay);
        });

        const errorMessage = document.createElement("p")
        errorMessage.className = "error";
        this.error = errorMessage;

        const form = document.createElement("form");

        const username = document.createElement("input");
        username.name = "username";
        username.classList.add("menu-item");
        username.type = "text";
        username.placeholder = "Username";
        username.value = state.username ? state.username : "";
        form.appendChild(username);

        if (mode === "join") {
            const gameId = document.createElement("input");
            gameId.name = "gameId";
            gameId.classList.add("menu-item");
            gameId.type = "text";
            gameId.placeholder = "Game id";
            gameId.value = state.gameId;
            form.appendChild(gameId);
        }

        const button = document.createElement("button");
        button.id = "save";
        button.classList.add("menu-item");
        button.type = "submit";
        button.textContent = mode === "host" ? "Save" : "Join game";
        form.appendChild(button);

        this.addEventListener(form, "submit", (e) => this.handleSubmit(e, mode));

        frame.append(errorMessage, form);
        this.container.appendChild(frame);
    }

    handleSubmit(e, mode) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const checkedUsername = this.checkUsername(formData.get("username"));

        if (checkedUsername) {
            state.username = checkedUsername;
            if (mode === "host") {
                hostGame(checkedUsername);
            } else {
                joinGame(formData.get("gameId"), checkedUsername);
            }
        }
    }

    checkUsername(username) {
        username.trim();
        if (username.length < 3) {
            this.error.textContent = "Username is too short";
            return false;
        }
        if (username.length > 12) {
            this.error.textContent = "Username is too long";
            return false;
        }

        return username;
    }
}