export default class Camera {
    constructor(zoomLevel, gameContainer) {
        this.zoomLevel = zoomLevel
        this.gameContainer = gameContainer ? gameContainer : document.getElementById("gameContainer");
    }


    updateCamera(x, y, width, height) {
        const playerCenterX = x + width / 2;
        const playerCenterY = y + height / 2;

        const viewSize = 3000;
        this.zoomLevel = viewSize / Math.max(2000, 2000);

        const screenW = window.innerWidth;
        const screenH = window.innerHeight;

        const translateX = (screenW / 2) - (playerCenterX * this.zoomLevel - 500);
        const translateY = (screenH / 2) - (playerCenterY * this.zoomLevel - 500);

        this.gameContainer.style.transform = `translate(${translateX}px, ${translateY}px) scale(${this.zoomLevel})`;
    }
}