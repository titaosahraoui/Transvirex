import axios from 'axios';
import { Response } from 'express';
import { pool } from '../db/postgres';
import { DeliveryEvent } from '../db/mongo';
import { createSuccess, createError } from '@transvirex/shared';
import { AuthenticatedRequest } from '../middleware/requireUser';
import { notifyUser } from '../utils/notify';

const AUTH_URL    = process.env.AUTH_SERVICE_URL    ?? 'http://localhost:4001';
const BILLING_URL = process.env.BILLING_SERVICE_URL ?? 'http://localhost:4003';

const ORDER_MAP: Record<string, string> = {
  created_asc:   'created_at ASC',
  created_desc:  'created_at DESC',
  deadline_asc:  'deadline ASC NULLS LAST',
  deadline_desc: 'deadline DESC NULLS LAST',
  priority_desc: "CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END ASC",
  price_desc:    'price DESC',
};

// ── GET /missions ─────────────────────────────────────────────────────────────
// Supports: ?status=X &driverId=Y &from=ISO &to=ISO &search=X &priority=X &missionType=X &sort=X &page=1 &limit=20
export async function getMissions(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { status, driverId, from, to, search, priority, missionType, sort, page: pageStr, limit: limitStr } =
      req.query as Record<string, string | undefined>;

    const page  = Math.max(1, parseInt(pageStr  ?? '1',  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitStr ?? '20', 10) || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (status)      { conditions.push(`status = $${idx++}`);                  values.push(status); }
    if (driverId)    { conditions.push(`driver_id = $${idx++}`);               values.push(driverId); }
    if (from)        { conditions.push(`created_at >= $${idx++}`);             values.push(from); }
    if (to)          { conditions.push(`created_at <= $${idx++}`);             values.push(to); }
    if (search)      { conditions.push(`client_name ILIKE $${idx++}`);         values.push(`%${search}%`); }
    if (priority)    { conditions.push(`priority = $${idx++}`);                values.push(priority); }
    if (missionType) { conditions.push(`mission_type = $${idx++}`);            values.push(missionType); }

    const where   = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderBy = ORDER_MAP[sort ?? ''] ?? 'created_at DESC';

    const [countResult, dataResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM missions ${where}`, values),
      pool.query(
        `SELECT id, client_name AS "clientName",
                pickup_address AS "pickupAddress",
                pickup_lat AS "pickupLat", pickup_lng AS "pickupLng",
                delivery_address AS "deliveryAddress",
                delivery_lat AS "deliveryLat", delivery_lng AS "deliveryLng",
                deadline, status, driver_id AS "driverId",
                created_by AS "createdBy", created_at AS "createdAt",
                price, mission_type AS "missionType", weight_kg AS "weightKg",
                notes, priority,
                completed_at AS "completedAt", rejected_reason AS "rejectedReason"
         FROM missions ${where}
         ORDER BY ${orderBy}
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, limit, offset]
      ),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);

    res.json(createSuccess({
      items:      dataResult.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }));
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
              created_by AS "createdBy", created_at AS "createdAt",
              price, mission_type AS "missionType", weight_kg AS "weightKg",
              notes, priority,
              completed_at AS "completedAt", rejected_reason AS "rejectedReason",
              pod_photo_url AS "podPhotoUrl"
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
      clientName, pickupAddress, pickupLat = 0, pickupLng = 0,
      deliveryAddress, deliveryLat = 0, deliveryLng = 0, deadline,
      price = 0, missionType = 'standard', weightKg = 0, notes, priority = 'medium',
    } = req.body;

    if (!clientName || !pickupAddress || !deliveryAddress) {
      res.status(400).json(
        createError('MISSING_FIELDS', 'clientName, pickupAddress, deliveryAddress are required')
      );
      return;
    }

    const result = await pool.query(
      `INSERT INTO missions
         (client_name, pickup_address, pickup_lat, pickup_lng,
          delivery_address, delivery_lat, delivery_lng, deadline,
          price, mission_type, weight_kg, notes, priority, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id, client_name AS "clientName",
                 pickup_address AS "pickupAddress",
                 pickup_lat AS "pickupLat", pickup_lng AS "pickupLng",
                 delivery_address AS "deliveryAddress",
                 delivery_lat AS "deliveryLat", delivery_lng AS "deliveryLng",
                 deadline, status, driver_id AS "driverId",
                 created_by AS "createdBy", created_at AS "createdAt",
                 price, mission_type AS "missionType", weight_kg AS "weightKg",
                 notes, priority`,
      [clientName, pickupAddress, pickupLat, pickupLng,
       deliveryAddress, deliveryLat, deliveryLng, deadline ?? null,
       price, missionType, weightKg, notes ?? null, priority, req.user!.userId]
    );

    res.status(201).json(createSuccess(result.rows[0]));
  } catch (err) {
    console.error('[mission] createMission error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Failed to create mission'));
  }
}

// ── PATCH /missions/:id/assign ────────────────────────────────────────────────
export async function assignMission(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { driverId } = req.body;

    if (!driverId) {
      res.status(400).json(createError('MISSING_FIELDS', 'driverId is required'));
      return;
    }

    const current = await pool.query(`SELECT status FROM missions WHERE id = $1`, [id]);

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
      `UPDATE missions SET status = 'assigned', driver_id = $1 WHERE id = $2
       RETURNING id, client_name AS "clientName",
                 pickup_address AS "pickupAddress", delivery_address AS "deliveryAddress",
                 deadline, status, driver_id AS "driverId", created_at AS "createdAt"`,
      [driverId, id]
    );

    const mission = result.rows[0];
    res.json(createSuccess(mission));

    Promise.resolve().then(async () => {
      try {
        const driverRes = await axios.get(`${AUTH_URL}/drivers/${driverId}`, {
          headers: { 'x-user-id': req.user!.userId, 'x-user-role': req.user!.role, 'x-user-email': req.user!.email },
          timeout: 3000,
        });
        await notifyUser('mission:assigned', driverRes.data.data.userId, {
          missionId: mission.id, clientName: mission.clientName,
          pickupAddress: mission.pickupAddress, deliveryAddress: mission.deliveryAddress,
          deadline: mission.deadline,
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

// ── PATCH /missions/:id/cancel ────────────────────────────────────────────────
// Dispatchers cancel a mission that hasn't started yet.
// pending → cancelled  (simple, no driver to notify)
// assigned → cancelled (notify the assigned driver)
export async function cancelMission(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const current = await pool.query(
      `SELECT status, driver_id, created_by FROM missions WHERE id = $1`, [id]
    );

    if (current.rows.length === 0) {
      res.status(404).json(createError('NOT_FOUND', 'Mission not found'));
      return;
    }

    const { status: currentStatus, driver_id: driverId, created_by: createdBy } = current.rows[0];

    if (!['pending', 'assigned'].includes(currentStatus)) {
      res.status(409).json(
        createError('INVALID_TRANSITION', `Cannot cancel a mission with status '${currentStatus}'`)
      );
      return;
    }

    const result = await pool.query(
      `UPDATE missions SET status = 'cancelled', driver_id = NULL WHERE id = $1
       RETURNING id, client_name AS "clientName", status,
                 driver_id AS "driverId", created_at AS "createdAt"`,
      [id]
    );

    res.json(createSuccess(result.rows[0]));

    Promise.resolve().then(async () => {
      try {
        if (driverId && currentStatus === 'assigned') {
          const driverRes = await axios.get(`${AUTH_URL}/drivers/${driverId}`, {
            headers: { 'x-user-id': req.user!.userId, 'x-user-role': req.user!.role, 'x-user-email': req.user!.email },
            timeout: 3000,
          });
          await notifyUser('mission:status', driverRes.data.data.userId, { missionId: id, status: 'cancelled' });
        }
        await notifyUser('mission:status', createdBy, { missionId: id, status: 'cancelled' });
      } catch (err) {
        console.error('[mission] cancelMission notify failed:', err);
      }
    });
  } catch (err) {
    console.error('[mission] cancelMission error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Failed to cancel mission'));
  }
}

// ── PATCH /missions/:id/status ────────────────────────────────────────────────
// Valid transitions:
//   assigned    → in_progress  (driver accepts)
//   assigned    → pending      (driver refuses — clears driver_id)
//   in_progress → completed    (accepts podPhotoUrl, notes)
//   in_progress → failed
export async function updateMissionStatus(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const { status, lat = 0, lng = 0, notes, podPhotoUrl } = req.body;

    const VALID_STATUSES = ['pending', 'assigned', 'in_progress', 'completed', 'failed'];
    if (!status || !VALID_STATUSES.includes(status)) {
      res.status(400).json(
        createError('INVALID_STATUS', `status must be one of: ${VALID_STATUSES.join(', ')}`)
      );
      return;
    }

    const current = await pool.query(
      `SELECT status, driver_id, created_by,
              client_name AS "clientName", price
       FROM missions WHERE id = $1`, [id]
    );

    if (current.rows.length === 0) {
      res.status(404).json(createError('NOT_FOUND', 'Mission not found'));
      return;
    }

    const currentStatus: string        = current.rows[0].status;
    const currentDriverId: string|null = current.rows[0].driver_id;
    const createdBy: string            = current.rows[0].created_by;

    const allowed: Record<string, string[]> = {
      assigned:    ['in_progress', 'pending'],
      in_progress: ['completed', 'failed'],
    };

    if (!allowed[currentStatus]?.includes(status)) {
      res.status(409).json(
        createError('INVALID_TRANSITION', `Transition from '${currentStatus}' to '${status}' is not allowed`)
      );
      return;
    }

    const newDriverId = status === 'pending' ? null : currentDriverId;
    const completedAtClause = status === 'completed' ? ', completed_at = NOW()' : '';

    const result = await pool.query(
      `UPDATE missions SET status = $1, driver_id = $2${completedAtClause} WHERE id = $3
       RETURNING id, client_name AS "clientName",
                 pickup_address AS "pickupAddress", delivery_address AS "deliveryAddress",
                 deadline, status, driver_id AS "driverId",
                 created_by AS "createdBy", created_at AS "createdAt",
                 completed_at AS "completedAt"`,
      [status, newDriverId, id]
    );

    const isDeliveryMilestone = status !== 'pending';
    if (currentDriverId && isDeliveryMilestone) {
      Promise.resolve(
        DeliveryEvent.create({
          mission_id: id, driver_id: currentDriverId, status,
          location: { lat, lng }, notes, podPhotoUrl, timestamp: new Date(),
        })
      ).catch((err: unknown) => console.error('[mission] DeliveryEvent save failed:', err));
    }

    res.json(createSuccess(result.rows[0]));

    notifyUser('mission:status', createdBy, { missionId: id, status, driverId: currentDriverId, notes });

    if (status === 'completed') {
      Promise.resolve().then(async () => {
        try {
          await axios.post(`${BILLING_URL}/billing/invoices`, {
            missionId: id,
            clientName: current.rows[0].clientName,
            amount: parseFloat(current.rows[0].price) || 0,
          }, {
            headers: {
              'x-user-id':    createdBy,
              'x-user-role':  'dispatcher',
              'x-user-email': 'system@transvirex.internal',
            },
          });
        } catch (err) {
          console.error('[mission] auto-invoice creation failed:', err);
        }
      });
    }
  } catch (err) {
    console.error('[mission] updateMissionStatus error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Failed to update mission status'));
  }
}

// ── PATCH /missions/:id/location ──────────────────────────────────────────────
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
      `SELECT status, driver_id, created_by FROM missions WHERE id = $1`, [id]
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
        mission_id: id, driver_id: req.user!.userId,
        status: 'in_progress', location: { lat, lng }, timestamp: new Date(),
      })
    ).catch((err: unknown) => console.error('[mission] location DeliveryEvent save failed:', err));

    notifyUser('driver:location', createdBy, { missionId: id, driverId: req.user!.userId, lat, lng });

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

// ── PATCH /missions/:id ───────────────────────────────────────────────────────
// Edit mission fields. Only allowed when status is pending or assigned.
export async function updateMission(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const {
      clientName, pickupAddress, pickupLat, pickupLng,
      deliveryAddress, deliveryLat, deliveryLng, deadline,
      price, missionType, weightKg, notes, priority,
    } = req.body;

    const current = await pool.query('SELECT status FROM missions WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      res.status(404).json(createError('NOT_FOUND', 'Mission not found'));
      return;
    }
    if (!['pending', 'assigned'].includes(current.rows[0].status)) {
      res.status(409).json(
        createError('INVALID_STATE', `Cannot edit a mission with status '${current.rows[0].status}'`)
      );
      return;
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (clientName      !== undefined) { fields.push(`client_name = $${idx++}`);      values.push(clientName); }
    if (pickupAddress   !== undefined) { fields.push(`pickup_address = $${idx++}`);   values.push(pickupAddress); }
    if (pickupLat       !== undefined) { fields.push(`pickup_lat = $${idx++}`);       values.push(pickupLat); }
    if (pickupLng       !== undefined) { fields.push(`pickup_lng = $${idx++}`);       values.push(pickupLng); }
    if (deliveryAddress !== undefined) { fields.push(`delivery_address = $${idx++}`); values.push(deliveryAddress); }
    if (deliveryLat     !== undefined) { fields.push(`delivery_lat = $${idx++}`);     values.push(deliveryLat); }
    if (deliveryLng     !== undefined) { fields.push(`delivery_lng = $${idx++}`);     values.push(deliveryLng); }
    if (deadline        !== undefined) { fields.push(`deadline = $${idx++}`);         values.push(deadline ?? null); }
    if (price           !== undefined) { fields.push(`price = $${idx++}`);           values.push(price); }
    if (missionType     !== undefined) { fields.push(`mission_type = $${idx++}`);   values.push(missionType); }
    if (weightKg        !== undefined) { fields.push(`weight_kg = $${idx++}`);      values.push(weightKg); }
    if (notes           !== undefined) { fields.push(`notes = $${idx++}`);          values.push(notes ?? null); }
    if (priority        !== undefined) { fields.push(`priority = $${idx++}`);       values.push(priority); }

    if (fields.length === 0) {
      res.status(400).json(createError('MISSING_FIELDS', 'At least one field to update is required'));
      return;
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE missions SET ${fields.join(', ')} WHERE id = $${idx}
       RETURNING id, client_name AS "clientName",
                 pickup_address AS "pickupAddress", pickup_lat AS "pickupLat", pickup_lng AS "pickupLng",
                 delivery_address AS "deliveryAddress", delivery_lat AS "deliveryLat", delivery_lng AS "deliveryLng",
                 deadline, status, driver_id AS "driverId",
                 created_by AS "createdBy", created_at AS "createdAt",
                 price, mission_type AS "missionType", weight_kg AS "weightKg",
                 notes, priority`,
      values
    );
    res.json(createSuccess(result.rows[0]));
  } catch (err) {
    console.error('[mission] updateMission error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Failed to update mission'));
  }
}

// ── PATCH /missions/:id/reassign ──────────────────────────────────────────────
// Reassign an already-assigned mission to a different driver.
// Notifies the old driver (cancelled) and the new driver (assigned).
export async function reassignMission(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { driverId: newDriverId } = req.body;

    if (!newDriverId) {
      res.status(400).json(createError('MISSING_FIELDS', 'driverId is required'));
      return;
    }

    const current = await pool.query(
      'SELECT status, driver_id FROM missions WHERE id = $1', [id]
    );
    if (current.rows.length === 0) {
      res.status(404).json(createError('NOT_FOUND', 'Mission not found'));
      return;
    }
    if (current.rows[0].status !== 'assigned') {
      res.status(409).json(
        createError('INVALID_TRANSITION', `Can only reassign missions with status 'assigned', current: '${current.rows[0].status}'`)
      );
      return;
    }

    const oldDriverId: string | null = current.rows[0].driver_id;

    const result = await pool.query(
      `UPDATE missions SET driver_id = $1 WHERE id = $2
       RETURNING id, client_name AS "clientName",
                 pickup_address AS "pickupAddress", delivery_address AS "deliveryAddress",
                 deadline, status, driver_id AS "driverId", created_at AS "createdAt"`,
      [newDriverId, id]
    );
    const mission = result.rows[0];
    res.json(createSuccess(mission));

    const headers = {
      'x-user-id':    req.user!.userId,
      'x-user-role':  req.user!.role,
      'x-user-email': req.user!.email,
    };

    Promise.resolve().then(async () => {
      try {
        if (oldDriverId) {
          const oldRes = await axios.get(`${AUTH_URL}/drivers/${oldDriverId}`, { headers, timeout: 3000 });
          await notifyUser('mission:status', oldRes.data.data.userId, { missionId: id, status: 'cancelled' });
        }
        const newRes = await axios.get(`${AUTH_URL}/drivers/${newDriverId}`, { headers, timeout: 3000 });
        await notifyUser('mission:assigned', newRes.data.data.userId, {
          missionId: id, clientName: mission.clientName,
          pickupAddress: mission.pickupAddress, deliveryAddress: mission.deliveryAddress,
          deadline: mission.deadline,
        });
      } catch (err) {
        console.error('[mission] reassignMission notify failed:', err);
      }
    });
  } catch (err) {
    console.error('[mission] reassignMission error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Failed to reassign mission'));
  }
}

// ── GET /missions/stats ───────────────────────────────────────────────────────
export async function getMissionStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending')     AS "pendingCount",
        COUNT(*) FILTER (WHERE status = 'assigned')    AS "assignedCount",
        COUNT(*) FILTER (WHERE status = 'in_progress') AS "inProgressCount",
        COUNT(*) FILTER (WHERE status = 'completed')   AS "completedCount",
        COUNT(*) FILTER (WHERE status = 'failed')      AS "failedCount",
        COUNT(*) FILTER (WHERE status = 'cancelled')   AS "cancelledCount",
        COALESCE(SUM(price) FILTER (WHERE status = 'completed'), 0) AS "totalRevenue",
        COUNT(*) FILTER (
          WHERE status IN ('assigned','in_progress') AND deadline IS NOT NULL AND deadline < NOW()
        ) AS "overdueCount",
        COUNT(*) FILTER (WHERE status = 'completed' AND deadline IS NOT NULL)                         AS "completedWithDeadline",
        COUNT(*) FILTER (WHERE status = 'completed' AND deadline IS NOT NULL AND completed_at <= deadline) AS "completedOnTime"
      FROM missions
    `);

    const row = result.rows[0];
    const completedWithDeadline = parseInt(row.completedWithDeadline, 10);
    const completedOnTime       = parseInt(row.completedOnTime, 10);
    const slaPercent = completedWithDeadline > 0
      ? Math.round((completedOnTime / completedWithDeadline) * 100)
      : 100;

    res.json(createSuccess({
      pendingCount:     parseInt(row.pendingCount, 10),
      assignedCount:    parseInt(row.assignedCount, 10),
      inProgressCount:  parseInt(row.inProgressCount, 10),
      completedCount:   parseInt(row.completedCount, 10),
      failedCount:      parseInt(row.failedCount, 10),
      cancelledCount:   parseInt(row.cancelledCount, 10),
      totalRevenue:     row.totalRevenue,
      overdueCount:     parseInt(row.overdueCount, 10),
      slaPercent,
    }));
  } catch (err) {
    console.error('[mission] getMissionStats error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Failed to fetch mission stats'));
  }
}

// ── PATCH /missions/:id/reject ────────────────────────────────────────────────
// Driver rejects an assigned mission with a reason. Mission returns to pending.
export async function rejectMission(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { reason = 'Aucune raison fournie' } = req.body;

    const current = await pool.query(
      'SELECT status, driver_id, created_by FROM missions WHERE id = $1', [id]
    );
    if (current.rows.length === 0) {
      res.status(404).json(createError('NOT_FOUND', 'Mission not found'));
      return;
    }

    if (current.rows[0].status !== 'assigned') {
      res.status(409).json(
        createError('INVALID_TRANSITION', `Cannot reject a mission with status '${current.rows[0].status}'`)
      );
      return;
    }

    const { driver_id: driverId, created_by: createdBy } = current.rows[0];

    const result = await pool.query(
      `UPDATE missions SET status = 'pending', driver_id = NULL, rejected_reason = $1 WHERE id = $2
       RETURNING id, client_name AS "clientName", status,
                 driver_id AS "driverId", rejected_reason AS "rejectedReason"`,
      [reason, id]
    );

    res.json(createSuccess(result.rows[0]));

    Promise.resolve().then(async () => {
      try {
        await DeliveryEvent.create({
          mission_id: id, driver_id: driverId,
          status: 'rejected', notes: reason, timestamp: new Date(),
          location: { lat: 0, lng: 0 },
        });
        await notifyUser('mission:status', createdBy, { missionId: id, status: 'rejected', reason });
      } catch (err) {
        console.error('[mission] rejectMission notify failed:', err);
      }
    });
  } catch (err) {
    console.error('[mission] rejectMission error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Failed to reject mission'));
  }
}

// ── GET /missions/:id/location-history ────────────────────────────────────────
// Returns ordered GPS pings from MongoDB for an in_progress mission.
export async function getMissionLocationHistory(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const events = await DeliveryEvent.find({
      mission_id: id,
      $or: [{ 'location.lat': { $ne: 0 } }, { 'location.lng': { $ne: 0 } }],
    })
      .sort({ timestamp: 1 })
      .select('location.lat location.lng timestamp driver_id -_id');

    const history = events.map((e: any) => ({
      lat:      e.location.lat,
      lng:      e.location.lng,
      timestamp: e.timestamp,
      driverId:  e.driver_id,
    }));

    res.json(createSuccess(history));
  } catch (err) {
    console.error('[mission] getMissionLocationHistory error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Failed to fetch location history'));
  }
}

// ── POST /missions/:id/pod ────────────────────────────────────────────────────
// Driver uploads a proof-of-delivery photo after completing a mission.
export async function uploadPod(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const file = (req as any).file as { filename: string } | undefined;

    if (!file) {
      res.status(400).json(createError('MISSING_FILE', 'No photo uploaded'));
      return;
    }

    const result = await pool.query(
      'SELECT status, driver_id AS "driverId", created_by AS "createdBy" FROM missions WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      res.status(404).json(createError('NOT_FOUND', 'Mission not found'));
      return;
    }

    if (result.rows[0].status !== 'completed') {
      res.status(409).json(createError('INVALID_STATE', 'POD can only be uploaded for completed missions'));
      return;
    }

    const { driverId, createdBy } = result.rows[0];
    const filename = file.filename;

    await pool.query('UPDATE missions SET pod_photo_url = $1 WHERE id = $2', [filename, id]);

    Promise.resolve(
      DeliveryEvent.create({
        mission_id: id, driver_id: driverId, status: 'pod',
        location: { lat: 0, lng: 0 }, podPhotoUrl: filename, timestamp: new Date(),
      })
    ).catch((err: unknown) => console.error('[mission] POD DeliveryEvent save failed:', err));

    res.json(createSuccess({ podPhotoUrl: filename }));
    notifyUser('mission:pod', createdBy, { missionId: id, podPhotoUrl: filename });
  } catch (err) {
    console.error('[mission] uploadPod error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Failed to upload POD'));
  }
}
