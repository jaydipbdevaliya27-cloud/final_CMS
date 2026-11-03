import express from 'express';
import {
  getAreaWiseReport,
  getRefDoctorReport,
  getPatientHistoryReport,
  getDailyCollectionsReport,
  getMonthlyIncomeReport,
  getDueReport,
} from '../controllers/reportController.js';
import { protectDoctor } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protectDoctor); // Protected: doctor auth required

router.get('/area-wise', getAreaWiseReport);
router.get('/ref-doctor', getRefDoctorReport);
router.get('/patient-history', getPatientHistoryReport);
router.get('/daily-collections', getDailyCollectionsReport);
router.get('/monthly-income', getMonthlyIncomeReport);
router.get('/dues', getDueReport);

export default router;

