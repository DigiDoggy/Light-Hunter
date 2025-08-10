/* eslint-env es6 */
'use strict';

import io from 'socket.io-client';

export const socket = io('http://localhost:8080');

let players = {};

// Socket event handlers
socket.on('currentPlayers', (serverPlayers) => {
    players = serverPlayers;
    console.log('Current players:', players);
});

socket.on('newPlayer', (player) => {
    players[player.id] = { x: player.x, y: player.y };
    console.log('New player joined:', player);
});

socket.on('playerMoved', (player) => {
    if (players[player.id]) {
        players[player.id].x = player.x;
        players[player.id].y = player.y;
        console.log('Player moved:', player);
    }
});

socket.on('playerDisconnected', (id) => {
    delete players[id];
    console.log('Player disconnected:', id);
});

// Multiplayer utility functions
export function sendPlayerMove(x, y) {
    socket.emit('move', { x, y });
}

// export function getPlayers() {
//     return players;
// }

export function getMyId() {
    return socket.id;
}

socket.on("error", (err) => {
    console.log(err);
})

export function hostGame(username) {
    socket.emit("hostGame", { username: username });
}

export function getPlayers() {
    socket.emit("getPlayers");
}

// socket.on("getPlayers", (players) => {
//
// })

export function updateReadyStatus(status) {
    socket.emit("updateReadyStatus", status);
}

export function testEmit() {
    console.log("emit")
    socket.emit("test");
}

export function updateSkin(skinIndex) {
    socket.emit("updateSkin", skinIndex);
}

export function joinGame(gameId, username) {
    socket.emit("joinGame", { gameId: gameId, username: username });
}