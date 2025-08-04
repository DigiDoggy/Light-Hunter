export function checkCollision(playerBounds, spatialGrid, gridSize) {
    const nearbyCells = getNearbyGridCells(playerBounds, gridSize);
    for (let cellKey of nearbyCells) {
        const objectsInCell = spatialGrid[cellKey] || [];
        for (let obj of objectsInCell) {
            if (rectanglesOverlap(playerBounds, obj.bounds)) {
                return obj;
            }
        }
    }
    return null;
}

export function updateSpatialGrid(gameObjects, gridSize) {
    let spatialGrid = {};

    for (let obj of gameObjects) {
        const cells = getGridCellsForObject(obj.bounds, gridSize);
        for (let cellKey of cells) {
            if (!spatialGrid[cellKey]) {
                spatialGrid[cellKey] = [];
            }
            spatialGrid[cellKey].push(obj);
        }
    }

    return spatialGrid;
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