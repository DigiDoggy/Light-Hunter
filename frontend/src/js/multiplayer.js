/* eslint-env es6 */
'use strict';

import io from 'socket.io-client';
import {allMaps} from "./map.js";

export const socket = io('http://localhost:8080');

let players = {};
let bonuses = {};
export class SocketHandler {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.socket = socket;

        this.registerSocketEvents();
    }

    registerSocketEvents() {
        socket.on("getPlayers", (players) => {
            this.stateManager.players = players;
            console.log("getPlayers", players);
        });

        socket.on("newPlayer", (player) => {
            this.stateManager.players[player.id] = player;
            console.log('New player joined:', player);
        });

        socket.on('playerDisconnected', (id) => {
            delete this.stateManager.players[id];
            console.log('Player disconnected:', id);
        });

        socket.on("playerMoved", (player) => {
            const p = this.stateManager.players[player.id];
            if (!p || p.id === socket.id) return;

            p.x = player.x;
            p.y = player.y;
            p.facingAngle = player.facingAngle;
            p.isMoving = player.isMoving;
        });

        socket.on("hostGame", (data) => {
            this.onHostJoinResponse(data);
        })

        socket.on("joinGame", (data) => {
            this.onHostJoinResponse(data);
        })

        socket.on("updateMap", (mapId) => {
            const map = allMaps.find(map => map.id === mapId);
            if (!map) {
                console.error(`Map with with id:${mapId} not found`);
                return;
            }
            this.stateManager.map = map;
            console.log("map updated", mapId);
        })

        socket.on("updateSkin", (player) => {
            this.stateManager.players[player.id].skinIndex = player.skinIndex;
        })

        socket.on("updateReadyStatus", (player) => {
            this.stateManager.players[player.id].readyStatus = player.readyStatus;
            console.log("update ready status:", player);
        })


        socket.on("startGame", (data) => {
            console.log("start game", data);

            if (data) {
                this.stateManager.players = data;
                console.log("player players", this.stateManager.players);
                console.log("start game with data", data);


            }

            this.stateManager.gameStatus = "started";



            console.log("start game", this.stateManager.players);
        })

        socket.on("error", (err) => {
            this.stateManager.error = err;
            console.log(err);
        })
    }

    onHostJoinResponse(data) {
        this.stateManager.skinIndex = data.player.skinIndex;
        this.stateManager.setGameId(data.gameId);
        history.pushState({}, "", data.gameId);
    }
}

//Sockets for bonus
socket.on('bonus:list', (list)=>{
    bonuses={};
    list.forEach(b=> bonuses[b.id]= b)
    window.dispatchEvent(new CustomEvent('bonus:sync', {detail:{bonuses}}))
});

socket.on('bonus:spawn', (b)=>{
    bonuses[b.id]=b;
    window.dispatchEvent(new CustomEvent('bonus:spawn', {detail:b}))
});

socket.on('bonus:remove', (id)=>{
    delete bonuses[id];
    window.dispatchEvent(new CustomEvent('bonus:remove', {detail:id}))
});

socket.on('bonus:picked', ({by, bonusId})=>{
    delete bonuses[bonusId];
    window.dispatchEvent(new CustomEvent('bonus:picked', {detail:{id:bonusId, by}}));
});

// Multiplayer utility functions
export function sendPlayerMove(x, y, facingAngle = 0,width = 20, height = 20, backgroundPosition = "0 0") {
    socket.emit('move', { x, y, facingAngle, width, height, backgroundPosition });
}
export function pickupBonus(bonusId, px, py){
    socket.emit('bonus:pickup', {bonusId, px, py})
}

export function getPlayers() {
    return players;
}
export function getBonuses() {
    return bonuses;
}

export function getMyId() {
    return socket.id;
}

export function hostGame(username) {
    socket.emit("hostGame", { username });
}

export function updateReadyStatus(status) {
    socket.emit("updateReadyStatus", status);
}

export function updateSkin(skinIndex) {
    socket.emit("updateSkin", skinIndex);
}

export function joinGame(gameId, username) {
    socket.emit("joinGame", { gameId, username });
}

export function updateMap(mapId) {
    socket.emit("updateMap", mapId)
}

