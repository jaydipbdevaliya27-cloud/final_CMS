import express from 'express';
import {
  createLabReport,
  getLabReports,
  getLabReportById,
  deleteLabReport,
} from '../controllers/labReportController.js';
import { protectDoctor } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protectDoctor);

router.route('/')
  .post(createLabReport)
  .get(getLabReports);

router.route('/:id')
  .get(getLabReportById)
  .delete(deleteLabReport);

export default router;

