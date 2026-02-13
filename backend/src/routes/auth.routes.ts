import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { authMiddleware } from '../midleware/authMiddleware.js';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', authMiddleware, authController.me);

export default router;
