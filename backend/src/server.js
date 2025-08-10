import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import Game from './Game.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // Allow all origins
        methods: ['GET', 'POST'], // Allow specific HTTP methods
    },
});

const PORT = 8080;

let players = {};

let games = new Map();

app.use(cors()); // Enable CORS for all HTTP routes
app.use(express.json());

app.get('/api/hello', (req, res) => {
    res.json({ message: 'Hello from backend!' });
});

io.on('connection', (socket) => {

    socket.on("hostGame", (data) => {
        const game = new Game(io, socket);
        const player = game.addPlayer(socket, data.username, true);
        games.set(game.id, game);
        socket.emit("hostGame", { gameId: game.id, player: player });
    });

    socket.on("joinGame", (data) => {
        console.log(data);
        const game = games.get(data.gameId);
        if (!game) {
            socket.emit("error", `Game with id ${data.gameId} not found`);
            return;
        }
        if (game.usernameExists(data.username)) {
            socket.emit("error", `Player with name ${data.username} already exists`);
            return;
        }

        const player = game.addPlayer(socket, data.username);
        socket.emit("joinGame", { gameId: game.id, player: player });
    })

    socket.on("test", () => {
        socket.emit("test");
    })

    players[socket.id] = { x: 100, y: 100 };
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

function generateGameId() {

}