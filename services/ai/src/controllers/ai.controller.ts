import { Response } from 'express';
import axios from 'axios';
import { createSuccess, createError } from '@transvirex/shared';
import { AuthenticatedRequest } from '../middleware/requireUser';
import { scoreDrivers, DriverFeatures } from '../ml/model';

const AUTH_SVC    = process.env.AUTH_SERVICE_URL    ?? 'http://localhost:4001';
const MISSION_SVC = process.env.MISSION_SERVICE_URL ?? 'http://localhost:4002';

// ── POST /ai/suggest-assignment ───────────────────────────────────────────────
export async function suggestAssignment(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { missionId } = req.body;

    if (!missionId) {
      res.status(400).json(createError('MISSING_FIELDS', 'missionId is required'));
      return;
    }

    // Fetch mission details from mission service (internal Docker DNS)
    const missionRes = await axios.get(`${MISSION_SVC}/missions/${missionId}`, {
      headers: {
        'x-user-id':    req.user!.userId,
        'x-user-role':  req.user!.role,
        'x-user-email': req.user!.email,
      },
    });

    if (missionRes.data.status !== 'success' || !missionRes.data.data) {
      res.status(404).json(createError('NOT_FOUND', 'Mission not found'));
      return;
    }

    const mission = missionRes.data.data;

    // Compute urgency: 0 = not urgent, 1 = very urgent (deadline within 2 hours)
    let missionUrgency = 0;
    if (mission.deadline) {
      const hoursUntilDeadline =
        (new Date(mission.deadline).getTime() - Date.now()) / 3_600_000;
      missionUrgency = Math.max(0, Math.min(1, 1 - hoursUntilDeadline / 24));
    }

    // Time-of-day score: 0=peak (7-9, 17-19), 1=off-peak
    const hour = new Date().getHours();
    const isPeak = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
    const timeOfDayScore = isPeak ? 0 : 1;

    // Fetch available drivers from auth service
    const driversRes = await axios.get(`${AUTH_SVC}/drivers?status=available`, {
      headers: {
        'x-user-id':    req.user!.userId,
        'x-user-role':  req.user!.role,
        'x-user-email': req.user!.email,
      },
    });

    if (driversRes.data.status !== 'success' || !driversRes.data.data) {
      res.status(502).json(createError('UPSTREAM_ERROR', 'Failed to fetch available drivers'));
      return;
    }

    const drivers: Array<{
      id: string;
      userId: string;
      name: string;
      lat: number;
      lng: number;
      currentLoad: number;
      acceptanceRate: number;
      experienceDays: number;
    }> = driversRes.data.data;

    if (drivers.length === 0) {
      res.json(createSuccess({ suggestions: [], message: 'No available drivers' }));
      return;
    }

    // Compute distance (haversine formula)
    function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    const driverFeatures: Array<DriverFeatures & { driverId: string; name: string }> =
      drivers.map((d) => ({
        driverId:       d.id,
        name:           d.name,
        distanceKm:     haversineKm(
                          d.lat,
                          d.lng,
                          parseFloat(mission.pickupLat) || 0,
                          parseFloat(mission.pickupLng) || 0
                        ),
        currentLoad:    d.currentLoad,
        acceptanceRate: parseFloat(d.acceptanceRate as any) || 100,
        experienceDays: d.experienceDays,
        missionUrgency,
        timeOfDayScore,
        zoneMatch:      0, // zone matching is simplified for now
      }));

    const suggestions = await scoreDrivers(driverFeatures);

    res.json(
      createSuccess({
        missionId,
        suggestions: suggestions.slice(0, 5), // top 5
      })
    );
  } catch (err) {
    console.error('[ai] suggestAssignment error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Failed to generate assignment suggestions'));
  }
}

// ── GET /ai/health-model ──────────────────────────────────────────────────────
// Returns info about the loaded TF.js model
export async function modelInfo(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { getModel } = await import('../ml/model');
    const model = await getModel();
    res.json(
      createSuccess({
        paramCount:  model.countParams(),
        layerCount:  model.layers.length,
        inputShape:  [7],
        outputShape: [1],
      })
    );
  } catch (err) {
    console.error('[ai] modelInfo error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Model not ready'));
  }
}
