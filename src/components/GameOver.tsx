import React from 'react';
import type { Player } from '../types';

interface GameOverProps {
    winnerId: string | null;
    players: Player[];
    onRestart: () => void;
}

export const GameOver: React.FC<GameOverProps> = ({ winnerId, players, onRestart }) => {
    const winner = players.find(p => p.id === winnerId);

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 100,
            color: 'white'
        }}>
            <h1 style={{ fontSize: '4rem', color: winner?.color, textShadow: '0 0 20px currentColor' }}>
                {winner ? `${winner.name} Won!` : 'Game Over'}
            </h1>
            <button
                onClick={onRestart}
                style={{
                    marginTop: '2rem',
                    padding: '1rem 2rem',
                    fontSize: '1.5rem',
                    border: '2px solid white',
                    background: 'transparent',
                    color: 'white',
                    cursor: 'pointer',
                    borderRadius: '8px'
                }}
            >
                Play Again
            </button>
        </div>
    );
};
