export function checkCollision(playerBounds, spatialGrid, gridSize,spectator=false) {
    const nearbyCells = getNearbyGridCells(playerBounds, gridSize);
    for (let cellKey of nearbyCells) {
        const obj = spatialGrid[cellKey] || null;
        console.log(obj);
        if (!obj || !obj.solid) continue;
        if (obj.width != 2000 && obj.height != 2000 && spectator) continue;
        if (rectanglesOverlap(playerBounds, obj.bounds)) {
            return obj;
        }

    }
    return null;
}

// In updateSpatialGrid.js
export function updateSpatialGrid(gameObjects, gridSize) {
    const grid = {};
    for (const obj of gameObjects) {
        if (!obj.solid) continue;
        const startX = Math.floor(obj.x / gridSize);
        const endX = Math.floor((obj.x + obj.width - 1) / gridSize);
        const startY = Math.floor(obj.y / gridSize);
        const endY = Math.floor((obj.y + obj.height - 1) / gridSize);
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                grid[`${x},${y}`] = obj;
            }
        }
    }
    return grid;
}

function getGridCellsForObject(bounds, gridSize) {
    const cells = [];
    const startX = Math.floor(bounds.x / gridSize);
    const endX = Math.floor((bounds.x + bounds.width) / gridSize);
    const startY = Math.floor(bounds.y / gridSize);
    const endY = Math.floor((bounds.y + bounds.height) / gridSize);

    for (let x = startX; x <= endX; x++) {
        for (let y = startY; y <= endY; y++) {
            cells.push(`${x},${y}`);
        }
    }
    return cells;
}

function getNearbyGridCells(bounds, gridSize) {
    const cells = [];
    const startX = Math.floor((bounds.x - 5) / gridSize);
    const endX = Math.floor((bounds.x + bounds.width + 5) / gridSize);
    const startY = Math.floor((bounds.y - 5) / gridSize);
    const endY = Math.floor((bounds.y + bounds.height + 5) / gridSize);

    for (let x = startX; x <= endX; x++) {
        for (let y = startY; y <= endY; y++) {
            cells.push(`${x},${y}`);
        }
    }
    return cells;
}

function rectanglesOverlap(rect1, rect2) {
    return !(rect1.x + rect1.width <= rect2.x ||
        rect2.x + rect2.width <= rect1.x ||
        rect1.y + rect1.height <= rect2.y ||
        rect2.y + rect2.height <= rect1.y);
}