/* eslint-env es6 */
'use strict';

import io from 'socket.io-client';
import state from "./AppStateManager.js";
import {allMaps} from "./map.js";

export const socket = io('http://localhost:8080');

let players = {};
let bonuses = {};

class SocketHandler {
    constructor() {
        this.registerSocketEvents();
    }

    registerSocketEvents() {

        socket.on('room:init', ({ players, mapId, bonuses: list, timer }) => {
            state.players = players || {};
            state.map = allMaps.find(m => m.id === mapId) || state.map;
            bonuses = {};
            (list || []).forEach(b => bonuses[b.id] = b);

            if (timer?.remainingMs != null) {
                state.timer = { serverNow: Date.now(), remainingMs: timer.remainingMs };
            }

            window.dispatchEvent(
                new CustomEvent('players:sync', { detail: { players: state.players } }
                ));

            window.dispatchEvent(
                new CustomEvent('bonus:sync',   { detail: { bonuses } }
                ));

            if (timer?.remainingMs != null) {
                window.dispatchEvent(
                    new CustomEvent('timer:update', {
                        detail: { remainingMs: timer.remainingMs, serverNow: Date.now() } }
                    ));
            }
        });

        //players
        socket.on("getPlayers", (players) => {
            state.players = players;
            console.log("getPlayers", players);
            window.dispatchEvent(
                new CustomEvent('players:sync', { detail: { players: state.players } }
                ));
        });

        socket.on("newPlayer", (player) => {
            state.players[player.id] = player;
            console.log('New player joined:', player);
            window.dispatchEvent(
                new CustomEvent('players:sync', { detail: { players: state.players } }
                ));

        });

        socket.on('playerDisconnected', (id) => {
            delete state.players[id];
            console.log('Player disconnected:', id);
            window.dispatchEvent(
                new CustomEvent('players:sync', { detail: { players: state.players } }
                ));

        });

        socket.on("playerMoved", (player) => {
            const p = state.players[player.id];
            if (!p || p.id === socket.id) return;

            p.x = player.x;
            p.y = player.y;
            p.facingAngle = player.facingAngle;
            p.isMoving = player.isMoving;
            p.flashOn = player.flashOn;
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
            state.map = map;
            console.log("map updated", mapId);
        })

        socket.on("updateSkin", (player) => {
            state.players[player.id].skinIndex = player.skinIndex;
        })

        socket.on("updateReadyStatus", (player) => {
            state.players[player.id].readyStatus = player.readyStatus;
            console.log("update ready status:", player);
        })


        socket.on("startGame", (data) => {
            console.log("start game", data);

            if (data) {
                state.players = data;
                console.log("player players", state.players);
                console.log("start game with data", data);
            }

            state.gameStatus = "started";
            window.dispatchEvent(
                new CustomEvent('players:sync', { detail: { players: state.players } }
                ));
        })

        socket.on("error", (err) => {
            state.error = err;
            console.log(err);
        })

        socket.on("playerCaught", (playerId) => {
            const player = state.players[playerId];
            if (!player) return;
            player.isCaught = true;
        });

        //timer/pause/resume

        socket.on('timer:update', ({ serverNow, remainingMs }) => {
            state.timer = { serverNow, remainingMs };
            window.dispatchEvent(
                new CustomEvent('timer:update', { detail: { remainingMs, serverNow }}
            ));
        });

        socket.on('timer:adjust', ({ pickupTimeBonus, newRemainingMs }) => {
            //todo for screen
        /*    window.dispatchEvent(
                new CustomEvent('timer:adjust', { detail: { pickupTimeBonus, newRemainingMs }}
                ));*/
        });

        socket.on('dashboard:action', ({ by, action }) => {
            state.isPaused = action === 'pause';
            window.dispatchEvent(
                new CustomEvent('hud:banner', { detail: { by, action } }
                ));
        });

        socket.on('game:ended', ({ reason }) => {
            window.dispatchEvent(
                new CustomEvent('hud:gameover', { detail: { reason }}
                ));
            state.gameStatus = 'ended';
        });
    }

    onHostJoinResponse(data) {
        state.skinIndex = data.player.skinIndex;
        state.setGameId(data.gameId);
        history.pushState({}, "", data.gameId);
    }
}

const sock = new SocketHandler();
export default sock;

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
export function sendPlayerMove(x, y, facingAngle = 0, isMoving = false, flashOn=true) {
    socket.emit('move', { x, y, facingAngle, isMoving, flashOn });
}
export function pickupBonus(bonusId, px, py){
    socket.emit('bonus:pickup', {bonusId, px, py})
}

export function getPlayers() {
    socket.emit("getPlayers");
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

export function isHost() {
    const me = state.players[socket.id];
    return Boolean(me && me.isHost);
}

export function hostPauseGame()  {
    socket.emit('game:pause');
}
export function hostResumeGame() {
    socket.emit('game:resume');
}

export function isPaused() {
    console.log("state.isPaused",state.isPaused)
    return !!state.isPaused;
}
