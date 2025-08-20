let bonuses = {};
let nextBonusId = 1;

function getAll() {
    return Object.values(bonuses);
}

function spawnBonus(io, {x, y, size = 28, type}) {
    const id = String(nextBonusId++);
    const bonus = {id, x, y, size, type};
    bonuses[id] = bonus;
    io.emit('bonus:spawn', bonus);
    return bonus;
}

function removeBonus(io, id) {
    if (!bonuses[id]) return false;
    delete bonuses[id];
    io.emit('bonus:remove', id);
    return true;
}

function broadcastBonusList(socket) {
    socket.emit('bonus:list', getAll());
}

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

function rectsOverlap(a, b) {
    return !(a.x + a.width <= b.x ||
        b.x + b.width <= a.x ||
        a.y + a.height <= b.y ||
        b.y + b.height <= a.y);
}

function randomInt(min, max) {
    return (min + Math.floor(Math.random() * (max - min + 1)));
}

function spawnBonusRandom(io, {
    world,
    walls = [],
    size = 28,
    attempts = 30,
    types = ['speed', 'vision', 'timeShift'],
} = {}) {
    const maxX = (world?.width ?? 1000) - size;
    const maxY = (world?.height ?? 1000) - size;

    const existing = getAll();

    for (let i = 0; i < attempts; i++) {
        const x = randomInt(0, maxX);
        const y = randomInt(0, maxY);
        const rect = {x, y, width: size, height: size};

        const hitWall = (walls || []).some(w =>
            !(rect.x + rect.width <= w.x ||
                w.x + w.width <= rect.x ||
                rect.y + rect.height <= w.y ||
                w.y + w.height <= rect.y)
        );
        if (hitWall) continue;

        const hitBonus = existing.some(o => rectsOverlap(rect, {x: o.x, y: o.y, width: o.size, height: o.size}));
        if (hitBonus) continue;

        const type = types[(Math.random() * types.length) | 0];
        return spawnBonus(io, {x, y, size, type});
    }
    return null;
}

export {
    getAll,
    spawnBonus,
    removeBonus,
    broadcastBonusList,
    spawnBonusRandom,
};
