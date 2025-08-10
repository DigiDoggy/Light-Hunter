const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*', // Allow all origins
        methods: ['GET', 'POST'], // Allow specific HTTP methods
    },
});

const PORT = 8080;

let players = {};

app.use(cors()); // Enable CORS for all HTTP routes
app.use(express.json());

app.get('/api/hello', (req, res) => {
    res.json({ message: 'Hello from backend!' });
});

io.on('connection', (socket) => {
    players[socket.id] = { x: 100, y: 100, facingAngle: 0,};
    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', { id: socket.id, ...players[socket.id] });

    socket.on('move', (data) => {
        players[socket.id] = data;
        socket.broadcast.emit('playerMoved', { id: socket.id, ...data });
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
});