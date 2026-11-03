import LabReport from '../models/LabReport.js';
import Counter from '../models/Counter.js';

// Helper: Generate next Lab Report ID (e.g. REP-2026-0001)
export const getNextReportId = async () => {
  const currentYear = new Date().getFullYear();
  const counterId = `labReport_${currentYear}`;

  let counter = await Counter.findOne({ id: counterId });
  if (!counter) {
    counter = await Counter.create({ id: counterId, seq: 1 });
    return `REP-${currentYear}-0001`;
  }

  counter.seq += 1;
  await counter.save();
  const seqStr = String(counter.seq).padStart(4, '0');
  return `REP-${currentYear}-${seqStr}`;
};

// Helper: Compile short summary of non-empty findings for case sheet
export const generateLabSummary = (data) => {
  const parts = [];

  const h = data.hematology || {};
  const cbcParts = [];
  if (h.hb) cbcParts.push(`Hb ${h.hb}`);
  if (h.wbc) cbcParts.push(`WBC ${h.wbc}`);
  if (h.platelet) cbcParts.push(`Plat ${h.platelet}`);
  if (h.esr) cbcParts.push(`ESR ${h.esr}`);
  if (cbcParts.length) parts.push(`CBC: ${cbcParts.join(', ')}`);

  const g = data.bloodGlucoseRenal || {};
  const gParts = [];
  if (g.rbs) gParts.push(`RBS ${g.rbs}`);
  if (g.fbs) gParts.push(`FBS ${g.fbs}`);
  if (g.ppbs) gParts.push(`PPBS ${g.ppbs}`);
  if (g.screatinin) gParts.push(`S.Creat ${g.screatinin}`);
  if (g.vitb12) gParts.push(`Vit B12 ${g.vitb12}`);
  if (gParts.length) parts.push(`Renal/Sugar: ${gParts.join(', ')}`);

  const t = data.thyroid || {};
  const tParts = [];
  if (t.t3) tParts.push(`T3 ${t.t3}`);
  if (t.t4) tParts.push(`T4 ${t.t4}`);
  if (t.tsh) tParts.push(`TSH ${t.tsh}`);
  if (tParts.length) parts.push(`Thyroid: ${tParts.join(', ')}`);

  const s = data.specialFindings || [];
  for (const item of s) {
    if (item.notes && item.notes.trim()) {
      parts.push(`${item.title}: ${item.notes.trim().slice(0, 40)}${item.notes.trim().length > 40 ? '...' : ''}`);
    }
  }

  return parts.join(' | ') || 'Routine Investigation Complete';
};

// @desc    Create new Lab Investigation Report
// @route   POST /api/lab-reports
// @access  Private
export const createLabReport = async (req, res) => {
  try {
    const {
      patientId,
      familyId,
      patientName,
      familyName,
      labName,
      doctorName,
      caseNo,
      entryDate,
      hematology,
      bloodGlucoseRenal,
      differentialWbc,
      thyroid,
      specialFindings,
      visitId,
    } = req.body;

    if (!patientId || !patientName) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID and Name are required.',
      });
    }

    const reportId = await getNextReportId();
    const summary = generateLabSummary(req.body);

    const report = await LabReport.create({
      reportId,
      patientId,
      familyId: familyId || '',
      patientName: patientName.trim(),
      familyName: familyName ? familyName.trim() : patientName.trim(),
      labName: labName ? labName.trim() : 'Diagnostic Laboratory Name',
      doctorName: doctorName ? doctorName.trim() : 'Dr. Chirag Paghdal',
      caseNo: caseNo ? caseNo.trim() : String(Date.now()).slice(-6),
      entryDate: entryDate || new Date().toISOString().split('T')[0],
      hematology: hematology || {},
      bloodGlucoseRenal: bloodGlucoseRenal || {},
      differentialWbc: differentialWbc || {},
      thyroid: thyroid || {},
      specialFindings: specialFindings || [],
      summary,
      visitId: visitId || null,
    });

    return res.status(201).json({
      success: true,
      message: 'Lab report created successfully.',
      data: report,
    });
  } catch (error) {
    console.error('Error creating lab report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create lab report.',
      error: error.message,
    });
  }
};

// @desc    Get all Lab Investigation Reports with optional patientId / search filter
// @route   GET /api/lab-reports
// @access  Private
export const getLabReports = async (req, res) => {
  try {
    const { patientId, search, startDate, endDate } = req.query;
    const query = {};

    if (patientId) {
      query.patientId = patientId;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { reportId: regex },
        { patientName: regex },
        { familyName: regex },
        { caseNo: regex },
        { summary: regex },
      ];
    }

    if (startDate || endDate) {
      query.entryDate = {};
      if (startDate) query.entryDate.$gte = startDate;
      if (endDate) query.entryDate.$lte = endDate;
    }

    const reports = await LabReport.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: reports.length,
      data: reports,
    });
  } catch (error) {
    console.error('Error fetching lab reports:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve lab reports.',
      error: error.message,
    });
  }
};

// @desc    Get single Lab Report by ID
// @route   GET /api/lab-reports/:id
// @access  Private
export const getLabReportById = async (req, res) => {
  try {
    const { id } = req.params;
    let report = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      report = await LabReport.findById(id);
    }
    if (!report) {
      report = await LabReport.findOne({ reportId: id });
    }

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Lab report not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error fetching lab report details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve lab report details.',
      error: error.message,
    });
  }
};

// @desc    Delete Lab Report by ID
// @route   DELETE /api/lab-reports/:id
// @access  Private
export const deleteLabReport = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await LabReport.findByIdAndDelete(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Lab report not found or already deleted.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Lab report deleted successfully.',
    });
  } catch (error) {
    console.error('Error deleting lab report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete lab report.',
      error: error.message,
    });
  }
};

