import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { regGameHandlers } from './Game.js';

const app = express();
app.use(cors()); // Enable CORS for all HTTP routes
app.use(express.json());

const server = http.createServer(app);
export const io = new Server(server, {
    cors: {
        origin: '*', // Allow all origins
        methods: ['GET', 'POST'], // Allow specific HTTP methods
    },
});
const PORT = 8080;

io.on('connection', (socket) => {
    regGameHandlers(socket);
});

server.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
});