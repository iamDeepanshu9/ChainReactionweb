import type { Cell, Grid, PlayerId } from '../types';
import { DEFAULT_ROWS, DEFAULT_COLS } from '../constants';

// Directions: Top, Bottom, Left, Right
const DIRECTIONS = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
];

export const getCapacity = (row: number, col: number, maxRows: number, maxCols: number): number => {
    let neighbors = 0;
    if (row > 0) neighbors++;
    if (row < maxRows - 1) neighbors++;
    if (col > 0) neighbors++;
    if (col < maxCols - 1) neighbors++;
    return neighbors;
};

export const createGrid = (rows = DEFAULT_ROWS, cols = DEFAULT_COLS): Grid => {
    const grid: Grid = [];
    for (let r = 0; r < rows; r++) {
        const rowCells: Cell[] = [];
        for (let c = 0; c < cols; c++) {
            rowCells.push({
                row: r,
                col: c,
                count: 0,
                owner: null,
                capacity: getCapacity(r, c, rows, cols),
            });
        }
        grid.push(rowCells);
    }
    return grid;
};

export const isValidMove = (cell: Cell, playerId: PlayerId): boolean => {
    if (cell.owner === null) return true;
    return cell.owner === playerId;
};

export const cloneGrid = (grid: Grid): Grid => {
    return grid.map(row => row.map(cell => ({ ...cell })));
};

// Returns a new grid state and a list of unstable cells (ready to explode)
export const addOrbToCell = (
    grid: Grid,
    row: number,
    col: number,
    playerId: PlayerId
): { newGrid: Grid; unstableCells: { row: number; col: number }[] } => {
    const newGrid = cloneGrid(grid);
    const cell = newGrid[row][col];

    // Logic: Add orb
    cell.count += 1;
    cell.owner = playerId;

    const unstableCells: { row: number; col: number }[] = [];

    if (cell.count >= cell.capacity) {
        unstableCells.push({ row, col });
    }

    return { newGrid, unstableCells };
};

export const explodeCells = (
    grid: Grid,
    unstableCells: { row: number; col: number }[]
): { newGrid: Grid; nextUnstableCells: { row: number; col: number }[] } => {
    const newGrid = cloneGrid(grid);
    const nextUnstableSet = new Set<string>(); // Use set to avoid duplicates "row,col"

    unstableCells.forEach(({ row, col }) => {
        const cell = newGrid[row][col];
        const explosionColor = cell.owner; // The player who triggered explosion claims neighbors
        const capacity = cell.capacity;

        // Reduce count by capacity (visualizing the explosion)
        cell.count -= capacity;
        if (cell.count === 0) {
            cell.owner = null;
        }

        if (cell.count >= cell.capacity) {
            nextUnstableSet.add(`${row},${col}`);
        }

        // Distribute to neighbors
        DIRECTIONS.forEach(([dRow, dCol]) => {
            const nRow = row + dRow;
            const nCol = col + dCol;

            if (nRow >= 0 && nRow < newGrid.length && nCol >= 0 && nCol < newGrid[0].length) {
                const neighbor = newGrid[nRow][nCol];
                neighbor.count += 1;
                neighbor.owner = explosionColor; // Capture!

                if (neighbor.count >= neighbor.capacity) {
                    nextUnstableSet.add(`${nRow},${nCol}`);
                }
            }
        });
    });

    const nextUnstableCells = Array.from(nextUnstableSet).map(str => {
        const [r, c] = str.split(',').map(Number);
        return { row: r, col: c };
    });

    return { newGrid, nextUnstableCells };
};
