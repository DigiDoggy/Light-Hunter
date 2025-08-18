import {Map1} from "./map.js";
import {updateSpatialGrid} from "./collision.js";
import Player from "./Player.js";
import GameObject from "./GameObject.js";
import {getPlayers, getMyId, sendPlayerMove} from "./multiplayer.js";
import Camera from "./Camera.js";
import Flashlight from "./flashlight.js";
import BonusBox from "./BonusBox.js";

export default class Game {
    constructor() {
        this.gameContainer = document.getElementById("gameContainer");
        this.player = new Player(100, 100, 32, 48);
        this.player.setRole('seeker')
        this.player.setCharacterIndex(5)
        this.npc = new GameObject(300, 300, 20, 20, "npc", this.gameContainer);
        this.camera = new Camera(0.1);
        this.flash = new Flashlight();
        this.gameObjects = [];
        this.gameObjects.push(this.npc);
        this.gridSize = 32;
        this.spatialGrid = [];
        this.keys = {};
        this.lastTime = performance.now();

        //for Bonus Box timing
        this.spawnEverySec = 5;
        this._spawnElapsed = 0;

        this.gameContainer.appendChild(this.flash.flashlightOverlay);


        this.init();
    }
    setDarkness(enabled) {
        const overlay = this.flash?.flashlightOverlay;
        if (!this.gameContainer || !overlay) return;

        if (enabled) {
            if (!overlay.isConnected) {
                this.gameContainer.appendChild(overlay);
            }
        } else {
            if (overlay.isConnected) {
                overlay.remove();
            }
        }
        this.darkness = !!enabled;
    }

    init() {
        this.createMap()
        this.setupEventListeners();
        this.spatialGrid = updateSpatialGrid(this.gameObjects, this.gridSize);

        this.gameLoop(5);
    }

    spawnBonus(gameObjects, gameContainer) {
        const size = 28;
        const radiusMin = 120;
        const radiusMax = 300;
        const attempts  = 20;

        //player center
        const px = this.player.x + this.player.width / 2;
        const py = this.player.y + this.player.height / 2;

        const maxX = this.gameContainer.clientWidth  - size;
        const maxY = this.gameContainer.clientHeight - size;

        const isColliding = (x, y) => {
            const rect = { x, y, width: size, height: size };

            const hitWall = Map1.walls.some(wall =>
                !(rect.x + rect.width  <= wall.x ||
                    wall.x + wall.width  <= rect.x ||
                    rect.y + rect.height <= wall.y ||
                    wall.y + wall.height <= rect.y)
            );
            if (hitWall) return true;

            const hitBonus = this.gameObjects.some(o =>
                o.type === 'bonus' &&
                rect.x < o.x + o.width &&
                rect.x + rect.width > o.x &&
                rect.y < o.y + o.height &&
                rect.y + rect.height > o.y
            );
            if (hitBonus) return true;

            // don't spawn in the player place
            const pb = this.player.bounds;
            const hitPlayer =
                rect.x < pb.x + pb.width &&
                rect.x + rect.width > pb.x &&
                rect.y < pb.y + pb.height &&
                rect.y + rect.height > pb.y;

            return hitPlayer;
        };

        let x, y, ok = false;

        for (let i = 0; i < attempts; i++) {
            const dist = radiusMin + Math.random() * (radiusMax - radiusMin);
            const ang  = Math.random() * Math.PI * 2;

            // place over the player
            x = Math.round(px + Math.cos(ang) * dist - size / 2);
            y = Math.round(py + Math.sin(ang) * dist - size / 2);

            x = Math.max(0, Math.min(maxX, x));
            y = Math.max(0, Math.min(maxY, y));

            if (!isColliding(x, y)) { ok = true; break; }
        }

        if (!ok) return; // if don't have place for spawn just chancel spawn


        const types = ["speed","vision","timeShift"]
        const type  = types[(Math.random() * types.length) | 0];

        const bonus = new BonusBox(x, y, size, type, gameContainer);
        gameObjects.push(bonus);
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
        if (!Number.isFinite(this.delta) || this.delta < 0 || this.delta > 1){
            this.delta = 0;
        }

        this.lastTime = time;

        // Handle player movement and send updates to the server
        this.player.handleMovement(this.keys, this.delta, this.spatialGrid, this.gridSize);
        sendPlayerMove(this.player.x, this.player.y, this.player.facingAngle, this.player.element.style.width, this.player.element.style.height, this.player.element.style.backgroundPosition);

        this.handleBonusPickup()
        this.updateBonusSpawn(this.delta);

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
                otherPlayer = new GameObject(playerData.x, playerData.y, 20, 20, "player", this.gameContainer);
                otherPlayer.id = id;
                this.gameObjects.push(otherPlayer);
            } else {
                otherPlayer.x = playerData.x;
                otherPlayer.y = playerData.y;
                otherPlayer.facingAngle = playerData.facingAngle || 0;
                otherPlayer.backgroundPosition = playerData.backgroundPosition;
                otherPlayer.updatePosition();
                otherPlayer.updateSkinFrame(otherPlayer.getDirectionFromAngle(), 1);
            }
        }

        this.gameObjects = this.gameObjects.filter(obj => {
            if (obj.type === "player" && !players[obj.id]) {
                obj.element.remove();
                return false;
            }
            return true;
        });
    }

    handleBonusPickup() {
        const p = this.player;
        const pb = p.bounds;

        for (let i = this.gameObjects.length - 1; i >= 0; i--) {
            const obj = this.gameObjects[i];
            if (obj.type !== 'bonus') continue;

            const bb = obj.bounds;

            const overlap =
                pb.x < bb.x + bb.width &&
                pb.x + pb.width > bb.x &&
                pb.y < bb.y + bb.height &&
                pb.y + pb.height > bb.y;

            const cx = bb.x + bb.width / 2;
            const cy = bb.y + bb.height / 2;
            const centerInside =
                cx >= pb.x && cx <= pb.x + pb.width &&
                cy >= pb.y && cy <= pb.y + pb.height;

            if (overlap || centerInside) {
                obj.activate(this.player, this);

                obj.remove?.();
                this.gameObjects.splice(i, 1);
            }
        }
    }

    updateBonusSpawn(delta) {
        this._spawnElapsed += delta;
        if (this._spawnElapsed >= this.spawnEverySec) {
            const times = Math.floor(this._spawnElapsed / this.spawnEverySec);
            for (let i = 0; i < times; i++) {
                this.spawnBonus(this.gameObjects, this.gameContainer);
                console.log("Bonus Box spawn")
            }
            this._spawnElapsed %= this.spawnEverySec;
        }
    }
}
