import React, { useState } from 'react';
import { MAX_PLAYERS, MIN_PLAYERS, PLAYER_COLORS } from '../constants';
import './PlayerSetup.css';

interface PlayerSetupProps {
    onStartGame: (numPlayers: number) => void;
}

export const PlayerSetup: React.FC<PlayerSetupProps> = ({ onStartGame }) => {
    const [numPlayers, setNumPlayers] = useState<number>(2);

    const increment = () => {
        if (numPlayers < MAX_PLAYERS) setNumPlayers(prev => prev + 1);
    };

    const decrement = () => {
        if (numPlayers > MIN_PLAYERS) setNumPlayers(prev => prev - 1);
    };

    return (
        <div className="setup-container">
            <h1 className="setup-title">Chain Reaction</h1>

            <div className="controls">
                <label>Players:</label>
                <button onClick={decrement} disabled={numPlayers <= MIN_PLAYERS}>-</button>
                <span className="player-count-display">{numPlayers}</span>
                <button onClick={increment} disabled={numPlayers >= MAX_PLAYERS}>+</button>
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

            <button className="btn-start" onClick={() => onStartGame(numPlayers)}>
                Start Game
            </button>
        </div>
    );
};
