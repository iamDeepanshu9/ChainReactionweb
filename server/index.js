const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for local dev convenience
        methods: ["GET", "POST"]
    }
});

const PORT = 3001;

// Store room info
const rooms = new Map(); // roomId -> { hostId: string, players: [], maxPlayers: number }

io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    socket.on('join_room', (data) => {
        const { roomId, username, maxPlayers, userId } = data;

        // Join the socket room
        // socket.join(roomId); // Moved down

        let room = rooms.get(roomId);
        if (!room) {
            const limit = maxPlayers || 2;
            // Players array now stores { id: userId, socketId: socket.id, username, ... }
            room = { hostId: socket.id, players: [], maxPlayers: limit };
            rooms.set(roomId, room);
            console.log(`Room ${roomId} created by ${socket.id} (${username}) with limit ${limit}`);
        }

        // Check if player already exists (Reconnect)
        const existingPlayerIndex = room.players.findIndex(p => p.id === userId);

        if (existingPlayerIndex !== -1) {
            // RECONNECTING
            console.log(`User ${username} (${userId}) reconnecting to ${roomId}`);
            room.players[existingPlayerIndex].socketId = socket.id; // Update socket ID
            room.players[existingPlayerIndex].isOnline = true;

            socket.join(roomId);

            if (room.players[existingPlayerIndex].isHost) {
                room.hostId = socket.id; // Update host ID if host reconnected
            }

            // Notify user they joined (restore persistence)
            socket.emit('room_joined', { roomId, userId, isHost: room.players[existingPlayerIndex].isHost });

            // Notify room (optional, maybe "player_back"?)
            // For now, just send player_joined to update list (with new socketId implicitly handled by server logic, but frontend uses userId)
            io.to(roomId).emit('player_joined', room.players);

            // Request state sync from Host (if we are not Host)
            if (!room.players[existingPlayerIndex].isHost) {
                io.to(room.hostId).emit('request_state_sync', { targetSocketId: socket.id });
            }

            return;
        }

        // Check availability for NEW players
        if (room.players.length >= room.maxPlayers) {
            socket.emit('error', 'Room is full');
            return;
        }

        // Join now that we know it's allowed
        socket.join(roomId);

        // Add player to room data
        // Use userId as the stable ID
        const playerInfo = {
            id: userId, // Stable ID
            socketId: socket.id,
            username,
            isHost: socket.id === room.hostId,
            isOnline: true
        };
        room.players.push(playerInfo);

        // Notify user they joined
        socket.emit('room_joined', { roomId, userId, isHost: playerInfo.isHost });

        // Notify everyone in room
        io.to(roomId).emit('player_joined', room.players);

        console.log(`User ${username} joined room ${roomId}`);
    });

    // Host sends this to update everyone's board (Grid, Players, Turn, etc.)
    socket.on('game_state_update', (data) => {
        const { roomId, gameState, targetSocketId } = data;
        if (targetSocketId) {
            // Targeted update (for sync)
            io.to(targetSocketId).emit('game_state_update', gameState);
        } else {
            // Broadcast
            socket.to(roomId).emit('game_state_update', gameState);
        }
    });

    // Server relay for state sync
    // (Actually Host does logic, Server just passes message)
    // We added emit('request_state_sync') above. We need to handle it? No, client listens.

    // Guest sends this to Host to request a move
    socket.on('request_move', (data) => {
        const { roomId, move } = data; // move = { row, col }
        // Find host
        const room = rooms.get(roomId);
        if (room && room.hostId) {
            // Send specifically to host
            // We need to verify sender? 
            // We attach senderId to be sure. socket.id or userId?
            // Host Logic uses userId check.
            // We need to find the userId associated with this socket.
            const player = room.players.find(p => p.socketId === socket.id);
            if (player) {
                io.to(room.hostId).emit('request_move', { ...move, senderId: player.id });
            }
        }
    });

    socket.on('leave_room', (data) => {
        const { roomId } = data;
        const room = rooms.get(roomId);
        if (!room) return;

        console.log(`User ${socket.id} leaving room ${roomId}`);

        // Remove player
        const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
        if (playerIndex !== -1) {
            const player = room.players[playerIndex];
            room.players.splice(playerIndex, 1);

            // Notify others
            io.to(roomId).emit('player_left', { playerId: player.id });
            io.to(roomId).emit('player_joined', room.players); // Send updated list

            // Check if room is empty
            if (room.players.length === 0) {
                rooms.delete(roomId);
                console.log(`Room ${roomId} deleted (empty)`);
            } else if (player.isHost) {
                // Host left! Assign new Host.
                const newHost = room.players[0];
                newHost.isHost = true;
                room.hostId = newHost.socketId;
                console.log(`New host for ${roomId} is ${newHost.username}`);
                // Notify new host?
                io.to(newHost.socketId).emit('you_are_host');
                // Re-broadcast updated list (with new host flag)
                io.to(roomId).emit('player_joined', room.players);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log("User Disconnected", socket.id);
        // Do NOT remove player. Just mark offline?
        rooms.forEach((room, roomId) => {
            const player = room.players.find(p => p.socketId === socket.id);
            if (player) {
                player.isOnline = false;
                // Optional: Notify room of disconnect status?
                // io.to(roomId).emit('player_status_change', { userId: player.id, isOnline: false });
            }
        });
    });
});

server.listen(PORT, () => {
    console.log(`SERVER RUNNING ON PORT ${PORT}`);
});
