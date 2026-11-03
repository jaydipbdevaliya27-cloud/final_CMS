import express from 'express';
import {
  getMasterItems,
  addMasterItem,
  updateMasterItem,
  deleteMasterItem,
} from '../controllers/masterDataController.js';
import { protectDoctor } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protectDoctor); // Doctor access required

router.get('/', getMasterItems);
router.post('/', addMasterItem);
router.put('/:id', updateMasterItem);
router.delete('/:id', deleteMasterItem);

export default router;

