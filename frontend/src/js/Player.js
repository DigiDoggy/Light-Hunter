import { checkCollision } from "./collision.js";
import GameObject from "./GameObject.js";
import audio from "./AudioManager.js";
// todo need create array of bonuses
export default class Player extends GameObject {
    constructor({x, y, width = 32, height = 48, username = "player", speed = 175, gameContainer,
                    facingAngle = 0, characterIndex= 0, role='hider', isLocal = false}) {
        super({x, y, width, height, type: "player", gameContainer});
        this.facingAngle = facingAngle;
        this.username = username;
        this.baseSpeed= speed;
        this.speed = speed;
        this.isMoving = false;
        this.role = role;
        this.solid = true;
        this.animationTimer = 0;
        this.currentFrame = 0;
        this.characterIndex= characterIndex;
        this.effects={};
        this.canControl = true;
        this.flashOn=true;
        this.isLocal = isLocal;
        this.id = null;
    }

    setRole(role){
        this.role=role;
    }

    setBaseSpeed(newBase){
        this.baseSpeed=newBase;
        if (!this.effects?.speed){
            this.speed=newBase;
        }
    }
    resetSpeedToBase(){
        this.speed = this.baseSpeed;
    }

    handleMovement(keys, delta, spatialGrid, gridSize) {
        if (!this.canControl) {
            this.isMoving = false;
            const direction = this.getDirectionFromAngle();
            this.animate(0, 200, direction);
            return;
        }
        // let direction = {x: 0, y: 0};
        const rotationSpeed = 2.5; // radians per second
        const moveSpeed = this.speed;
        const deltaTime = delta || 0.01667;
        const frameDuration = 200;


        let move = 0;
        if (keys['KeyW'] || keys["ArrowUp"]) move += 1;
        if (keys['KeyS'] || keys["ArrowDown"]) move -= 1;

        this.isMoving = move !== 0;

        if (keys['KeyA'] || keys["ArrowLeft"]) this.facingAngle -= rotationSpeed * deltaTime;
        if (keys['KeyD'] || keys["ArrowRight"]) this.facingAngle += rotationSpeed * deltaTime;

        const moveStepX = Math.cos(this.facingAngle) * move * moveSpeed * deltaTime;
        const moveStepY = Math.sin(this.facingAngle) * move * moveSpeed * deltaTime;

        const playerBoundsX = {
            x: this.x + moveStepX,
            y: this.y,
            width: this.width,
            height: this.height,
        };

        const collisionX = checkCollision(playerBoundsX, spatialGrid, gridSize, this.type==='spectator');
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


        const collisionY = checkCollision(playerBoundsY, spatialGrid, gridSize, this.type==='spectator');
        if (collisionY) {
            if (moveStepY > 0) this.y = collisionY.bounds.y - this.height;
            else if (moveStepY < 0) this.y = collisionY.bounds.y + collisionY.bounds.height;
        } else {
            this.y += moveStepY;
        }

        this.updatePosition();

        const direction = this.getDirectionFromAngle();
        const frameIndex = 1;

        this.updateSkinFrame(direction, frameIndex);
        this.animate(deltaTime, frameDuration, direction);

        this.playAudio();
    }

    animate(deltaTime, frameDuration = 200, direction) {
        if (this.isMoving) {
            this.animationTimer += deltaTime * 1000;

            if (this.animationTimer >= frameDuration) {
                this.currentFrame = this.currentFrame === 0 ? 2 : 0;
                this.animationTimer = 0;
            }
            this.updateSkinFrame(direction, this.currentFrame);
        } else {                    // if not moving, then we use middle picture  from sprite(stay)
            this.currentFrame = 1;//when player stay
            this.animationTimer = 0;
            this.updateSkinFrame(direction, 1);
        }

    }

    playAudio() {
        // footsteps
        if (this.isMoving && this.animationTimer === 0) {
            audio.playFootstep(this.isLocal, {x: this.x, y: this.y});
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


        this.element.style.backgroundPosition = `-${x}px -${y}px`;
        this.element.style.width = `${frameWidth}px`;
        this.element.style.height = `${frameHeight}px`;
    }

    //set skins (0-11)
    setCharacterIndex(index){

        this.characterIndex=index;
    }
}