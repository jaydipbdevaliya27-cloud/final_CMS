import express from 'express';
import { loginDoctor, getDoctorProfile, logoutDoctor } from '../controllers/authController.js';
import { protectDoctor } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', loginDoctor);
router.get('/me', protectDoctor, getDoctorProfile);
router.post('/logout', protectDoctor, logoutDoctor);

export default router;
