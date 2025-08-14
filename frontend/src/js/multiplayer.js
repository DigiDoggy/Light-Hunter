/* eslint-env es6 */
'use strict';

import io from 'socket.io-client';

const socket = io('http://localhost:8080');

let players = {};

// Socket event handlers
socket.on('currentPlayers', (serverPlayers) => {
    players = serverPlayers;
    console.log('Current players:', players);
});

socket.on('newPlayer', (player) => {
    players[player.id] = { x: player.x, y: player.y, facingAngle: player.facingAngle, backgroundPosition: player.backgroundPosition };
    console.log('New player joined:', player);
});

socket.on('playerMoved', (player) => {
    if (players[player.id]) {
        players[player.id].x = player.x;
        players[player.id].y = player.y;
        players[player.id].facingAngle = player.facingAngle;
        players[player.id].backgroundPosition = player.backgroundPosition;
        players[player.id].width = player.width;
        players[player.id].height = player.height;
    }
});

socket.on('playerDisconnected', (id) => {
    delete players[id];
    console.log('Player disconnected:', id);
});

// Multiplayer utility functions
export function sendPlayerMove(x, y, facingAngle = 0,width = 20, height = 20, backgroundPosition = "0 0") {
    socket.emit('move', { x, y, facingAngle, width, height, backgroundPosition });
}

export function getPlayers() {
    return players;
}

export function getMyId() {
    return socket.id;
}