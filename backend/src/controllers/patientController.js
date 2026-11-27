import mongoose from 'mongoose';
import Patient from '../models/Patient.js';
import Family from '../models/Family.js';
import Visit from '../models/Visit.js';
import LabReport from '../models/LabReport.js';
import Certificate from '../models/Certificate.js';
import { autoSaveMasterItem } from './masterDataController.js';
import { toUpperTrim, toUpperArray } from '../utils/textUtils.js';
import { getNextFamilyIdValue } from './familyController.js';

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
      dob,
      ageRecordedAt,
      bloodGroup,
      allergies,
      society,
      area,
      houseNo,
      phone,
      gender,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Member full name is required.',
      });
    }

    // Normalize allergies
    const patientAllergies = toUpperArray(allergies);

    // Individual / Unlinked patient registration (no Family Head yet)
    if (!familyId || !familyId.trim() || familyId.trim() === 'UNLINKED') {
      const existingIndCount = await Patient.countDocuments({ patientId: { $regex: /^P-IND-/ } });
      let nextSeq = existingIndCount + 1;
      let patientId = `P-IND-${nextSeq}`;
      while (await Patient.exists({ patientId })) {
        nextSeq += 1;
        patientId = `P-IND-${nextSeq}`;
      }

      const newPatient = await Patient.create({
        patientId,
        familyId: '',
        name: toUpperTrim(name),
        relation: 'INDIVIDUAL',
        age: toUpperTrim(age),
        dob: dob ? String(dob).trim() : '',
        ageRecordedAt: ageRecordedAt ? new Date(ageRecordedAt) : (age ? new Date() : null),
        gender: gender || 'Male',
        bloodGroup: toUpperTrim(bloodGroup),
        allergies: patientAllergies,
        society: toUpperTrim(society),
        area: toUpperTrim(area),
        houseNo: toUpperTrim(houseNo),
        phone: phone ? phone.trim() : '',
        isHead: false,
        registrationDoneBy: 'Individual Patient',
      });

      if (newPatient.area) await autoSaveMasterItem('area', newPatient.area);
      if (patientAllergies.length > 0) {
        for (const al of patientAllergies) {
          await autoSaveMasterItem('allergy', al);
        }
      }

      return res.status(201).json({
        success: true,
        message: `Patient "${newPatient.name}" registered without a Family Head`,
        patient: newPatient,
        family: null,
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

    // Create Patient record in MongoDB
    const newPatient = await Patient.create({
      patientId,
      familyId: familyId.trim(),
      name: toUpperTrim(name),
      relation: relation ? toUpperTrim(relation) : 'MEMBER',
      age: toUpperTrim(age),
      dob: dob ? String(dob).trim() : '',
      ageRecordedAt: ageRecordedAt ? new Date(ageRecordedAt) : (age ? new Date() : null),
      gender: gender || 'Male',
      bloodGroup: toUpperTrim(bloodGroup),
      allergies: patientAllergies,
      society: society ? toUpperTrim(society) : toUpperTrim(family.society),
      area: area ? toUpperTrim(area) : toUpperTrim(family.area),
      houseNo: houseNo ? toUpperTrim(houseNo) : toUpperTrim(family.houseNo),
      phone: phone ? phone.trim() : family.phone || '',
      isHead: false,
      registrationDoneBy: 'Family Member',
    });

    // Increment family member counter
    family.membersCount = nextSeq;
    await family.save();

    // Auto-save any new area or allergies to Master Data
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

      const isFamExplicit = /^fam[-\s]*\d+/i.test(rawSearch);
      const isPidExplicit = /^p[-\s]*\d+/i.test(rawSearch);
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
      } else if (isPidExplicit && pidStripped) {
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
      .select('patientId familyId name age dob ageRecordedAt houseNo gender bloodGroup allergies society area phone relation isHead totalDue deposit createdAt updatedAt')
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

    // Enrich with the last 2 to 3 case records for each matching patient (targeted search only)
    const patientIds = [...new Set(patients.map((p) => p.patientId).filter(Boolean))];
    const visitsByPatient = {};
    if (search && search.trim() && patientIds.length > 0 && patientIds.length <= 50) {
      const recentVisits = await Visit.find({ patientId: { $in: patientIds } })
        .select('patientId visitDate complaint complaintList treatments prescriptions investigation investigationList ipdDetails dietary labReport allergies bp sugar other charge received due createdAt updatedAt isEdited editedAt')
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(150)
        .lean();

      recentVisits.forEach((v) => {
        if (!visitsByPatient[v.patientId]) {
          visitsByPatient[v.patientId] = [];
        }

        // Show up to 3 most recent visits for this patient
        if (visitsByPatient[v.patientId].length < 3) {
          const ipdList = Array.isArray(v.ipdDetails)
            ? v.ipdDetails.map((i) => (typeof i === 'string' ? i.trim() : (i?.item || '').trim())).filter(Boolean)
            : (typeof v.ipdDetails === 'string' && v.ipdDetails.trim() ? v.ipdDetails.split(',').map((s) => s.trim()).filter(Boolean) : []);

          visitsByPatient[v.patientId].push({
            _id: v._id,
            visitDate: v.visitDate,
            complaint: v.complaint || '',
            treatments: v.treatments || [],
            prescriptions: v.prescriptions || [],
            investigation: v.investigation || '',
            ipdDetails: ipdList,
            dietary: v.dietary || '',
            labReport: v.labReport ? (typeof v.labReport === 'string' ? v.labReport : (v.labReport.reportType || v.labReport.title || 'Lab Report')) : '',
            allergies: Array.isArray(v.allergies) ? v.allergies : (v.allergies ? [v.allergies] : []),
            bp: v.bp || '',
            sugar: v.sugar || '',
            other: v.other || '',
            charge: v.charge || 0,
            received: v.received || 0,
            due: v.due || 0,
            createdAt: v.createdAt,
            updatedAt: v.updatedAt,
            isEdited: Boolean(v.isEdited || (v.updatedAt && v.createdAt && new Date(v.updatedAt).getTime() - new Date(v.createdAt).getTime() > 2000)),
            editedAt: v.editedAt || v.updatedAt,
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

    // Normalize text fields to UPPERCASE
    if (updateData.name !== undefined) updateData.name = toUpperTrim(updateData.name);
    if (updateData.relation !== undefined) updateData.relation = toUpperTrim(updateData.relation);
    if (updateData.age !== undefined) updateData.age = toUpperTrim(updateData.age);
    if (updateData.bloodGroup !== undefined) updateData.bloodGroup = toUpperTrim(updateData.bloodGroup);
    if (updateData.society !== undefined) updateData.society = toUpperTrim(updateData.society);
    if (updateData.area !== undefined) updateData.area = toUpperTrim(updateData.area);
    if (updateData.houseNo !== undefined) updateData.houseNo = toUpperTrim(updateData.houseNo);
    if (updateData.allergies !== undefined) {
      updateData.allergies = toUpperArray(updateData.allergies);
    }

    const oldName = patient.name;
    const oldFamilyId = patient.familyId || '';
    const { familyAction, newFamilyHeadName } = updateData;
    delete updateData.familyAction;
    delete updateData.newFamilyHeadName;

    let linkedFamily = null;
    if (familyAction === 'link-existing' && updateData.familyId) {
      const targetFam = await Family.findOne({ familyId: String(updateData.familyId).trim() });
      if (!targetFam) {
        return res.status(404).json({
          success: false,
          message: `Family FAM-${updateData.familyId} not found`,
        });
      }
      updateData.familyId = targetFam.familyId;
      updateData.isHead = String(targetFam.headPatientId || '') === String(patient._id);
      linkedFamily = targetFam;
    } else if (familyAction === 'create-head' && newFamilyHeadName && String(newFamilyHeadName).trim()) {
      const cleanHead = toUpperTrim(newFamilyHeadName);
      const nextFamId = await getNextFamilyIdValue();
      const isSelfHead = cleanHead === toUpperTrim(updateData.name || patient.name);

      if (isSelfHead) {
        const createdFam = await Family.create({
          familyId: nextFamId,
          headName: cleanHead,
          headPatientId: patient._id,
          society: updateData.society ?? patient.society ?? '',
          area: updateData.area ?? patient.area ?? '',
          houseNo: updateData.houseNo ?? patient.houseNo ?? '',
          phone: updateData.phone ?? patient.phone ?? '',
          registrationDoneBy: 'Self (Head of Family)',
          membersCount: 1,
        });
        updateData.familyId = nextFamId;
        updateData.isHead = true;
        updateData.relation = 'SELF';
        linkedFamily = createdFam;
      } else {
        const headPatId = `P-${nextFamId}-1`;
        const headPat = await Patient.create({
          patientId: headPatId,
          familyId: nextFamId,
          name: cleanHead,
          isHead: true,
          relation: 'SELF',
          society: updateData.society ?? patient.society ?? '',
          area: updateData.area ?? patient.area ?? '',
          houseNo: updateData.houseNo ?? patient.houseNo ?? '',
          phone: updateData.phone ?? patient.phone ?? '',
          gender: 'Male',
        });
        const createdFam = await Family.create({
          familyId: nextFamId,
          headName: cleanHead,
          headPatientId: headPat._id,
          society: updateData.society ?? patient.society ?? '',
          area: updateData.area ?? patient.area ?? '',
          houseNo: updateData.houseNo ?? patient.houseNo ?? '',
          phone: updateData.phone ?? patient.phone ?? '',
          registrationDoneBy: 'Self (Head of Family)',
          membersCount: 2,
        });
        updateData.familyId = nextFamId;
        updateData.isHead = false;
        updateData.relation = updateData.relation || 'MEMBER';
        linkedFamily = createdFam;
      }
    } else if (familyAction === 'unlink') {
      updateData.familyId = '';
      updateData.isHead = false;
      updateData.relation = 'INDIVIDUAL';
    }

    Object.assign(patient, updateData);
    await patient.save();

    if (patient.familyId !== oldFamilyId) {
      await Visit.updateMany({ patientId: patient.patientId }, { familyId: patient.familyId });
      if (oldFamilyId) {
        const oldCount = await Patient.countDocuments({ familyId: oldFamilyId });
        await Family.findOneAndUpdate({ familyId: oldFamilyId }, { membersCount: oldCount });
      }
      if (patient.familyId) {
        const newCount = await Patient.countDocuments({ familyId: patient.familyId });
        linkedFamily = await Family.findOneAndUpdate(
          { familyId: patient.familyId },
          { membersCount: newCount },
          { new: true }
        );
      }
    } else if (patient.familyId) {
      linkedFamily = await Family.findOne({ familyId: patient.familyId });
    }

    // If patient name changed, sync across visit records and family
    if (updateData.name && updateData.name.trim() !== oldName) {
      const newName = updateData.name.trim();
      await Visit.updateMany({ patientId: patient.patientId }, { patientName: newName });
      if (patient.isHead && patient.familyId) {
        await Family.findOneAndUpdate({ familyId: patient.familyId }, { headName: newName });
      }
    }

    // Auto-save updated Master Data
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
      family: linkedFamily,
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

    // Cascade delete all records linked to this patient
    const [deletedVisits, deletedLabReports, deletedCertificates] = await Promise.all([
      Visit.deleteMany({ patientId }),
      LabReport.deleteMany({ patientId }),
      Certificate.deleteMany({ patientId }),
    ]);

    // Check remaining members in this family
    const remainingMembers = await Patient.find({ familyId }).sort({ createdAt: 1 });
    const remainingCount = remainingMembers.length;

    if (remainingCount === 0 && familyId) {
      // No members left in family -> clean up orphan Family and any family-level records
      await Promise.all([
        Family.deleteOne({ familyId }),
        Visit.deleteMany({ familyId }),
        LabReport.deleteMany({ familyId }),
      ]);
    } else if (familyId) {
      // Recalculate family due from remaining visits
      const remainingFamilyVisits = await Visit.find({ familyId }).select('charge received due').lean();
      const totalCharge = remainingFamilyVisits.reduce((acc, v) => acc + Number(v.charge || 0), 0);
      const totalReceived = remainingFamilyVisits.reduce((acc, v) => acc + Number(v.received || 0), 0);
      const newFamDue = Math.max(0, totalCharge - totalReceived);

      const familyUpdate = {
        membersCount: remainingCount,
        familyDue: newFamDue,
      };

      // If the deleted patient was the Family Head, promote the next remaining member
      if (isHead && remainingMembers[0]) {
        const nextHead = remainingMembers[0];
        await Patient.updateOne(
          { _id: nextHead._id },
          { $set: { isHead: true, relation: 'Self' } }
        );
        familyUpdate.headName = nextHead.name;
        familyUpdate.headPatientId = nextHead._id;
      }

      await Family.findOneAndUpdate({ familyId }, { $set: familyUpdate });
    }

    return res.status(200).json({
      success: true,
      message: 'Patient and all related records deleted successfully',
      deleted: {
        visits: deletedVisits.deletedCount || 0,
        labReports: deletedLabReports.deletedCount || 0,
        certificates: deletedCertificates.deletedCount || 0,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete patient',
      error: error.message,
    });
  }
};

