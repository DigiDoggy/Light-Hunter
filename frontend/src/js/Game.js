import {Map1} from "./map.js";
import {updateSpatialGrid} from "./collision.js";
import Player from "./Player.js";
import GameObject from "./GameObject.js";
import {getPlayers, getMyId, sendPlayerMove} from "./multiplayer.js";
import Camera from "./Camera.js";
import Flashlight from "./Flashlight.js";
import "../css/game.css"
import State from "./State.js";

export default class Game extends State {
    constructor(stateManager, rootContainer, socket) {
        super(stateManager, rootContainer, socket);
        this.setupContainer("gameContainer", "game-container");
        this.player = new Player(100, 100, 32, 48);
        this.player.setCharacterIndex(this.stateManager.skinIndex)
        this.npc = new GameObject(300, 300, 20, 20, "npc", this.container);
        this.camera = new Camera(0.1);
        this.flash = new Flashlight();
        this.gameObjects = [];
        this.gameObjects.push(this.npc);
        this.gridSize = 100;
        this.spatialGrid = [];
        this.keys = {};
        this.lastTime = performance.now();


        this.container.appendChild(this.flash.flashlightOverlay);

    }

    init() {
        this.createMap()
        this.setupEventListeners();
        this.spatialGrid = updateSpatialGrid(this.gameObjects, this.gridSize);
        this.gameLoop();
    }




    castRay(x, y, angle, maxLength) {
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);

        let closest = {x: x + dx * maxLength, y: y + dy * maxLength};
        let closestDist = maxLength;
        let closestType = null;

        for (const obj of this.gameObjects) {
            if (obj.type !== "wall" && obj.type !== "npc") continue;

            const intersections = this.getRayBoxIntersections(x, y, dx, dy, obj);

            for (const point of intersections) {
                const dist = Math.hypot(point.x - x, point.y - y);
                if (dist < closestDist) {
                    closest = point;
                    closestDist = dist;
                    closestType = obj.type;
                }
            }
        }
        const npcThreshold = 150; // adjust as needed

        if (closestType === "npc" && closestDist <= npcThreshold) {
            alert('npc caught');

            console.log('npc caught');
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
            this.gameObjects.push(new GameObject(wall.x, wall.y, wall.width, wall.height, "wall", this.container));
        })
        this.spatialGrid = updateSpatialGrid(this.gameObjects, this.gridSize);

    }

    setupEventListeners() {
        document.addEventListener("keydown", (e) => this.keys[e.code] = true);
        document.addEventListener("keyup", (e) => this.keys[e.code] = false);

        document.addEventListener("keydown", (e) => {
            if (e.code === "Escape") {
                this.stateManager.switchState("lobby")
            }
        })
    }


    gameLoop(time) {
        this.delta = (time - this.lastTime) / 1000;
        this.lastTime = time;

        // Handle player movement and send updates to the server
        this.player.handleMovement(this.keys, this.delta, this.spatialGrid, this.gridSize);
        sendPlayerMove(this.player.x, this.player.y);

        // Update other players from the server
        const players = getPlayers();
        this.updateOtherPlayers(players);

        this.camera.updateCamera(this.player.x, this.player.y, this.player.width, this.player.height);
        this.updateFlashlightCone();
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    updateFlashlightCone() {
        this.flash.clearCones();

        const addConeForPlayer = (centerX, centerY, direction) => {
            const coneLength = 220;
            const coneAngle = Math.PI / 1.2;
            const rayCount = 60;
            const rays = [];
            for (let i = 0; i <= rayCount; i++) {
                const angle = direction - coneAngle / 2 + (coneAngle * i) / rayCount;
                const end = this.castRay(centerX, centerY, angle, coneLength);
                rays.push({ x: end.x, y: end.y, angle: angle });
            }
            rays.sort((a, b) => a.angle - b.angle);
            const points = [`${centerX},${centerY}`];
            for (const r of rays) {
                points.push(`${Math.round(r.x)},${Math.round(r.y)}`);
            }
            this.flash.addCone(points.join(" "));
        };

        const playerCenterX = this.player.x + this.player.width / 2;
        const playerCenterY = this.player.y + this.player.height / 2;
        addConeForPlayer(playerCenterX, playerCenterY, this.player.facingAngle || 0);

        const players = getPlayers();
        for (const id in players) {
            if (id === getMyId()) continue;
            const p = players[id];
            const centerX = p.x + 10;
            const centerY = p.y + 10;
            addConeForPlayer(centerX, centerY, p.facingAngle || 0);
        }
    }


    updateOtherPlayers(players) {
        for (const id in players) {
            if (id === getMyId()) continue;
            const playerData = players[id];

            let otherPlayer = this.gameObjects.find(obj => obj.id === id);
            if (!otherPlayer) {
                otherPlayer = new GameObject(playerData.x, playerData.y, 20, 20, "player", this.container);
                otherPlayer.id = id;
                this.gameObjects.push(otherPlayer);
            } else {
                otherPlayer.x = playerData.x;
                otherPlayer.y = playerData.y;
                otherPlayer.facingAngle = playerData.facingAngle || 0;
                otherPlayer.updatePosition();
            }
        }

        this.gameObjects = this.gameObjects.filter(obj => {
            if (obj.type === "player" && !players[obj.id]) {
                obj.remove();
                return false;
            }
            return true;
        });
    }

    cleanup() {
        this.rootContainer.innerHTML = "";
    }
}
