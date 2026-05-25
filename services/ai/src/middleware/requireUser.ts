import { Request, Response, NextFunction } from 'express';
import { createError } from '@transvirex/shared';

export interface UserContext {
  userId: string;
  role: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: UserContext;
}

export function requireUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const userId = req.headers['x-user-id'] as string | undefined;
  const role   = req.headers['x-user-role'] as string | undefined;
  const email  = req.headers['x-user-email'] as string | undefined;

  if (!userId || !role || !email) {
    res.status(401).json(createError('UNAUTHORIZED', 'Missing user context headers'));
    return;
  }

  req.user = { userId, role, email };
  next();
}
