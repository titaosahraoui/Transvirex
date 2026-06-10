import { Router } from 'express';
import { register, login, getMe, requireManagement, listUsers, createManagedUser, deleteUser, listDispatchers } from '../controllers/auth.controller';
import { requireFields } from '../middleware/validate';
import { verifyToken } from '../middleware/jwt';

const router = Router();

// Public
router.post('/register', requireFields('email', 'password', 'name', 'role'), register);
router.post('/login',    requireFields('email', 'password'), login);

// Protected
router.get('/me', verifyToken, getMe as any);

// Any authenticated user — used by drivers/dispatchers to find who to chat with
router.get('/dispatchers', verifyToken, listDispatchers as any);

// Management-only user management
router.get   ('/users',     verifyToken, requireManagement as any, listUsers as any);
router.post  ('/users',     verifyToken, requireManagement as any, requireFields('name', 'email', 'password', 'role'), createManagedUser as any);
router.delete('/users/:id', verifyToken, requireManagement as any, deleteUser as any);

export default router;
