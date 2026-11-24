import Visit from '../models/Visit.js';
import Patient from '../models/Patient.js';
import Family from '../models/Family.js';
import LabReport from '../models/LabReport.js';
import Doctor from '../models/Doctor.js';
import { autoSaveMasterItem } from './masterDataController.js';
import { getNextReportId, generateLabSummary } from './labReportController.js';
import { getNextFamilyIdValue } from './familyController.js';

// Helper to recalculate dues and deposits for patient & family
export const recalculateDues = async (patientId, familyId) => {
  try {
    // 1. Patient Total Due & Deposit
    const patientVisits = await Visit.find({ patientId });
    const rawPatientDue = patientVisits.reduce((acc, v) => acc + (v.charge || 0) - (v.received || 0), 0);
    const patientDue = rawPatientDue > 0 ? rawPatientDue : 0;
    const patientDeposit = rawPatientDue < 0 ? Math.abs(rawPatientDue) : 0;
    await Patient.findOneAndUpdate({ patientId }, { totalDue: patientDue, deposit: patientDeposit });

    // 2. Family Total Due & Deposit
    const familyVisits = await Visit.find({ familyId });
    const rawFamDue = familyVisits.reduce((acc, v) => acc + (v.charge || 0) - (v.received || 0), 0);
    const famDue = rawFamDue > 0 ? rawFamDue : 0;
    const famDeposit = rawFamDue < 0 ? Math.abs(rawFamDue) : 0;
    await Family.findOneAndUpdate({ familyId }, { familyDue: famDue, familyDeposit: famDeposit });

    return { patientDue, patientDeposit, famDue, famDeposit };
  } catch (err) {
    console.error('Error recalculating dues:', err.message);
    return { patientDue: 0, patientDeposit: 0, famDue: 0, famDeposit: 0 };
  }
};

// @desc    Record a new Patient Visit & Prescription
// @route   POST /api/visits
// @access  Private
export const recordVisit = async (req, res) => {
  try {
    const {
      patientId,
      familyId,
      patientName,
      visitDate,
      bp,
      sugar,
      other,
      reference,
      investigation,
      complaint,
      treatments,
      prescriptions,
      dietary,
      ipdDetails,
      allergies,
      charge,
      received,
      labReport,
    } = req.body;

    let finalPatientId = patientId;
    let finalFamilyId = familyId;

    // Auto-create Family and Patient if new unregistered patient
    if ((!finalPatientId || finalPatientId === 'NEW' || !finalFamilyId) && patientName && patientName.trim()) {
      try {
        const nextFamId = await getNextFamilyIdValue();
        const patId = `P-${nextFamId}-1`;
        await Family.create({
          familyId: nextFamId,
          headName: patientName.trim(),
          phone: req.body.phone || '',
          society: req.body.society || '',
          area: req.body.area || '',
          age: req.body.age ? String(req.body.age).trim() : '',
          gender: req.body.gender || 'Male',
        });
        const createdPat = await Patient.create({
          patientId: patId,
          familyId: nextFamId,
          name: patientName.trim(),
          isHead: true,
          relation: 'Self',
          phone: req.body.phone || '',
          society: req.body.society || '',
          area: req.body.area || '',
          age: req.body.age ? String(req.body.age).trim() : '',
          dob: req.body.dob || '',
          gender: req.body.gender || 'Male',
          allergies: Array.isArray(allergies) ? allergies : (allergies ? [allergies] : []),
        });
        finalPatientId = patId;
        finalFamilyId = nextFamId;
      } catch (autoErr) {
        console.error('Error auto-creating patient in recordVisit:', autoErr.message);
      }
    }

    if (!finalPatientId || !finalFamilyId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID and Family ID are required',
      });
    }

    const numCharge = Math.max(0, Number(charge) || 0);
    const numReceived = Math.max(0, Number(received) || 0);
    const numDue = Math.max(0, numCharge - numReceived);

    // Format clean treatments and prescriptions arrays
    const cleanTreatments = Array.isArray(treatments)
      ? treatments.filter((t) => t.item && t.item.trim())
      : [];

    const cleanPrescriptions = Array.isArray(prescriptions)
      ? prescriptions
          .filter((p) => p.medicine && p.medicine.trim())
          .map((p) => ({
            medicine: p.medicine.trim(),
            qty: p.qty !== undefined && p.qty !== null ? String(p.qty).trim() : '',
            morning: p.morning !== undefined ? String(p.morning).trim() : '1',
            noon: p.noon !== undefined ? String(p.noon).trim() : '0',
            evening: p.evening !== undefined ? String(p.evening).trim() : '1',
            night: p.night !== undefined ? String(p.night).trim() : '0',
            timing: p.timing || 'AF',
            sosInstruction: p.sosInstruction ? String(p.sosInstruction).trim() : '',
          }))
      : [];

    // Optional: Save attached Lab Report if present
    let savedLabReport = null;
    if (labReport && typeof labReport === 'object' && Object.keys(labReport).length > 0) {
      try {
        const reportId = labReport.reportId || (await getNextReportId());
        const summary = labReport.summary || generateLabSummary(labReport);
        savedLabReport = await LabReport.create({
          ...labReport,
          reportId,
          patientId: finalPatientId.trim(),
          familyId: finalFamilyId.trim(),
          patientName: patientName || 'Patient',
          summary,
        });
      } catch (err) {
        console.error('Error auto-creating LabReport in recordVisit:', err.message);
      }
    }

    const visit = await Visit.create({
      patientId: finalPatientId.trim(),
      familyId: finalFamilyId.trim(),
      patientName: patientName || 'Patient',
      visitDate: visitDate || new Date().toISOString().split('T')[0],
      bp: bp ? bp.trim() : '120/80',
      sugar: sugar ? sugar.trim() : '',
      other: other ? other.trim() : '',
      reference: reference ? reference.trim() : '',
      investigation: investigation ? investigation.trim() : '',
      complaint: complaint ? complaint.trim() : '',
      treatments: cleanTreatments,
      prescriptions: cleanPrescriptions,
      dietary: dietary ? dietary.trim() : '',
      ipdDetails: Array.isArray(ipdDetails) ? ipdDetails : (ipdDetails ? [ipdDetails] : []),
      allergies: Array.isArray(allergies) ? allergies : (allergies ? [allergies] : []),
      charge: numCharge,
      received: numReceived,
      due: numDue,
      labReport: savedLabReport ? savedLabReport.toObject() : (labReport || null),
      labReportId: savedLabReport ? savedLabReport._id : null,
    });

    if (savedLabReport) {
      savedLabReport.visitId = visit._id;
      await savedLabReport.save();
    }

    // Recalculate dues & deposits
    const { patientDue, patientDeposit, famDue, famDeposit } = await recalculateDues(finalPatientId, finalFamilyId);

    // Auto-save individual terms to Master Data for autocomplete:
    // Split comma-separated items and only save new individual terms if not already existing
    if (complaint && typeof complaint === 'string') {
      const tokens = complaint.split(',').map((c) => c.trim()).filter(Boolean);
      for (const item of tokens) {
        await autoSaveMasterItem('complaint', item);
      }
    }
    if (investigation && typeof investigation === 'string') {
      const tokens = investigation.split(',').map((i) => i.trim()).filter(Boolean);
      for (const item of tokens) {
        await autoSaveMasterItem('investigation', item);
      }
    }
    for (const rx of cleanPrescriptions) {
      if (rx.medicine) await autoSaveMasterItem('medicine', rx.medicine);
    }
    for (const tr of cleanTreatments) {
      if (tr.item) await autoSaveMasterItem('medicine', tr.item);
    }
    if (Array.isArray(ipdDetails)) {
      for (const ipdItem of ipdDetails) {
        const itemVal = typeof ipdItem === 'string' ? ipdItem : ipdItem?.item;
        if (itemVal && itemVal.trim()) {
          // IPD data stored in medicine tab of master data
          await autoSaveMasterItem('medicine', itemVal.trim());
        }
      }
    }
    if (dietary && typeof dietary === 'string') {
      const tokens = dietary.split(',').map((d) => d.trim()).filter(Boolean);
      for (const item of tokens) {
        await autoSaveMasterItem('dietary', item);
      }
    }
    if (req.body.society && typeof req.body.society === 'string' && req.body.society.trim()) {
      await autoSaveMasterItem('society', req.body.society.trim());
    }
    if (req.body.area && typeof req.body.area === 'string' && req.body.area.trim()) {
      await autoSaveMasterItem('area', req.body.area.trim());
    }
    if (Array.isArray(allergies) && allergies.length > 0) {
      for (const alg of allergies) {
        if (typeof alg === 'string' && alg.trim()) {
          await autoSaveMasterItem('allergy', alg.trim());
        }
      }
    }

    // Sync patient demographic updates (dob, age, phone, society, area, allergies)
    const patUpdates = {};
    if (req.body.phone !== undefined) patUpdates.phone = req.body.phone;
    if (req.body.age !== undefined) patUpdates.age = req.body.age;
    if (req.body.dob !== undefined) patUpdates.dob = req.body.dob;
    if (req.body.society !== undefined) patUpdates.society = req.body.society;
    if (req.body.area !== undefined) patUpdates.area = req.body.area;
    if (Array.isArray(allergies)) patUpdates.allergies = allergies;
    if (Object.keys(patUpdates).length > 0) {
      await Patient.findOneAndUpdate({ patientId: visit.patientId }, patUpdates);
    }

    return res.status(201).json({
      success: true,
      message: 'Visit and clinical case recorded successfully',
      visit,
      totalDue: patientDue,
      familyDue: famDue,
    });
  } catch (error) {
    console.error('Error recording visit:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record visit',
      error: error.message,
    });
  }
};

// @desc    Get all visits for a patient
// @route   GET /api/visits
// @access  Private
export const getPatientVisits = async (req, res) => {
  try {
    const { patientId, familyId } = req.query;
    const query = {};

    if (patientId) query.patientId = patientId.trim();
    if (familyId) query.familyId = familyId.trim();

    const visits = await Visit.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: visits.length,
      data: visits,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve visits',
      error: error.message,
    });
  }
};

// @desc    Update a visit record
// @route   PUT /api/visits/:id
// @access  Private
export const updateVisit = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      visitDate,
      bp,
      sugar,
      other,
      reference,
      investigation,
      complaint,
      treatments,
      prescriptions,
      dietary,
      ipdDetails,
      allergies,
      charge,
      received,
      labReport,
    } = req.body;

    const visit = await Visit.findById(id);
    if (!visit) {
      return res.status(404).json({
        success: false,
        message: 'Visit not found',
      });
    }

    const numCharge = Math.max(0, Number(charge) || 0);
    const numReceived = Math.max(0, Number(received) || 0);
    const numDue = Math.max(0, numCharge - numReceived);

    const cleanTreatments = Array.isArray(treatments)
      ? treatments.filter((t) => t.item && t.item.trim())
      : [];

    const cleanPrescriptions = Array.isArray(prescriptions)
      ? prescriptions
          .filter((p) => p.medicine && p.medicine.trim())
          .map((p) => ({
            medicine: p.medicine.trim(),
            qty: p.qty !== undefined && p.qty !== null ? String(p.qty).trim() : '',
            morning: p.morning !== undefined ? String(p.morning).trim() : '1',
            noon: p.noon !== undefined ? String(p.noon).trim() : '0',
            evening: p.evening !== undefined ? String(p.evening).trim() : '1',
            night: p.night !== undefined ? String(p.night).trim() : '0',
            timing: p.timing || 'AF',
            sosInstruction: p.sosInstruction ? String(p.sosInstruction).trim() : '',
          }))
      : [];

    visit.visitDate = visitDate || visit.visitDate;
    visit.bp = bp !== undefined ? bp : visit.bp;
    visit.sugar = sugar !== undefined ? sugar : visit.sugar;
    visit.other = other !== undefined ? other : visit.other;
    visit.reference = reference !== undefined ? reference : visit.reference;
    visit.investigation = investigation !== undefined ? investigation : visit.investigation;
    visit.complaint = complaint !== undefined ? complaint : visit.complaint;
    visit.treatments = cleanTreatments;
    visit.prescriptions = cleanPrescriptions;
    if (dietary !== undefined) visit.dietary = dietary ? dietary.trim() : '';
    if (ipdDetails !== undefined) {
      visit.ipdDetails = Array.isArray(ipdDetails) ? ipdDetails : (ipdDetails ? [ipdDetails] : []);
    }
    if (allergies !== undefined) {
      visit.allergies = Array.isArray(allergies) ? allergies : (allergies ? [allergies] : []);
    }
    visit.charge = numCharge;
    visit.received = numReceived;
    visit.due = numDue;

    if (labReport !== undefined) {
      visit.labReport = labReport;
      if (labReport && typeof labReport === 'object' && Object.keys(labReport).length > 0) {
        if (visit.labReportId) {
          await LabReport.findByIdAndUpdate(visit.labReportId, {
            ...labReport,
            summary: labReport.summary || generateLabSummary(labReport),
          });
        } else {
          try {
            const reportId = labReport.reportId || (await getNextReportId());
            const summary = labReport.summary || generateLabSummary(labReport);
            const newRep = await LabReport.create({
              ...labReport,
              reportId,
              patientId: visit.patientId,
              familyId: visit.familyId,
              patientName: visit.patientName,
              visitId: visit._id,
              summary,
            });
            visit.labReportId = newRep._id;
            visit.labReport = newRep.toObject();
          } catch (err) {
            console.error('Error creating LabReport in updateVisit:', err.message);
          }
        }
      } else if (labReport === null) {
        if (visit.labReportId) {
          await LabReport.findByIdAndDelete(visit.labReportId);
          visit.labReportId = null;
        }
      }
    }

    await visit.save();

    // Recalculate dues
    const { patientDue, famDue } = await recalculateDues(visit.patientId, visit.familyId);

    // Auto-save individual terms to Master Data for autocomplete:
    // Split comma-separated items and only save new individual terms if not already existing
    if (complaint && typeof complaint === 'string') {
      const tokens = complaint.split(',').map((c) => c.trim()).filter(Boolean);
      for (const item of tokens) {
        await autoSaveMasterItem('complaint', item);
      }
    }
    if (investigation && typeof investigation === 'string') {
      const tokens = investigation.split(',').map((i) => i.trim()).filter(Boolean);
      for (const item of tokens) {
        await autoSaveMasterItem('investigation', item);
      }
    }
    for (const rx of cleanPrescriptions) {
      if (rx.medicine) await autoSaveMasterItem('medicine', rx.medicine);
    }
    for (const tr of cleanTreatments) {
      if (tr.item) await autoSaveMasterItem('medicine', tr.item);
    }
    if (Array.isArray(ipdDetails)) {
      for (const ipdItem of ipdDetails) {
        const itemVal = typeof ipdItem === 'string' ? ipdItem : ipdItem?.item;
        if (itemVal && itemVal.trim()) {
          // IPD data stored in medicine tab of master data
          await autoSaveMasterItem('medicine', itemVal.trim());
        }
      }
    }
    if (dietary && typeof dietary === 'string') {
      const tokens = dietary.split(',').map((d) => d.trim()).filter(Boolean);
      for (const item of tokens) {
        await autoSaveMasterItem('dietary', item);
      }
    }
    if (req.body.society && typeof req.body.society === 'string' && req.body.society.trim()) {
      await autoSaveMasterItem('society', req.body.society.trim());
    }
    if (req.body.area && typeof req.body.area === 'string' && req.body.area.trim()) {
      await autoSaveMasterItem('area', req.body.area.trim());
    }
    if (Array.isArray(allergies) && allergies.length > 0) {
      for (const alg of allergies) {
        if (typeof alg === 'string' && alg.trim()) {
          await autoSaveMasterItem('allergy', alg.trim());
        }
      }
    }

    // Sync patient demographic updates (dob, age, phone, society, area, allergies)
    const patUpdates = {};
    if (req.body.phone !== undefined) patUpdates.phone = req.body.phone;
    if (req.body.age !== undefined) patUpdates.age = req.body.age;
    if (req.body.dob !== undefined) patUpdates.dob = req.body.dob;
    if (req.body.society !== undefined) patUpdates.society = req.body.society;
    if (req.body.area !== undefined) patUpdates.area = req.body.area;
    if (Array.isArray(allergies)) patUpdates.allergies = allergies;
    if (Object.keys(patUpdates).length > 0) {
      await Patient.findOneAndUpdate({ patientId: visit.patientId }, patUpdates);
    }

    return res.status(200).json({
      success: true,
      message: 'Visit updated successfully',
      visit,
      totalDue: patientDue,
      familyDue: famDue,
    });
  } catch (error) {
    console.error('Error updating visit:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update visit',
      error: error.message,
    });
  }
};

// @desc    Delete a visit (Protected by Doctor Password)
// @route   DELETE /api/visits/:id
// @access  Private
export const deleteVisit = async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Doctor password is required to delete a clinical visit record',
      });
    }

    // Verify doctor identity & password
    const doctorId = req.doctor?._id;
    const doctor = doctorId ? await Doctor.findById(doctorId) : await Doctor.findOne();
    if (!doctor) {
      return res.status(401).json({
        success: false,
        message: 'Doctor profile not found or unauthorized',
      });
    }

    const isMatch = await doctor.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect doctor password. Deletion denied.',
      });
    }

    const visit = await Visit.findById(req.params.id);
    if (!visit) {
      return res.status(404).json({
        success: false,
        message: 'Visit record not found',
      });
    }

    if (visit.labReportId) {
      try {
        await LabReport.findByIdAndDelete(visit.labReportId);
      } catch (err) {
        console.warn('Error deleting attached LabReport on visit deletion:', err.message);
      }
    }

    await Visit.findByIdAndDelete(req.params.id);

    // Recalculate dues after deletion
    const { patientDue, famDue } = await recalculateDues(visit.patientId, visit.familyId);

    return res.status(200).json({
      success: true,
      message: 'Visit record deleted successfully',
      totalDue: patientDue,
      familyDue: famDue,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete visit',
      error: error.message,
    });
  }
};

// @desc    Collect Due payment from patient
// @route   POST /api/visits/collect-due
// @access  Private
export const collectDue = async (req, res) => {
  try {
    const { patientId, amount, paymentMode = 'Cash', notes = '' } = req.body;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID is required',
      });
    }

    const numAmount = Math.max(0, Number(amount) || 0);
    if (numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid collection amount greater than 0 is required',
      });
    }

    const patient = await Patient.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient record not found',
      });
    }

    const visitDate = new Date().toISOString().split('T')[0];
    const modeUpper = (paymentMode || 'Cash').toUpperCase();
    const cleanNotes = notes ? notes.trim() : '';
    const refString = `DUE COLLECTION (${modeUpper})${cleanNotes ? ' - ' + cleanNotes : ''}`;

    const visit = await Visit.create({
      patientId: patient.patientId,
      familyId: patient.familyId,
      patientName: patient.name,
      visitDate,
      bp: '',
      sugar: '',
      other: '',
      reference: refString,
      investigation: '',
      complaint: '',
      treatments: [],
      prescriptions: [],
      dietary: '',
      ipdDetails: [],
      allergies: [],
      charge: 0,
      received: numAmount,
      due: -numAmount,
    });

    const { patientDue, patientDeposit, famDue, famDeposit } = await recalculateDues(patient.patientId, patient.familyId);

    return res.status(201).json({
      success: true,
      message: `₹${numAmount.toLocaleString('en-IN')} collected successfully`,
      visit,
      totalDue: patientDue,
      deposit: patientDeposit,
      familyDue: famDue,
      familyDeposit: famDeposit,
    });
  } catch (error) {
    console.error('Error collecting due:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record due collection',
      error: error.message,
    });
  }
};

// @desc    Get recent OPD visits / cases for Recent History view
// @route   GET /api/visits/recent
// @access  Private
export const getRecentVisits = async (req, res) => {
  try {
    const { search = '', period = 'all', date = '', limit = 150 } = req.query;

    const query = {};

    // Date / period filter
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    if (period === 'today') {
      query.visitDate = todayStr;
    } else if (period === 'yesterday') {
      const yDate = new Date();
      yDate.setDate(yDate.getDate() - 1);
      const yStr = `${yDate.getFullYear()}-${pad(yDate.getMonth() + 1)}-${pad(yDate.getDate())}`;
      query.visitDate = yStr;
    } else if (period === 'custom' && date) {
      query.visitDate = date;
    }

    // Search query: patient name, patient id, family id, complaint, reference, phone, or area
    if (search && search.trim()) {
      const s = search.trim();
      const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');

      // Also search matching patientIds by phone, mobile, area, or society
      const matchedPatients = await Patient.find({
        $or: [
          { name: regex },
          { patientId: regex },
          { familyId: regex },
          { phone: regex },
          { mobile: regex },
          { area: regex },
          { society: regex },
        ],
      }).select('patientId').lean();

      const matchedPids = matchedPatients.map((p) => p.patientId);

      query.$or = [
        { patientName: regex },
        { patientId: regex },
        { familyId: regex },
        { complaint: regex },
        { reference: regex },
        { investigation: regex },
        { patientId: { $in: matchedPids } },
      ];
    }

    const visits = await Visit.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(Math.min(300, Number(limit) || 150))
      .lean();

    // Attach patient details (phone, mobile, area, society, current due, deposit)
    const patientIds = [...new Set(visits.map((v) => v.patientId).filter(Boolean))];
    const patients = await Patient.find({ patientId: { $in: patientIds } })
      .select('patientId name phone mobile area society totalDue deposit familyId gender age')
      .lean();
    const patMap = {};
    patients.forEach((p) => {
      patMap[p.patientId] = p;
    });

    const enriched = visits.map((v) => {
      const pat = patMap[v.patientId];
      return {
        ...v,
        phone: pat?.phone || pat?.mobile || '',
        area: pat?.area || pat?.society || '',
        gender: pat?.gender || '',
        age: pat?.age || '',
        currentPatientDue: pat?.totalDue !== undefined ? pat.totalDue : (v.due || 0),
        currentPatientDeposit: pat?.deposit || 0,
      };
    });

    return res.status(200).json({
      success: true,
      count: enriched.length,
      visits: enriched,
    });
  } catch (error) {
    console.error('Error fetching recent visits:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch recent visits',
      error: error.message,
    });
  }
};


