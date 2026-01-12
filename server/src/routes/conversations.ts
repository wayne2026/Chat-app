import { Router, Request, Response } from 'express';
import { User } from '../models/User';
import { verifyToken } from '../middleware/auth';


const router = Router();

function createConversationId(userId1: string, userId2: string): string {
    const ids = [userId1, userId2].sort();
    return `${ids[0]}_${ids[1]}`;
}

router.post('/start', async (req: Request, res: Response): Promise<void> => {
    try {
        const { token, recipientEmail } = req.body;

        if (!token || !recipientEmail) {
            res.status(400).json({ message: 'Token and recipient email required' });
            return;
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            res.status(401).json({ message: 'Invalid token' });
            return;
        }

        // Find recipient by email
        const recipient = await User.findOne({ email: recipientEmail.toLowerCase() });
        if (!recipient) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        if (recipient._id.toString() === decoded.userId) {
            res.status(400).json({ message: 'Cannot start conversation with yourself' });
            return;
        }

        const conversationId = createConversationId(decoded.userId, recipient._id.toString());

        res.json({
            conversation: {
                conversationId,
                recipientId: recipient._id,
                recipientUsername: recipient.username,
                recipientEmail: recipient.email
            }
        });
    } catch (error) {
        console.error('Start conversation error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});



export default router;
