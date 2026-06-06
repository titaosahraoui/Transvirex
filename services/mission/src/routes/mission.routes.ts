import { Router } from 'express';
import { requireUser } from '../middleware/requireUser';
import {
  getMissions,
  getMissionById,
  createMission,
  assignMission,
  cancelMission,
  updateMissionStatus,
  updateDriverLocation,
  getMissionEvents,
  updateMission,
  reassignMission,
} from '../controllers/mission.controller';

const router = Router();

// All mission routes require a valid user context (x-user-* headers from gateway)
router.use(requireUser as any);

router.get('/',              getMissions as any);
router.get('/:id',           getMissionById as any);
router.post('/',             createMission as any);
router.patch('/:id/assign',    assignMission as any);
router.patch('/:id/cancel',    cancelMission as any);
router.patch('/:id/reassign',  reassignMission as any);
router.patch('/:id/status',    updateMissionStatus as any);
router.patch('/:id/location',  updateDriverLocation as any);
router.patch('/:id',           updateMission as any);
router.get('/:id/events',      getMissionEvents as any);

export default router;
