import Family from '../models/Family.js';
import Patient from '../models/Patient.js';
import Counter from '../models/Counter.js';
import { autoSaveMasterItem } from './masterDataController.js';

// Helper: Get or initialize next 5-digit sequence starting with 00001
export const getNextFamilyIdValue = async () => {
  let counter = await Counter.findOne({ id: 'familyId' });
  let nextSeq = counter ? counter.seq : 1;
  let familyId = String(nextSeq).padStart(5, '0');

  // Verify next familyId is truly available in database
  while (await Family.exists({ familyId })) {
    nextSeq += 1;
    familyId = String(nextSeq).padStart(5, '0');
  }

  // Keep counter aligned
  if (!counter || counter.seq !== nextSeq) {
    await Counter.findOneAndUpdate(
      { id: 'familyId' },
      { $set: { seq: nextSeq } },
      { upsert: true, returnDocument: 'after' }
    );
  }

  return familyId;
};

// @desc    Preview the next available 5-digit Family ID
// @route   GET /api/families/next-id
// @access  Private
export const getNextFamilyIdPreview = async (req, res) => {
  try {
    const nextId = await getNextFamilyIdValue();
    return res.status(200).json({
      success: true,
      nextFamilyId: nextId,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to preview next Family ID',
      error: error.message,
    });
  }
};

// @desc    Register a new Family Head & automatically register as Patient
// @route   POST /api/families
// @access  Private
export const registerFamilyHead = async (req, res) => {
  try {
    const {
      headName,
      age,
      bloodGroup,
      allergies,
      society,
      area,
      registrationDoneBy,
      phone,
    } = req.body;

    if (!headName || !headName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Family head name is required',
      });
    }

    // Atomically find next non-conflicting 5-digit family ID starting with 00001
    let counter = await Counter.findOne({ id: 'familyId' });
    let currentSeq = counter ? counter.seq : 1;
    let familyId = String(currentSeq).padStart(5, '0');

    // Auto-advance if familyId is already taken
    while (await Family.exists({ familyId })) {
      currentSeq += 1;
      familyId = String(currentSeq).padStart(5, '0');
    }

    // Persist counter forward for next registration
    await Counter.findOneAndUpdate(
      { id: 'familyId' },
      { $set: { seq: currentSeq + 1 } },
      { upsert: true, returnDocument: 'after' }
    );

    // 1. Create the Family Head as a Patient directly in MongoDB
    let patientSeq = 1;
    let patientId = `P-${familyId}-${patientSeq}`;
    while (await Patient.exists({ patientId })) {
      patientSeq += 1;
      patientId = `P-${familyId}-${patientSeq}`;
    }

    const patientAllergies = Array.isArray(allergies)
      ? allergies
      : allergies ? [allergies] : [];

    const patient = await Patient.create({
      patientId,
      familyId,
      name: headName.trim(),
      age: age ? Number(age) : undefined,
      bloodGroup: bloodGroup || '',
      allergies: patientAllergies,
      society: society ? society.trim() : '',
      area: area ? area.trim() : '',
      phone: phone ? phone.trim() : '',
      relation: 'Self',
      isHead: true,
      registrationDoneBy: registrationDoneBy || 'Self (Head of Family)',
    });

    // 2. Create the Family record linking to the Patient
    const family = await Family.create({
      familyId,
      headName: headName.trim(),
      headPatientId: patient._id,
      society: society ? society.trim() : '',
      area: area ? area.trim() : '',
      phone: phone ? phone.trim() : '',
      registrationDoneBy: registrationDoneBy || 'Self (Head of Family)',
      membersCount: 1,
    });

    // 3. Auto-save location & allergy entries into Master Data for future autocomplete
    if (society) {
      await autoSaveMasterItem('society', society);
    }
    if (area) {
      await autoSaveMasterItem('area', area);
    }
    if (patientAllergies.length > 0) {
      for (const allergy of patientAllergies) {
        await autoSaveMasterItem('allergy', allergy);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Family head and patient record registered successfully',
      family,
      patient,
    });
  } catch (error) {
    console.error('Error registering family head:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to register family head',
      error: error.message,
    });
  }
};

// @desc    Get all registered families with search filter
// @route   GET /api/families
// @access  Private
export const getFamilies = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search && search.trim()) {
      const rawSearch = search.trim();
      const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

      // Also search patients for matching member names, patient IDs, etc.
      const patientOrConditions = [
        { name: regex },
        { patientId: regex },
        ...(pidStripped ? [{ patientId: new RegExp(escapeRegex(pidStripped), 'i') }] : []),
        { phone: regex },
        { society: regex },
        { area: regex },
      ];
      const matchingPatients = await Patient.find({ $or: patientOrConditions }, 'familyId');
      const matchingPatientFamIds = matchingPatients.map((p) => p.familyId);

      const allFamIds = Array.from(new Set([...candidateFamIdArr, ...matchingPatientFamIds]));

      query = {
        $or: [
          { familyId: regex },
          { headName: regex },
          { society: regex },
          { area: regex },
          { phone: regex },
          ...(allFamIds.length > 0 ? [{ familyId: { $in: allFamIds } }] : []),
        ],
      };
    }

    const families = await Family.find(query)
      .sort({ createdAt: -1 })
      .populate('headPatientId', 'age bloodGroup allergies');

    const familyIds = families.map((f) => f.familyId);
    const members = await Patient.find({ familyId: { $in: familyIds } })
      .select('patientId familyId name fullName relation isHead allergies age gender phone')
      .sort({ isHead: -1, createdAt: 1 });

    const membersByFamId = {};
    for (const m of members) {
      if (!membersByFamId[m.familyId]) {
        membersByFamId[m.familyId] = [];
      }
      membersByFamId[m.familyId].push(m);
    }

    const enrichedFamilies = families.map((fam) => {
      const famObj = fam.toObject();
      famObj.members = membersByFamId[fam.familyId] || [];
      famObj.membersCount = famObj.members.length || fam.membersCount || 1;
      return famObj;
    });

    return res.status(200).json({
      success: true,
      count: enrichedFamilies.length,
      data: enrichedFamilies,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve families',
      error: error.message,
    });
  }
};

// @desc    Get single family with all member records
// @route   GET /api/families/:familyId
// @access  Private
export const getFamilyDetails = async (req, res) => {
  try {
    const { familyId } = req.params;
    const family = await Family.findOne({ familyId });

    if (!family) {
      return res.status(404).json({
        success: false,
        message: 'Family not found',
      });
    }

    const members = await Patient.find({ familyId }).sort({ isHead: -1, createdAt: 1 });

    return res.status(200).json({
      success: true,
      family,
      members,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve family details',
      error: error.message,
    });
  }
};

// @desc    Update Family and linked Head Patient record
// @route   PUT /api/families/:familyId
// @access  Private
export const updateFamily = async (req, res) => {
  try {
    const { familyId } = req.params;
    const {
      headName,
      age,
      bloodGroup,
      allergies,
      society,
      area,
      registrationDoneBy,
      phone,
    } = req.body;

    const family = await Family.findOne({ familyId });
    if (!family) {
      return res.status(404).json({
        success: false,
        message: 'Family not found',
      });
    }

    if (headName && headName.trim()) {
      family.headName = headName.trim();
    }
    if (society !== undefined) family.society = society.trim();
    if (area !== undefined) family.area = area.trim();
    if (phone !== undefined) family.phone = phone.trim();
    if (registrationDoneBy) family.registrationDoneBy = registrationDoneBy;

    await family.save();

    // Also update the linked Head Patient record
    const patientAllergies = Array.isArray(allergies)
      ? allergies
      : allergies ? [allergies] : [];

    const headPatient = await Patient.findOneAndUpdate(
      { familyId, isHead: true },
      {
        $set: {
          name: family.headName,
          age: age ? Number(age) : undefined,
          bloodGroup: bloodGroup || '',
          allergies: patientAllergies,
          society: family.society,
          area: family.area,
          phone: family.phone,
          registrationDoneBy: family.registrationDoneBy,
        },
      },
      { new: true }
    );

    // Auto-save any new society, area, or allergies to Master Data
    if (family.society) await autoSaveMasterItem('society', family.society);
    if (family.area) await autoSaveMasterItem('area', family.area);
    if (patientAllergies.length > 0) {
      for (const al of patientAllergies) {
        await autoSaveMasterItem('allergy', al);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Family and patient records updated successfully',
      family,
      patient: headPatient,
    });
  } catch (error) {
    console.error('Error updating family:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update family',
      error: error.message,
    });
  }
};

// @desc    Delete Family and all associated Patient members
// @route   DELETE /api/families/:familyId
// @access  Private
export const deleteFamily = async (req, res) => {
  try {
    const { familyId } = req.params;

    const family = await Family.findOneAndDelete({ familyId });
    if (!family) {
      return res.status(404).json({
        success: false,
        message: 'Family not found',
      });
    }

    // Cascade delete all associated patients in this family
    const deletedPatients = await Patient.deleteMany({ familyId });

    return res.status(200).json({
      success: true,
      message: `Family FAM-${familyId} and ${deletedPatients.deletedCount} linked patient record(s) deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting family:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete family',
      error: error.message,
    });
  }
};

