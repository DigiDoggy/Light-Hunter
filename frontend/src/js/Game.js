import state from "./AppStateManager.js";
import {Map1} from "./map.js";
import {updateSpatialGrid} from "./collision.js";
import Player from "./Player.js";
import GameObject from "./GameObject.js";
import {
    getPlayers,
    getMyId,
    sendPlayerMove,
    pickupBonus,
    isPaused,
    resumeGame,
    hostPauseGame, isHost, playerCaught
} from "./multiplayer.js";
import Camera from "./Camera.js";
import Flashlight from "./Flashlight.js";
import "../css/game.css"
import State from "./State.js";
import BonusBox from "./BonusBox.js";
import audio from "./AudioManager.js";
import HUD from "./Hud.js";

export default class Game extends State {
    constructor() {
        super();
        this.setupContainer("gameContainer", "game-container");
        this.player = new Player({isLocal: true});
        this.player.setCharacterIndex(state.skinIndex)
        this.camera = new Camera(0.1);
        this.flash = new Flashlight();

        this.gameObjects = [];
        this.gridSize = 32;
        this.spatialGrid = [];
        this.keys = {};
        this.lastTime = performance.now();
        this.status='running'
        this.hud = new HUD(this.gameContainer, this);

        //for Bonus Box timing
        this._spawnElapsed = 0;

        this.container.appendChild(this.flash.flashlightOverlay);

        this.addEventListener(window, 'hud:toast', (e) => {
            this.hud.showToast(e.detail || {});
        });

        this.addEventListener(window, 'bonus:picked', (e) => {
            const { id, by, type } = e.detail || {};
            this.removeBonusById(id);

            if (by === getMyId()) {
                audio.playSound('bonus');
            }
        });

        this.addEventListener(window, 'player:buff', (e) => {
            const { playerId, type, durationMs } = e.detail || {};
            if (playerId !== getMyId()) return;

            const def = BonusBox.defs?.[type];
            if (!def) return;

            const player = this.player;
            player.effects ??= {};
            const prev = player.effects[type];

            if (prev) {
                clearTimeout(prev.timer);
                prev.timer = setTimeout(() => {
                    def.revert?.(player, this);
                    delete player.effects[type];
                }, durationMs);
                return;
            }

            def.apply?.(player, this);

            if (def.revert && durationMs > 0) {
                const timer = setTimeout(() => {
                    def.revert?.(player, this);
                    delete player.effects[type];
                }, durationMs);
                player.effects[type] = { timer, revert: def.revert };
            }
        });


        this.addEventListener(window, 'bonus:sync', (e) => {
            this.rebuildBonuses(e.detail.bonuses);
        });
        this.addEventListener(window, 'bonus:spawn', (e) => {
            this.createBonusFromServer(e.detail);
        });
        this.addEventListener(window, 'bonus:remove', (e) => {
            this.removeBonusById(e.detail.id);
        });
        this.addEventListener(window, 'hud:banner', (e) => {
            const { action, byName } = e.detail || {};
            if (action === 'pause')  {
                this.setStatus('paused');
                this.hud.showCenterMessage('Paused', byName ? `Paused by: ${byName}` : '', 0);
            }
            if (action === 'resume') {
                this.setStatus('running');
                this.hud.showCenterMessage('Resumed', byName ? `Resumed by: ${byName}` : '', 1500);
            }
        });

        this.hud.setSeeker(this._findSeekerNick(state.players));
        if (state.timer?.remainingMs != null) {
            this.hud.setTimer(state.timer.remainingMs);
        }
        this.hud.setHiders(this._collectHiders(state.players));

        this.addEventListener(window, 'players:sync', (e) => {
            const players = e.detail.players;
            this.hud.setSeeker(this._findSeekerNick(players));
            this.hud.setHiders(this._collectHiders(players));
        });

        this.addEventListener(window, 'timer:update', (e) => {
            const { remainingMs } = e.detail;
            this.hud.setTimer(remainingMs);
        });
    }
    _findSeekerNick(players = {}) {
        const seeker = Object.values(players).find(p => p.role === 'seeker');
        return seeker.username || '';
    }
    _collectHiders(players = {}) {
        return Object.values(players)
            .filter(p => p.role === "hider")
            .map(p => p.username);
    }


    setStatus(newStatus) {
        this.status = newStatus;
        console.log("GAME STATUS", this.status);

        if (newStatus === "paused" || newStatus === "ended") {
            this.keys = {};
            if (this.player) {
                this.player.canControl = false;
                this.player.isMoving = false;
                this.player.vx = 0; this.player.vy = 0;
                this.player.updatePosition?.();
            }
            Object.values(state.players).forEach((p) => p.isMoving = false);
        } else if (newStatus === "running") {
            if (this.player) {
                this.player.canControl = true;
            }
        }
    }

    wasCaught(){
        this.player.type='spectator';
        this.player.element.classList.add('spectator');
        if (!Object.values(state.players).some(player => player.isCaught)) {
            this.hud.showCenterMessage('You were caught!', 'You are now a spectator.', 0);
        }
        audio.playSound('caught');
    }

    setDarkness(enabled) {
        const overlay = this.flash?.flashlightOverlay;
        if (!this.container || !overlay) return;

        if (enabled) {
            if (!overlay.isConnected) {
                this.container.appendChild(overlay);
            }
        } else {
            if (overlay.isConnected) {
                overlay.remove();
            }
        }}

    init() {
        audio.playSound("gameMusic");
        this.player.id = getMyId();
        this.setPlayerPosition(state.players[getMyId()].x, state.players[getMyId()].y);
        this.createMap()
        this.setupEventListeners();
        this.registerSocketHandlers();
        this.setupPauseHotkey();
        this.spatialGrid = updateSpatialGrid(this.gameObjects, this.gridSize);
        this.player.role = state.players[getMyId()].role;
        this.gameObjects.push(this.player);
        this.gameLoop(5);
    }

    registerSocketHandlers() {
        const handlers = {
            "dashboard:action": (data) => {
                const { action } = data;
                switch (action) {
                    case "pause":
                        this.hud.controls(state.isHost, "pause");
                        break;
                    case "resume":
                        this.hud.controls(state.isHost, "resume");
                }
            },
            "game:ended": (data) => {
                const { reason } = data;
                if (reason === "manual") return;
                this.setStatus("ended");
                if (reason === "seekerWon") {
                    const message = this.player.role === "seeker" ? "Congratulations" : "Game over";
                    this.hud.showCenterMessage(message, "Seeker wins", 0);
                } else if (reason === "timeUp") {
                    const message = this.player.role === "hider" ? "Congratulations" : "Game over";
                    this.hud.showCenterMessage(message, "Hiders win", 0);
                }
                this.hud.controls(state.isHost, "end");
            },
            "startGame": () => {
                state.switchState("game");
            },
        }

        Object.entries(handlers).forEach(([event, handler]) => this.onSocket(event, handler));
    }

    setPlayerPosition(x, y) {
        this.player.x = x;
        this.player.y = y;
        this.player.updatePosition();
    }

    rebuildBonuses(map) {
        console.log('[bonus] sync', map);
        this.gameObjects = this.gameObjects.filter(o => {
            if (o.type === 'bonus') { o.remove?.(); return false; }
            return true;
        });
        Object.values(map).forEach(b => this.createBonusFromServer(b));
    }

    setupPauseHotkey() {
        let lastToggleAt = 0;

        this.addEventListener(document,'keydown', (e) => {
            if (e.code !== 'Space' || e.repeat) return;
            e.preventDefault();

            const now = performance.now();
            if (now - lastToggleAt < 250) return;
            lastToggleAt = now;


            if (isPaused()){
                resumeGame();
            }else{
                hostPauseGame();
            }
        });
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

    castRay(x, y, angle, maxLength, role, selfid) {
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);

        let closest = {x: x + dx * maxLength, y: y + dy * maxLength};
        let closestDist = maxLength;
        let closestType = null;

        for (const obj of this.gameObjects) {
            if (obj.type !== "wall" && obj.type !== 'player') continue;
            if (selfid && obj.id === selfid) continue;

            const intersections = this.getRayBoxIntersections(x, y, dx, dy, obj);

            for (const point of intersections) {
                const dist = Math.hypot(point.x - x, point.y - y);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestType = obj.type;
                    const npcThreshold = 150;
                    if (closestType === 'player' && role ==='seeker' && closestDist <= npcThreshold) {
                        playerCaught(obj.id);
                    }
                    closest = point;


                }
            }
        }
        return closest;
    }

    getRayBoxIntersections(rx, ry, rdx, rdy, obj) {
        const { x, y, width, height } = obj;
        const lines = [
            { x1: x, y1: y, x2: x + width, y2: y },
            { x1: x + width, y1: y, x2: x + width, y2: y + height },
            { x1: x + width, y1: y + height, x2: x, y2: y + height },
            { x1: x, y1: y + height, x2: x, y2: y },
        ];

        const points = [];
        for (const line of lines) {
            const pt = this.getLineIntersection(rx, ry, rdx, rdy, line);
            if (pt) {
                points.push(pt);
            }
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
            this.gameObjects.push(new GameObject({x: wall.x, y: wall.y, width: wall.width, height: wall.height, type: "wall", gameContainer: this.container}));
        })
        this.spatialGrid = updateSpatialGrid(this.gameObjects, this.gridSize);

    }

    setupEventListeners() {
        this.addEventListener(document,"keydown", (e) => this.keys[e.code] = true);
        this.addEventListener(document,"keyup", (e) => this.keys[e.code] = false);

        this.addEventListener(document,"keydown", (e) => {
            if (e.code === "Escape") {
                state.switchState("lobby")
            }
            if (e.code === "ControlLeft") {
                this.player.flashOn = !this.player.flashOn;
            }
        })
    }


    gameLoop(time) {
        if (state.gameStatus === 'ended') this.player.isMoving = false;



        this.delta = (time - this.lastTime) / 1000;
        if (!Number.isFinite(this.delta) || this.delta < 0 || this.delta > 1){
            this.delta = 0;
        }

        this.lastTime = time;

        // Handle player movement and send updates to the server

        if(this.status==='running'){
            this.player.handleMovement(this.keys, this.delta, this.spatialGrid, this.gridSize);
            sendPlayerMove(this.player.x, this.player.y, this.player.facingAngle, this.player.isMoving, this.player.flashOn);

            this.handleBonusPickup();
        }else{
            this.player.isMoving = false;
            this.player.vx = 0; this.player.vy = 0;
        }


        // Update other players from the server
        const players = state.players;
        this.updateOtherPlayers(players, state.gameStatus);

        this.camera.updateCamera(this.player.x, this.player.y, this.player.width, this.player.height);

        if (this.player.type === "spectator") {
            this.flash.flashlightOverlay.style.opacity=0;
            this.player.flashOn = false;
        }
        else {
            if (players[getMyId()].isCaught)
            {
                this.wasCaught();
            }

        }
        this.updateFlashlightCone();

        audio.updatePosition(this.player.x, this.player.y);

        this.requestAnimationFrame((time) => this.gameLoop(time));
    }

    updateFlashlightCone() {
        this.flash.clearCones();

        const addConeForPlayer = (centerX, centerY, direction, role,selfid) => {
            const coneLength = 220;
            const coneDivisor = role === "hider" ? 2 : 0.5;
            const coneAngle = Math.PI / coneDivisor;
            const rayCount = 60;
            const rays = [];
            for (let i = 0; i <= rayCount; i++) {
                const angle = direction - coneAngle / 2 + (coneAngle * i) / rayCount;
                const end = this.castRay(centerX, centerY, angle, coneLength, role, selfid);
                rays.push({ x: end.x, y: end.y, angle: angle });
            }
            rays.sort((a, b) => a.angle - b.angle);
            const points = [`${centerX},${centerY}`];
            for (const r of rays) {
                points.push(`${Math.round(r.x)},${Math.round(r.y)}`);
            }
            this.flash.addCone(points.join(" "));
        };
        if (this.player.flashOn) {
            const playerCenterX = this.player.x + this.player.width / 2;
            const playerCenterY = this.player.y + this.player.height / 2;
            addConeForPlayer(playerCenterX, playerCenterY, this.player.facingAngle || 0, this.player.role, this.player.id);
        }
        const players = state.players;
        for (const id in players) {
            if (id === getMyId()) continue;
            const p = players[id];
            if (!p.flashOn) continue;
            const centerX = p.x + this.player.width / 2;
            const centerY = p.y + this.player.height / 2;
            addConeForPlayer(centerX, centerY, p.facingAngle || 0, p.role, p.id);
        }
    }


    updateOtherPlayers(players, status) {
        for (const id in players) {
            if (id === getMyId()) continue;
            const playerData = players[id];

            let otherPlayer = this.gameObjects.find(obj => obj.id === id);
            if (!otherPlayer) {
                console.log("Creating new player object for", playerData);
                otherPlayer = new Player({
                    x: playerData.x, y: playerData.y, width: 32, height: 48, username: playerData.username,
                    container: this.container, characterIndex: playerData.skinIndex, role: playerData.role});
                otherPlayer.id = id;
                this.gameObjects.push(otherPlayer);
            } else {
                otherPlayer.isCaught = playerData.isCaught;
                if (otherPlayer.isCaught)
                {
                    otherPlayer.type='spectator';
                    otherPlayer.element.classList.add('spectator');
                }

                otherPlayer.x = playerData.x;
                otherPlayer.y = playerData.y;
                otherPlayer.facingAngle = playerData.facingAngle || 0;
                otherPlayer.isMoving = status === 'ended' ? false : playerData.isMoving ;
                otherPlayer.updatePosition();
                otherPlayer.animate(this.delta, undefined, otherPlayer.getDirectionFromAngle(), this.player.bounds);
                otherPlayer.playAudio();
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
            if (p.type === 'spectator') continue;

            console.log('Picking up bonus', obj);

            // obj.activate(this.player, this);

            obj.__claimed = true;

            // if (obj.element && obj.element.isConnected) {
            // obj.element.remove();
            // }
            if (obj.id) {
              console.log('[bonus] pickup request', obj.id);
              pickupBonus(obj.id, p.x + p.width / 2, p.y + p.height / 2);
            }

        }
    }

    onCleanup() {
        audio.stopAllSounds();
        document.body.removeChild(document.querySelector(".hud"))
        const overlay = this.flash?.flashlightOverlay;
         if (overlay?.isConnected) overlay.remove();

        this.gameObjects?.forEach(o => o.remove?.());
        this.gameObjects = [];

    }
}
