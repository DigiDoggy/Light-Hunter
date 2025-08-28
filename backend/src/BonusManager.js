export default class BonusManager {
    constructor({
            game
            ,geometry,
            spawnEveryMs=5000,
            types=['speed','vision','timeShift'],
            size = 28,
            attempts = 30}) {

        this.game = game;
        this.io= game.io;
        this.roomId=game.id;

        this.geometry= geometry;
        this.spawnEveryMs=spawnEveryMs;
        this.types=types;
        this.size=size;
        this.attempts=attempts;

        this.bonuses=new Map();
        this.nextId=1;
        this.interval=null;
    }
    start(){
        this.stop();
        this.interval=setInterval(()=>
            this.spawnRandom(),
            this.spawnEveryMs);
    }

    stop() {
if(this.interval)clearInterval(this.interval);
this.interval=null;
    }

    list(){
        return[...this.bonuses.values()];
    }
    broadcastList(socket){
        socket.emit('bonus:list', this.list())
    }
    spawnAt(x, y, type) {
        const id = String(this.nextId++);
        const bonus = { id, x, y, size: this.size, type };
        this.bonuses.set(id, bonus);

        console.log(
            `[bonus] spawn room=${this.roomId} id=${id} type=${type} x=${x} y=${y} total=${this.bonuses.size}`
        );

        this.io.to(this.roomId).emit('bonus:spawn', bonus);
        return bonus;
    }

    remove(id) {
        if (!this.bonuses.has(id)) return false;
        this.bonuses.delete(id);
        this.io.to(this.roomId).emit('bonus:remove', id);
        return true;
    }

    spawnRandom() {
        const { world, walls = [] } = this.geometry || {};
        const maxX = (world?.width ?? 1000) - this.size;
        const maxY = (world?.height ?? 1000) - this.size;

        const existing = this.list();

        for (let i = 0; i < this.attempts; i++) {
            const x = this.randInt(0, maxX);
            const y = this.randInt(0, maxY);
            const rect = { x, y, width: this.size, height: this.size };

            const hitWall = (walls || []).some(w =>
                !(rect.x + rect.width <= w.x ||
                    w.x + w.width <= rect.x ||
                    rect.y + rect.height <= w.y ||
                    w.y + w.height <= rect.y)
            );
            if (hitWall) continue;

            const hitBonus = existing.some(o => this.overlap(rect, { x: o.x, y: o.y, width: o.size, height: o.size }));
            if (hitBonus) continue;

            const type = this.types[(Math.random() * this.types.length) | 0];
            return this.spawnAt(x, y, type);
        }
        return null;
    }

    handlePickup(socket, { bonusId }) {
        if (this.game.isPaused) return;
        if (!bonusId) return;
        const bonus = this.bonuses.get(bonusId);
        if (!bonus) return;

        const player = this.game.players[socket.id];
        if (!player) return;

        this.applyEffect(player, bonus);
        this.remove(bonusId);
        this.io.to(this.roomId).emit('bonus:picked', { by: socket.id, bonusId, type: bonus.type });
    }

    applyEffect(player, bonus) {
        switch (bonus.type) {
            case 'timeShift':
                const deltaMs= (player.role =='seeker')?5000:-5000
                this.game.timer.adjust(deltaMs);
                break;
            case 'speed':
                this.io.to(this.roomId).emit('player:buff', { playerId: player.id ?? player.socket?.id ?? player.socketId ?? player.username, type: 'speed', durationMs: 10000 });
                break;
            case 'vision':
                this.io.to(this.roomId).emit('player:buff', { playerId: player.id ?? player.socket?.id ?? player.socketId ?? player.username, type: 'vision', durationMs: 10000 });
                break;
            default:
                break;
        }
    }

    randInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
    overlap(a, b) {
        return !(a.x + a.width <= b.x ||
            b.x + b.width <= a.x ||
            a.y + a.height <= b.y ||
            b.y + b.height <= a.y);
    }
    overlapsPlayer(player, bonus) {
        const pw = player.width ?? 32, ph = player.height ?? 32;
        const a = { x: player.x, y: player.y, width: pw, height: ph };
        const b = { x: bonus.x, y: bonus.y, width: bonus.size, height: bonus.size };
        return this.overlap(a, b);
    }

}