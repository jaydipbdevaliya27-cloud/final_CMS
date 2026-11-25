import mongoose from 'mongoose';
import Patient from '../models/Patient.js';
import Family from '../models/Family.js';
import Visit from '../models/Visit.js';
import { autoSaveMasterItem } from './masterDataController.js';

// @desc    Add a new Patient Member under an existing Family Head
// @route   POST /api/patients
// @access  Private
export const addPatientMember = async (req, res) => {
  try {
    const {
      familyId,
      name,
      relation,
      age,
      bloodGroup,
      allergies,
      society,
      area,
      phone,
      gender,
    } = req.body;

    if (!familyId || !familyId.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Family ID is required. Please select a valid family head.',
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Member full name is required.',
      });
    }

    // Verify family head exists in MongoDB
    const family = await Family.findOne({ familyId: familyId.trim() });
    if (!family) {
      return res.status(404).json({
        success: false,
        message: `Family with ID FAM-${familyId} does not exist. Please register the family head first.`,
      });
    }

    // Determine sequence number for this family with collision-safe check
    const existingCount = await Patient.countDocuments({ familyId: familyId.trim() });
    let nextSeq = existingCount + 1;
    let patientId = `P-${familyId.trim()}-${nextSeq}`;
    while (await Patient.exists({ patientId })) {
      nextSeq += 1;
      patientId = `P-${familyId.trim()}-${nextSeq}`;
    }

    // Normalize allergies
    let patientAllergies = [];
    if (Array.isArray(allergies)) {
      patientAllergies = allergies.map((a) => String(a).trim()).filter(Boolean);
    } else if (typeof allergies === 'string' && allergies.trim()) {
      patientAllergies = allergies
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);
    }

    // Create Patient record in MongoDB
    const newPatient = await Patient.create({
      patientId,
      familyId: familyId.trim(),
      name: name.trim(),
      relation: relation ? relation.trim() : 'Member',
      age: age ? String(age).trim() : '',
      gender: gender || 'Male',
      bloodGroup: bloodGroup || '',
      allergies: patientAllergies,
      society: society ? society.trim() : family.society || '',
      area: area ? area.trim() : family.area || '',
      phone: phone ? phone.trim() : family.phone || '',
      isHead: false,
      registrationDoneBy: 'Family Member',
    });

    // Increment family member counter
    family.membersCount = nextSeq;
    await family.save();

    // Auto-save any new society, area, or allergies to Master Data
    if (newPatient.society) await autoSaveMasterItem('society', newPatient.society);
    if (newPatient.area) await autoSaveMasterItem('area', newPatient.area);
    if (patientAllergies.length > 0) {
      for (const al of patientAllergies) {
        await autoSaveMasterItem('allergy', al);
      }
    }

    return res.status(201).json({
      success: true,
      message: `Member "${newPatient.name}" added successfully to Family FAM-${family.familyId}`,
      patient: newPatient,
      family,
    });
  } catch (error) {
    console.error('Error adding patient member:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add patient member',
      error: error.message,
    });
  }
};

// Escape regex special characters
const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// @desc    Get all patients with search & familyId filter
// @route   GET /api/patients
// @access  Private
export const getPatients = async (req, res) => {
  try {
    const { familyId, search, limit: reqLimit } = req.query;
    const query = {};

    if (familyId) {
      query.familyId = familyId.trim();
    }

    let isNameSearch = false;
    let searchUpper = '';

    if (search && search.trim()) {
      const rawSearch = search.trim();
      searchUpper = rawSearch.toUpperCase();
      const tokens = rawSearch.split(/\s+/).filter(Boolean);

      const isFamExplicit = /^fam[-\s]*/i.test(rawSearch);
      const famStripped = rawSearch.replace(/^fam[-\s]*/i, '').trim();
      const pidStripped = rawSearch.replace(/^p[-\s]*/i, '').trim();
      const isDigitsOnly = /^\d+$/.test(rawSearch);

      if (isFamExplicit && famStripped) {
        // Explicit family search (e.g. FAM-00001)
        const candidateFamIds = [
          famStripped,
          famStripped.padStart(5, '0'),
          String(parseInt(famStripped, 10)),
        ].filter(Boolean);
        query.familyId = { $in: candidateFamIds };
      } else if (isDigitsOnly) {
        // Pure numeric search: phone number or numeric patientId
        query.$or = [
          { phone: new RegExp(escapeRegex(rawSearch), 'i') },
          { patientId: new RegExp(escapeRegex(rawSearch), 'i') },
        ];
      } else if (/^p[-\s]*/i.test(rawSearch) && pidStripped) {
        // Explicit patient ID search (e.g. P-00001)
        query.patientId = new RegExp(escapeRegex(pidStripped), 'i');
      } else {
        // Patient Name Search: MUST search ONLY by patient's own name, NEVER other family members or headName!
        isNameSearch = true;
        if (tokens.length === 1) {
          query.name = new RegExp(escapeRegex(tokens[0]), 'i');
        } else {
          // Multi-word search: patient name must match all entered words
          query.$and = tokens.map((t) => ({
            name: new RegExp(escapeRegex(t), 'i'),
          }));
        }
      }
    }

    // Fast selective limits: up to 10,000 for RAM preloading, 50 for live network search
    const maxLimit = reqLimit ? parseInt(reqLimit, 10) : (search && search.trim() ? 50 : 10000);

    let patients = await Patient.find(query)
      .select('patientId familyId name age gender bloodGroup allergies society area phone relation isHead totalDue deposit createdAt')
      .limit(maxLimit)
      .lean();

    // When searching by patient name, sort by relevance so the exact name match is ALWAYS first!
    if (isNameSearch && searchUpper) {
      patients.sort((a, b) => {
        const aName = (a.name || '').toUpperCase();
        const bName = (b.name || '').toUpperCase();

        // 1. Exact full name match
        const aExact = aName === searchUpper;
        const bExact = bName === searchUpper;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        // 2. Starts with query
        const aStarts = aName.startsWith(searchUpper);
        const bStarts = bName.startsWith(searchUpper);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        // 3. Closest length to search query
        return aName.length - bName.length || aName.localeCompare(bName);
      });
    } else {
      patients.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Enrich with family info (headName, familyDue, area, etc.)
    const familyIds = [...new Set(patients.map((p) => p.familyId).filter(Boolean))];
    const families = await Family.find({ familyId: { $in: familyIds } })
      .select('familyId headName society area phone familyDue familyDeposit')
      .lean();
    const familyMap = {};
    families.forEach((f) => {
      familyMap[f.familyId] = f;
    });

    // Enrich with the last 2 to 3 case records for each matching patient
    const patientIds = [...new Set(patients.map((p) => p.patientId).filter(Boolean))];
    const visitsByPatient = {};
    if (patientIds.length > 0) {
      const recentVisits = await Visit.find({ patientId: { $in: patientIds } })
        .select('patientId visitDate complaint treatments prescriptions investigation labReport allergies bp sugar other charge received due createdAt')
        .sort({ visitDate: -1, createdAt: -1 })
        .lean();

      recentVisits.forEach((v) => {
        if (!visitsByPatient[v.patientId]) {
          visitsByPatient[v.patientId] = [];
        }
        if (visitsByPatient[v.patientId].length < 3) {
          visitsByPatient[v.patientId].push({
            _id: v._id,
            visitDate: v.visitDate,
            complaint: v.complaint || '',
            treatments: v.treatments || [],
            prescriptions: v.prescriptions || [],
            investigation: v.investigation || '',
            labReport: v.labReport ? (typeof v.labReport === 'string' ? v.labReport : (v.labReport.reportType || v.labReport.title || 'Lab Report')) : '',
            allergies: Array.isArray(v.allergies) ? v.allergies : (v.allergies ? [v.allergies] : []),
            bp: v.bp || '',
            sugar: v.sugar || '',
            other: v.other || '',
            charge: v.charge || 0,
            received: v.received || 0,
            due: v.due || 0,
            createdAt: v.createdAt,
          });
        }
      });
    }

    const enriched = patients.map((p) => ({
      ...p,
      family: familyMap[p.familyId] || null,
      recentVisits: visitsByPatient[p.patientId] || [],
    }));

    return res.status(200).json({
      success: true,
      count: enriched.length,
      data: enriched,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve patients',
      error: error.message,
    });
  }
};

// @desc    Get single patient by ID with family info
// @route   GET /api/patients/:id
// @access  Private
export const getPatientById = async (req, res) => {
  try {
    const { id } = req.params;
    let patient = null;

    if (mongoose.isValidObjectId(id)) {
      patient = await Patient.findById(id);
    }
    if (!patient) {
      patient = await Patient.findOne({ patientId: id });
    }

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    const family = await Family.findOne({ familyId: patient.familyId });

    return res.status(200).json({
      success: true,
      patient: {
        ...patient.toObject(),
        family,
      },
      family,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve patient',
      error: error.message,
    });
  }
};

// @desc    Update Patient record
// @route   PUT /api/patients/:id
// @access  Private
export const updatePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    let patient = null;
    if (mongoose.isValidObjectId(id)) {
      patient = await Patient.findById(id);
    }
    if (!patient) {
      patient = await Patient.findOne({ patientId: id });
    }

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    // Strip immutable fields
    delete updateData._id;
    delete updateData.patientId;

    // Process allergies if provided
    if (updateData.allergies) {
      if (typeof updateData.allergies === 'string') {
        updateData.allergies = updateData.allergies
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean);
      }
    }

    const oldName = patient.name;
    Object.assign(patient, updateData);
    await patient.save();

    // If patient name changed, sync across visit records and family
    if (updateData.name && updateData.name.trim() !== oldName) {
      const newName = updateData.name.trim();
      await Visit.updateMany({ patientId: patient.patientId }, { patientName: newName });
      if (patient.isHead) {
        await Family.findOneAndUpdate({ familyId: patient.familyId }, { headName: newName });
      }
    }

    // Auto-save updated Master Data
    if (patient.society) await autoSaveMasterItem('society', patient.society);
    if (patient.area) await autoSaveMasterItem('area', patient.area);
    if (patient.allergies?.length > 0) {
      for (const al of patient.allergies) {
        await autoSaveMasterItem('allergy', al);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Patient updated successfully',
      patient,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update patient',
      error: error.message,
    });
  }
};

// @desc    Delete Patient record
// @route   DELETE /api/patients/:id
// @access  Private
export const deletePatient = async (req, res) => {
  try {
    const { id } = req.params;

    let patient = null;
    if (mongoose.isValidObjectId(id)) {
      patient = await Patient.findById(id);
    }
    if (!patient) {
      patient = await Patient.findOne({ patientId: id });
    }

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    const { familyId, isHead, patientId } = patient;
    await patient.deleteOne();

    // Delete associated visits for this patient and recalculate family due
    await Visit.deleteMany({ patientId });
    const remainingFamilyVisits = await Visit.find({ familyId });
    const newFamDue = remainingFamilyVisits.reduce((acc, v) => acc + (v.due || 0), 0);

    // Decrement member count on family if not head
    const remainingCount = await Patient.countDocuments({ familyId });
    await Family.findOneAndUpdate(
      { familyId },
      { membersCount: remainingCount, familyDue: newFamDue }
    );

    return res.status(200).json({
      success: true,
      message: 'Patient deleted successfully and dues updated',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete patient',
      error: error.message,
    });
  }
};

