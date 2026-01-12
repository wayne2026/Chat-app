import { Router, Request, Response } from 'express';
import { Room } from '../models/Room';
import { verifyToken } from '../middleware/auth';

const router = Router();


router.post('/create', async (req: Request, res: Response): Promise<void> => {
    try {
        const { token, name } = req.body;

        if (!token || !name) {
            res.status(400).json({ message: 'Token and room name required' });
            return;
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            res.status(401).json({ message: 'Invalid token' });
            return;
        }

        // Generate unique room number
        const roomNumber = Math.random().toString(36).substring(2, 8).toUpperCase();

        const room = new Room({
            name: name.trim(),
            roomNumber,
            creator: decoded.userId,
            members: [decoded.userId]
        });

        await room.save();

        res.json({
            room: {
                _id: room._id,
                name: room.name,
                roomNumber: room.roomNumber,
                members: room.members
            }
        });
    } catch (error) {
        console.error('Create room error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


router.post('/join', async (req: Request, res: Response): Promise<void> => {
    try {
        const { token, roomNumber } = req.body;

        if (!token || !roomNumber) {
            res.status(400).json({ message: 'Token and room number required' });
            return;
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            res.status(401).json({ message: 'Invalid token' });
            return;
        }

        const room = await Room.findOne({ roomNumber: roomNumber.toUpperCase() });
        if (!room) {
            res.status(404).json({ message: 'Room not found' });
            return;
        }

        // Add user to members if not already in
        if (!room.members.includes(decoded.userId as any)) {
            room.members.push(decoded.userId as any);
            await room.save();
        }

        res.json({
            room: {
                _id: room._id,
                name: room.name,
                roomNumber: room.roomNumber,
                members: room.members
            }
        });
    } catch (error) {
        console.error('Join room error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});



export default router;
