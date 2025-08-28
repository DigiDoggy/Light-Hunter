// Hud.js
export default class HUD {
    constructor(root = document.body) {
        this.root = root;
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

        this.centerMsg = document.createElement('div');
        this.centerMsg.className = 'hud__center-msg';
        this.centerMsg.hidden = true;

        this.toastBox = document.createElement('div');
        this.toastBox.className = 'hud__toasts hud__toasts--under-hiders';
        this.hidersBox.append(this.toastBox);

        this.el.append(this.top, this.centerMsg);
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
}
