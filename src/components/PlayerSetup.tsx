import React, { useState } from 'react';
import { MAX_PLAYERS, MIN_PLAYERS, PLAYER_COLORS } from '../constants';
import { GridSize, Difficulty } from '../types';
import type { MultiplayerConfig } from '../types';
import { socket, getUserId } from '../utils/socket';
import './PlayerSetup.css';

interface PlayerSetupProps {
    onStartGame: (numPlayers: number, gridSize: GridSize, playerNames?: string[], isSinglePlayer?: boolean, difficulty?: Difficulty, multiplayerConfig?: MultiplayerConfig) => void;
}

type SetupStep = 'SETUP' | 'MODE_SELECT' | 'OFFLINE_CONFIG' | 'ONLINE_CONFIG' | 'DIFFICULTY_SELECT';

export const PlayerSetup: React.FC<PlayerSetupProps> = ({ onStartGame }) => {
    const [step, setStep] = useState<SetupStep>('SETUP');
    const [numPlayers, setNumPlayers] = useState<number>(2);
    const [gridSize, setGridSize] = useState<GridSize>(GridSize.SMALL);
    const [playerNames, setPlayerNames] = useState<string[]>([]);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.EASY);

    // Online Config State
    const [onlineName, setOnlineName] = useState(localStorage.getItem('chain_reaction_username') || "");
    const [roomIdInput, setRoomIdInput] = useState("");
    const [isJoining, setIsJoining] = useState(false);
    const [joinError, setJoinError] = useState("");

    React.useEffect(() => {
        // Check for Room ID in URL
        const params = new URLSearchParams(window.location.search);
        const urlRoomId = params.get('room');

        if (urlRoomId) {
            setRoomIdInput(urlRoomId);
            setStep('ONLINE_CONFIG');

            // Auto-Join if we have a name
            const savedName = localStorage.getItem('chain_reaction_username');
            if (savedName) {
                console.log("Auto-joining room:", urlRoomId, "as", savedName);
                setIsJoining(true);
                // No need to disconnect/connect here usually, but to be safe:
                // socket.connected logic? socket.connect() is idempotent-ish.
                if (!socket.connected) socket.connect();
                socket.emit('join_room', { roomId: urlRoomId, username: savedName, userId: getUserId() });
            }
        }

        const handleRoomJoined = (data: { roomId: string, userId: string, isHost: boolean }) => {
            setIsJoining(false);

            // Save username for future auto-joins
            localStorage.setItem('chain_reaction_username', onlineName || data.userId); // data.userId as fallback? No, onlineName should be set.

            // Update URL
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set('room', data.roomId);
            window.history.pushState({}, '', newUrl);

            // Pass numPlayers = 1 to ensure game initializes. New players are added via socket events.
            onStartGame(1, gridSize, [onlineName], false, Difficulty.EASY, {
                mode: data.isHost ? 'HOST' : 'GUEST',
                roomId: data.roomId,
                isHost: data.isHost,
                username: onlineName,
                playerId: data.userId
            });
        };

        const handleError = (msg: string) => {
            setIsJoining(false);
            setJoinError(msg);
            socket.disconnect(); // Ensure we don't stay half-connected or retry loops
        };

        socket.on('room_joined', handleRoomJoined);
        socket.on('error', handleError);

        return () => {
            socket.off('room_joined', handleRoomJoined);
            socket.off('error', handleError);
        };
    }, [onStartGame, gridSize, onlineName]);

    const handleCreateRoom = () => {
        if (!onlineName.trim()) {
            setJoinError("Please enter a name");
            return;
        }
        localStorage.setItem('chain_reaction_username', onlineName); // Save name
        setIsJoining(true);
        // Generate random room ID
        const roomId = Math.random().toString(36).substring(2, 7).toUpperCase();
        socket.disconnect();
        socket.connect();
        // Send maxPlayers (from numPlayers state)
        socket.emit('join_room', { roomId, username: onlineName, userId: getUserId(), maxPlayers: numPlayers });
    };

    const handleJoinRoom = () => {
        if (!onlineName.trim() || !roomIdInput.trim()) {
            setJoinError("Please enter name and room ID");
            return;
        }
        localStorage.setItem('chain_reaction_username', onlineName); // Save name
        setIsJoining(true);
        socket.disconnect();
        socket.connect();
        socket.emit('join_room', { roomId: roomIdInput, username: onlineName, userId: getUserId() });
    };

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

    const handleModeSelect = (mode: 'ONLINE' | 'OFFLINE' | 'SINGLE_PLAYER') => {
        if (mode === 'OFFLINE') {
            const initialNames = Array.from({ length: numPlayers }, (_, i) => `Player ${i + 1}`);
            setPlayerNames(initialNames);
            setStep('OFFLINE_CONFIG');
        } else if (mode === 'SINGLE_PLAYER') {
            setNumPlayers(2); // Single player is always 2 players (User vs Bot)
            // Default names
            setPlayerNames(["Player 1 (You)", "Bot"]);
            setStep('DIFFICULTY_SELECT');
        } else {
            setStep('ONLINE_CONFIG');
        }
    };

    const handleNameChange = (index: number, name: string) => {
        const newNames = [...playerNames];
        newNames[index] = name;
        setPlayerNames(newNames);
    };

    const handleFinalStart = (mode: 'OFFLINE' | 'SINGLE_PLAYER') => {
        if (mode === 'SINGLE_PLAYER') {
            onStartGame(2, gridSize, playerNames, true, difficulty);
        } else {
            onStartGame(numPlayers, gridSize, playerNames, false);
        }
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
                <button className="mode-btn" onClick={() => handleModeSelect('SINGLE_PLAYER')}>
                    Single Player (vs Bot)
                </button>
                <button className="mode-btn" onClick={() => handleModeSelect('OFFLINE')}>
                    Offline (Local Multiplayer)
                </button>
                <button className="mode-btn" onClick={() => handleModeSelect('ONLINE')}>
                    Online (Multiplayer)
                </button>
            </div>
            <button className="btn-back" onClick={() => setStep('SETUP')}>Back</button>
        </div>
    );

    const renderDifficultySelect = () => (
        <div className="difficulty-select-container">
            <h2>Select Difficulty</h2>
            <div className="difficulty-buttons">
                {(Object.keys(Difficulty) as Array<keyof typeof Difficulty>).map((diffKey) => (
                    <button
                        key={diffKey}
                        className={`mode-btn ${difficulty === Difficulty[diffKey] ? 'active-diff' : ''}`}
                        onClick={() => setDifficulty(Difficulty[diffKey])}
                        style={{ backgroundColor: difficulty === Difficulty[diffKey] ? '#4CAF50' : '' }}
                    >
                        {diffKey}
                    </button>
                ))}
            </div>
            <div className="action-buttons">
                <button className="btn-back" onClick={() => setStep('MODE_SELECT')}>Back</button>
                <button className="btn-start" onClick={() => handleFinalStart('SINGLE_PLAYER')}>Play vs Bot</button>
            </div>
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
                <button className="btn-start" onClick={() => handleFinalStart('OFFLINE')}>Play</button>
            </div>
        </div>
    );

    const renderOnlineConfig = () => (
        <div className="online-config-container">
            <h2>Online Multiplayer</h2>

            <div className="input-group">
                <label>Your Name:</label>
                <input
                    type="text"
                    value={onlineName}
                    onChange={(e) => setOnlineName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (roomIdInput ? handleJoinRoom() : handleCreateRoom())}
                    placeholder="Enter your name"
                    className="player-name-input"
                    autoFocus
                />
            </div>

            <div className="online-actions">
                <div className="action-box">
                    <h3>Create New Room</h3>
                    <button className="btn-start" onClick={handleCreateRoom} disabled={isJoining}>
                        {isJoining ? "Creating..." : "Create Room"}
                    </button>
                </div>

                <div className="divider">OR</div>

                <div className="action-box">
                    <h3>Join Existing Room</h3>
                    <input
                        type="text"
                        value={roomIdInput}
                        onChange={(e) => setRoomIdInput(e.target.value)}
                        placeholder="Enter Room ID"
                        className="player-name-input"
                        style={{ marginBottom: '10px' }}
                    />
                    <button className="btn-start" onClick={handleJoinRoom} disabled={isJoining}>
                        {isJoining ? "Joining..." : "Join Room"}
                    </button>
                </div>
            </div>

            {joinError && <p className="error-text">{joinError}</p>}

            <button className="btn-back" onClick={() => setStep('MODE_SELECT')} disabled={isJoining}>Back</button>
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
            {step === 'DIFFICULTY_SELECT' && renderDifficultySelect()}
            {step === 'OFFLINE_CONFIG' && renderOfflineConfig()}
            {step === 'ONLINE_CONFIG' && renderOnlineConfig()}

            <footer className="setup-footer">Created by Deepanshu Singh</footer>
        </div>
    );
};
