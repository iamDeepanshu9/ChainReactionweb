import React from 'react';
import type { Cell as CellType, Player } from '../types';
import './Cell.css';

interface CellProps {
    cell: CellType;
    players: Player[];
    onClick: (row: number, col: number) => void;
}

export const Cell: React.FC<CellProps> = ({ cell, players, onClick }) => {
    const { row, col, count, owner, capacity } = cell;

    const ownerPlayer = players.find(p => p.id === owner);
    const color = ownerPlayer?.color || 'transparent';

    const isUnstable = count >= capacity;

    const renderOrbs = () => {
        const orbs = [];
        if (count === 1) {
            orbs.push(<div key="0" className="orb orb-1" style={{ backgroundColor: color, color: color }} />);
        } else if (count === 2) {
            orbs.push(<div key="0" className="orb pos-0" style={{ backgroundColor: color, color: color }} />);
            orbs.push(<div key="1" className="orb pos-1" style={{ backgroundColor: color, color: color }} />);
        } else if (count >= 3) {
            orbs.push(<div key="0" className="orb tri-0" style={{ backgroundColor: color, color: color }} />);
            orbs.push(<div key="1" className="orb tri-1" style={{ backgroundColor: color, color: color }} />);
            orbs.push(<div key="2" className="orb tri-2" style={{ backgroundColor: color, color: color }} />);
        }
        return orbs;
    };

    return (
        <div
            className={`cell ${isUnstable ? 'unstable' : ''}`}
            onClick={() => onClick(row, col)}
            style={{ borderColor: owner ? color : '#333' }}
        >
            <div
                className={`orb-container ${count > 1 ? 'spinning' : ''}`}
                style={{ color: color }}
            >
                {renderOrbs()}
            </div>
        </div>
    );
};
