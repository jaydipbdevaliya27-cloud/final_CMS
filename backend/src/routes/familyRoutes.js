import express from 'express';
import {
  getNextFamilyIdPreview,
  registerFamilyHead,
  getFamilies,
  getFamilyDetails,
  updateFamily,
  deleteFamily,
} from '../controllers/familyController.js';
import { protectDoctor } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protectDoctor); // Doctor access required

router.get('/next-id', getNextFamilyIdPreview);
router.post('/', registerFamilyHead);
router.get('/', getFamilies);
router.get('/:familyId', getFamilyDetails);
router.put('/:familyId', updateFamily);
router.delete('/:familyId', deleteFamily);

export default router;

