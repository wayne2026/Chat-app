import { Router, Request, Response } from 'express';
import { Message } from '../models/Message';
import { Room } from '../models/Room';
import { User } from '../models/User';
import { verifyToken } from '../middleware/auth';
import mongoose from 'mongoose';

const router = Router();


router.post('/getChatList', async (req: Request, res: Response): Promise<void> => {
    try {
        const { token } = req.body;

        if (!token) {
            res.status(401).json({ message: 'Token required' });
            return;
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            res.status(401).json({ message: 'Invalid token' });
            return;
        }

        // Fetch rooms
        const rooms = await Room.find({
            members: decoded.userId
        }).select('name roomNumber createdAt').sort({ createdAt: -1 });

        // Fetch conversations
        const distinctConversations = await Message.distinct('conversationId', {
            conversationId: { $exists: true, $ne: null },
            $or: [
                { sender: decoded.userId },
                { recipient: decoded.userId }
            ]
        });

        const conversations = await Promise.all(
            distinctConversations.map(async (conversationId) => {
                // conversationId format: "userId1_userId2"
                const userIds = conversationId.split('_');
                const otherUserId = userIds[0] === decoded.userId ? userIds[1] : userIds[0];

                const otherUser = await User.findById(otherUserId).select('username email');

                if (!otherUser) return null;

                return {
                    conversationId,
                    otherUser: {
                        id: otherUser._id,
                        username: otherUser.username,
                        email: otherUser.email
                    }
                };
            })
        ).then(results => results.filter(Boolean));

        res.json({ rooms, conversations });
    } catch (error) {
        console.error('Get chat list error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


router.post('/getChatMessages', async (req: Request, res: Response): Promise<void> => {
    try {
        const { token, room, conversationId } = req.body;

        if (!token) {
            res.status(401).json({ message: 'Token required' });
            return;
        }

        // Verify token
        const decoded = verifyToken(token);
        if (!decoded) {
            res.status(401).json({ message: 'Invalid token' });
            return;
        }

        let query: any = {};

        if (conversationId) {
            // Direct message query
            query.conversationId = conversationId;
        } else if (room) {
            // Room message query
            query.room = room;
        } else {
            res.status(400).json({ message: 'Either room or conversationId required' });
            return;
        }

        const messages = await Message.find(query)
            .sort({ createdAt: -1 })
            .limit(100)


        // Include user info for client-side validation
        res.json({
            messages: messages.reverse(),
            user: {
                id: decoded.userId,
                username: decoded.username
            }
        });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
