import { Router } from 'express';
import { requireUser } from '../middleware/requireUser';
import { suggestAssignment, modelInfo } from '../controllers/ai.controller';

const router = Router();

router.use(requireUser as any);

router.post('/suggest-assignment', suggestAssignment as any);
router.get('/model-info',          modelInfo as any);

export default router;
