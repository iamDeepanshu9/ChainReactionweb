import React, { useEffect } from 'react';
import { useGameLogic } from '../hooks/useGameLogic';
import { Board } from './Board';
import { PlayerSetup } from './PlayerSetup';
import { GameOver } from './GameOver';
import { socket } from '../utils/socket';
import type { Player } from '../types';
import { PlayerType } from '../types';
import { PLAYER_COLORS } from '../constants';

export const GameContainer: React.FC = () => {
    const {
        grid,
        players,
        currentPlayerId,
        isGameOver,
        winner,
        handleCellClick,
        resetGame,
        restartGame,
        isAnimating,
        injectGameState,
        multiplayerConfig,
        turnCount,
        updatePlayers
    } = useGameLogic();

    // Multiplayer State Sync (HOST Broadcast)
    useEffect(() => {
        if (!multiplayerConfig || !multiplayerConfig.isHost || !multiplayerConfig.roomId) return;

        const state = {
            grid,
            players,
            currentPlayerId,
            isGameOver,
            winner,
            turnCount
        };
        socket.emit('game_state_update', { roomId: multiplayerConfig.roomId, gameState: state });
    }, [grid, players, currentPlayerId, isGameOver, winner, turnCount, multiplayerConfig]);

    // Multiplayer State Sync Request Handlers (HOST)
    useEffect(() => {
        if (!multiplayerConfig || !multiplayerConfig.isHost) return;

        const handleSyncRequest = (data: { targetSocketId: string }) => {
            // Host replies to a specific guest who just reconnected/joined
            const state = { grid, players, currentPlayerId, isGameOver, winner, turnCount };
            socket.emit('game_state_update', { roomId: multiplayerConfig.roomId, gameState: state, targetSocketId: data.targetSocketId });
        };

        socket.on('request_state_sync', handleSyncRequest);
        return () => { socket.off('request_state_sync', handleSyncRequest); };
    }, [multiplayerConfig, grid, players, currentPlayerId, isGameOver, winner, turnCount]);

    // General Multiplayer Listeners (GUEST & HOST)
    useEffect(() => {
        if (!multiplayerConfig || !multiplayerConfig.roomId) return;

        if (!multiplayerConfig.isHost) {
            // GUEST: Listen for state updates
            const handleUpdate = (newState: any) => {
                injectGameState(newState);
                // Optional logic: if we just joined, could say "Synced!"
            };
            socket.on('game_state_update', handleUpdate);
            // Request sync immediately upon component mount if we are guest (in case we missed broadcast)
            // But server does this automatically on join.

            return () => { socket.off('game_state_update', handleUpdate); };
        } else {
            // HOST: Listen for move requests
            const handleMoveRequest = (data: { row: number, col: number, senderId: string }) => {
                // SenderID check handled by logic or assumed valid if server passed it?
                // For strict checking:
                if (data.senderId !== currentPlayerId) return;

                handleCellClick(data.row, data.col);
            };
            socket.on('request_move', handleMoveRequest);

            // Listen for new players
            const handlePlayerJoined = (roomPlayers: { id: string, username: string, isHost: boolean }[]) => {
                // Filter out players who are no longer in the room (Left explicitly)
                // But wait, what if they are just offline? Server keeps offline players.
                // So if they are missing from roomPlayers, they are REALLY gone.
                const serverPlayerIds = new Set(roomPlayers.map(p => p.id));
                const filteredCurrent = players.filter(p => serverPlayerIds.has(p.id));
                const currentPlayersMap = new Map(filteredCurrent.map(p => [p.id, p]));

                const newPlayers: Player[] = roomPlayers.map((p, i) => {
                    const existing = currentPlayersMap.get(p.id);
                    if (existing) {
                        return existing; // Keep authoritative state
                    }
                    // New player
                    return {
                        id: p.id,
                        name: p.username,
                        color: PLAYER_COLORS[i % PLAYER_COLORS.length],
                        isAlive: true,
                        order: i,
                        type: PlayerType.HUMAN
                    };
                });

                // Only update if length changed or we really need to (to avoid re-renders or loops)
                // But for now, safe to set.
                updatePlayers(newPlayers);
            };
            socket.on('player_joined', handlePlayerJoined);

            return () => {
                socket.off('request_move', handleMoveRequest);
                socket.off('player_joined', handlePlayerJoined);
            };
        }
    }, [multiplayerConfig, injectGameState, handleCellClick, updatePlayers, currentPlayerId]);

    const onCellClick = (row: number, col: number) => {
        if (!multiplayerConfig) {
            handleCellClick(row, col);
            return;
        }

        if (multiplayerConfig.playerId !== currentPlayerId) return;

        if (multiplayerConfig.isHost) {
            handleCellClick(row, col);
        } else {
            socket.emit('request_move', { roomId: multiplayerConfig.roomId, move: { row, col } });
        }
    };

    if (players.length === 0) {
        return <PlayerSetup onStartGame={resetGame} />;
    }

    const currentPlayer = players.find(p => p.id === currentPlayerId);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            backgroundColor: '#121212',
            color: 'white',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <header style={{
                padding: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: `2px solid ${currentPlayer?.color || '#333'}`,
                transition: 'border-color 0.5s',
                boxShadow: `0 0 20px ${currentPlayer?.color}40`
            }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                    Deep-Chain Reaction
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {multiplayerConfig?.roomId && (
                        <div style={{
                            marginRight: '15px',
                            background: '#333',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.9rem'
                        }}>
                            Room: <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>{multiplayerConfig.roomId}</span>
                        </div>
                    )}
                    <span>Turn :</span>
                    <span style={{
                        color: currentPlayer?.color,
                        fontWeight: 'bold',
                        textShadow: `0 0 10px ${currentPlayer?.color}`
                    }}>
                        {currentPlayer?.name}
                    </span>
                </div>

                <button
                    onClick={() => {
                        // Clear URL to prevent auto-rejoin
                        const newUrl = new URL(window.location.href);
                        newUrl.searchParams.delete('room');
                        window.history.pushState({}, '', newUrl);

                        // Disconnect from multiplayer
                        if (multiplayerConfig) {
                            socket.emit('leave_room', { roomId: multiplayerConfig.roomId });
                            socket.disconnect();
                        }

                        // Reset game state
                        resetGame(0);
                    }}
                    style={{
                        background: 'transparent',
                        border: '1px solid #666',
                        color: '#aaa',
                        padding: '0.5rem 1rem',
                        cursor: 'pointer',
                        borderRadius: '4px'
                    }}
                >
                    Quit
                </button>
            </header>

            {/* Scorecard */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: '1.5rem',
                padding: '0.75rem',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderBottom: '1px solid #222'
            }}>
                {players.map(player => {
                    const cellCount = grid.reduce((acc, row) =>
                        acc + row.filter(cell => cell.owner === player.id).length, 0
                    );
                    const isActive = currentPlayerId === player.id;
                    return (
                        <div key={player.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            opacity: isActive ? 1 : 0.5,
                            transform: isActive ? 'scale(1.05)' : 'scale(1)',
                            transition: 'all 0.3s ease'
                        }}>
                            <div style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                backgroundColor: player.color,
                                boxShadow: isActive ? `0 0 12px ${player.color}` : `0 0 4px ${player.color}`
                            }} />
                            <span style={{ fontSize: '0.9rem', fontWeight: isActive ? 'bold' : 'normal' }}>
                                {player.name}: {cellCount}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Main Board Area */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                <Board grid={grid} players={players} onCellClick={onCellClick} />

                {isAnimating && (
                    <div style={{
                        position: 'absolute', top: 10, right: 10, color: '#666', fontSize: '0.8rem'
                    }}>
                        Chain Reacting...
                    </div>
                )}
            </div>

            {isGameOver && (
                <GameOver
                    winnerId={winner}
                    players={players}
                    onRestart={restartGame}
                />
            )}
        </div>
    );
};
