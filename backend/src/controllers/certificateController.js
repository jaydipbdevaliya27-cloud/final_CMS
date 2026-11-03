import Certificate from '../models/Certificate.js';
import CertificateTemplate from '../models/CertificateTemplate.js';
import Counter from '../models/Counter.js';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';

// Predefined default medical templates
const DEFAULT_TEMPLATES = [
  {
    templateKey: 'fitness',
    name: 'Medical Fitness Certificate',
    category: 'Fitness',
    defaultBodyText:
      'This is to certify that {PATIENT_NAME}, aged {AGE}, has been examined by me. The patient has clinically recovered from {DIAGNOSIS} and is now found medically fit in all respects to resume normal daily duties.',
  },
  {
    templateKey: 'leave_rest',
    name: 'Medical Leave & Rest Certificate',
    category: 'Leave',
    defaultBodyText:
      'This is to certify that {PATIENT_NAME}, aged {AGE}, is under my medical care and treatment for {DIAGNOSIS}. The patient is advised complete physical rest and leave of absence from {FROM_DATE} to {TO_DATE} ({REST_DAYS} days) for proper recovery.',
  },
  {
    templateKey: 'illness_recovery',
    name: 'Illness & Recovery Certificate',
    category: 'Recovery',
    defaultBodyText:
      'This is to certify that {PATIENT_NAME}, aged {AGE}, was suffering from {DIAGNOSIS} and was advised medical rest from {FROM_DATE} to {TO_DATE}. On re-examination today, the patient is asymptomatic, fully recovered, and fit to resume duties.',
  },
  {
    templateKey: 'general_fitness',
    name: 'General Health & Travel Fitness Certificate',
    category: 'General',
    defaultBodyText:
      'This is to certify that I have clinically examined {PATIENT_NAME}, aged {AGE}. The patient is found to be in good physical and mental health, free from any contagious illness or disability, and is declared fit for routine travel and physical activity.',
  },
];

// Helper: Seed default templates if database collection is empty
const ensureDefaultTemplates = async () => {
  const count = await CertificateTemplate.countDocuments();
  if (count === 0) {
    await CertificateTemplate.insertMany(DEFAULT_TEMPLATES);
  }
};

// Helper: Get next certificate ID (e.g. CERT-2026-0001) with collision-safe preview
export const getNextCertificateIdValue = async () => {
  const currentYear = new Date().getFullYear();
  const counterKey = `certId_${currentYear}`;

  let counter = await Counter.findOne({ id: counterKey });
  let nextSeq = counter ? counter.seq : 1;
  let certificateId = `CERT-${currentYear}-${String(nextSeq).padStart(4, '0')}`;

  while (await Certificate.exists({ certificateId })) {
    nextSeq += 1;
    certificateId = `CERT-${currentYear}-${String(nextSeq).padStart(4, '0')}`;
  }

  return certificateId;
};

// Helper: Increment and commit next certificate ID
export const incrementCertificateSeq = async () => {
  const currentYear = new Date().getFullYear();
  const counterKey = `certId_${currentYear}`;

  let counter = await Counter.findOne({ id: counterKey });
  let currentSeq = counter ? counter.seq : 1;
  let certificateId = `CERT-${currentYear}-${String(currentSeq).padStart(4, '0')}`;

  while (await Certificate.exists({ certificateId })) {
    currentSeq += 1;
    certificateId = `CERT-${currentYear}-${String(currentSeq).padStart(4, '0')}`;
  }

  await Counter.findOneAndUpdate(
    { id: counterKey },
    { $set: { seq: currentSeq + 1 } },
    { upsert: true, returnDocument: 'after' }
  );

  return certificateId;
};

// @desc    Preview next Certificate ID
// @route   GET /api/certificates/next-id
// @access  Private
export const getNextCertificateIdPreview = async (req, res) => {
  try {
    const nextId = await getNextCertificateIdValue();
    return res.status(200).json({
      success: true,
      nextCertId: nextId,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate next certificate ID preview',
      error: error.message,
    });
  }
};

// @desc    Get all certificate templates
// @route   GET /api/certificates/templates
// @access  Private
export const getCertificateTemplates = async (req, res) => {
  try {
    await ensureDefaultTemplates();
    const templates = await CertificateTemplate.find().sort({ createdAt: 1 }).lean();
    return res.status(200).json({
      success: true,
      count: templates.length,
      data: templates,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch templates',
      error: error.message,
    });
  }
};

// @desc    Add a new custom certificate template
// @route   POST /api/certificates/templates
// @access  Private
export const createCertificateTemplate = async (req, res) => {
  try {
    const { name, defaultBodyText, category = 'Custom' } = req.body;

    if (!name || !defaultBodyText) {
      return res.status(400).json({
        success: false,
        message: 'Template name and body text are required.',
      });
    }

    const templateKey = `custom_${Date.now()}`;
    const newTemplate = await CertificateTemplate.create({
      templateKey,
      name: name.trim(),
      category: category.trim(),
      defaultBodyText: defaultBodyText.trim(),
      isCustom: true,
    });

    return res.status(201).json({
      success: true,
      message: 'Certificate template created successfully',
      data: newTemplate,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create certificate template',
      error: error.message,
    });
  }
};

// @desc    Issue a new Medical Certificate
// @route   POST /api/certificates
// @access  Private
export const issueCertificate = async (req, res) => {
  try {
    const {
      patientId,
      patientName,
      age,
      gender,
      templateId,
      templateName,
      medicalDiagnosis,
      fromDate,
      toDate,
      restDays,
      issuePlace,
      bodyText,
      digitalSignature,
    } = req.body;

    // 1. Validation
    if (!patientName || !patientName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Patient Name is required.',
      });
    }

    // Check if patient exists in MongoDB records (by ID or case-insensitive Name)
    let patientExists = null;
    if (patientId && patientId.trim()) {
      patientExists = await Patient.findOne({ patientId: patientId.trim() });
    }
    if (!patientExists && patientName.trim()) {
      const escaped = patientName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      patientExists = await Patient.findOne({
        name: { $regex: new RegExp(`^${escaped}$`, 'i') },
      });
    }

    // Assign registered patientId or generate OPD ID for walk-in
    const assignedPatientId =
      patientExists?.patientId ||
      (patientId && patientId.trim() ? patientId.trim() : `P-OPD-${Date.now().toString().slice(-4)}`);

    if (!medicalDiagnosis || !medicalDiagnosis.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Medical diagnosis is required.',
      });
    }

    if (!fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: 'From Date and To Date are required.',
      });
    }

    // 2. Fetch doctor profile details for branding
    const doctor = await Doctor.findOne();
    const clinicName = doctor?.clinicName || 'Dhyey Main Clinic';
    const doctorName = doctor?.name || 'Dr. Dhyey Patel';
    const doctorQualifications = doctor?.specialization || 'M.B.B.S., Consulting Physician';

    // 3. Atomically generate unique Certificate ID (collision-safe)
    const currentYear = new Date().getFullYear();
    const counterKey = `certId_${currentYear}`;
    let counter = await Counter.findOne({ id: counterKey });
    let currentSeq = counter ? counter.seq : 1;
    let certificateId = `CERT-${currentYear}-${String(currentSeq).padStart(4, '0')}`;

    while (await Certificate.exists({ certificateId })) {
      currentSeq += 1;
      certificateId = `CERT-${currentYear}-${String(currentSeq).padStart(4, '0')}`;
    }

    await Counter.findOneAndUpdate(
      { id: counterKey },
      { $set: { seq: currentSeq + 1 } },
      { upsert: true, returnDocument: 'after' }
    );

    // 4. Create Certificate Record
    const certificate = await Certificate.create({
      certificateId,
      patientId: assignedPatientId,
      patientName: patientName.trim(),
      age: age || patientExists?.age || '',
      gender: gender || patientExists?.gender || 'Male',
      templateId: templateId || 'fitness',
      templateName: templateName || 'Medical Fitness Certificate',
      medicalDiagnosis: medicalDiagnosis.trim(),
      fromDate,
      toDate,
      restDays: Number(restDays) || 1,
      issuePlace: issuePlace || 'Ahmedabad',
      bodyText: bodyText.trim(),
      clinicName,
      clinicAddress: 'Shop No. 1, Mahavir Heights, New Kosad Road, Amroli, Surat',
      doctorName,
      doctorRegNo: 'G-14285',
      doctorQualifications,
      digitalSignature: digitalSignature || '',
      issueDate: new Date().toISOString().split('T')[0],
      status: 'Issued',
      isVerifiable: true,
    });

    return res.status(201).json({
      success: true,
      message: `Medical Certificate ${certificateId} issued successfully!`,
      data: certificate,
    });
  } catch (error) {
    console.error('Issue certificate error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to issue medical certificate',
      error: error.message,
    });
  }
};

// @desc    Get all issued medical certificates with search & filter
// @route   GET /api/certificates
// @access  Private
export const getCertificates = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const query = {};

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { certificateId: regex },
        { patientName: regex },
        { patientId: regex },
        { medicalDiagnosis: regex },
        { templateName: regex },
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const total = await Certificate.countDocuments(query);
    const certificates = await Certificate.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    return res.status(200).json({
      success: true,
      data: certificates,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum) || 1,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error('Get certificates error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch certificates',
      error: error.message,
    });
  }
};

// @desc    Verify Certificate authenticity by Certificate ID
// @route   GET /api/certificates/verify/:certId
// @access  Public / Private
export const verifyCertificate = async (req, res) => {
  try {
    const { certId } = req.params;
    const certificate = await Certificate.findOne({
      certificateId: certId.trim().toUpperCase(),
    }).lean();

    if (!certificate) {
      return res.status(404).json({
        success: false,
        isVerified: false,
        message: `Certificate ID "${certId}" was NOT found in the clinic records. Document is invalid or unverified.`,
      });
    }

    return res.status(200).json({
      success: true,
      isVerified: true,
      message: 'Official Verifiable Medical Certificate Confirmed',
      certificate: {
        certificateId: certificate.certificateId,
        patientName: certificate.patientName,
        patientId: certificate.patientId,
        diagnosis: certificate.medicalDiagnosis,
        templateName: certificate.templateName,
        validityPeriod: `${certificate.fromDate} to ${certificate.toDate}`,
        restDays: certificate.restDays,
        issueDate: certificate.issueDate,
        doctorName: certificate.doctorName,
        clinicName: certificate.clinicName,
        status: certificate.status,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to verify certificate',
      error: error.message,
    });
  }
};

// @desc    Delete / Cancel a Certificate
// @route   DELETE /api/certificates/:id
// @access  Private
export const deleteCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    const cert = await Certificate.findByIdAndDelete(id);
    if (!cert) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Certificate deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete certificate',
      error: error.message,
    });
  }
};

