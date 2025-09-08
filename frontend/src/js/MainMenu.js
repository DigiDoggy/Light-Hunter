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
        if (!audio.isPlaying("menuMusic")) audio.playMenuMusic();
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
                <button id="single" class="menu-item">Single Game</button>
                <button id="join" class="menu-item">Join Game</button>
                <button id="settings" class="menu-item">Settings</button>
                <button id="guide" class="menu-item">Guide</button>
            </div>
        `;

        this.addEventListener(document.getElementById("host"), "click",() => {
            audio.playButtonClick();
            state.isHost = true;
            state.isSingleGame = true;
            this.gameEntryDialog("single");
        })

        this.addEventListener(document.getElementById("single"), 'click', ()=>{
            audio.playButtonClick();
            this.state.isSingleGame=true;
            this.gameEntryDialog('single')
        })

        this.addEventListener(document.getElementById("join"), "click",() => {
            audio.playButtonClick();
            state.isHost = false;
            this.gameEntryDialog("join");
        })

        this.addEventListener(document.getElementById("settings"), "click",() => {
            audio.playButtonClick();
            this.settings();
        })

        this.addEventListener(document.getElementById("guide"), "click",() => {
            audio.playButtonClick();
            this.guide();
        })

        if (state.gameId) {
            this.gameEntryDialog("join")
        }
    }

    settings() {
        const settings = this.popupMenu(this.container, "settings");
        this.soundSettings(settings);
    }

    soundSettings(parent) {
        const title = document.createElement("p");
        title.classList.add("title");
        title.textContent = "Volume";

        const slider = document.createElement("input");
        slider.className = "volume-slider";
        slider.type = "range";
        slider.min = 0;
        slider.max = 100;

        const volume = localStorage.getItem("volume");
        slider.value = volume;

        const display = document.createElement("p");
        display.classList.add("volume-display");
        display.textContent = volume + "%";
        this.addEventListener(slider, "input", (e) => {
            const vol = e.target.value;
            audio.setVolume(vol);
            display.textContent = vol + "%";
            localStorage.setItem("volume", vol);
        });

        parent.append(title, display, slider);
    }
    
    guide() {
        const frame = this.popupMenu(this.container, "guide");
        this.controls(frame);
        this.bonuses(frame);
    }

    controls(parent) {
        const controls = {
            move: {
                primary: ["w", "s"],
                secondary: ["↑", "↓"],
            },
            rotate: {
                primary: ["a", "d"],
                secondary: ["←", "→"],
            },
            flashlight: {
                primary: ["left ctrl"],
            },
            pause: {
                primary: ["space"],
            }
        }

        const container = document.createElement("div");
        container.classList.add("controls");
        const title = document.createElement("p");
        title.className = "title";
        title.textContent = "Controls";
        container.append(title);

        for (const a in controls) {
            const control = document.createElement("div");
            control.className = "control-item";

            const action = document.createElement("p");
            action.className = "desc";
            action.textContent = a;
            control.append(action);

            controls[a].primary.forEach((btn) => addKey(btn));

            if (controls[a].secondary) {
                const dash = document.createElement("p");
                dash.textContent = "/";
                control.append(dash);
                controls[a].secondary.forEach((btn) => addKey(btn));
            }


            container.append(control);

            function addKey(button) {
                const key = document.createElement("span");
                key.classList.add("key");
                key.textContent = button;
                control.append(key);
            }
        }

        parent.appendChild(container);
    }

    bonuses(parent) {
        const path = "./src/assets/skins/bonusBox/"
        const bonuses = {
            reveal: {
                img: path + "openMap.png",
                desc: "Reveal the map"
            },
            speed: {
                img: path + "speed.png",
                desc: "Increased movement speed"
            },
            time: {
                img: path + "timeShift.png",
                desc: "Extra time"
            },
        }

        const container = document.createElement("div");
        container.classList.add("bonuses");
        const title = document.createElement("p");
        title.className = "title";
        title.textContent = "Bonuses";
        container.append(title);

        for (const b in bonuses) {
            const item = document.createElement("div");
            item.className = "bonus-item";

            const img = document.createElement("img");
            img.src = bonuses[b].img;
            img.alt = b;

            const desc = document.createElement("span");
            desc.className = "desc";
            desc.textContent = bonuses[b].desc;

            item.append(img, desc);
            container.append(item);
        }

        parent.append(container);
    }

    gameEntryDialog(mode) {
        const frame = this.popupMenu(this.container, "game-entry-dialog");

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

        if (mode === "join" || mode === "single") {
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
            if (mode === "host" || mode === "single") {
                hostGame({ username: checkedUsername, single: mode === 'single' });
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