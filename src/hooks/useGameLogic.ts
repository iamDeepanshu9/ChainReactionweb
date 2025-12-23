import { useState, useEffect, useCallback } from 'react';
import { GridSize } from '../types';
import type { Grid, Player, PlayerId, GameState } from '../types';
import {
    createGrid,
    isValidMove,
    addOrbToCell,
    explodeCells
} from '../utils/gameUtils';
import {
    DEFAULT_ROWS,
    DEFAULT_COLS,
    PLAYER_COLORS,
    EXPLOSION_DELAY_MS,
    GRID_SIZE_PRESETS
} from '../constants';

interface UseGameLogicReturn extends GameState {
    handleCellClick: (row: number, col: number) => void;
    resetGame: (numPlayers: number, gridSize?: GridSize, playerNames?: string[]) => void;
    isAnimating: boolean;
}

export const useGameLogic = (): UseGameLogicReturn => {
    const [grid, setGrid] = useState<Grid>(createGrid());
    const [players, setPlayers] = useState<Player[]>([]);
    const [currentPlayerIdx, setCurrentPlayerIdx] = useState<number>(0);
    const [turnCount, setTurnCount] = useState<number>(0);
    const [isGameOver, setIsGameOver] = useState<boolean>(false);
    const [winner, setWinner] = useState<PlayerId | null>(null);

    // Queue of unstable cells to process sequentially (for animation)
    const [explosionQueue, setExplosionQueue] = useState<{ row: number, col: number }[][]>([]);

    const isAnimating = explosionQueue.length > 0;

    // Initialize game
    const resetGame = useCallback((numPlayers: number = 0, gridSize: GridSize = GridSize.SMALL, playerNames?: string[]) => {
        // If numPlayers is 0, we are just resetting to setup screen, so grid doesn't matter much
        // but if we are starting a game, we need dimensions.

        let rows = DEFAULT_ROWS;
        let cols = DEFAULT_COLS;

        if (numPlayers > 0) {
            if (gridSize === GridSize.SMALL) {
                rows = GRID_SIZE_PRESETS.SMALL.rows;
                cols = GRID_SIZE_PRESETS.SMALL.cols;
            } else if (gridSize === GridSize.MEDIUM) {
                rows = GRID_SIZE_PRESETS.MEDIUM.rows;
                cols = GRID_SIZE_PRESETS.MEDIUM.cols;
            } else if (gridSize === GridSize.LARGE) {
                // Calculate based on window size
                // Assuming cell size is approx 50px (from CSS) + gaps/padding
                // This is a rough estimation. 
                // Header is ~80px, padding ~40px.
                const availableWidth = window.innerWidth - 140;
                const availableHeight = window.innerHeight - 220; // Header + padding

                const CELL_SIZE = 55; // 50px + gap estimate

                cols = Math.floor(availableWidth / CELL_SIZE);
                rows = Math.floor(availableHeight / CELL_SIZE);

                // Enforce minimums (at least small)
                rows = Math.max(rows, GRID_SIZE_PRESETS.SMALL.rows);
                cols = Math.max(cols, GRID_SIZE_PRESETS.SMALL.cols);
            }
        }

        const newGrid = createGrid(rows, cols);
        const newPlayers: Player[] = Array.from({ length: numPlayers }, (_, i) => ({
            id: `p${i + 1}`,
            name: playerNames && playerNames[i] ? playerNames[i] : `Player ${i + 1}`,
            color: PLAYER_COLORS[i % PLAYER_COLORS.length],
            isAlive: true,
            order: i,
        }));

        setGrid(newGrid);
        setPlayers(newPlayers);
        setCurrentPlayerIdx(0);
        setTurnCount(0);
        setIsGameOver(false);
        setWinner(null);
        setExplosionQueue([]);
    }, []);

    // Handle Turn Switch
    const advanceTurn = useCallback((currentGrid: Grid, currentPlayers: Player[]) => {
        // Check win condition first
        // Win condition: If turnCount is high enough, and only 1 player has orbs.
        const activePlayerIds = new Set<PlayerId>();
        currentGrid.forEach(row => row.forEach(cell => {
            if (cell.owner) activePlayerIds.add(cell.owner);
        }));

        // Check elimination
        const nextPlayers = currentPlayers.map(p => ({
            ...p,
            isAlive: p.isAlive && (turnCount < currentPlayers.length || activePlayerIds.has(p.id))
        }));

        // Check winner
        const alivePlayers = nextPlayers.filter(p => p.isAlive);
        if (turnCount >= currentPlayers.length && alivePlayers.length === 1) {
            setIsGameOver(true);
            setWinner(alivePlayers[0].id);
            setPlayers(nextPlayers);
            return;
        }

        setPlayers(nextPlayers);

        // Find next alive player
        let nextIdx = (currentPlayerIdx + 1) % currentPlayers.length;
        let loopCount = 0;
        while (!nextPlayers[nextIdx].isAlive && loopCount < currentPlayers.length) {
            nextIdx = (nextIdx + 1) % currentPlayers.length;
            loopCount++;
        }

        setCurrentPlayerIdx(nextIdx);
        setTurnCount(prev => prev + 1);
    }, [currentPlayerIdx, turnCount]);


    // Effect to process explosion queue
    useEffect(() => {
        if (explosionQueue.length === 0) return;

        const timeoutId = setTimeout(() => {
            const currentBatch = explosionQueue[0];
            const remainingQueue = explosionQueue.slice(1);

            const { newGrid, nextUnstableCells } = explodeCells(grid, currentBatch);
            setGrid(newGrid);

            if (nextUnstableCells.length > 0) {
                setExplosionQueue([nextUnstableCells, ...remainingQueue]);
            } else {
                setExplosionQueue(remainingQueue);
                // If queue is empty after this, turn ends
                if (remainingQueue.length === 0) {
                    advanceTurn(newGrid, players);
                }
            }
        }, EXPLOSION_DELAY_MS);

        return () => clearTimeout(timeoutId);
    }, [explosionQueue, grid, players, advanceTurn]);


    const handleCellClick = (row: number, col: number) => {
        if (isGameOver || isAnimating || players.length === 0) return;

        const currentPlayer = players[currentPlayerIdx];
        const cell = grid[row][col];

        if (!isValidMove(cell, currentPlayer.id)) return;

        const { newGrid, unstableCells } = addOrbToCell(grid, row, col, currentPlayer.id);
        setGrid(newGrid);

        if (unstableCells.length > 0) {
            setExplosionQueue([unstableCells]);
        } else {
            advanceTurn(newGrid, players);
        }
    };

    return {
        grid,
        players,
        currentPlayerId: players[currentPlayerIdx]?.id,
        isGameOver,
        winner,
        turnCount,
        handleCellClick,
        resetGame,
        isAnimating
    };
};
