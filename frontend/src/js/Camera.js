export default class Camera {
    constructor(zoomLevel, gameContainer) {
        this.zoomLevel = zoomLevel
        this.gameContainer = gameContainer ? gameContainer : document.getElementById("gameContainer");
    }


    updateCamera(x, y, width, height) {
        const playerCenterX = x + width / 2;
        const playerCenterY = y + height / 2;

        const viewSize = 20; // 200x200px area
        this.zoomLevel = viewSize / Math.max(width, height);
        console.log(this.zoomLevel);

        const screenW = window.innerWidth;
        const screenH = window.innerHeight;

        const translateX = (screenW / 2) - (playerCenterX * this.zoomLevel);
        const translateY = (screenH / 2) - (playerCenterY * this.zoomLevel);

        this.gameContainer.style.transform = `translate(${translateX}px, ${translateY}px) scale(${this.zoomLevel})`;
    }
}