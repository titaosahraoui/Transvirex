import { Request, Response, NextFunction } from 'express';
import { createError } from '@transvirex/shared';

/** Middleware factory — returns 400 if any listed field is missing from req.body */
export function requireFields(...fields: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missing = fields.filter(
      (f) => req.body[f] === undefined || req.body[f] === null || req.body[f] === ''
    );
    if (missing.length > 0) {
      res
        .status(400)
        .json(createError('MISSING_FIELDS', `Missing required fields: ${missing.join(', ')}`));
      return;
    }
    next();
  };
}
