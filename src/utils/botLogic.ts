import type { Grid, PlayerId } from '../types';
import { Difficulty } from '../types';
import { isValidMove, addOrbToCell, explodeCells } from './gameUtils';

// Evaluation Constants
const SCORE_ORB = 10;
const SCORE_CELL = 5;
const SCORE_CRITICAL_BONUS = 5; // Bonus for a cell about to explode
const SCORE_ENEMY_ORB = -10;
const SCORE_WIN = 10000;
const SCORE_LOSS = -10000;

// Helper to simulate a move on a grid copy
const simulateMove = (
    initialGrid: Grid,
    row: number,
    col: number,
    playerId: PlayerId
): { grid: Grid; isWin: boolean; isEliminated: boolean } => {
    // Deep copy grid 
    const gridCopy = JSON.parse(JSON.stringify(initialGrid)) as Grid;

    // Perform move
    let { newGrid, unstableCells } = addOrbToCell(gridCopy, row, col, playerId);

    // Process explosions until stable or max depth
    let steps = 0;
    const MAX_STEPS = 20; // Increased limit for better simulation

    while (unstableCells.length > 0 && steps < MAX_STEPS) {
        const result = explodeCells(newGrid, unstableCells);
        newGrid = result.newGrid;
        unstableCells = result.nextUnstableCells;
        steps++;
    }

    // Check game state after move
    let myOrbs = 0;
    let enemyOrbs = 0;

    newGrid.forEach(gridRow => {
        gridRow.forEach(cell => {
            if (cell.owner === playerId) {
                myOrbs += cell.count;
            } else if (cell.owner) {
                enemyOrbs += cell.count;
            }
        });
    });

    const isWin = enemyOrbs === 0 && myOrbs > 0;
    const isEliminated = myOrbs === 0 && enemyOrbs > 0;

    return { grid: newGrid, isWin, isEliminated };
};

const evaluateGrid = (grid: Grid, playerId: PlayerId): number => {
    let score = 0;
    let myOrbs = 0;
    let enemyOrbs = 0;

    grid.forEach(row => {
        row.forEach(cell => {
            if (cell.owner === playerId) {
                myOrbs += cell.count;
                score += cell.count * SCORE_ORB;
                score += SCORE_CELL;
                if (cell.count === cell.capacity - 1) {
                    score += SCORE_CRITICAL_BONUS;
                }
            } else if (cell.owner) {
                enemyOrbs += cell.count;
                score += cell.count * SCORE_ENEMY_ORB;
                // Penalty if enemy has critical cell (threat)
                if (cell.count === cell.capacity - 1) {
                    score -= SCORE_CRITICAL_BONUS * 2; // High threat
                }

                // Heuristic: Check provided threat to my cells?
                // Too expensive for simple eval, reliance on Minimax depth.
            }
        });
    });

    if (myOrbs === 0 && enemyOrbs > 0) return SCORE_LOSS;
    if (enemyOrbs === 0 && myOrbs > 0) return SCORE_WIN;

    return score;
};

// Minimax Algorithm
const minimax = (
    grid: Grid,
    depth: number,
    isMaximizing: boolean,
    playerId: PlayerId,
    enemyId: PlayerId,
    alpha: number,
    beta: number
): number => {
    const currentScore = evaluateGrid(grid, playerId);
    if (Math.abs(currentScore) >= Math.abs(SCORE_WIN) - 100) {
        // Return score adjusted by depth to prefer faster wins / slower losses
        return currentScore > 0 ? currentScore - depth : currentScore + depth;
    }

    if (depth === 0) {
        return currentScore;
    }

    const availableMoves: { row: number; col: number }[] = [];
    grid.forEach(row => {
        row.forEach(cell => {
            // For maximizing player (Bot), valid moves are on own cells or empty
            // For minimizing player (Human), valid moves are on own cells or empty
            const mover = isMaximizing ? playerId : enemyId;
            if (isValidMove(cell, mover)) {
                availableMoves.push({ row: cell.row, col: cell.col });
            }
        });
    });

    if (availableMoves.length === 0) {
        // No moves available, likely lost
        return isMaximizing ? SCORE_LOSS : SCORE_WIN;
    }

    // Optimization: limit branching factor if too many moves?
    // For now, full search.

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of availableMoves) {
            const { grid: nextGrid } = simulateMove(grid, move.row, move.col, playerId);
            const evalScore = minimax(nextGrid, depth - 1, false, playerId, enemyId, alpha, beta);
            maxEval = Math.max(maxEval, evalScore);
            alpha = Math.max(alpha, evalScore);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of availableMoves) {
            // Simulate outcome for enemy
            const { grid: nextGrid } = simulateMove(grid, move.row, move.col, enemyId);
            const evalScore = minimax(nextGrid, depth - 1, true, playerId, enemyId, alpha, beta);
            minEval = Math.min(minEval, evalScore);
            beta = Math.min(beta, evalScore);
            if (beta <= alpha) break;
        }
        return minEval;
    }
};

export const getBotMove = (
    grid: Grid,
    playerId: PlayerId,
    difficulty: Difficulty
): { row: number; col: number } | null => {
    const availableMoves: { row: number; col: number }[] = [];

    grid.forEach(row => {
        row.forEach(cell => {
            if (isValidMove(cell, playerId)) {
                availableMoves.push({ row: cell.row, col: cell.col });
            }
        });
    });

    if (availableMoves.length === 0) return null;

    if (difficulty === Difficulty.EASY) {
        // Random move
        const randomIndex = Math.floor(Math.random() * availableMoves.length);
        return availableMoves[randomIndex];
    }

    // Determine enemy ID (Assuming 2 player for now as per task)
    // In a multi-bot scenario we'd need more logic.
    let enemyId = 'p1';
    if (playerId === 'p1') enemyId = 'p2'; // Should not happen in single player but safekeeping

    const depth = difficulty === Difficulty.MEDIUM ? 2 : 3; // Medium=2, Hard=3

    let bestMove = availableMoves[0];
    let maxVal = -Infinity;

    // We run the first level of maximizing here to track the best move
    for (const move of availableMoves) {
        const { grid: nextGrid, isWin } = simulateMove(grid, move.row, move.col, playerId);

        if (isWin) return move; // Immediate win

        const moveVal = minimax(nextGrid, depth - 1, false, playerId, enemyId, -Infinity, Infinity);

        if (moveVal > maxVal) {
            maxVal = moveVal;
            bestMove = move;
        }
    }

    return bestMove;
};
