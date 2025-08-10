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

export function getPlayers() {
    return players;
}

export function getMyId() {
    return socket.id;
}