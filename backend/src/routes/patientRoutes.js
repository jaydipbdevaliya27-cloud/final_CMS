import express from 'express';
import {
  addPatientMember,
  getPatients,
  getPatientById,
  updatePatient,
  deletePatient,
} from '../controllers/patientController.js';
import { protectDoctor } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protectDoctor); // Doctor access required

router.post('/', addPatientMember);
router.get('/', getPatients);
router.get('/:id', getPatientById);
router.put('/:id', updatePatient);
router.delete('/:id', deletePatient);

export default router;

