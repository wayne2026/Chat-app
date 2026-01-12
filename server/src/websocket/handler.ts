import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { verifyToken } from '../middleware/auth';
import { Message } from '../models/Message';

interface AuthenticatedWebSocket extends WebSocket {
    userId?: string;
    username?: string;
    room?: string;
    conversationId?: string;
}

interface ChatMessage {
    type: 'message' | 'error' | 'switch_chat';
    content?: string;
    sender?: string;
    senderId?: string;
    room?: string;
    conversationId?: string;
    recipientId?: string;
    timestamp?: Date;
    messageId?: string;
}

const clients = new Map<string, Set<AuthenticatedWebSocket>>();
// this is a map of all the clients connected to the socket server its object of all the rooms and everything

export const setupWebSocket = (wss: WebSocketServer): void => {
    wss.on('connection', async (ws: AuthenticatedWebSocket, req: IncomingMessage) => {

        // Extract token from query string
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const token = url.searchParams.get('token');

        if (!token) {
            ws.send(JSON.stringify({ type: 'error', content: 'No token provided' }));
            ws.close();
            return;
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            ws.send(JSON.stringify({ type: 'error', content: 'Invalid token' }));
            ws.close();
            return;
        }

        ws.userId = decoded.userId;
        ws.username = decoded.username;

        ws.on('message', async (data) => {
            try {
                const message: ChatMessage = JSON.parse(data.toString());

                if (message.type === 'switch_chat') {
                    handleSwitchChat(ws, message);
                } else if (message.type === 'message') {
                    await handleMessage(ws, message);
                }
            } catch (error) {
                console.error('WebSocket message error:', error);
                ws.send(JSON.stringify({ type: 'error', content: 'Invalid message format' }));
            }
        });

        ws.on('close', () => {
            const chatId = ws.room || ws.conversationId;
            if (chatId && clients.has(chatId)) {
                clients.get(chatId)!.delete(ws);
            }
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
    });
};

function handleSwitchChat(ws: AuthenticatedWebSocket, message: ChatMessage): void {
    // Remove from current chat
    const currentChatId = ws.room || ws.conversationId;
    if (currentChatId && clients.has(currentChatId)) {
        clients.get(currentChatId)!.delete(ws);
    }

    // Add to new chat
    const newChatId = message.room || message.conversationId;
    if (newChatId) {
        ws.room = message.room;
        ws.conversationId = message.conversationId;

        if (!clients.has(newChatId)) {
            clients.set(newChatId, new Set()); // creates a new room
        }
        clients.get(newChatId)!.add(ws); // add the user in it
    }
}

async function handleMessage(ws: AuthenticatedWebSocket, message: ChatMessage): Promise<void> {
    if (!message.content || !message.content.trim()) return;

    const content = message.content.trim();
    const chatId = ws.room || ws.conversationId;

    // Save message to database
    const messageData: any = {
        sender: ws.userId,
        senderUsername: ws.username,
        content
    };

    if (ws.room) {
        messageData.room = ws.room;
    } else if (ws.conversationId) {
        messageData.conversationId = ws.conversationId;
        messageData.recipient = message.recipientId;
    }

    const savedMessage = new Message(messageData);
    await savedMessage.save();

    // Send message to all users in the chat (except sender)
    const broadcastMessage: ChatMessage = {
        type: 'message',
        messageId: savedMessage._id.toString(),
        sender: ws.username,
        senderId: ws.userId,
        content,
        room: ws.room,
        conversationId: ws.conversationId,
        timestamp: savedMessage.createdAt
    };

    broadcastToChat(chatId!, broadcastMessage, ws);
}

function broadcastToChat(chatId: string, message: ChatMessage, exclude?: WebSocket): void {
    const roomClients = clients.get(chatId); // get all the clients connected to this chat id
    if (!roomClients) return;

    const messageStr = JSON.stringify(message);
    roomClients.forEach((client) => {
        if (client !== exclude && client.readyState === WebSocket.OPEN) {
            client.send(messageStr);
        }
    });
}
