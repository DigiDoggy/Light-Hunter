# Light Hunter — Multiplayer Browser Game

## Table of Contents

1. [Introduction](#introduction)
2. [Game Description](#game-description)

    * [Bonuses](#bonuses)
    * [Abilities](#abilities)
    * [Win Conditions](#win-conditions)
3. [Controls](#controls)
4. [Technical Details](#technical-details)

    * [Architecture](#architecture)
    * [Libraries and Dependencies](#libraries-and-dependencies)
5. [Running the Project](#running-the-project)
6. [Configure ngrok](#configure-ngrok)

---

## Introduction

This project was developed as part of an assignment: to create a multiplayer web game that works **in the browser without Canvas**, using only DOM elements.
The game must support **2 to 4 players**, ensure smooth animation (60 FPS with `requestAnimationFrame`), and work over the internet, not just on a local network.

---

## Game Description

The game is essentially a **hide-and-seek in a maze**.

* The map consists of walls forming corridors and dead ends.
* Each player has a **flashlight** that illuminates their path.
* Players are divided into roles:

    * **Seeker** — must find all Hiders within the time limit.
    * **Hiders** — must avoid being found.
    * **Spectator** - when a hider is found, they become a spectator and can freely move around the map through obstacles.

### Bonuses

Bonuses appear on the map:

1. **Speed** — temporarily increases the player's movement speed.
2. **Time** — adds time to the global timer for the Seeker, and subtracts time for the Hiders.
3. **Vision** - opens the map for a limited time.

### Abilities

* A Hider can press **Ctrl** to "hide in darkness": their flashlight turns off, making them invisible.

### Win Conditions

* **Seeker wins** if all Hiders are caught before the timer runs out.
* **Hiders win** if at least one survives until the timer expires.

---

## Controls

| Key       | Action                   |
| --------- | ------------------------ |
| **W / ↑** | Move forward             |
| **S / ↓** | Move backward            |
| **A / ←** | Rotate left              |
| **D / →** | Rotate right             |
| **Space** | Pause / Resume           |
| **Ctrl**  | Toggle flashlight on/off |

---

## Technical Details

### Architecture

* **Frontend** — Vite, Vanilla JS, DOM rendering (no Canvas).
* **Backend** — Node.js, Express, Socket.IO for real-time player synchronization.
* Communication happens via WebSocket events (`player:move`, `bonus:pickup`, `game:pause`, `timer:tick`, etc.).

### Libraries and Dependencies

#### Backend (`/backend`)

**Dependencies**

* **express** `^5.1.0` — HTTP server.
* **socket.io** `^4.8.1` — real-time multiplayer communication.
* **cors** `^2.8.5` — CORS support for the frontend.
* **dotenv** `^17.2.1` — environment variables management.

**Dev Dependencies**

* **nodemon** `^3.1.10` — auto-restart server on changes.

#### Frontend (`/frontend`)

**Dependencies**

* **vite** `^7.0.4` — bundler and dev server (listed under devDependencies, used during development/build).
* **socket.io-client** `^4.8.1` — client connection to the server.
* **socket.io** `^4.8.1` — shared protocol utilities used by some builds (optional; client uses `socket.io-client`).
* **howler** `^2.2.4` — audio playback for sound effects.

**Dev Dependencies**

* **vite** `^7.0.4`

---

## Running the Project

1. Clone the repository:

   ```bash
   git clone <repo-url>
   cd <repo-folder>
   ```

2. Install dependencies:

   ```bash
   cd backend
   npm install
   cd ../frontend
   npm install
   ```

3. Start the backend:

   ```bash
   cd backend
   npm run dev
   ```

4. Start the frontend:

   ```bash
   cd frontend
   npm run dev
   ```

5.  Once started:

    * Open the frontend URL (usually `http://localhost:5173`).
    * Enter a player name and join the lobby.
    * Once all players are ready, the **host** starts the game.

## Configure ngrok

 - Add Your Authtoken

    Open your terminal and run:

    ```yaml
    ngrok config add-authtoken <your_token>
    ```

 - Edit the Configuration File

    Open the ngrok configuration file by running:

    ```yaml
    ngrok config edit
    ```

 - Then add the following configuration (your authtoken will already be present):

    ```yaml
    version: "3"
    
    agent:
      authtoken: <your_token>
    
    endpoints:
      - name: frontend
        upstream:
          url: http://localhost:5173
      - name: backend
        upstream:
          url: http://localhost:8080
    ```

 - Start ngrok

    Ensure your server and client are running.

    Open a new terminal window and run:
    ```yaml
    ngrok start --all
    ```

 - Copy the link and share it to play online.

    ![ngrok.png](pic/ngrok.png)

---