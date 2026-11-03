import Visit from '../models/Visit.js';
import Patient from '../models/Patient.js';
import Family from '../models/Family.js';
import LabReport from '../models/LabReport.js';
import { autoSaveMasterItem } from './masterDataController.js';
import { getNextReportId, generateLabSummary } from './labReportController.js';

// Helper to recalculate dues for patient & family
const recalculateDues = async (patientId, familyId) => {
  try {
    // 1. Patient Total Due
    const patientVisits = await Visit.find({ patientId });
    const patientDue = patientVisits.reduce((acc, v) => acc + (v.due || 0), 0);
    await Patient.findOneAndUpdate({ patientId }, { totalDue: patientDue });

    // 2. Family Total Due
    const familyVisits = await Visit.find({ familyId });
    const famDue = familyVisits.reduce((acc, v) => acc + (v.due || 0), 0);
    await Family.findOneAndUpdate({ familyId }, { familyDue: famDue });

    return { patientDue, famDue };
  } catch (err) {
    console.error('Error recalculating dues:', err.message);
    return { patientDue: 0, famDue: 0 };
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
      charge,
      received,
      labReport,
    } = req.body;

    if (!patientId || !familyId) {
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
      ? prescriptions.filter((p) => p.medicine && p.medicine.trim())
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
          patientId: patientId.trim(),
          familyId: familyId.trim(),
          patientName: patientName || 'Patient',
          summary,
        });
      } catch (err) {
        console.error('Error auto-creating LabReport in recordVisit:', err.message);
      }
    }

    const visit = await Visit.create({
      patientId: patientId.trim(),
      familyId: familyId.trim(),
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

    // Recalculate dues
    const { patientDue, famDue } = await recalculateDues(patientId, familyId);

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
    if (dietary && typeof dietary === 'string') {
      const tokens = dietary.split(',').map((d) => d.trim()).filter(Boolean);
      for (const item of tokens) {
        await autoSaveMasterItem('dietary', item);
      }
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
      ? prescriptions.filter((p) => p.medicine && p.medicine.trim())
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
    if (dietary && typeof dietary === 'string') {
      const tokens = dietary.split(',').map((d) => d.trim()).filter(Boolean);
      for (const item of tokens) {
        await autoSaveMasterItem('dietary', item);
      }
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

// @desc    Delete a visit
// @route   DELETE /api/visits/:id
// @access  Private
export const deleteVisit = async (req, res) => {
  try {
    const visit = await Visit.findByIdAndDelete(req.params.id);
    if (!visit) {
      return res.status(404).json({
        success: false,
        message: 'Visit not found',
      });
    }

    // Recalculate dues after deletion
    await recalculateDues(visit.patientId, visit.familyId);

    return res.status(200).json({
      success: true,
      message: 'Visit record deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete visit',
      error: error.message,
    });
  }
};


