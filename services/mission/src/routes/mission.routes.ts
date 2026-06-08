import { Router } from 'express';
import { requireUser } from '../middleware/requireUser';
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
} from '../controllers/mission.controller';

const router = Router();

// All mission routes require a valid user context (x-user-* headers from gateway)
router.use(requireUser as any);

router.get('/',              getMissions as any);
router.get('/stats',         getMissionStats as any);          // before /:id to avoid param collision
router.get('/:id',           getMissionById as any);
router.post('/',             createMission as any);
router.patch('/:id/assign',    assignMission as any);
router.patch('/:id/cancel',    cancelMission as any);
router.patch('/:id/reassign',  reassignMission as any);
router.patch('/:id/reject',    rejectMission as any);
router.patch('/:id/status',    updateMissionStatus as any);
router.patch('/:id/location',  updateDriverLocation as any);
router.patch('/:id',           updateMission as any);
router.get('/:id/events',           getMissionEvents as any);
router.get('/:id/location-history', getMissionLocationHistory as any);

export default router;
