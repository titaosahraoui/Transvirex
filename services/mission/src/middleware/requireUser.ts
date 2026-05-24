import { Request, Response, NextFunction } from 'express';
import { createError } from '@transvirex/shared';

/**
 * The gateway injects x-user-* headers after verifying the JWT.
 * Downstream services read these headers instead of re-verifying the token.
 */
export interface UserContext {
  userId: string;
  role: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: UserContext;
}

/**
 * requireUser — attaches req.user from gateway-injected headers.
 * Returns 401 if the headers are missing (request did not come through the gateway).
 */
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
