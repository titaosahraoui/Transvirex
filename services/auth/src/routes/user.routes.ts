import { Router } from 'express';
import {
  getDrivers,
  getDriverById,
  getDriverByUserId,
  updateDriver,
  getUserById,
} from '../controllers/user.controller';

const router = Router();

// Driver endpoints (called internally by gateway/mission/AI services)
router.get('/drivers',                    getDrivers);
router.get('/drivers/by-user/:userId',    getDriverByUserId);
router.get('/drivers/:id',               getDriverById);
router.patch('/drivers/:id',             updateDriver);

// User lookup (called internally)
router.get('/users/:id', getUserById);

export default router;
