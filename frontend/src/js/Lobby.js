import "../css/lobby.css";

const ANIMATION_DIRECTIONS = {
    FRONT: 0,
    LEFT: 1,
    RIGHT: 2,
    BACK: 3
}

export default class Lobby {
    constructor(stateManager, rootContainer) {
        this.stateManager = stateManager;
        this.rootContainer = rootContainer;
        this.container = null;
        this.isHost = stateManager.isHost;
        this.error = "";
    }

    init() {
        // todo: connect to lobby

        this.container = this.stateManager.setupContainer("lobbyContainer");
        this.pickRandomUnusedSkin();
        this.renderUsernameInput();
        // this.renderLobby();
    }

    pickRandomUnusedSkin() {
        const skins = [0, 1, 2, 3, 4, 5, 6, 7];
        let takenSkins = [];
        this.stateManager.lobby.players.forEach((player) => {
            takenSkins.push(player.skinIndex);
        })
        const availableSkins = skins.filter(index => !takenSkins.includes(index));

        this.stateManager.skinIndex = (availableSkins[Math.floor(Math.random() * availableSkins.length)]);
    }

    renderLobby() {
        const frame = document.createElement("div")
        frame.className = "menu-frame lobby";

        this.renderSkinSection(frame);
        this.renderPlayerSection(frame);
        this.renderMapSection(frame);
        this.renderReadyButton(frame);

        this.container.innerHTML = "";
        this.container.appendChild(frame);
    }

    renderMapSection(container) {

        // todo map selector

        const mapContainer = document.createElement("div");
        mapContainer.className = "map-container";

        const title = document.createElement("p");
        title.textContent = "Map";

        const dropdown = document.createElement("select");
        dropdown.className = "map-list menu-item";

        dropdown.addEventListener("change", (e) => {
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

        readyButton.addEventListener("click", () => {
            // todo emit ready

            readyButton.classList.toggle("ready")

            // dev
            this.stateManager.switchState("game");
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

        this.stateManager.lobby.players.forEach((player) => {
            const playerEl = document.createElement("div");
            playerEl.classList.add("player-list-item");

            const skin = document.createElement("img");
            skin.className = "skin";
            this.prepareSkin(skin, 1, player.skinIndex, ANIMATION_DIRECTIONS.FRONT, 1);

            const playerName = document.createElement("p");
            playerName.textContent = player.isHost ? "🔌" + player.username : player.username;

            if (player.username === this.stateManager.username) {
                playerName.style.color = "green";
            }

            playerEl.append(skin, playerName);
            playerListContainer.append(playerEl);
        })

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

        skinSelectorButton.addEventListener("click", () => {
            this.renderSkinSelector(skinContainer, skinSelectorButton);
        })

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

        const title = document.createElement("p")
        title.textContent = "Pick a skin";
        frame.appendChild(title);

        const skins = document.createElement("div");
        skins.classList.add("skin-grid");

        for (let i = 0; i < 8; i++) {
            const skin = document.createElement("img");
            skin.className = "skin-selector-button select-skin menu-item";
            this.prepareSkin(skin, 3, i, ANIMATION_DIRECTIONS.FRONT, 1);
            skin.addEventListener("click", () => {
                this.stateManager.skinIndex = i;
                this.prepareSkin(menuButton, 3, i, ANIMATION_DIRECTIONS.FRONT, 1);
                frame.classList.add("hidden");
                darknessOverlay.classList.add("hidden");

                // todo emit update
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

    renderUsernameInput() {
        const frame = document.createElement("div");
        frame.classList.add("menu-frame");

        const errorMessage = document.createElement("p")
        errorMessage.className = "error";
        this.error = errorMessage;

        const form = document.createElement("form");
        form.id = "usernameForm";

        const input = document.createElement("input");
        input.id = "usernameInput";
        input.classList.add("menu-item");
        input.type = "text";
        input.placeholder = "Username";
        input.autofocus = true;

        const button = document.createElement("button");
        button.id = "save";
        button.classList.add("menu-item");
        button.type = "submit";
        button.textContent = this.isHost ? "Save" : "Join game";

        form.addEventListener("submit", (e) => {
            e.preventDefault();
            this.handleUsername(input.value);
        })
        form.append(input, button);
        frame.append(errorMessage, form);

        this.container.innerHTML = "";
        this.container.appendChild(frame);
    }

    handleUsername(username) {
        username.trim();
        if (username.length < 3) {
            this.error.textContent = "Username is too short";
            return false;
        }
        if (username.length > 12) {
            this.error.textContent = "Username is too long";
            return false;
        }

        this.stateManager.username = username;
        this.renderLobby();
    }

    cleanup() {
        this.rootContainer.innerHTML = "";
    }

}