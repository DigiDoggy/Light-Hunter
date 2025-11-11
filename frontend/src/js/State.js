import state from "./AppStateManager.js";
import {socket} from "./multiplayer.js";
import audio from "./AudioManager.js";

export default class State {
    constructor() {
        this.rootContainer = state.container;
        this.socket = socket;
        this.container = null;
        this.eventListeners = [];
        this.socketListeners = [];
        this.timeouts = [];
        this.intervals = [];
        this.animationFrames = [];
    }

    setupContainer(containerName, classes) {
        this.container = document.createElement("div");
        if (containerName) this.container.id = containerName;
        if (classes) this.container.className = classes;
        this.rootContainer.appendChild(this.container);
    }

    addEventListener(element, event, handler, options) {
        element.addEventListener(event, handler, options);
        this.eventListeners.push({element, event, handler, options});
    }

    onSocket(event, handler) {
        this.socket.on(event, handler);
        this.socketListeners.push({event, handler});
    }

    requestAnimationFrame(callback) {
        const id = requestAnimationFrame(callback);
        this.animationFrames.push(id);
        return id;
    }

    cleanup() {
        this.eventListeners.forEach(({element, event, handler, options}) => {
            element.removeEventListener(event, handler, options);
        })
        this.eventListeners = [];

        this.socketListeners.forEach(({event, handler}) => {
            this.socket.off(event, handler);
        })
        this.socketListeners = [];

        this.intervals.forEach(id => clearInterval(id));
        this.intervals = [];

        this.timeouts.forEach((id) => clearTimeout(id));
        this.timeouts = [];

        this.animationFrames.forEach((id) => cancelAnimationFrame(id));
        this.animationFrames = [];

        if (this.container?.isConnected) {
            this.container.remove();
        }

        this.onCleanup();
    }

    onCleanup() {
    }

    popupMenu(container, name) {
        const darknessOverlay = document.createElement("div");
        darknessOverlay.id = "darknessOverlay";
        darknessOverlay.className = "darkness-overlay";
        this.container.appendChild(darknessOverlay);

        const frame = document.createElement("div");
        frame.id = name;
        frame.className = `${name} menu-frame`;
        container.appendChild(frame);

        this.addEventListener(darknessOverlay, "click", () => {
            audio.playButtonClick(2);
            container.removeChild(frame);
            this.container.removeChild(darknessOverlay);
        })

        return frame;
    }
}