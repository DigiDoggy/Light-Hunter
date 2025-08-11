import {updateSkin, testEmit, getPlayers, updateReadyStatus} from "./multiplayer.js";
import "../css/lobby.css";
import State from "./State.js";

const ANIMATION_DIRECTIONS = {
    FRONT: 0,
    LEFT: 1,
    RIGHT: 2,
    BACK: 3
}

export default class Lobby extends State {
    constructor(stateManager, rootContainer, socket) {
        super(stateManager, rootContainer, socket);
        this.playerList = null;
        this.error = "";
    }

    init() {
        this.setupContainer("lobbyContainer");
        this.registerSocketHandlers();
        getPlayers();
        this.render();
    }

    registerSocketHandlers() {
        this.onSocket("getPlayers", (players) => {
            console.log("players", players);
            this.stateManager.players = players;
            this.updatePlayerList(this.playerList);
        });

        this.onSocket("startGame", () => {
            console.log("startGame");
            this.stateManager.switchState("game")
        });
    }

    render() {
        const frame = document.createElement("div")
        frame.className = "menu-frame lobby";

        this.renderSkinSection(frame);
        this.renderPlayerSection(frame);
        this.renderMapSection(frame);
        this.renderReadyButton(frame);

        this.container.appendChild(frame);
    }

    updatePlayerList(playerList) {
        playerList.innerHTML = "";
        for (const [id, player] of Object.entries(this.stateManager.players)) {
            const playerEl = document.createElement("div");
            playerEl.classList.add("player-list-item");

            const skin = document.createElement("img");
            skin.className = "skin";
            this.prepareSkin(skin, 1, player.skinIndex, ANIMATION_DIRECTIONS.FRONT, 1);

            const playerName = document.createElement("p");k
            playerName.textContent = (player.isHost ? "🔌" + player.username : "") + player.username + (player.readyStatus === true ? "🟢" : "🔴");

            if (player.username === this.stateManager.username) {
                playerName.style.color = "green";
            }

            playerEl.append(skin, playerName);
            playerList.append(playerEl);
        }
    }

    renderMapSection(container) {

        // todo map selector

        const mapContainer = document.createElement("div");
        mapContainer.className = "map-container";

        const title = document.createElement("p");
        title.textContent = "Map";

        const dropdown = document.createElement("select");
        dropdown.className = "map-list menu-item";

        this.addEventListener(dropdown,"change", (e) => {
            const selectedValue = e.target.value;
            console.log(selectedValue);
        })

        const maps = ["map1", "map2"];

        maps.forEach((map) => {
            const option = document.createElement("option");
            option.value = map;
            option.textContent = map;
            dropdown.appendChild(option);
        })



        mapContainer.append(title, dropdown);
        container.appendChild(mapContainer);
    }

    renderReadyButton(container) {
        const readyContainer = document.createElement("div");
        readyContainer.classList.add("ready-container");

        const readyButton = document.createElement("button");
        readyButton.className = "ready-button menu-item";
        readyButton.textContent = "Ready";

        this.addEventListener(readyButton, "click", () => {
            updateReadyStatus(!this.stateManager.readyStatus)
            readyButton.classList.toggle("ready")

            // dev
            // this.stateManager.switchState("game");
        })

        readyContainer.appendChild(readyButton);
        container.appendChild(readyContainer);
    }

    renderPlayerSection(container) {
        const playerListContainer = document.createElement("div");
        playerListContainer.className = "player-list-container";

        const title = document.createElement("p");
        title.textContent = "Player list"
        playerListContainer.append(title)

        this.playerList = document.createElement("div");
        playerListContainer.append(this.playerList);
        container.appendChild(playerListContainer);
    }

    renderSkinSection(container) {
        const skinContainer = document.createElement("div");
        skinContainer.className = "skin-container";

        const skinSelectorTitle = document.createElement("p")
        skinSelectorTitle.textContent = "Skin";
        const skinSelectorButton = document.createElement("img");
        skinSelectorButton.className = "skin-selector-button menu-item"
        this.prepareSkin(skinSelectorButton, 3,this.stateManager.skinIndex, ANIMATION_DIRECTIONS.FRONT, 1);

        this.addEventListener(skinSelectorButton, "click", () => {
            this.renderSkinSelector(skinContainer, skinSelectorButton);
        });

        skinContainer.append(skinSelectorTitle, skinSelectorButton);
        container.append(skinContainer);
    }

    renderSkinSelector(container, menuButton) {
        const skinSelector = document.getElementById("skin-selector");
        if (skinSelector) {
            skinSelector.classList.remove("hidden");
            document.getElementById("darknessOverlay").classList.remove("hidden");
            return;
        }

        const darknessOverlay = document.createElement("div");
        darknessOverlay.id = "darknessOverlay";
        darknessOverlay.className = "darkness-overlay";
        container.appendChild(darknessOverlay);

        const frame = document.createElement("div");
        frame.id = "skin-selector";
        frame.className = "skin-selector menu-frame";

        this.addEventListener(darknessOverlay, "click", () => {
            frame.classList.toggle("hidden");
            darknessOverlay.classList.toggle("hidden");
        })

        const title = document.createElement("p")
        title.textContent = "Pick a skin";
        frame.appendChild(title);

        const skins = document.createElement("div");
        skins.classList.add("skin-grid");

        for (let i = 0; i < 8; i++) {
            const skin = document.createElement("img");
            skin.className = "skin-selector-button select-skin menu-item";
            this.prepareSkin(skin, 3, i, ANIMATION_DIRECTIONS.FRONT, 1);
            this.addEventListener(skin, "click", () => {
                this.stateManager.skinIndex = i;
                this.prepareSkin(menuButton, 3, i, ANIMATION_DIRECTIONS.FRONT, 1);
                frame.classList.add("hidden");
                darknessOverlay.classList.add("hidden");

                updateSkin(i);
            })
            skins.append(skin);
        }

        frame.appendChild(skins);
        container.append(frame);
    }

    prepareSkin(element, scale = 3,skinIndex, direction, animation) {
        const mapWidth = 384 * scale;
        const mapHeight = 384 * scale;
        const frameWidth = 32 * scale;
        const frameHeight = 48 * scale;

        skinIndex = skinIndex % 8;  // 8 skins
        direction = direction % 4;  // 4 directions
        animation = animation % 3;  // 3 animation frames per direction

        const col = (skinIndex % 4) * 3 + animation;
        const row = skinIndex > 3 ? 4 + direction : direction;

        const x = -(col * frameWidth);
        const y = -(row * frameHeight);

        element.style.width = `${frameWidth}px`;
        element.style.height = `${frameHeight}px`;
        element.style.backgroundSize = `${mapWidth}px ${mapHeight}px`
        element.style.backgroundPosition = `${x}px ${y}px`;
    }
}