import express from 'express';
import {
  getNextCertificateIdPreview,
  getCertificateTemplates,
  createCertificateTemplate,
  issueCertificate,
  getCertificates,
  verifyCertificate,
  deleteCertificate,
} from '../controllers/certificateController.js';
import { protectDoctor } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route for instant verification
router.get('/verify/:certId', verifyCertificate);

// Protected routes (Doctor authentication required)
router.use(protectDoctor);

router.get('/next-id', getNextCertificateIdPreview);
router.get('/templates', getCertificateTemplates);
router.post('/templates', createCertificateTemplate);
router.get('/', getCertificates);
router.post('/', issueCertificate);
router.delete('/:id', deleteCertificate);

export default router;

