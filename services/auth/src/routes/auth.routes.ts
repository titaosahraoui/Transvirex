import { Router } from 'express';
import { register, login, getMe } from '../controllers/auth.controller';
import { requireFields } from '../middleware/validate';
import { verifyToken } from '../middleware/jwt';

const router = Router();

// Public
router.post('/register', requireFields('email', 'password', 'name', 'role'), register);
router.post('/login',    requireFields('email', 'password'), login);

// Protected
router.get('/me', verifyToken, getMe as any);

export default router;
