class WallTile {
    constructor(x, y, tileX, tileY, gameContainer) {
        this.x = x;
        this.y = y;
        this.tileX = tileX;
        this.tileY = tileY;

        this.el = document.createElement("div");
        this.el.className = "wall-tile";
        this.el.style.position = "absolute";
        this.el.style.width = tileSize + "px";
        this.el.style.height = tileSize + "px";
        this.el.style.left = this.x + "px";
        this.el.style.top = this.y + "px";

        this.el.style.backgroundImage = "url('../assets/skins/walls/walls.png')";
        this.el.style.backgroundPosition = `-${this.tileX * tileSize}px -${this.tileY * tileSize}px`;
        this.el.style.backgroundSize = "auto";

        // Для отладки добавим цвет фона и рамку
        this.el.style.border = "1px solid red";
        this.el.style.backgroundColor = "rgba(255,0,0,0.3)";
        this.el.style.imageRendering = "pixelated";

        gameContainer.appendChild(this.el);
    }
}