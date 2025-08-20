import {Map1} from "./map.js";
import {updateSpatialGrid} from "./collision.js";
import Player from "./Player.js";
import GameObject from "./GameObject.js";
import {getPlayers, getMyId, sendPlayerMove, pickupBonus} from "./multiplayer.js";
import Camera from "./Camera.js";
import Flashlight from "./flashlight.js";
import BonusBox from "./BonusBox.js";

export default class Game {
    constructor() {
        this.gameContainer = document.getElementById("gameContainer");
        this.player = new Player(100, 100, 32, 48, this.gameContainer);
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

        window.addEventListener('bonus:sync', (e) => {
            this.rebuildBonuses(e.detail.bonuses);
        });
        window.addEventListener('bonus:spawn', (e) => {
            this.createBonusFromServer(e.detail);
        });
        window.addEventListener('bonus:remove', (e) => {
            this.removeBonusById(e.detail.id);
        });


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
        }}

    init() {
        this.createMap()
        this.setupEventListeners();
        this.spatialGrid = updateSpatialGrid(this.gameObjects, this.gridSize);

        this.gameLoop(performance.now());
    }

    rebuildBonuses(map) {
        console.log('[bonus] sync', map);
        this.gameObjects = this.gameObjects.filter(o => {
            if (o.type === 'bonus') { o.remove?.(); return false; }
            return true;
        });
        Object.values(map).forEach(b => this.createBonusFromServer(b));
    }

    createBonusFromServer(b) {
        console.log('[bonus] spawn', b)
        const bonus = new BonusBox(b.x, b.y, b.size, b.type, this.gameContainer, b.id);
        this.gameObjects.push(bonus);
    }

    removeBonusById(id) {
        console.log('[bonus] remove', id);
        this.gameObjects = this.gameObjects.filter(o => {
            if (o.type === 'bonus' && o.id === id) { o.remove?.(); return false; }
            return true;
        });
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

        this.handleBonusPickup();

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

            let otherPlayer = this.gameObjects.find(obj => obj.type === 'player' && obj.id==id);
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

            if(!overlap) continue;

            if (obj.__claimed) continue;

            obj.activate(this.player, this);

            obj.__claimed = true;

            if (obj.element && obj.element.isConnected) {
                obj.element.remove();
            }
            if (obj.id) {
                console.log('[bonus] pickup request', obj.id);
                pickupBonus(obj.id, p.x + p.width / 2, p.y + p.height / 2);
            }
        }
    }

}
