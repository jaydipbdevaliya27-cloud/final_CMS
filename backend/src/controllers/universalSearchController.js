import Family from '../models/Family.js';
import Patient from '../models/Patient.js';

// Escape regex special characters
const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * @desc    Universal Search for Patient / Family
 *          - When searched via Family ID: returns ALL family members under that Family ID
 *          - When searched via Patient ID, Patient Name, Area, Phone: returns ONLY the matched patient(s)
 * @route   GET /api/universal-search
 * @access  Private (Doctor protected)
 */
export const universalSearch = async (req, res) => {
  try {
    const rawQuery = (req.query.q || req.query.search || '').trim();

    if (!rawQuery) {
      return res.status(200).json({
        success: true,
        query: '',
        count: 0,
        data: [],
      });
    }

    const safeRegex = new RegExp(escapeRegex(rawQuery), 'i');

    // 1. Determine whether this search is explicitly for a Family ID:
    // Examples of Family ID search: "FAM-00001", "fam 00001", "FAM-1", "FAM 1", "fam1"
    const isExplicitFamSearch = /^fam[-\s]*/i.test(rawQuery);

    // Pure digits like "00001" or "1" (without "P" or sequence hyphens)
    const isPureDigits = /^\d+$/.test(rawQuery);

    // Patient ID pattern: starts with "P-" or "p-", or sequence like "00001-2"
    const isPidPattern = /^p[-\s]*/i.test(rawQuery) || /\d+-\d+/.test(rawQuery);

    const isFamSearch = isExplicitFamSearch || (isPureDigits && !isPidPattern);

    if (isFamSearch) {
      // -------------------------------------------------------------
      // SEARCH VIA FAMILY ID -> SHOW ALL MEMBERS UNDER THAT FAMILY ID
      // -------------------------------------------------------------
      const famStripped = rawQuery.replace(/^fam[-\s]*/i, '').trim();
      const digitsOnly = rawQuery.replace(/\D/g, '');

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

      const families = await Family.find({
        $or: [
          { familyId: safeRegex },
          ...(candidateFamIdArr.length > 0 ? [{ familyId: { $in: candidateFamIdArr } }] : []),
        ],
      }).lean();

      const matchedFamilyIds = families.map((f) => f.familyId);

      // Fetch ALL members belonging to these matched family IDs
      const members = await Patient.find({ familyId: { $in: matchedFamilyIds } })
        .select('patientId familyId name fullName relation isHead age gender bloodGroup allergies society area phone totalDue createdAt')
        .sort({ isHead: -1, createdAt: 1 })
        .lean();

      return res.status(200).json({
        success: true,
        query: rawQuery,
        searchType: 'family',
        count: members.length,
        data: members,
      });
    } else {
      // --------------------------------------------------------------------------
      // SEARCH VIA PATIENT ID, NAME, AREA, PHONE -> SHOW ONLY THE MATCHED PATIENTS
      // --------------------------------------------------------------------------
      const pidStripped = rawQuery.replace(/^p[-\s]*/i, '').trim();

      const patientOrConditions = [
        { name: safeRegex },
        { patientId: safeRegex },
        { phone: safeRegex },
        { society: safeRegex },
        { area: safeRegex },
      ];

      if (pidStripped) {
        patientOrConditions.push({ patientId: new RegExp(escapeRegex(pidStripped), 'i') });
      }

      const patients = await Patient.find({ $or: patientOrConditions })
        .select('patientId familyId name fullName relation isHead age gender bloodGroup allergies society area phone totalDue createdAt')
        .sort({ createdAt: -1 })
        .lean();

      return res.status(200).json({
        success: true,
        query: rawQuery,
        searchType: 'patient',
        count: patients.length,
        data: patients,
      });
    }
  } catch (error) {
    console.error('Universal search error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to execute universal search',
      error: error.message,
    });
  }
};
