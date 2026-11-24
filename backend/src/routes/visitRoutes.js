import express from 'express';
import {
  recordVisit,
  getPatientVisits,
  updateVisit,
  deleteVisit,
  getRecentVisits,
  collectDue,
} from '../controllers/visitController.js';
import { protectDoctor } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protectDoctor); // Doctor auth required

router.get('/recent', getRecentVisits);
router.post('/collect-due', collectDue);
router.post('/', recordVisit);
router.get('/', getPatientVisits);
router.put('/:id', updateVisit);
router.delete('/:id', deleteVisit);

export default router;

