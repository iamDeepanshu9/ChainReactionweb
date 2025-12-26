import { useState, useEffect, useCallback } from 'react';
import { GridSize, PlayerType, Difficulty } from '../types';
import type { Grid, Player, PlayerId, GameState } from '../types';
import {
    createGrid,
    isValidMove,
    addOrbToCell,
    explodeCells
} from '../utils/gameUtils';
import { getBotMove } from '../utils/botLogic';
import {
    DEFAULT_ROWS,
    DEFAULT_COLS,
    PLAYER_COLORS,
    EXPLOSION_DELAY_MS,
    GRID_SIZE_PRESETS
} from '../constants';

interface UseGameLogicReturn extends GameState {
    handleCellClick: (row: number, col: number) => void;
    resetGame: (numPlayers: number, gridSize?: GridSize, playerNames?: string[], isSinglePlayer?: boolean, difficulty?: Difficulty) => void;
    restartGame: () => void;
    isAnimating: boolean;
}

export const useGameLogic = (): UseGameLogicReturn => {
    const [grid, setGrid] = useState<Grid>(createGrid());
    const [players, setPlayers] = useState<Player[]>([]);
    const [currentPlayerIdx, setCurrentPlayerIdx] = useState<number>(0);
    const [turnCount, setTurnCount] = useState<number>(0);
    const [isGameOver, setIsGameOver] = useState<boolean>(false);
    const [winner, setWinner] = useState<PlayerId | null>(null);

    // Game Config State (for restarts)
    const [gameConfig, setGameConfig] = useState<{
        isSinglePlayer: boolean;
        difficulty: Difficulty;
        gridSize: GridSize;
    }>({ isSinglePlayer: false, difficulty: Difficulty.EASY, gridSize: GridSize.SMALL });

    // Queue of unstable cells to process sequentially (for animation)
    const [explosionQueue, setExplosionQueue] = useState<{ row: number, col: number }[][]>([]);

    const isAnimating = explosionQueue.length > 0;

    // Initialize game
    const resetGame = useCallback((
        numPlayers: number = 0,
        gridSize: GridSize = GridSize.SMALL,
        playerNames?: string[],
        isSinglePlayer: boolean = false,
        difficulty: Difficulty = Difficulty.EASY
    ) => {
        // If numPlayers is 0, we are just resetting to setup screen

        // Save config
        if (numPlayers > 0) {
            setGameConfig({ isSinglePlayer, difficulty, gridSize });
        }

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
        const newPlayers: Player[] = Array.from({ length: numPlayers }, (_, i) => {
            const isBot = isSinglePlayer && i === 1; // Player 2 is Bot in Single Player
            return {
                id: `p${i + 1}`,
                name: playerNames && playerNames[i] ? playerNames[i] : `Player ${i + 1}`,
                color: PLAYER_COLORS[i % PLAYER_COLORS.length],
                isAlive: true,
                order: i,
                type: isBot ? PlayerType.BOT : PlayerType.HUMAN,
                difficulty: isBot ? difficulty : undefined
            };
        });

        setGrid(newGrid);
        setPlayers(newPlayers);
        setCurrentPlayerIdx(0);
        setTurnCount(0);
        setIsGameOver(false);
        setWinner(null);
        setExplosionQueue([]);
    }, []);

    const restartGame = useCallback(() => {
        const currentNames = players.map(p => p.name);

        resetGame(
            players.length,
            gameConfig.gridSize,
            currentNames,
            gameConfig.isSinglePlayer,
            gameConfig.difficulty
        );
    }, [players, gameConfig, resetGame]);

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

            // Check for winner immediately after this explosion step
            if (turnCount >= players.length) {
                const activeOwners = new Set<string>();
                newGrid.forEach(row => row.forEach(cell => {
                    if (cell.owner) activeOwners.add(cell.owner);
                }));

                if (activeOwners.size === 1) {
                    const winnerId = Array.from(activeOwners)[0];
                    setIsGameOver(true);
                    setWinner(winnerId);
                    setExplosionQueue([]); // Stop animation
                    return; // Stop further processing
                }
            }

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
    }, [explosionQueue, grid, players, advanceTurn, turnCount]);

    // Core Move Logic
    const makeMove = useCallback((row: number, col: number) => {
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
    }, [grid, players, currentPlayerIdx, advanceTurn]);

    // Bot Logic Effect
    useEffect(() => {
        if (isGameOver || players.length === 0) return;

        const currentPlayer = players[currentPlayerIdx];
        if (currentPlayer && currentPlayer.type === PlayerType.BOT && !isAnimating && explosionQueue.length === 0) {
            // It's Bot's turn
            const timer = setTimeout(() => {
                const move = getBotMove(grid, currentPlayer.id, currentPlayer.difficulty || Difficulty.EASY);
                if (move) {
                    makeMove(move.row, move.col);
                } else {
                    // Start thinking about resignation logic or stuck?
                    // Usually this shouldn't happen unless board is broken.
                    console.warn("Bot found no moves!");
                }
            }, 800); // Thinking delay

            return () => clearTimeout(timer);
        }
    }, [currentPlayerIdx, players, grid, isGameOver, isAnimating, explosionQueue, makeMove]);

    // Human Interaction
    const handleCellClick = (row: number, col: number) => {
        if (isGameOver || isAnimating || players.length === 0) return;

        const currentPlayer = players[currentPlayerIdx];
        // Only allow click if it's Human turn
        if (currentPlayer.type !== PlayerType.HUMAN) return;

        makeMove(row, col);
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
        restartGame,
        isAnimating
    };
};
