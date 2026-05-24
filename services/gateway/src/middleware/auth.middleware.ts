import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from '@transvirex/shared';

interface JwtPayload {
  userId: string;
  role: string;
  email: string;
}

/**
 * Routes that bypass JWT validation.
 * Matched against the *full* path seen by the gateway (not the proxied sub-path).
 */
const PUBLIC_ROUTES: Array<{ method: string; path: string }> = [
  { method: 'POST', path: '/auth/login' },
  { method: 'POST', path: '/auth/register' },
];

/**
 * jwtGuard — applied before every proxy.
 * - Public routes: pass straight through.
 * - Protected routes: verify Bearer token, inject x-user-* headers for downstream services.
 */
export function jwtGuard(req: Request, res: Response, next: NextFunction): void {
  // req.path is the *remaining* path after stripping the mount-point prefix
  // (e.g. POST /auth/login → req.path = '/login' inside the '/auth' sub-stack).
  // Re-assemble the full gateway path with req.baseUrl before comparing.
  const fullPath = req.baseUrl + req.path;
  const isPublic = PUBLIC_ROUTES.some(
    (r) => r.method === req.method && fullPath === r.path
  );

  if (isPublic) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json(createError('UNAUTHORIZED', 'Authentication required'));
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'changeme'
    ) as JwtPayload;

    // Downstream services read these headers instead of re-verifying the JWT
    req.headers['x-user-id']    = decoded.userId;
    req.headers['x-user-role']  = decoded.role;
    req.headers['x-user-email'] = decoded.email;

    next();
  } catch {
    res.status(401).json(createError('INVALID_TOKEN', 'Invalid or expired token'));
  }
}
