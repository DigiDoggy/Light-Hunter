const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bonuses = require('./bonuses');
const { WORLD, walls } = require('./mapData');

const setBonusTime=5000;


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

setInterval(() => {

    const forbidRects = Object.values(players).map(p => ({
        x: p.x || 0,
        y: p.y || 0,
        width: parseInt(p.width, 10)  || 20,
        height: parseInt(p.height, 10) || 20,
    }));

    const spawned = bonuses.spawnBonusRandom(io, {
        world: WORLD,
        walls,
        size: 28,
        attempts: 30,
        types: ['speed','vision','timeShift'],
    });

}, setBonusTime);

app.get('/api/hello', (req, res) => {
    res.json({ message: 'Hello from backend!' });
});

io.on('connection', (socket) => {
    players[socket.id] = { x: 100, y: 100 };
    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', { id: socket.id, ...players[socket.id] });

    bonuses.broadcastBonusList(socket);

    socket.on('bonus:pickup', ({ bonusId }) => {
        if (!bonusId) return;
        const ok = bonuses.removeBonus(io, bonusId);
        if (ok) {
            io.emit('bonus:picked', { by: socket.id, bonusId });
        }
    });


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