import GameObject from "./GameObject.js";

export default class BonusBox extends GameObject {
    constructor(x, y, size = 28, bonusType = "speed", gameContainer) {
        super(x, y, size, size, "bonus", gameContainer);
        this.bonusType = bonusType;
        this.solid = false;
        this.element.classList.add(`bonus--${bonusType}`);
        this.element.style.zIndex = "20";
    }
}