import { Map1 } from "./map.js";
import { updateSpatialGrid } from "./collision.js";
import Player from "./Player.js";
import GameObject from "./GameObject.js";
import Camera from "./Camera.js";

export default class Game {
    constructor() {
        this.gameContainer = document.getElementById("gameContainer");
        //todo need rewrite picture without border. Create little bit bigger
        this.player = new Player(100, 100, 60, 60);
        this.camera = new Camera(1.5);

        this.gameObjects = [];
        this.gridSize = 100;
        this.spatialGrid = [];
        this.keys = {};
        this.lastTime = performance.now();
        // seconds from last frame
        this.delta = 0;

        this.init();
    }

    init() {
        this.createMap()
        this.setupEventListeners();
        this.spatialGrid = updateSpatialGrid(this.gameObjects, this.gridSize);
        this.gameLoop();
    }

    createMap() {
        Map1.walls.forEach((wall) => {
            this.gameObjects.push(new GameObject(wall.x, wall.y, wall.width, wall.height, "wall", this.gameContainer));
        })
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

        requestAnimationFrame((time) => this.gameLoop(time));
    }
}
