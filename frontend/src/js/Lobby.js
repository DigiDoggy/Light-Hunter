import state from "./AppStateManager.js";
import { allMaps } from "./map.js";
import {updateSkin, updateMap, getPlayers, updateReadyStatus, leaveGame, getMyId} from "./multiplayer.js";
import "../css/lobby.css";
import State from "./State.js";
import audio from "./AudioManager.js";

const ANIMATION_DIRECTIONS = {
    FRONT: 0,
    LEFT: 1,
    RIGHT: 2,
    BACK: 3
}

export default class Lobby extends State {
    constructor() {
        super();
        this.playerList = null;
        this.playerListTitle = null;
        this.readyButton = null;
        this.error = "";
    }

    init() {
        this.setupContainer("lobbyContainer");
        this.registerSocketHandlers();
        getPlayers();
        this.render();
        if (!audio.isPlaying("menuMusic")) audio.playMenuMusic();
    }

    registerSocketHandlers() {
        this.onSocket("getPlayers", () => this.updatePlayerList());
        this.onSocket("newPlayer", () => this.updatePlayerList());
        this.onSocket("updateSkin", () => this.updatePlayerList());
        this.onSocket("playerDisconnected", () => this.updatePlayerList());
        this.onSocket("updateMap", () => this.openMapSelectorButton.style.backgroundImage = `url(${state.map.imagePath})`);
        this.onSocket("startGame", () => state.switchState("game"));
        this.onSocket("updateReadyStatus", ({ id, readyStatus}) => {
            this.updatePlayerList();
            if (id === getMyId()) {
                console.log(readyStatus);
                if (readyStatus === true) this.readyButton.classList.add("ready");
                else if (readyStatus === false) this.readyButton.classList.remove("ready");
            }
        });
    }

    render() {

        const frame = document.createElement("div")
        frame.className = "menu-frame lobby";

        this.renderSkinSection(frame);
        this.renderPlayerSection(frame);
        this.renderMapSection(frame);
        this.renderReadyButton(frame);
        this.renderBackButton(this.container);

        this.container.appendChild(frame);
    }

    renderBackButton(container) {
        const backButton = document.createElement("button");
        backButton.className = "menu-item menu-back";
        backButton.textContent = "⬅";
        this.addEventListener(backButton, "click", () => {
            leaveGame();
            state.switchState("mainMenu");
        })
        container.appendChild(backButton);
    }

    updatePlayerList() {
        this.playerListTitle.textContent = "Player list " + Object.keys(state.players).length + "/4";
        
        this.playerList.innerHTML = "";
        for (const [id, player] of Object.entries(state.players)) {
            const playerEl = document.createElement("div");
            playerEl.classList.add("player-list-item");

            const skin = document.createElement("img");
            skin.className = "skin";
            this.prepareSkin(skin, 1, player.skinIndex, ANIMATION_DIRECTIONS.FRONT, 1);

            const playerName = document.createElement("p");
            playerName.textContent = (player.isHost ? "🔌" : "") + player.username + (player.readyStatus === true ? "🟢" : "🔴");

            if (player.username === state.username) {
                playerName.style.color = "green";
            }

            playerEl.append(skin, playerName);
            this.playerList.append(playerEl);
        }
    }

    renderMapSection(container) {
        const mapContainer = document.createElement("div");
        mapContainer.className = "map-container";

        const title = document.createElement("p");
        title.textContent = "Map";

        const openMapSelector = document.createElement("img");
        openMapSelector.className = "open-map-selector-button map";
        openMapSelector.style.backgroundImage = `url(${state.map.imagePath})`;
        this.addEventListener(openMapSelector, "click", () => {
            audio.playButtonClick();
            this.mapSelector(mapContainer);
        })
        this.openMapSelectorButton = openMapSelector;

        mapContainer.append(title, openMapSelector);
        container.appendChild(mapContainer);
    }

    mapSelector(container) {
        const mapMenu = this.popupMenu(container, "map-selector");

        const title = document.createElement("p");
        title.textContent = "Pick a map";
        mapMenu.appendChild(title);

        allMaps.forEach(mapData => {
            const map = document.createElement("img");
            map.className = "map";
            map.style.backgroundImage = `url(${mapData.imagePath}`;
            this.addEventListener(map, "click", () => {
                audio.playButtonClick();
                state.map = mapData;
                this.openMapSelectorButton.style.backgroundImage = `url(${mapData.imagePath})`;
                container.removeChild(mapMenu);
                this.container.removeChild(document.getElementById("darknessOverlay"));

                updateMap(mapData.id);
            })

            mapMenu.append(map);
        })

        container.appendChild(mapMenu);
    }

    renderReadyButton(container) {
        const readyContainer = document.createElement("div");
        readyContainer.classList.add("ready-container");

        const readyButton = document.createElement("button");
        this.readyButton = readyButton;
        readyButton.className = "ready-button menu-item";
        readyButton.textContent = "Ready";

        this.addEventListener(readyButton, "click", () => {
            const ready = !state.readyStatus;
            audio.playButtonClick(ready ? 1 : 2);
            state.readyStatus = ready;
            updateReadyStatus(ready);
            readyButton.classList.toggle("ready")

            // dev
            // state.switchState("game");
        })

        readyContainer.appendChild(readyButton);
        container.appendChild(readyContainer);
    }

    renderPlayerSection(container) {
        const playerListContainer = document.createElement("div");
        playerListContainer.className = "player-list-container";

        const title = document.createElement("p");
        this.playerListTitle = title;
        title.textContent = "Player list " + Object.keys(state.players).length + "/4";
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
        this.prepareSkin(skinSelectorButton, 3,state.skinIndex, ANIMATION_DIRECTIONS.FRONT, 1);

        this.addEventListener(skinSelectorButton, "click", () => {
            audio.playButtonClick();
            this.renderSkinSelector(skinContainer, skinSelectorButton);
        });

        skinContainer.append(skinSelectorTitle, skinSelectorButton);
        container.append(skinContainer);
    }

    renderSkinSelector(container, menuButton) {
        const skinMenu = this.popupMenu(container, "skin-selector");

        const title = document.createElement("p")
        title.textContent = "Pick a skin";
        skinMenu.appendChild(title);

        const skins = document.createElement("div");
        skins.classList.add("skin-grid");

        for (let i = 0; i < 8; i++) {
            const skin = document.createElement("img");
            skin.className = "skin-selector-button select-skin menu-item";
            this.prepareSkin(skin, 3, i, ANIMATION_DIRECTIONS.FRONT, 1);
            this.addEventListener(skin, "click", () => {
                audio.playButtonClick();
                state.skinIndex = i;
                this.prepareSkin(menuButton, 3, i, ANIMATION_DIRECTIONS.FRONT, 1);
                container.removeChild(skinMenu);
                this.container.removeChild(document.getElementById("darknessOverlay"));
                updateSkin(i);
            })
            skins.append(skin);
        }

        skinMenu.appendChild(skins);
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

    onCleanup() {
        audio.stopAllSounds();
    }
}