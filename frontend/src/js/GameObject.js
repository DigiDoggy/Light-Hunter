export default class GameObject {
    constructor(x, y, width, height, type, gameContainer) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type;
        this.solid = (type === "wall" || type === "npc");

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