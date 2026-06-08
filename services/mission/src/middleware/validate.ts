import { Request, Response, NextFunction } from 'express';
import { createError } from '@transvirex/shared';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Rule = {
  optional?: boolean;
  type?: 'number' | 'isoDate';
  min?: number;
  max?: number;
  enum?: readonly string[];
  uuid?: boolean;
};

export function validateIdParam(_req: Request, res: Response, next: NextFunction, id: string): void {
  if (!UUID_RE.test(id)) {
    res.status(400).json(createError('INVALID_PARAM', 'id must be a valid UUID'));
    return;
  }
  next();
}

export function body(schema: Record<string, Rule>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    for (const [field, rule] of Object.entries(schema)) {
      const value = req.body[field];
      const absent = value === undefined || value === null || value === '';

      if (absent) {
        if (!rule.optional) errors.push(`${field} is required`);
        continue;
      }

      if (rule.type === 'number') {
        const n = Number(value);
        if (isNaN(n)) { errors.push(`${field} must be a number`); continue; }
        if (rule.min !== undefined && n < rule.min) errors.push(`${field} must be ≥ ${rule.min}`);
        if (rule.max !== undefined && n > rule.max) errors.push(`${field} must be ≤ ${rule.max}`);
      }

      if (rule.type === 'isoDate' && isNaN(Date.parse(value))) {
        errors.push(`${field} must be a valid ISO date string`);
      }

      if (rule.enum && !rule.enum.includes(value)) {
        errors.push(`${field} must be one of: ${rule.enum.join(', ')}`);
      }

      if (rule.uuid && !UUID_RE.test(value)) {
        errors.push(`${field} must be a valid UUID`);
      }
    }

    if (errors.length > 0) {
      res.status(400).json(createError('VALIDATION_ERROR', errors.join('; ')));
      return;
    }
    next();
  };
}
