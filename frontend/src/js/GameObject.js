export default class GameObject {
    constructor(x, y, width, height, type, gameContainer, backgroundPosition = "0 0") {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type;
        this.solid = (type === "wall" || type === "npc");
        this.backgroundPosition = backgroundPosition;

        this.createElement(gameContainer ? gameContainer : document.getElementById("gameContainer"));
    }

    get bounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
        }
    }
    getDirectionFromAngle() {
        const angle = this.facingAngle % (2 * Math.PI);
        const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;

        if (normalizedAngle >= Math.PI / 4 && normalizedAngle < 3 * Math.PI / 4) return "down";
        if (normalizedAngle >= 3 * Math.PI / 4 && normalizedAngle < 5 * Math.PI / 4) return "left";
        if (normalizedAngle >= 5 * Math.PI / 4 && normalizedAngle < 7 * Math.PI / 4) return "up";
        return "right";
    }
    updateSkinFrame(direction, frame) {
        const frameWidth = 32;
        const frameHeight = 48;

        const directionMap = {
            down: 0,
            left: 1,
            right: 2,
            up: 3,
        };

        const row = directionMap[direction];
        const skinRowOffset = this.characterIndex > 3 ? 4 : 0;

        const x = (this.characterIndex * 3 + frame) * frameWidth;
        const y = (row + skinRowOffset) * frameHeight;

        this.element.style.backgroundPosition = this.backgroundPosition;
        this.element.style.width = `${frameWidth}px`;
        this.element.style.height = `${frameHeight}px`;
    }

    createElement(gameContainer) {
        const element = document.createElement("div");
        element.className = this.type;
        element.style.transform = `translate(${this.x}px, ${this.y}px)`
        element.style.width = this.width + 'px';
        element.style.height = this.height + 'px';
        this.element = element;
        gameContainer.appendChild(element);
    }

    updatePosition() {
        this.element.style.transform = `translate(${this.x}px, ${this.y}px)`;
    }


}