import React from 'react';
import type { Grid, Player } from '../types';
import { Cell } from './Cell';
import './Board.css';

interface BoardProps {
    grid: Grid;
    players: Player[];
    onCellClick: (row: number, col: number) => void;
}

export const Board: React.FC<BoardProps> = ({ grid, players, onCellClick }) => {
    if (!grid || grid.length === 0) return null;

    const rows = grid.length;
    const cols = grid[0].length;

    return (
        <div className="board-container">
            <div
                className="board"
                style={{
                    gridTemplateColumns: `repeat(${cols}, auto)`,
                    gridTemplateRows: `repeat(${rows}, auto)`
                }}
            >
                {grid.map((row, r) =>
                    row.map((cell, c) => (
                        <Cell
                            key={`${r}-${c}`}
                            cell={cell}
                            players={players}
                            onClick={onCellClick}
                        />
                    ))
                )}
            </div>
        </div>
    );
};
