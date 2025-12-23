import React, { useState } from 'react';
import { MAX_PLAYERS, MIN_PLAYERS, PLAYER_COLORS } from '../constants';
import { GridSize } from '../types';
import './PlayerSetup.css';

interface PlayerSetupProps {
    onStartGame: (numPlayers: number, gridSize: GridSize) => void;
}

export const PlayerSetup: React.FC<PlayerSetupProps> = ({ onStartGame }) => {
    const [numPlayers, setNumPlayers] = useState<number>(2);
    const [gridSize, setGridSize] = useState<GridSize>(GridSize.SMALL);

    const increment = () => {
        if (numPlayers < MAX_PLAYERS) setNumPlayers(prev => prev + 1);
    };

    const decrement = () => {
        if (numPlayers > MIN_PLAYERS) setNumPlayers(prev => prev - 1);
    };

    return (
        <div className="setup-container">
            <h1 className="setup-title">Deep-Chain Reaction</h1>

            <div className="controls">
                <label>Players:</label>
                <div className="player-selector">
                    <button onClick={decrement} disabled={numPlayers <= MIN_PLAYERS}>-</button>
                    <span className="player-count-display">{numPlayers}</span>
                    <button onClick={increment} disabled={numPlayers >= MAX_PLAYERS}>+</button>
                </div>
            </div>

            <div className="controls">
                <label>Grid Size:</label>
                <div className="grid-selector">
                    {(Object.keys(GridSize) as Array<keyof typeof GridSize>).map((sizeKey) => (
                        <button
                            key={sizeKey}
                            className={`grid-btn ${gridSize === GridSize[sizeKey] ? 'active' : ''}`}
                            onClick={() => setGridSize(GridSize[sizeKey])}
                        >
                            {sizeKey}
                        </button>
                    ))}
                </div>
            </div>

            <div className="preview-orbs">
                {Array.from({ length: numPlayers }).map((_, i) => (
                    <div
                        key={i}
                        className="preview-orb"
                        style={{
                            backgroundColor: PLAYER_COLORS[i],
                            color: PLAYER_COLORS[i]
                        }}
                    />
                ))}
            </div>

            <button className="btn-start" onClick={() => onStartGame(numPlayers, gridSize)}>
                Start Game
            </button>
        </div>
    );
};
