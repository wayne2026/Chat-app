import { Request } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    userId?: string;
    username?: string;
}


export const verifyToken = (token: string): { userId: string; username: string } | null => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
            userId: string;
            username: string;
        };
    } catch {
        return null;
    }
};
