export default class Camera {
    constructor(zoomLevel, gameContainer) {
        this.zoomLevel = zoomLevel
        this.gameContainer = gameContainer ? gameContainer : document.getElementById("gameContainer");
    }

    updateCamera(x, y, width, height) {
        const centerX = x + (width / 2);
        const centerY = y + (height / 2);

        const translateX = (window.innerWidth / 2) - (centerX * this.zoomLevel);
        const translateY = (window.innerHeight / 1.5) - (centerY * this.zoomLevel);

        this.gameContainer.style.transform = `translate(${translateX}px, ${translateY}px) scale(${this.zoomLevel})`;
    }
}