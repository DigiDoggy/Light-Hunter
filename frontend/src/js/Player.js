import { checkCollision } from "./collision.js";
import GameObject from "./GameObject.js";

export default class Player extends GameObject {
    constructor(x, y, width = 20, height = 20, name = "player", speed = 200, gameContainer, facingAngle = 0) {
        super(x, y, width, height, "player", gameContainer);
        this.facingAngle = facingAngle;
        this.name = name;
        this.speed = speed;
    }

    #norm = Math.SQRT1_2;

    handleMovement(keys, delta, spatialGrid, gridSize) {
        let direction = {x: 0, y: 0};
        const rotationSpeed = 2.5; // radians per second
        const moveSpeed = this.speed;
        const deltaTime = delta || 0.01667;

        let move = 0;
        if (keys['KeyW']) move += 1;
        if (keys['KeyS']) move -= 1;


        if (keys['KeyA']) this.facingAngle -= rotationSpeed * deltaTime;
        if (keys['KeyD']) this.facingAngle += rotationSpeed * deltaTime;

        const moveStepX = Math.cos(this.facingAngle) * move * moveSpeed * deltaTime;
        const moveStepY = Math.sin(this.facingAngle) * move * moveSpeed * deltaTime;

        const playerBoundsX = {
            x: this.x + moveStepX,
            y: this.y,
            width: this.width,
            height: this.height,
        };

        const collisionX = checkCollision(playerBoundsX, spatialGrid, gridSize);
        if (collisionX) {
            if (moveStepX > 0) this.x = collisionX.bounds.x - this.width;
            else if (moveStepX < 0) this.x = collisionX.bounds.x + collisionX.bounds.width;
        } else {
            this.x += moveStepX;
        }

        const playerBoundsY = {
            x: this.x,
            y: this.y + moveStepY,
            width: this.width,
            height: this.height,
        };

        const collisionY = checkCollision(playerBoundsY, spatialGrid, gridSize);
        if (collisionY) {
            if (moveStepY > 0) this.y = collisionY.bounds.y - this.height;
            else if (moveStepY < 0) this.y = collisionY.bounds.y + collisionY.bounds.height;
        } else {
            this.y += moveStepY;
        }

        this.updatePosition();
    }
}