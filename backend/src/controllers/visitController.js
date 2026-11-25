import Visit from '../models/Visit.js';
import Patient from '../models/Patient.js';
import Family from '../models/Family.js';
import LabReport from '../models/LabReport.js';
import Doctor from '../models/Doctor.js';
import { autoSaveMasterItem } from './masterDataController.js';
import { getNextReportId, generateLabSummary } from './labReportController.js';
import { getNextFamilyIdValue } from './familyController.js';

// Helper to recalculate dues and deposits for patient & family concurrently
export const recalculateDues = async (patientId, familyId) => {
  try {
    const [patientVisits, familyVisits] = await Promise.all([
      Visit.find({ patientId }).select('charge received').lean(),
      Visit.find({ familyId }).select('charge received').lean(),
    ]);

    const rawPatientDue = (patientVisits || []).reduce((acc, v) => acc + (v.charge || 0) - (v.received || 0), 0);
    const patientDue = rawPatientDue > 0 ? rawPatientDue : 0;
    const patientDeposit = rawPatientDue < 0 ? Math.abs(rawPatientDue) : 0;

    const rawFamDue = (familyVisits || []).reduce((acc, v) => acc + (v.charge || 0) - (v.received || 0), 0);
    const famDue = rawFamDue > 0 ? rawFamDue : 0;
    const famDeposit = rawFamDue < 0 ? Math.abs(rawFamDue) : 0;

    await Promise.all([
      Patient.findOneAndUpdate({ patientId }, { totalDue: patientDue, deposit: patientDeposit }),
      Family.findOneAndUpdate({ familyId }, { familyDue: famDue, familyDeposit: famDeposit }),
    ]);

    return { patientDue, patientDeposit, famDue, famDeposit };
  } catch (err) {
    console.error('Error recalculating dues:', err.message);
    return { patientDue: 0, patientDeposit: 0, famDue: 0, famDeposit: 0 };
  }
};

// Background helper to auto-save terms to Master Data without blocking HTTP response
const dispatchAutoSaveMasterData = (complaint, investigation, cleanPrescriptions, cleanTreatments, ipdDetails, dietary, reqBody, allergies) => {
  try {
    const tasks = [];
    if (complaint && typeof complaint === 'string') {
      complaint.split(',').forEach((c) => { if (c.trim()) tasks.push(autoSaveMasterItem('complaint', c.trim())); });
    }
    if (investigation && typeof investigation === 'string') {
      investigation.split(',').forEach((i) => { if (i.trim()) tasks.push(autoSaveMasterItem('investigation', i.trim())); });
    }
    if (Array.isArray(cleanPrescriptions)) {
      cleanPrescriptions.forEach((rx) => { if (rx.medicine) tasks.push(autoSaveMasterItem('medicine', rx.medicine)); });
    }
    if (Array.isArray(cleanTreatments)) {
      cleanTreatments.forEach((tr) => { if (tr.item) tasks.push(autoSaveMasterItem('medicine', tr.item)); });
    }
    if (Array.isArray(ipdDetails)) {
      ipdDetails.forEach((ipdItem) => {
        const itemVal = typeof ipdItem === 'string' ? ipdItem : ipdItem?.item;
        if (itemVal && itemVal.trim()) tasks.push(autoSaveMasterItem('medicine', itemVal.trim()));
      });
    }
    if (dietary && typeof dietary === 'string') {
      dietary.split(',').forEach((d) => { if (d.trim()) tasks.push(autoSaveMasterItem('dietary', d.trim())); });
    }
    if (reqBody.society && typeof reqBody.society === 'string' && reqBody.society.trim()) {
      tasks.push(autoSaveMasterItem('society', reqBody.society.trim()));
    }
    if (reqBody.area && typeof reqBody.area === 'string' && reqBody.area.trim()) {
      tasks.push(autoSaveMasterItem('area', reqBody.area.trim()));
    }
    if (Array.isArray(allergies)) {
      allergies.forEach((alg) => {
        if (typeof alg === 'string' && alg.trim()) tasks.push(autoSaveMasterItem('allergy', alg.trim()));
      });
    }
    if (tasks.length > 0) {
      Promise.allSettled(tasks).catch(() => {});
    }
  } catch (e) {
    // Non-critical background task
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

    // Auto-save individual terms to Master Data in background without blocking HTTP response
    dispatchAutoSaveMasterData(complaint, investigation, cleanPrescriptions, cleanTreatments, ipdDetails, dietary, req.body, allergies);

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
      deposit: patientDeposit,
      familyDue: famDue,
      familyDeposit: famDeposit,
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
    const { patientId, patientIds, familyId, limit } = req.query;
    const query = {};

    if (patientIds) {
      const idList = Array.isArray(patientIds)
        ? patientIds
        : String(patientIds).split(',').map((id) => id.trim()).filter(Boolean);
      query.patientId = { $in: idList };
    } else if (patientId) {
      query.patientId = patientId.trim();
    }
    if (familyId) query.familyId = familyId.trim();

    let queryBuilder = Visit.find(query).sort({ visitDate: -1, createdAt: -1 });
    if (limit) {
      queryBuilder = queryBuilder.limit(parseInt(limit, 10));
    }
    const visits = await queryBuilder.lean();

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
    const { patientDue, patientDeposit, famDue, famDeposit } = await recalculateDues(visit.patientId, visit.familyId);

    // Auto-save individual terms to Master Data in background without blocking HTTP response
    dispatchAutoSaveMasterData(complaint, investigation, cleanPrescriptions, cleanTreatments, ipdDetails, dietary, req.body, allergies);

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
      deposit: patientDeposit,
      familyDue: famDue,
      familyDeposit: famDeposit,
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
    const { patientDue, patientDeposit, famDue, famDeposit } = await recalculateDues(visit.patientId, visit.familyId);

    return res.status(200).json({
      success: true,
      message: 'Visit record deleted successfully',
      totalDue: patientDue,
      deposit: patientDeposit,
      familyDue: famDue,
      familyDeposit: famDeposit,
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

    // Fast search: search directly on indexed Visit fields (patientName, patientId, complaint, reference)
    if (search && search.trim()) {
      const s = search.trim();
      const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');

      query.$or = [
        { patientName: regex },
        { patientId: regex },
        { complaint: regex },
        { reference: regex },
      ];
    }

    const visits = await Visit.find(query)
      .select('patientId familyId patientName visitDate createdAt complaint ipdDetails treatments prescriptions bp sugar other reference charge received due allergies')
      .sort({ createdAt: -1 })
      .limit(Math.min(250, Number(limit) || 100))
      .lean();

    // Attach latest patient allergies for highlight
    const patientIds = [...new Set(visits.map((v) => v.patientId).filter(Boolean))];
    const patients = await Patient.find({ patientId: { $in: patientIds } })
      .select('patientId allergies')
      .lean();
    const patMap = {};
    patients.forEach((p) => {
      patMap[p.patientId] = p;
    });

    const enriched = visits.map((v) => {
      const pat = patMap[v.patientId];
      const combinedAllergies = (pat?.allergies && pat.allergies.length > 0)
        ? pat.allergies
        : (v.allergies || []);
      return {
        ...v,
        allergies: combinedAllergies,
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


