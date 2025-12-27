import { io, Socket } from 'socket.io-client';

// Use localhost for now, hardcoded. In production, this would be env var.
const URL = 'http://localhost:3001';

export const socket: Socket = io(URL, {
    autoConnect: false
});

// Helper to get or generate persistent User ID
export const getUserId = (): string => {
    let id = localStorage.getItem('chain_reaction_userid');
    if (!id) {
        id = `user_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
        localStorage.setItem('chain_reaction_userid', id);
    }
    return id;
};

// Helper to join room
export const joinRoom = (roomId: string, username: string, maxPlayers?: number) => {
    socket.connect();
    const userId = getUserId();
    socket.emit('join_room', { roomId, username, userId, maxPlayers });
};

// Helper to leave room
export const leaveRoom = () => {
    socket.disconnect();
};
