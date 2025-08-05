import {Map1} from "./map.js";
import {updateSpatialGrid} from "./collision.js";
import Player from "./Player.js";
import GameObject from "./GameObject.js";
import Camera from "./Camera.js";

export default class Game {
    constructor() {
        this.gameContainer = document.getElementById("gameContainer");
        this.player = new Player(100, 100, 20, 20);
        this.camera = new Camera(1.5);

        this.gameObjects = [];
        this.gridSize = 100;
        this.spatialGrid = [];
        this.keys = {};
        this.lastTime = performance.now();

        this.flashlightOverlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.flashlightOverlay.setAttribute("width", "100%");
        this.flashlightOverlay.setAttribute("height", "100%");
        this.flashlightOverlay.style.position = "absolute";
        this.flashlightOverlay.style.top = "0";
        this.flashlightOverlay.style.left = "0";
        this.flashlightOverlay.style.pointerEvents = "none";
        this.flashlightOverlay.style.zIndex = "100";

        this.flashlightOverlay.innerHTML = `
          <defs>
          <filter id="blur-filter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="15" />
          </filter>

  <mask id="flashlight-mask">
    <rect width="100%" height="100%" fill="white"/>
    <polygon opacity="80%" id="flashlight-cone" points="" fill="black" filter="url(#blur-filter)" />
  </mask>
</defs>
<rect width="100%" height="100%" fill="black" mask="url(#flashlight-mask)" />
        `;

        this.gameContainer.appendChild(this.flashlightOverlay);


        this.init();
    }

    init() {
        this.createMap()
        this.setupEventListeners();
        this.spatialGrid = updateSpatialGrid(this.gameObjects, this.gridSize);
        this.gameLoop();
    }

    updateFlashlightCone() {
        const playerCenterX = this.player.x + this.player.width / 2;
        const playerCenterY = this.player.y + this.player.height / 2;
        const coneLength = 220;
        const coneAngle = Math.PI / 1.2;
        const direction = this.player.facingAngle || 0;
        const rayCount = 60;

        const rays = [];

        for (let i = 0; i <= rayCount; i++) {
            const angle = direction - coneAngle / 2 + (coneAngle * i) / rayCount;
            const end = this.castRay(
                playerCenterX,
                playerCenterY,
                angle,
                coneLength
            );
            rays.push({
                x: end.x,
                y: end.y,
                angle: angle
            });
        }

        // Sort the rays by angle — helps prevent jitter
        rays.sort((a, b) => a.angle - b.angle);

        // Construct point list
        const points = [`${playerCenterX},${playerCenterY}`];
        for (const r of rays) {
            points.push(`${Math.round(r.x)},${Math.round(r.y)}`);
        }

        const cone = this.flashlightOverlay.querySelector("#flashlight-cone");
        cone.setAttribute("points", points.join(" "));
    }


    castRay(x, y, angle, maxLength) {
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);

        let closest = {x: x + dx * maxLength, y: y + dy * maxLength};
        let closestDist = maxLength;

        for (const obj of this.gameObjects) {
            if (obj.type !== "wall") continue;

            const intersections = this.getRayBoxIntersections(x, y, dx, dy, obj);

            for (const point of intersections) {
                const dist = Math.hypot(point.x - x, point.y - y);
                if (dist < closestDist) {
                    closest = point;
                    closestDist = dist;
                }
            }
        }

        return closest;
    }

    getRayBoxIntersections(rx, ry, rdx, rdy, obj) {
        const {x, y, width, height} = obj;
        const lines = [
            {x1: x, y1: y, x2: x + width, y2: y},
            {x1: x + width, y1: y, x2: x + width, y2: y + height},
            {x1: x + width, y1: y + height, x2: x, y2: y + height},
            {x1: x, y1: y + height, x2: x, y2: y},
        ];

        const points = [];
        for (const line of lines) {
            const pt = this.getLineIntersection(rx, ry, rdx, rdy, line);
            if (pt) points.push(pt);
        }

        return points;
    }


    getLineIntersection(rx, ry, rdx, rdy, line) {
        const {x1, y1, x2, y2} = line;

        const s1x = rdx;
        const s1y = rdy;
        const s2x = x2 - x1;
        const s2y = y2 - y1;

        const denom = (-s2x * s1y + s1x * s2y);
        if (denom === 0) return null;

        const s = (-s1y * (rx - x1) + s1x * (ry - y1)) / denom;
        const t = (s2x * (ry - y1) - s2y * (rx - x1)) / denom;

        if (s >= 0 && s <= 1 && t >= 0) {
            return {
                x: rx + (t * s1x),
                y: ry + (t * s1y),
            };
        }

        return null;
    }


    createMap() {
        Map1.walls.forEach((wall) => {
            this.gameObjects.push(new GameObject(wall.x, wall.y, wall.width, wall.height, "wall", this.gameContainer));
        })
        this.spatialGrid = updateSpatialGrid(this.gameObjects, this.gridSize);

    }

    setupEventListeners() {
        document.addEventListener("keydown", (e) => this.keys[e.code] = true);
        document.addEventListener("keyup", (e) => this.keys[e.code] = false);
    }


    gameLoop(time) {
        this.delta = (time - this.lastTime) / 1000;
        this.lastTime = time;

        this.player.handleMovement(this.keys, this.delta, this.spatialGrid, this.gridSize);
        this.camera.updateCamera(this.player.x, this.player.y, this.player.width, this.player.height);
        this.updateFlashlightCone();
        requestAnimationFrame((time) => this.gameLoop(time));
    }
}
