import axios from 'axios';
import { Response } from 'express';
import { pool } from '../db/postgres';
import { DeliveryEvent } from '../db/mongo';
import { createSuccess, createError } from '@transvirex/shared';
import { AuthenticatedRequest } from '../middleware/requireUser';
import { notifyUser } from '../utils/notify';

const AUTH_URL = process.env.AUTH_SERVICE_URL ?? 'http://localhost:4001';

// ── GET /missions?status=X ────────────────────────────────────────────────────
export async function getMissions(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { status, driverId } = req.query as { status?: string; driverId?: string };

    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (status) {
      conditions.push(`status = $${idx++}`);
      values.push(status);
    }
    if (driverId) {
      conditions.push(`driver_id = $${idx++}`);
      values.push(driverId);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT id, client_name AS "clientName",
              pickup_address AS "pickupAddress",
              pickup_lat AS "pickupLat", pickup_lng AS "pickupLng",
              delivery_address AS "deliveryAddress",
              delivery_lat AS "deliveryLat", delivery_lng AS "deliveryLng",
              deadline, status, driver_id AS "driverId",
              created_by AS "createdBy", created_at AS "createdAt"
       FROM missions ${where}
       ORDER BY created_at DESC`,
      values
    );

    res.json(createSuccess(result.rows));
  } catch (err) {
    console.error('[mission] getMissions error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Failed to fetch missions'));
  }
}

// ── GET /missions/:id ─────────────────────────────────────────────────────────
export async function getMissionById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, client_name AS "clientName",
              pickup_address AS "pickupAddress",
              pickup_lat AS "pickupLat", pickup_lng AS "pickupLng",
              delivery_address AS "deliveryAddress",
              delivery_lat AS "deliveryLat", delivery_lng AS "deliveryLng",
              deadline, status, driver_id AS "driverId",
              created_by AS "createdBy", created_at AS "createdAt"
       FROM missions WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json(createError('NOT_FOUND', 'Mission not found'));
      return;
    }

    res.json(createSuccess(result.rows[0]));
  } catch (err) {
    console.error('[mission] getMissionById error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Failed to fetch mission'));
  }
}

// ── POST /missions ────────────────────────────────────────────────────────────
export async function createMission(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const {
      clientName,
      pickupAddress,
      pickupLat = 0,
      pickupLng = 0,
      deliveryAddress,
      deliveryLat = 0,
      deliveryLng = 0,
      deadline,
    } = req.body;

    if (!clientName || !pickupAddress || !deliveryAddress) {
      res.status(400).json(
        createError('MISSING_FIELDS', 'clientName, pickupAddress, deliveryAddress are required')
      );
      return;
    }

    const createdBy = req.user!.userId;

    const result = await pool.query(
      `INSERT INTO missions
         (client_name, pickup_address, pickup_lat, pickup_lng,
          delivery_address, delivery_lat, delivery_lng, deadline, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, client_name AS "clientName",
                 pickup_address AS "pickupAddress",
                 pickup_lat AS "pickupLat", pickup_lng AS "pickupLng",
                 delivery_address AS "deliveryAddress",
                 delivery_lat AS "deliveryLat", delivery_lng AS "deliveryLng",
                 deadline, status, driver_id AS "driverId",
                 created_by AS "createdBy", created_at AS "createdAt"`,
      [
        clientName,
        pickupAddress,
        pickupLat,
        pickupLng,
        deliveryAddress,
        deliveryLat,
        deliveryLng,
        deadline ?? null,
        createdBy,
      ]
    );

    res.status(201).json(createSuccess(result.rows[0]));
  } catch (err) {
    console.error('[mission] createMission error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Failed to create mission'));
  }
}

// ── PATCH /missions/:id/assign ────────────────────────────────────────────────
// Assign a driver → status: pending → assigned
// After DB update: resolves driver's userId from auth service, then pushes
// a mission:assigned notification so the driver app receives a real-time alert.
export async function assignMission(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { driverId } = req.body;

    if (!driverId) {
      res.status(400).json(createError('MISSING_FIELDS', 'driverId is required'));
      return;
    }

    const current = await pool.query(
      `SELECT status FROM missions WHERE id = $1`,
      [id]
    );

    if (current.rows.length === 0) {
      res.status(404).json(createError('NOT_FOUND', 'Mission not found'));
      return;
    }

    if (current.rows[0].status !== 'pending') {
      res.status(409).json(
        createError('INVALID_TRANSITION', `Cannot assign a mission with status '${current.rows[0].status}'`)
      );
      return;
    }

    const result = await pool.query(
      `UPDATE missions
       SET status = 'assigned', driver_id = $1
       WHERE id = $2
       RETURNING id, client_name AS "clientName",
                 pickup_address AS "pickupAddress", delivery_address AS "deliveryAddress",
                 deadline, status, driver_id AS "driverId", created_at AS "createdAt"`,
      [driverId, id]
    );

    const mission = result.rows[0];
    res.json(createSuccess(mission));

    // Fire-and-forget: resolve driver's userId from auth service, then notify
    Promise.resolve().then(async () => {
      try {
        const driverRes = await axios.get(`${AUTH_URL}/drivers/${driverId}`, {
          headers: {
            'x-user-id':    req.user!.userId,
            'x-user-role':  req.user!.role,
            'x-user-email': req.user!.email,
          },
          timeout: 3000,
        });
        const driverUserId: string = driverRes.data.data.userId;
        await notifyUser('mission:assigned', driverUserId, {
          missionId:       mission.id,
          clientName:      mission.clientName,
          pickupAddress:   mission.pickupAddress,
          deliveryAddress: mission.deliveryAddress,
          deadline:        mission.deadline,
        });
      } catch (err) {
        console.error('[mission] assignMission notify failed:', err);
      }
    });
  } catch (err) {
    console.error('[mission] assignMission error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Failed to assign mission'));
  }
}

// ── PATCH /missions/:id/status ────────────────────────────────────────────────
// Valid transitions:
//   assigned     → in_progress  (driver accepts)
//   assigned     → pending      (driver refuses — clears driver_id)
//   in_progress  → completed
//   in_progress  → failed
// After each transition the dispatcher (created_by) receives a mission:status push.
export async function updateMissionStatus(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const { status, lat = 0, lng = 0, notes } = req.body;

    const VALID_STATUSES = ['pending', 'assigned', 'in_progress', 'completed', 'failed'];
    if (!status || !VALID_STATUSES.includes(status)) {
      res.status(400).json(
        createError('INVALID_STATUS', `status must be one of: ${VALID_STATUSES.join(', ')}`)
      );
      return;
    }

    const current = await pool.query(
      `SELECT status, driver_id, created_by FROM missions WHERE id = $1`,
      [id]
    );

    if (current.rows.length === 0) {
      res.status(404).json(createError('NOT_FOUND', 'Mission not found'));
      return;
    }

    const currentStatus: string   = current.rows[0].status;
    const currentDriverId: string | null = current.rows[0].driver_id;
    const createdBy: string       = current.rows[0].created_by;

    const allowed: Record<string, string[]> = {
      assigned:    ['in_progress', 'pending'],
      in_progress: ['completed', 'failed'],
    };

    if (!allowed[currentStatus]?.includes(status)) {
      res.status(409).json(
        createError(
          'INVALID_TRANSITION',
          `Transition from '${currentStatus}' to '${status}' is not allowed`
        )
      );
      return;
    }

    const newDriverId = status === 'pending' ? null : currentDriverId;

    const result = await pool.query(
      `UPDATE missions
       SET status = $1, driver_id = $2
       WHERE id = $3
       RETURNING id, client_name AS "clientName", status,
                 driver_id AS "driverId", created_at AS "createdAt"`,
      [status, newDriverId, id]
    );

    // Persist delivery event for meaningful driver transitions (not refusals)
    const isDeliveryMilestone = status !== 'pending';
    if (currentDriverId && isDeliveryMilestone) {
      Promise.resolve(
        DeliveryEvent.create({
          mission_id: id,
          driver_id:  currentDriverId,
          status,
          location:   { lat, lng },
          notes,
          timestamp:  new Date(),
        })
      ).catch((mongoErr: unknown) => {
        console.error('[mission] DeliveryEvent save failed:', mongoErr);
      });
    }

    res.json(createSuccess(result.rows[0]));

    // Fire-and-forget: notify dispatcher of the status change (covers all transitions including refusals)
    notifyUser('mission:status', createdBy, {
      missionId: id,
      status,
      driverId:  currentDriverId,
      notes,
    });
  } catch (err) {
    console.error('[mission] updateMissionStatus error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Failed to update mission status'));
  }
}

// ── PATCH /missions/:id/location ──────────────────────────────────────────────
// Driver sends a GPS ping while in_progress.
// Persists a DeliveryEvent to MongoDB and broadcasts driver:location to the dispatcher.
export async function updateDriverLocation(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const { lat, lng } = req.body;

    if (lat === undefined || lng === undefined) {
      res.status(400).json(createError('MISSING_FIELDS', 'lat and lng are required'));
      return;
    }

    const missionRes = await pool.query(
      `SELECT status, created_by FROM missions WHERE id = $1`,
      [id]
    );

    if (missionRes.rows.length === 0) {
      res.status(404).json(createError('NOT_FOUND', 'Mission not found'));
      return;
    }

    if (missionRes.rows[0].status !== 'in_progress') {
      res.status(409).json(
        createError('INVALID_STATUS', 'Location updates are only allowed for in_progress missions')
      );
      return;
    }

    const createdBy: string = missionRes.rows[0].created_by;

    Promise.resolve(
      DeliveryEvent.create({
        mission_id: id,
        driver_id:  req.user!.userId,
        status:     'in_progress',
        location:   { lat, lng },
        timestamp:  new Date(),
      })
    ).catch((err: unknown) => {
      console.error('[mission] location DeliveryEvent save failed:', err);
    });

    notifyUser('driver:location', createdBy, {
      missionId: id,
      driverId:  req.user!.userId,
      lat,
      lng,
    });

    res.json(createSuccess({ missionId: id, lat, lng }));
  } catch (err) {
    console.error('[mission] updateDriverLocation error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Failed to update location'));
  }
}

// ── GET /missions/:id/events ──────────────────────────────────────────────────
export async function getMissionEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const events = await DeliveryEvent.find({ mission_id: id }).sort({ timestamp: 1 });
    res.json(createSuccess(events));
  } catch (err) {
    console.error('[mission] getMissionEvents error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Failed to fetch mission events'));
  }
}
