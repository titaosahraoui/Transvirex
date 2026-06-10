import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db/postgres";
import {
  createSuccess,
  createError,
  RegisterRequest,
  LoginRequest,
} from "@transvirex/shared";
import { AuthRequest } from "../middleware/jwt";

const JWT_SECRET = process.env.JWT_SECRET || "changeme";
// Cast to any — JWT_EXPIRES_IN is a valid duration string ('7d', '24h', etc.)
// but @types/jsonwebtoken v9+ requires the narrow `StringValue` type from `ms`
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || "7d") as any;

// POST /auth/register
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, name, phone, role } = req.body as RegisterRequest;

    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);
    if (existing.rows.length > 0) {
      res
        .status(409)
        .json(createError("USER_EXISTS", "Email already registered"));
      return;
    }

    const validRoles = ["driver", "dispatcher", "billing", "management"];
    if (!validRoles.includes(role)) {
      res
        .status(400)
        .json(
          createError(
            "INVALID_ROLE",
            `Role must be one of: ${validRoles.join(", ")}`,
          ),
        );
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role, name, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, role, name, phone, created_at`,
      [email, passwordHash, role, name, phone ?? null],
    );

    const user = result.rows[0];

    // Drivers get an entry in the drivers table automatically
    if (role === "driver") {
      await pool.query("INSERT INTO drivers (user_id) VALUES ($1)", [user.id]);
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );

    res.status(201).json(
      createSuccess({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          createdAt: user.created_at,
        },
        token,
      }),
    );
  } catch (err) {
    console.error("[auth] register error:", err);
    res.status(500).json(createError("INTERNAL_ERROR", "Registration failed"));
  }
}

// POST /auth/login
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body as LoginRequest;

    const result = await pool.query(
      "SELECT id, email, password_hash, role, name, phone, created_at FROM users WHERE email = $1",
      [email],
    );

    if (result.rows.length === 0) {
      res
        .status(401)
        .json(createError("INVALID_CREDENTIALS", "Invalid email or password"));
      return;
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      res
        .status(401)
        .json(createError("INVALID_CREDENTIALS", "Invalid email or password"));
      return;
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );

    res.json(
      createSuccess({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          createdAt: user.created_at,
        },
        token,
      }),
    );
  } catch (err) {
    console.error("[auth] login error:", err);
    res.status(500).json(createError("INTERNAL_ERROR", "Login failed"));
  }
}

// Management-only guard (chained after verifyToken)
export function requireManagement(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'management') {
    res.status(403).json(createError('FORBIDDEN', 'Management access required'));
    return;
  }
  next();
}

// GET /auth/me  (requires verifyToken middleware)
export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;

    const result = await pool.query(
      "SELECT id, email, role, name, phone, created_at FROM users WHERE id = $1",
      [userId],
    );

    if (result.rows.length === 0) {
      res.status(404).json(createError("NOT_FOUND", "User not found"));
      return;
    }

    const user = result.rows[0];
    res.json(
      createSuccess({
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        createdAt: user.created_at,
      }),
    );
  } catch (err) {
    console.error("[auth] getMe error:", err);
    res.status(500).json(createError("INTERNAL_ERROR", "Failed to fetch user"));
  }
}

// GET /auth/users?role=X  (management only)
export async function listUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { role } = req.query as { role?: string };
    const validRoles = ['driver', 'dispatcher', 'billing', 'management'];
    const values: string[] = [];
    let query = `SELECT id, email, name, phone, role, created_at AS "createdAt" FROM users`;
    if (role && validRoles.includes(role)) {
      query += ' WHERE role = $1';
      values.push(role);
    }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, values);
    res.json(createSuccess(result.rows));
  } catch (err) {
    console.error('[auth] listUsers error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Failed to list users'));
  }
}

// POST /auth/users  (management only — create staff account)
export async function createManagedUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, email, password, role, phone } = req.body;

    const staffRoles = ['dispatcher', 'billing', 'management'];
    if (!staffRoles.includes(role)) {
      res.status(400).json(createError('INVALID_ROLE', 'Role must be dispatcher, billing, or management — drivers self-register'));
      return;
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      res.status(409).json(createError('USER_EXISTS', 'Email already registered'));
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role, name, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, role, name, phone, created_at AS "createdAt"`,
      [email, passwordHash, role, name, phone ?? null]
    );

    res.status(201).json(createSuccess(result.rows[0]));
  } catch (err) {
    console.error('[auth] createManagedUser error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Failed to create user'));
  }
}

// GET /auth/dispatchers  (any authenticated user — used by drivers to find who to message)
export async function listDispatchers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT id, name, email FROM users WHERE role = 'dispatcher' ORDER BY name`
    );
    res.json(createSuccess(result.rows));
  } catch (err) {
    console.error('[auth] listDispatchers error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Failed to list dispatchers'));
  }
}

// DELETE /auth/users/:id  (management only)
export async function deleteUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      res.status(404).json(createError('NOT_FOUND', 'User not found'));
      return;
    }
    res.status(204).send();
  } catch (err) {
    console.error('[auth] deleteUser error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Failed to delete user'));
  }
}
