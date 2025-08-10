import State from './State';
import {hostGame, joinGame} from "./multiplayer.js";
import "../css/menu.css";

export default class MainMenu extends State {
    constructor(stateManager, rootContainer, socket) {
        super(stateManager, rootContainer, socket);
    }

    init() {
        this.setupContainer("mainMenuContainer");
        this.registerSocketHandlers();
        this.render();
    }

    registerSocketHandlers() {
        const onEntryResponse = (data) => {
            this.stateManager.skinIndex = data.player.skinIndex;
            this.stateManager.setGameId(data.gameId);
            history.pushState({}, "", data.gameId);
            this.stateManager.switchState("lobby");
        }

        this.onSocket("hostGame", onEntryResponse)
        this.onSocket("joinGame", onEntryResponse)
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
            this.stateManager.isHost = true;
            this.gameEntryDialog("host");
        })

        this.addEventListener(document.getElementById("join"), "click",() => {
            this.stateManager.isHost = false;
            this.gameEntryDialog("join");
        })

        if (this.stateManager.gameId) {
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
        form.appendChild(username);

        if (mode === "join") {
            const gameId = document.createElement("input");
            gameId.name = "gameId";
            gameId.classList.add("menu-item");
            gameId.type = "text";
            gameId.placeholder = "Game id";
            gameId.value = this.stateManager.gameId;
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
            this.stateManager.username = checkedUsername;
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