import express from 'express';
import { universalSearch } from '../controllers/universalSearchController.js';
import { protectDoctor } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protectDoctor); // Doctor auth required

// GET /api/universal-search?q=...
router.get('/', universalSearch);

export default router;

