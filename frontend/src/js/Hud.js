// Hud.js
import state from "./AppStateManager.js";
import {endGame, leaveGame, restartGame} from "./multiplayer.js";

export default class HUD {
    constructor(root = document.body, game) {
        this.root = root;
        this.game = game;
        this.el = document.createElement('div');
        this.el.className = 'hud';

        this.top = document.createElement('div');
        this.top.className = 'hud__top';

        this.seekerBox = document.createElement('div');
        this.seekerBox.className = 'hud__seeker';
        this.seekerName = document.createElement('div');
        this.seekerName.className = 'hud__seeker-name';
        this.seekerBox.append(this.seekerName);

        this.timerBox = document.createElement('div');
        this.timerBox.className = 'hud__timer';
        this.timerText = document.createElement('div');
        this.timerText.className = 'hud__timer-text';
        this.timerBox.append(this.timerText);

        this.hidersBox = document.createElement('div');
        this.hidersBox.className = 'hud__hiders';
        this.hidersList = document.createElement('ul');
        this.hidersList.className = 'hud__hiders-list';
        this.hidersBox.append(this.hidersList);

        this.top.append(this.seekerBox, this.timerBox, this.hidersBox);

        this.centerHud = document.createElement("div");
        this.centerHud.className = 'hud__center';

        this.centerMsg = document.createElement('div');
        this.centerMsg.className = 'hud__center-msg';
        this.centerMsg.hidden = true;
        this.centerHud.append(this.centerMsg);

        this.controlsHud = document.createElement("div");
        this.controlsHud.className = "hud__center-msg hud__controls";
        this.controlsHud.hidden = true;
        this.centerHud.append(this.controlsHud);

        this.toastBox = document.createElement('div');
        this.toastBox.className = 'hud__toasts hud__toasts--under-hiders';
        this.hidersBox.append(this.toastBox);

        this.el.append(this.top, this.centerHud);
        this.root.append(this.el);
    }


    setSeeker(nick) {
        this.seekerName.textContent = nick ? `Seeker: ${nick}` : 'Seeker: —';
    }

    setTimer(ms) {
        const total = Math.max(0, Math.floor(ms / 1000));
        const mm = String(Math.floor(total / 60)).padStart(2,'0');
        const ss = String(total % 60).padStart(2,'0');
        this.timerText.textContent = `${mm}:${ss}`;
    }

    setHiders(nicks = []) {
        this.hidersList.innerHTML = '';
        nicks.forEach(n => {
            const li = document.createElement('li');
            li.textContent = n;
            this.hidersList.append(li);
        });
    }

    showCenterMessage(text, subtext=null, ttlMs=2000) {
        this.centerMsg.innerHTML = '';
        const t = document.createElement('div');
        t.className = 'hud__center-title';
        t.textContent = text;
        this.centerMsg.append(t);
        if (subtext) {
            const s = document.createElement('div');
            s.className = 'hud__center-sub';
            s.textContent = subtext;
            this.centerMsg.append(s);
        }
        this.centerMsg.hidden = false;
        if (this._hideTimer) clearTimeout(this._hideTimer);
        if (ttlMs > 0) {
            this._hideTimer = setTimeout(() => this.hideCenterMessage(), ttlMs);
        }
    }

    hideCenterMessage() {
        this.centerMsg.hidden = true;
    }

    showToast({ title, text='', ttl=2000, tone='info' } = {}) {
        const wrap = document.createElement('div');
        wrap.className = `hud__toast hud__toast--${tone}`;

        if (title) {
            const h = document.createElement('div');
            h.className = 'hud__toast-title';
            h.textContent = title;
            wrap.append(h);
        }
        if (text) {
            const p = document.createElement('div');
            p.className = 'hud__toast-text';
            p.textContent = text;
            wrap.append(p);
        }

        this.toastBox.append(wrap);

        if (ttl > 0) {
            setTimeout(() => {
                wrap.remove();
            }, ttl);
        }
    }

    controls(isHost, status) {
        const quitButton = () => {
            const quit = document.createElement("button");
            quit.className = "hud__controls-btn hud__toast--danger";
            quit.textContent = "Quit";
            this.controlsHud.append(quit);
            this.game.addEventListener(quit, "click", () => {
                leaveGame();
                state.reset();
                state.switchState("mainMenu");
            });
        };

        const endButton = (force) => {
            const end = document.createElement("button");
            end.className = "hud__controls-btn";
            end.classList.add(force ? "hud__toast--danger" : "hud__toast--success");
            end.textContent = force ? "End Game" : "Back to lobby";
            this.controlsHud.append(end);
            this.game.addEventListener(end, "click", () => {
                endGame();
            });
        };

        const restartButton = () => {
            const restart = document.createElement("button");
            restart.className = "hud__controls-btn";
            restart.textContent = "Restart Game";
            this.controlsHud.append(restart);
            this.game.addEventListener(restart, "click", () => {
                restartGame();
                state.reset();
            });
        };

        this.controlsHud.innerHTML = "";

        if (status === "resume") {
            this.controlsHud.hidden = true;
            return;
        }

        if (isHost) {
            if (status === "end") {
                restartButton();
                endButton(false);
            } else {
                endButton(true)
            }
        }

        quitButton();
        this.controlsHud.hidden = false;
    }
}
