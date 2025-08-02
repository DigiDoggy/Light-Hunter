# 🎮 Multiplayer Web Game Project

This is the initial setup for a multiplayer web game built with a **Vite-based frontend** and a **Node.js + Express + Socket.IO backend**.

---

## 📁 Project Structure

```
project-root/
├── frontend/         # Vite + Vanilla JS + Howler (audio)
│   ├── src/
│   ├── public/
│   ├── index.html
│   └── package.json
├── backend/          # Express + Socket.IO
│   ├── src/server.js
│   └── package.json
└── README.md
```

---

## 🚀 Getting Started

### 🧩 Prerequisites

* Node.js (v18+ recommended)
* npm (v9+)

---

### 🔧 Backend Setup

```bash
cd backend
npm install
npm run dev
```

* Runs on [http://localhost:8080](http://localhost:8080)
* Uses Express + Socket.IO for real-time communication
* CORS enabled for frontend access

---

### 🎨 Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

* Vite development server starts on [http://localhost:5173](http://localhost:5173)
* Uses Socket.IO client to connect to backend
* Includes `howler.js` for sound support

---

## ⚙️ Scripts Summary

### Frontend `package.json`

| Script    | Description                   |
| --------- | ----------------------------- |
| `dev`     | Run Vite dev server           |
| `build`   | Build frontend for production |
| `preview` | Preview built frontend        |

### Backend `package.json`

| Script  | Description                            |
| ------- | -------------------------------------- |
| `start` | Run server with Node                   |
| `dev`   | Run server with `nodemon` (hot reload) |

---

## 📦 Installed Packages

### Frontend:

* `vite`
* `howler` (audio playback)
* `socket.io` (optional peer client/server sync)

### Backend:

* `express`
* `socket.io`
* `cors`
* `dotenv`
* `nodemon` (dev only)

---
### Git Command

* `git fetch --prune` - Will update information about branches and automatically

## Close port
* lsof -i tcp:8080
* sudo kill 12345