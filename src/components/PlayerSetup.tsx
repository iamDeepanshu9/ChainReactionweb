import React, { useState } from 'react';
import { MAX_PLAYERS, MIN_PLAYERS, PLAYER_COLORS } from '../constants';
import { GridSize } from '../types';
import './PlayerSetup.css';

interface PlayerSetupProps {
    onStartGame: (numPlayers: number, gridSize: GridSize, playerNames?: string[]) => void;
}

type SetupStep = 'SETUP' | 'MODE_SELECT' | 'OFFLINE_CONFIG' | 'ONLINE_CONFIG';

export const PlayerSetup: React.FC<PlayerSetupProps> = ({ onStartGame }) => {
    const [step, setStep] = useState<SetupStep>('SETUP');
    const [numPlayers, setNumPlayers] = useState<number>(2);
    const [gridSize, setGridSize] = useState<GridSize>(GridSize.SMALL);
    const [playerNames, setPlayerNames] = useState<string[]>([]);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => {
                setIsFullscreen(true);
            }).catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen().then(() => {
                setIsFullscreen(false);
            });
        }
    };

    const increment = () => {
        if (numPlayers < MAX_PLAYERS) setNumPlayers(prev => prev + 1);
    };

    const decrement = () => {
        if (numPlayers > MIN_PLAYERS) setNumPlayers(prev => prev - 1);
    };

    const handleInitialStart = () => {
        setStep('MODE_SELECT');
    };

    const handleModeSelect = (mode: 'ONLINE' | 'OFFLINE') => {
        if (mode === 'OFFLINE') {
            // Initialize empty names or default names
            const initialNames = Array.from({ length: numPlayers }, (_, i) => `Player ${i + 1}`);
            setPlayerNames(initialNames);
            setStep('OFFLINE_CONFIG');
        } else {
            setStep('ONLINE_CONFIG');
        }
    };

    const handleNameChange = (index: number, name: string) => {
        const newNames = [...playerNames];
        newNames[index] = name;
        setPlayerNames(newNames);
    };

    const handleFinalStart = () => {
        onStartGame(numPlayers, gridSize, playerNames);
    };

    const renderSetup = () => (
        <>
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

            <button className="btn-start" onClick={handleInitialStart}>
                Start Game
            </button>
        </>
    );

    const renderModeSelect = () => (
        <div className="mode-select-container">
            <h2>Select Game Mode</h2>
            <div className="mode-buttons">
                <button className="mode-btn" onClick={() => handleModeSelect('OFFLINE')}>
                    Offline (Local)
                </button>
                <button className="mode-btn" onClick={() => handleModeSelect('ONLINE')}>
                    Online (Multiplayer)
                </button>
            </div>
            <button className="btn-back" onClick={() => setStep('SETUP')}>Back</button>
        </div>
    );

    const renderOfflineConfig = () => (
        <div className="offline-config-container">
            <h2>Name Players</h2>
            <div className="player-inputs">
                {playerNames.map((name, i) => (
                    <div key={i} className="player-input-group">
                        <div
                            className="player-color-indicator"
                            style={{ backgroundColor: PLAYER_COLORS[i] }}
                        />
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => handleNameChange(i, e.target.value)}
                            placeholder={`Player ${i + 1}`}
                            className="player-name-input"
                        />
                    </div>
                ))}
            </div>
            <div className="action-buttons">
                <button className="btn-back" onClick={() => setStep('MODE_SELECT')}>Back</button>
                <button className="btn-start" onClick={handleFinalStart}>Play</button>
            </div>
        </div>
    );

    const renderOnlineConfig = () => (
        <div className="online-config-container">
            <h2>Online Multiplayer</h2>
            <p>Share this link with your friends:</p>
            <div className="share-link-box">
                https://chainreaction.game/room/12345
            </div>
            <p className="coming-soon">(Online mode coming soon!)</p>
            <button className="btn-back" onClick={() => setStep('MODE_SELECT')}>Back</button>
        </div>
    );

    return (
        <div className="setup-container">
            <button
                className="fullscreen-toggle"
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
                {isFullscreen ? "⛶" : "⛶"}
            </button>
            <h1 className="setup-title">Deep-Chain Reaction</h1>

            {step === 'SETUP' && renderSetup()}
            {step === 'MODE_SELECT' && renderModeSelect()}
            {step === 'OFFLINE_CONFIG' && renderOfflineConfig()}
            {step === 'ONLINE_CONFIG' && renderOnlineConfig()}

            <footer className="setup-footer">Created by Deepanshu Singh</footer>
        </div>
    );
};
