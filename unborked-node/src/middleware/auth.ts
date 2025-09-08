import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Define interface to extend Express Request
interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    username: string;
    [key: string]: any;
  };
}

export const authenticateToken = (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
    req.user = user as { userId: number; username: string; };
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};