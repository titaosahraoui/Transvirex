import { Response, NextFunction } from 'express';
import { createError } from '@transvirex/shared';
import { AuthenticatedRequest } from './requireUser';

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json(createError('FORBIDDEN', `Requires role: ${roles.join(' or ')}`));
      return;
    }
    next();
  };
}
