import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from '@transvirex/shared';

export interface JwtPayload {
  userId: string;
  role: string;
  email: string;
}

// Extend Express Request to carry decoded token
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function verifyToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json(createError('UNAUTHORIZED', 'No token provided'));
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'changeme'
    ) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json(createError('INVALID_TOKEN', 'Invalid or expired token'));
  }
}
