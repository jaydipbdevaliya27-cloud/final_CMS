import express from 'express';
import {
  getCuts,
  createCut,
  updateCut,
  deleteCut,
  getCutSummary,
} from '../controllers/cutController.js';
import { protectDoctor } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protectDoctor); // Doctor auth required

router.get('/summary', getCutSummary);
router.get('/', getCuts);
router.post('/', createCut);
router.put('/:id', updateCut);
router.delete('/:id', deleteCut);

export default router;
