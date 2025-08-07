import "../css/menu.css";

export default class MainMenu {
    constructor(stateManager, rootContainer) {
        this.stateManager = stateManager;
        this.rootContainer = rootContainer;
        this.container = null;
    }

    init() {
        this.container = this.stateManager.setupContainer("mainMenuContainer");
        this.renderTitleScreen();
    }

    renderTitleScreen() {
        // language=HTML
        this.container.innerHTML = `
            <div class="menu-frame">
                <h1 class="title">web-game</h1>
                <button id="host" class="menu-item">Host Game</button>
                <button id="settings" class="menu-item">Settings</button>
            </div>
        `;

        const hostButton = document.getElementById("host");
        hostButton.addEventListener("click", () => {
            // todo host server
            this.stateManager.isHost = true;
            this.stateManager.switchState("lobby",);
        });

        // todo settings
    }

    cleanup() {
        // todo
        // const hostButton = document.getElementById("host");
        // hostButton.removeEventListener("click", (e) => {})
        // this.rootContainer.removeChild(this.container);
        this.container.innerHTML = "";
    }
}