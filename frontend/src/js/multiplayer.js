/* eslint-env es6 */
'use strict';

import io from 'socket.io-client';
import state from "./AppStateManager.js";
import {allMaps} from "./map.js";

export const socket = io();

let bonuses = {};

class SocketHandler {
    constructor() {
        this.registerSocketEvents();
    }

    registerSocketEvents() {

        socket.on('room:init', ({ players, mapId, bonuses: list, timer, paused}) => {
            state.players = players || {};
            state.map = allMaps.find(m => m.id === mapId) || state.map;
            bonuses = {};
            (list || []).forEach(b => bonuses[b.id] = b);
            state.isPaused = !!paused;

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
            if (paused){
                window.dispatchEvent(new CustomEvent('hud:banner', { detail: { action: 'pause' } }));
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

        socket.on('playerDisconnected', (payload) => {
            const { id, username } = (typeof payload === 'string')
                ? { id: payload, username: state.players?.[payload]?.username }
                : payload;

            window.dispatchEvent(new CustomEvent('hud:toast', {
                detail: { title: 'Player left', text: username || id, tone: 'neutral', ttl: 2500 }
            }));

            delete state.players[id];
            window.dispatchEvent(new CustomEvent('players:sync', { detail: { players: state.players } }));
        });

        socket.on("playerMoved", (player) => {
            const p = state.players[player.id];
            if (!p || p.id === socket.id) return;

            p.x = player.x;
            p.y = player.y;
            p.facingAngle = player.facingAngle;
            p.isMoving = player.isMoving;
            p.flashOn = player.flashOn;
            p.isCaught = player.isCaught;
        });

        socket.on("hostGame", (data) => {
            this.onHostJoinResponse(data);
            if (data.gameKey) {
                state.gameKey=data.gameKey;
                console.log('Single-game key:', data.gameKey);
            }
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
            if (player.id === socket.id) state.readyStatus = player.readyStatus;
            state.players[player.id].readyStatus = player.readyStatus;
            console.log("update ready status:", player);
        })


        socket.on('startGame', (data) => {
            if (data) state.players = data;
            state.gameStatus = 'started';
            window.dispatchEvent(new CustomEvent('players:sync', { detail: { players: state.players } }));

            const seeker = Object.values(state.players || {}).find(p => p.role === 'seeker');
            window.dispatchEvent(new CustomEvent('hud:toast', {
                detail: { title: 'Match started!', text: `Seeker: ${seeker?.username || '—'}`, tone: 'info', ttl: 2500 }
            }));
        });

        socket.on('game:ended', ({ reason }) => {
            state.gameStatus = 'ended';

            console.log("game:ended", reason);
            if (reason === "manual") {
                console.log("manual")
                state.reset();
                state.switchState("lobby");
                return;
            }

            window.dispatchEvent(new CustomEvent('hud:gameover', { detail: { reason } }));
            window.dispatchEvent(new CustomEvent('hud:toast', {
                detail: { title: 'Match ended', text: reason || '', tone: 'neutral', ttl: 3000 }
            }));
            state.reset();
        });

        socket.on("error", (err) => {
            state.error = err;
            console.log(err);
        })

        socket.on("playerCaught", (playerId) => {
            const player = state.players[playerId];
            if (!player) return;
            player.isCaught = true;
            player.type = 'spectator'
        });

        //timer/pause/resume

        socket.on('timer:update', ({ serverNow, remainingMs }) => {
            state.timer = { serverNow, remainingMs };
            window.dispatchEvent(
                new CustomEvent('timer:update', { detail: { remainingMs, serverNow }}
            ));
        });

        socket.on('timer:adjust', ({ pickupTimeBonus, newRemainingMs }) => {
            if (typeof pickupTimeBonus === 'number' && pickupTimeBonus !== 0) {
                const sign = pickupTimeBonus > 0 ? '+' : '−';
                window.dispatchEvent(new CustomEvent('hud:toast', {
                    detail: {
                        title: 'Timer',
                        text: `${sign}${Math.abs(pickupTimeBonus/1000)}s`,
                        tone: pickupTimeBonus > 0 ? 'info' : 'danger',
                        ttl: 1500
                    }
                }));
            }
        });

        socket.on('dashboard:action', ({ byId, byName, action }) => {
            state.isPaused = action === 'pause';

            window.dispatchEvent(new CustomEvent('hud:banner', {
                detail: { byId, byName, action }
            }));

            if (action === 'pause') {
                window.dispatchEvent(new CustomEvent('hud:toast', {
                    detail: { title: 'Pause', text: `Paused by: ${byName || playerName(byId)}`, tone: 'warning', ttl: 2500 }
                }));
            } else if (action === 'resume') {
                window.dispatchEvent(new CustomEvent('hud:toast', {
                    detail: { title: 'Resume', text: `Resumed by: ${byName || playerName(byId)}`, tone: 'success', ttl: 2000 }
                }));
            }
        });


        // socket.on('game:ended', ({ reason }) => {
        //     window.dispatchEvent(
        //         new CustomEvent('hud:gameover', { detail: { reason }}
        //         ));
        //     state.gameStatus = 'ended';
        // });

        socket.on("session:end", ({ reason }) => {
            console.log("session:end", reason);
            state.reset();
            state.switchState("mainMenu");

            if (reason === "Host disconnected") state.error = reason;
        })
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
    window.dispatchEvent(new CustomEvent('bonus:remove', { detail: { id } }));
});

socket.on('player:buff', ({ playerId, type, durationMs }) => {
    window.dispatchEvent(new CustomEvent('player:buff', {
        detail: { playerId, type, durationMs }
    }));
});

socket.on('bonus:picked', ({ by, bonusId, type }) => {
    const local = bonuses[bonusId];
    delete bonuses[bonusId];

    window.dispatchEvent(new CustomEvent('bonus:picked', {
        detail: { id: bonusId, by, type, bonus: local }
    }));

    window.dispatchEvent(new CustomEvent('hud:toast', {
        detail: {
            title: 'Bonus',
            text: `${playerName(by)} picked: ${bonusLabel(type)}`,
            tone: 'success',
            ttl: 1800
        }
    }));
});


// Multiplayer utility functions
export function sendPlayerMove(x, y, facingAngle = 0, isMoving = false, flashOn=true, isCaught=false) {
    socket.emit('move', { x, y, facingAngle, isMoving, flashOn, isCaught });
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

export function hostGame(payload) {
   const {isSingle}=payload;
    console.log("single game bol ",isSingle)

    socket.emit("hostGame", { payload });
}

export function singleGame(){
    socket.emit('single:game')
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
export function playerCaught(playerId) {
    socket.emit("catch", playerId);
}


export function leaveGame() {
    socket.emit("player:leave");
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
export function resumeGame() {
    socket.emit('game:resume');
}

export function restartGame() {
    socket.emit("game:restart");
}

export function endGame() {
    socket.emit("game:end");
}

export function isPaused() {
    console.log("state.isPaused",state.isPaused)
    return !!state.isPaused;
}
function bonusLabel(type) {
    switch (type) {
        case 'speed': return 'Speed';
        case 'vision': return 'Vision';
        case 'timeShift': return 'Time';
        default: return type || 'Bonus';
    }
}

function playerName(id) {
    return state.players?.[id]?.username || id || 'Player';
}