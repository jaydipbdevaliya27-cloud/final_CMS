import express from 'express';
import {
  recordVisit,
  getPatientVisits,
  updateVisit,
  deleteVisit,
} from '../controllers/visitController.js';
import { protectDoctor } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protectDoctor); // Doctor auth required

router.post('/', recordVisit);
router.get('/', getPatientVisits);
router.put('/:id', updateVisit);
router.delete('/:id', deleteVisit);

export default router;

