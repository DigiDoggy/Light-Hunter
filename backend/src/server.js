import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { regGameHandlers } from './Game.js';

export const DEV_MODE = process.env.NODE_ENV === "development";
if (DEV_MODE) console.log("Development mode enabled");

const app = express();
app.use(cors({
    origin(origin, cb) {
        if (!origin) return cb(null, true);
        if (origin === 'http://localhost:5173' || /\.ngrok-(free|app)\.app$/.test(origin)) {
            return cb(null, true);
        }
        return cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
})); // Enable CORS for all HTTP routes
app.use(express.json());

const server = http.createServer(app);
export const io = new Server(server, {
    cors: {
        origin: [
            'http://localhost:5173',
            /\.ngrok-(free|app)\.app$/
        ],
        credentials: true,
    }
});
const PORT = 8080;

io.on('connection', (socket) => {
    regGameHandlers(socket);
});

server.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
});