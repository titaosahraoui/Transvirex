import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireUser } from '../middleware/requireUser';
import { requireRole } from '../middleware/requireRole';
import { validateIdParam, body } from '../middleware/validate';
import {
  getMissions,
  getMissionById,
  getMissionStats,
  createMission,
  assignMission,
  cancelMission,
  updateMissionStatus,
  updateDriverLocation,
  getMissionEvents,
  getMissionLocationHistory,
  updateMission,
  reassignMission,
  rejectMission,
  uploadPod,
} from '../controllers/mission.controller';

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (req, _file, cb) => {
    const ext = path.extname(_file.originalname).toLowerCase() || '.jpg';
    cb(null, `pod-${req.params.id}-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => { cb(null, file.mimetype.startsWith('image/')); },
});

const DISPATCHER = ['dispatcher', 'management'];
const DRIVER     = ['driver'];
const ALL        = ['dispatcher', 'management', 'driver', 'billing'];

// ── Validation schemas ────────────────────────────────────────────────────────
const COORD_LAT     = { optional: true, type: 'number' as const, min: -90,  max: 90  };
const COORD_LNG     = { optional: true, type: 'number' as const, min: -180, max: 180 };
const MISSION_TYPES = ['standard', 'express', 'lourd', 'fragile'] as const;
const PRIORITIES    = ['low', 'medium', 'high', 'urgent'] as const;

const missionBody = {
  clientName:      {},
  pickupAddress:   {},
  deliveryAddress: {},
  pickupLat:   COORD_LAT,
  pickupLng:   COORD_LNG,
  deliveryLat: COORD_LAT,
  deliveryLng: COORD_LNG,
  price:       { optional: true, type: 'number' as const, min: 0 },
  weightKg:    { optional: true, type: 'number' as const, min: 0 },
  missionType: { optional: true, enum: MISSION_TYPES },
  priority:    { optional: true, enum: PRIORITIES },
  deadline:    { optional: true, type: 'isoDate' as const },
};

const updateMissionBody = Object.fromEntries(
  Object.entries(missionBody).map(([k, v]) => [k, { ...v, optional: true }])
);

const driverIdBody   = { driverId: { uuid: true } };
const locationBody   = {
  lat: { type: 'number' as const, min: -90,  max: 90  },
  lng: { type: 'number' as const, min: -180, max: 180 },
};

// ── Router ────────────────────────────────────────────────────────────────────
const router = Router();

router.use(requireUser as any);

// UUID validation applied automatically to every /:id route
router.param('id', validateIdParam as any);

// ── Read routes ───────────────────────────────────────────────────────────────
router.get('/',      requireRole(...ALL) as any,        getMissions as any);
router.get('/stats', requireRole(...DISPATCHER) as any, getMissionStats as any);  // before /:id
router.get('/:id',   requireRole(...ALL) as any,        getMissionById as any);
router.get('/:id/events',           requireRole(...ALL) as any, getMissionEvents as any);
router.get('/:id/location-history', requireRole(...ALL) as any, getMissionLocationHistory as any);

// ── Write routes — create ─────────────────────────────────────────────────────
router.post('/',
  requireRole(...DISPATCHER) as any,
  body(missionBody) as any,
  createMission as any,
);

// ── Write routes — dispatcher actions ─────────────────────────────────────────
router.patch('/:id',
  requireRole(...DISPATCHER) as any,
  body(updateMissionBody) as any,
  updateMission as any,
);
router.patch('/:id/assign',
  requireRole(...DISPATCHER) as any,
  body(driverIdBody) as any,
  assignMission as any,
);
router.patch('/:id/cancel',   requireRole(...DISPATCHER) as any, cancelMission as any);
router.patch('/:id/reassign',
  requireRole(...DISPATCHER) as any,
  body(driverIdBody) as any,
  reassignMission as any,
);

// ── Write routes — driver actions ─────────────────────────────────────────────
router.patch('/:id/reject',   requireRole(...DRIVER) as any, rejectMission as any);
router.patch('/:id/status',   requireRole(...DRIVER) as any, updateMissionStatus as any);
router.patch('/:id/location',
  requireRole(...DRIVER) as any,
  body(locationBody) as any,
  updateDriverLocation as any,
);
router.post('/:id/pod',
  requireRole(...DRIVER) as any,
  upload.single('photo'),
  uploadPod as any,
);

export default router;
