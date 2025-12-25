import React from 'react';
import { useGameLogic } from '../hooks/useGameLogic';
import { Board } from './Board';
import { PlayerSetup } from './PlayerSetup';
import { GameOver } from './GameOver';

export const GameContainer: React.FC = () => {
    const {
        grid,
        players,
        currentPlayerId,
        isGameOver,
        winner,
        handleCellClick,
        resetGame,
        isAnimating
    } = useGameLogic();

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
                    onClick={() => resetGame(0)} // Reset to setup
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
                <Board grid={grid} players={players} onCellClick={handleCellClick} />

                {/* Visual indicator when animating (optional, blocking interaction via logic already) */}
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
                    onRestart={() => resetGame(players.length)}
                />
            )}
        </div>
    );
};
