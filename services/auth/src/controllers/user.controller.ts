import { Request, Response } from 'express';
import { pool } from '../db/postgres';
import { createSuccess, createError } from '@transvirex/shared';

// Shared query — joins drivers + users to return the full Driver shape
const DRIVER_SELECT = `
  SELECT
    d.id,
    d.user_id      AS "userId",
    u.name,
    u.email,
    d.vehicle_type AS "vehicleType",
    d.lat,
    d.lng,
    d.status,
    d.current_load AS "currentLoad",
    d.acceptance_rate AS "acceptanceRate",
    d.experience_days AS "experienceDays"
  FROM drivers d
  JOIN users u ON u.id = d.user_id
`;

// GET /drivers
export async function getDrivers(req: Request, res: Response): Promise<void> {
  try {
    // Optional filter: ?status=available
    const { status } = req.query;
    let query = DRIVER_SELECT;
    const params: string[] = [];

    if (status) {
      query += ' WHERE d.status = $1';
      params.push(status as string);
    }

    const result = await pool.query(query, params);
    res.json(createSuccess(result.rows));
  } catch (err) {
    console.error('[auth] getDrivers error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Failed to fetch drivers'));
  }
}

// GET /drivers/:id
export async function getDriverById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const result = await pool.query(`${DRIVER_SELECT} WHERE d.id = $1`, [id]);

    if (result.rows.length === 0) {
      res.status(404).json(createError('NOT_FOUND', 'Driver not found'));
      return;
    }

    res.json(createSuccess(result.rows[0]));
  } catch (err) {
    console.error('[auth] getDriverById error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Failed to fetch driver'));
  }
}

// GET /drivers/by-user/:userId  — used internally by mission service
export async function getDriverByUserId(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const result = await pool.query(`${DRIVER_SELECT} WHERE d.user_id = $1`, [userId]);

    if (result.rows.length === 0) {
      res.status(404).json(createError('NOT_FOUND', 'Driver not found'));
      return;
    }

    res.json(createSuccess(result.rows[0]));
  } catch (err) {
    console.error('[auth] getDriverByUserId error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Failed to fetch driver'));
  }
}

// PATCH /drivers/:id  — mission service updates status/load/location
export async function updateDriver(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status, lat, lng, currentLoad, acceptanceRate } = req.body;

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (status !== undefined)       { fields.push(`status = $${idx++}`);           values.push(status); }
    if (lat !== undefined)          { fields.push(`lat = $${idx++}`);              values.push(lat); }
    if (lng !== undefined)          { fields.push(`lng = $${idx++}`);              values.push(lng); }
    if (currentLoad !== undefined)  { fields.push(`current_load = $${idx++}`);     values.push(currentLoad); }
    if (acceptanceRate !== undefined){ fields.push(`acceptance_rate = $${idx++}`); values.push(acceptanceRate); }

    if (fields.length === 0) {
      res.status(400).json(createError('NO_FIELDS', 'No fields to update'));
      return;
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE drivers SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id`,
      values
    );

    if (result.rows.length === 0) {
      res.status(404).json(createError('NOT_FOUND', 'Driver not found'));
      return;
    }

    res.json(createSuccess({ updated: true }));
  } catch (err) {
    console.error('[auth] updateDriver error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Failed to update driver'));
  }
}

// GET /users/:id
export async function getUserById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, email, role, name, phone, created_at FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json(createError('NOT_FOUND', 'User not found'));
      return;
    }

    const u = result.rows[0];
    res.json(
      createSuccess({
        id: u.id,
        email: u.email,
        name: u.name,
        phone: u.phone,
        role: u.role,
        createdAt: u.created_at,
      })
    );
  } catch (err) {
    console.error('[auth] getUserById error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Failed to fetch user'));
  }
}
