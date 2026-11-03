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

    // Determine sequence number for this family
    const existingCount = await Patient.countDocuments({ familyId: familyId.trim() });
    const nextSeq = existingCount + 1;
    const patientId = `P-${familyId.trim()}-${nextSeq}`;

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
      gender: gender || 'Not Specified',
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
    const { familyId, search } = req.query;
    const query = {};

    if (familyId) {
      query.familyId = familyId.trim();
    }

    if (search && search.trim()) {
      const rawSearch = search.trim();
      const regex = new RegExp(escapeRegex(rawSearch), 'i');

      const famStripped = rawSearch.replace(/^fam[-\s]*/i, '').trim();
      const pidStripped = rawSearch.replace(/^p[-\s]*/i, '').trim();
      const digitsOnly = rawSearch.replace(/\D/g, '');

      const candidateFamIds = new Set();
      if (famStripped) {
        candidateFamIds.add(famStripped);
        if (/^\d+$/.test(famStripped)) {
          candidateFamIds.add(famStripped.padStart(5, '0'));
          candidateFamIds.add(String(parseInt(famStripped, 10)));
        }
      }
      if (digitsOnly) {
        candidateFamIds.add(digitsOnly);
        candidateFamIds.add(digitsOnly.padStart(5, '0'));
        candidateFamIds.add(String(parseInt(digitsOnly, 10)));
      }
      const candidateFamIdArr = Array.from(candidateFamIds).filter(Boolean);

      // Also match if user searches by family head name or society or area
      const matchingFamilies = await Family.find(
        {
          $or: [
            { headName: regex },
            { society: regex },
            { area: regex },
            { phone: regex },
            ...(candidateFamIdArr.length > 0 ? [{ familyId: { $in: candidateFamIdArr } }] : []),
          ],
        },
        'familyId'
      );
      const matchingFamilyIds = matchingFamilies.map((f) => f.familyId);
      const allFamIdsToMatch = Array.from(new Set([...candidateFamIdArr, ...matchingFamilyIds]));

      query.$or = [
        { name: regex },
        { patientId: regex },
        ...(pidStripped ? [{ patientId: new RegExp(escapeRegex(pidStripped), 'i') }] : []),
        { phone: regex },
        { society: regex },
        { area: regex },
        { familyId: regex },
        ...(allFamIdsToMatch.length > 0 ? [{ familyId: { $in: allFamIdsToMatch } }] : []),
      ];
    }

    const patients = await Patient.find(query).sort({ createdAt: -1 }).lean();

    // Enrich with family info (headName, familyDue, area, etc.)
    const familyIds = [...new Set(patients.map((p) => p.familyId))];
    const families = await Family.find({ familyId: { $in: familyIds } }).lean();
    const familyMap = {};
    families.forEach((f) => {
      familyMap[f.familyId] = f;
    });

    const enriched = patients.map((p) => ({
      ...p,
      family: familyMap[p.familyId] || null,
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

    // Process allergies if provided
    if (updateData.allergies) {
      if (typeof updateData.allergies === 'string') {
        updateData.allergies = updateData.allergies
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean);
      }
    }

    Object.assign(patient, updateData);
    await patient.save();

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

