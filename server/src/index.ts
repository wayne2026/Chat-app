import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import messageRoutes from './routes/messages';
import roomRoutes from './routes/rooms';
import conversationRoutes from './routes/conversations';
import { setupWebSocket } from './websocket/handler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes); // this is for authentication
app.use('/api/messages', messageRoutes); // this has all the rooms and the conversations
app.use('/api/rooms', roomRoutes);  //this is for joining and creating rooms    
app.use('/api/conversations', conversationRoutes); // this is to start a conversation with a user



// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });
setupWebSocket(wss);

// Connect to MongoDB and start server
const startServer = async (): Promise<void> => {
    try {
        const mongoUri = process.env.MONGODB_URI || ' ';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        server.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
            console.log(`WebSocket server running on ws://localhost:${PORT}/ws`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
