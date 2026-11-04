import express from 'express';
import {
  loginDoctor,
  getDoctorProfile,
  updateDoctorProfile,
  changeCredentials,
  getSecurityQuestion,
  verifySecurityAnswer,
  resetPassword,
  logoutDoctor,
} from '../controllers/authController.js';
import { protectDoctor } from '../middleware/authMiddleware.js';

const router = express.Router();

// Authentication
router.post('/login', loginDoctor);
router.get('/me', protectDoctor, getDoctorProfile);
router.post('/logout', protectDoctor, logoutDoctor);

// Profile and Credentials management
router.put('/profile', protectDoctor, updateDoctorProfile);
router.put('/change-credentials', protectDoctor, changeCredentials);

// Forgot Password workflow
router.get('/forgot-password/question/:username', getSecurityQuestion);
router.post('/forgot-password/verify', verifySecurityAnswer);
router.post('/forgot-password/reset', resetPassword);

export default router;
