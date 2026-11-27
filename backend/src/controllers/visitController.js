import mongoose from 'mongoose';
import Visit from '../models/Visit.js';
import Patient from '../models/Patient.js';
import Family from '../models/Family.js';
import LabReport from '../models/LabReport.js';
import Doctor from '../models/Doctor.js';
import { autoSaveMasterItem } from './masterDataController.js';
import { getNextReportId, generateLabSummary } from './labReportController.js';
import { getNextFamilyIdValue } from './familyController.js';
import { toUpperTrim, toUpperArray } from '../utils/textUtils.js';

// Helper to recalculate dues and deposits for patient & family concurrently using fast aggregation
export const recalculateDues = async (patientId, familyId, additionalPatientUpdates = {}) => {
  try {
    const [patientAgg, familyAgg] = await Promise.all([
      Visit.aggregate([
        { $match: { patientId } },
        { $group: { _id: null, totalCharge: { $sum: '$charge' }, totalReceived: { $sum: '$received' } } },
      ]),
      familyId
        ? Visit.aggregate([
            { $match: { familyId } },
            { $group: { _id: null, totalCharge: { $sum: '$charge' }, totalReceived: { $sum: '$received' } } },
          ])
        : Promise.resolve([]),
    ]);

    const pCharge = patientAgg[0]?.totalCharge || 0;
    const pReceived = patientAgg[0]?.totalReceived || 0;
    const rawPatientDue = pCharge - pReceived;
    const patientDue = rawPatientDue > 0 ? rawPatientDue : 0;
    const patientDeposit = rawPatientDue < 0 ? Math.abs(rawPatientDue) : 0;

    const fCharge = familyAgg[0]?.totalCharge || 0;
    const fReceived = familyAgg[0]?.totalReceived || 0;
    const rawFamDue = fCharge - fReceived;
    const famDue = rawFamDue > 0 ? rawFamDue : 0;
    const famDeposit = rawFamDue < 0 ? Math.abs(rawFamDue) : 0;

    const patientUpdatePayload = {
      totalDue: patientDue,
      deposit: patientDeposit,
      ...additionalPatientUpdates,
    };

    const updatePromises = [
      Patient.findOneAndUpdate({ patientId }, patientUpdatePayload),
    ];
    if (familyId) {
      updatePromises.push(
        Family.findOneAndUpdate(
          { familyId },
          { familyDue: famDue, familyDeposit: famDeposit }
        )
      );
    }

    await Promise.all(updatePromises);

    return { patientDue, patientDeposit, famDue, famDeposit };
  } catch (err) {
    console.error('Error recalculating dues:', err.message);
    return { patientDue: 0, patientDeposit: 0, famDue: 0, famDeposit: 0 };
  }
};

// Background helper to auto-save terms to Master Data without blocking HTTP response
const dispatchAutoSaveMasterData = (complaint, investigation, cleanPrescriptions, cleanTreatments, ipdDetails, dietary, reqBody, allergies) => {
  setImmediate(() => {
    try {
      const tasks = [];
      if (complaint && typeof complaint === 'string') {
        complaint.split(',').forEach((c) => { if (c.trim()) tasks.push(autoSaveMasterItem('complaint', c.trim())); });
      }
      if (investigation && typeof investigation === 'string') {
        investigation.split(',').forEach((i) => { if (i.trim()) tasks.push(autoSaveMasterItem('investigation', i.trim())); });
      }
      if (Array.isArray(cleanPrescriptions)) {
        cleanPrescriptions.forEach((rx) => {
          if (rx.medicine) tasks.push(autoSaveMasterItem('medicine', rx.medicine));
          if (rx.timing === 'SOS' && rx.sosInstruction && rx.sosInstruction.trim()) {
            tasks.push(autoSaveMasterItem('sos', rx.sosInstruction.trim()));
          }
        });
      }
      if (Array.isArray(cleanTreatments)) {
        cleanTreatments.forEach((tr) => { if (tr.item) tasks.push(autoSaveMasterItem('medicine', tr.item)); });
      }
      if (Array.isArray(ipdDetails)) {
        ipdDetails.forEach((ipdItem) => {
          const itemVal = typeof ipdItem === 'string' ? ipdItem : ipdItem?.item;
          if (itemVal && itemVal.trim()) tasks.push(autoSaveMasterItem('ipd', itemVal.trim()));
        });
      }
      if (dietary && typeof dietary === 'string') {
        dietary.split(',').forEach((d) => { if (d.trim()) tasks.push(autoSaveMasterItem('dietary', d.trim())); });
      }
      const areaToSave = (reqBody.area && typeof reqBody.area === 'string' && reqBody.area.trim())
        || (reqBody.society && typeof reqBody.society === 'string' && reqBody.society.trim())
        || '';
      if (areaToSave) {
        tasks.push(autoSaveMasterItem('area', areaToSave));
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
  });
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
      investigationList,
      complaint,
      complaintList,
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

    // Auto-create Family and/or Patient if new unregistered patient
    if ((!finalPatientId || finalPatientId === 'NEW' || !finalFamilyId || finalFamilyId === 'NEW') && patientName && patientName.trim()) {
      try {
        const cleanPatName = toUpperTrim(patientName);
        const requestedHeadName = (req.body.familyHeadName && String(req.body.familyHeadName).trim())
          ? toUpperTrim(req.body.familyHeadName)
          : '';

        // Case 0: Unlinked individual patient (no Family Head provided)
        if (finalFamilyId === 'UNLINKED' || (!requestedHeadName && (!finalFamilyId || finalFamilyId === 'NEW'))) {
          const existingIndCount = await Patient.countDocuments({ patientId: { $regex: /^P-IND-/ } });
          let nextSeq = existingIndCount + 1;
          let patId = `P-IND-${nextSeq}`;
          while (await Patient.exists({ patientId: patId })) {
            nextSeq += 1;
            patId = `P-IND-${nextSeq}`;
          }

          await Patient.create({
            patientId: patId,
            familyId: '',
            name: cleanPatName,
            isHead: false,
            relation: 'INDIVIDUAL',
            phone: req.body.phone ? String(req.body.phone).trim() : '',
            houseNo: toUpperTrim(req.body.houseNo),
            society: toUpperTrim(req.body.society),
            area: toUpperTrim(req.body.area),
            age: toUpperTrim(req.body.age),
            dob: req.body.dob || '',
            ageRecordedAt: req.body.age ? new Date() : null,
            gender: req.body.gender || 'Male',
            allergies: toUpperArray(allergies),
          });
          finalPatientId = patId;
          finalFamilyId = '';
        } else {

        // Case A: Joining an EXISTING Family Head
        if (finalFamilyId && finalFamilyId !== 'NEW') {
          const existingFamily = await Family.findOne({ familyId: finalFamilyId });
          if (existingFamily) {
            const existingCount = await Patient.countDocuments({ familyId: finalFamilyId });
            let nextSeq = existingCount + 1;
            let patId = `P-${finalFamilyId}-${nextSeq}`;
            while (await Patient.exists({ patientId: patId })) {
              nextSeq += 1;
              patId = `P-${finalFamilyId}-${nextSeq}`;
            }

            await Patient.create({
              patientId: patId,
              familyId: finalFamilyId,
              name: cleanPatName,
              isHead: false,
              relation: 'MEMBER',
              phone: req.body.phone ? String(req.body.phone).trim() : (existingFamily.phone || ''),
              houseNo: toUpperTrim(req.body.houseNo) || toUpperTrim(existingFamily.houseNo),
              society: toUpperTrim(req.body.society) || toUpperTrim(existingFamily.society),
              area: toUpperTrim(req.body.area) || toUpperTrim(existingFamily.area),
              age: toUpperTrim(req.body.age),
              dob: req.body.dob || '',
              ageRecordedAt: req.body.age ? new Date() : null,
              gender: req.body.gender || 'Male',
              allergies: toUpperArray(allergies),
            });
            existingFamily.membersCount = nextSeq;
            await existingFamily.save();
            finalPatientId = patId;
          } else {
            finalFamilyId = 'NEW';
          }
        }

        // Case B: Creating a BRAND NEW Family (either self as head, or a different new family head)
        if (!finalFamilyId || finalFamilyId === 'NEW') {
          const nextFamId = await getNextFamilyIdValue();
          const isSameAsPatient = requestedHeadName.toUpperCase() === cleanPatName.toUpperCase();

          await Family.create({
            familyId: nextFamId,
            headName: requestedHeadName,
            phone: req.body.phone ? String(req.body.phone).trim() : '',
            houseNo: toUpperTrim(req.body.houseNo),
            society: toUpperTrim(req.body.society),
            area: toUpperTrim(req.body.area),
            age: isSameAsPatient && req.body.age ? toUpperTrim(req.body.age) : '',
            gender: req.body.gender || 'Male',
            membersCount: isSameAsPatient ? 1 : 2,
          });

          if (isSameAsPatient) {
            const patId = `P-${nextFamId}-1`;
            await Patient.create({
              patientId: patId,
              familyId: nextFamId,
              name: cleanPatName,
              isHead: true,
              relation: 'SELF',
              phone: req.body.phone ? String(req.body.phone).trim() : '',
              houseNo: toUpperTrim(req.body.houseNo),
              society: toUpperTrim(req.body.society),
              area: toUpperTrim(req.body.area),
              age: toUpperTrim(req.body.age),
              dob: req.body.dob || '',
              ageRecordedAt: req.body.age ? new Date() : null,
              gender: req.body.gender || 'Male',
              allergies: toUpperArray(allergies),
            });
            finalPatientId = patId;
          } else {
            // Create the new Family Head first, then the patient as a member under that family
            const headPatId = `P-${nextFamId}-1`;
            await Patient.create({
              patientId: headPatId,
              familyId: nextFamId,
              name: requestedHeadName,
              isHead: true,
              relation: 'SELF',
              phone: req.body.phone ? String(req.body.phone).trim() : '',
              houseNo: toUpperTrim(req.body.houseNo),
              society: toUpperTrim(req.body.society),
              area: toUpperTrim(req.body.area),
              gender: 'Male',
            });

            const memberPatId = `P-${nextFamId}-2`;
            await Patient.create({
              patientId: memberPatId,
              familyId: nextFamId,
              name: cleanPatName,
              isHead: false,
              relation: 'MEMBER',
              phone: req.body.phone ? String(req.body.phone).trim() : '',
              houseNo: toUpperTrim(req.body.houseNo),
              society: toUpperTrim(req.body.society),
              area: toUpperTrim(req.body.area),
              age: toUpperTrim(req.body.age),
              dob: req.body.dob || '',
              ageRecordedAt: req.body.age ? new Date() : null,
              gender: req.body.gender || 'Male',
              allergies: toUpperArray(allergies),
            });
            finalPatientId = memberPatId;
          }
          finalFamilyId = nextFamId;
        }
        }
      } catch (autoErr) {
        console.error('Error auto-creating patient in recordVisit:', autoErr.message);
      }
    }

    if (!finalPatientId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID is required',
      });
    }

    const numCharge = Math.max(0, Number(charge) || 0);
    const numReceived = Math.max(0, Number(received) || 0);
    const numDue = Math.max(0, numCharge - numReceived);

    // Format clean investigation list and summary string
    const cleanInvList = Array.isArray(investigationList) && investigationList.length > 0
      ? investigationList
          .filter((i) => i && (i.reportType || typeof i === 'string'))
          .map((i) => ({
            id: String(i.id || Date.now() + '-' + Math.random()),
            reportType: String(i.reportType || i).trim().toUpperCase(),
            labName: String(i.labName || 'CARE').trim().toUpperCase(),
          }))
      : (investigation && typeof investigation === 'string'
          ? investigation.split(',').map((s, idx) => ({ id: `${Date.now()}-${idx}`, reportType: s.trim().toUpperCase(), labName: 'CARE' })).filter((i) => i.reportType)
          : []);

    const cleanInvString = investigation && investigation.trim()
      ? investigation.trim().toUpperCase()
      : cleanInvList.map((i) => i.reportType).join(', ');

    // Format clean complaint list and summary string
    const cleanCompList = Array.isArray(complaintList) && complaintList.length > 0
      ? complaintList.map((c) => String(c).trim().toUpperCase()).filter(Boolean)
      : (complaint && typeof complaint === 'string'
          ? complaint.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean)
          : []);

    const cleanCompString = complaint && complaint.trim()
      ? complaint.trim().toUpperCase()
      : cleanCompList.join(', ');

    // Format clean IPD details (injections, IV bottles, procedures)
    const cleanIpdList = toUpperArray(ipdDetails);

    // Format clean treatments and prescriptions arrays
    const cleanTreatments = Array.isArray(treatments)
      ? treatments
          .filter((t) => t.item && t.item.trim())
          .map((t) => ({
            ...t,
            item: toUpperTrim(t.item),
            qty: toUpperTrim(t.qty || '1'),
            morning: toUpperTrim(t.morning || '1'),
            noon: toUpperTrim(t.noon || '0'),
            evening: toUpperTrim(t.evening || '1'),
          }))
      : [];

    const cleanPrescriptions = Array.isArray(prescriptions)
      ? prescriptions
          .filter((p) => p.medicine && p.medicine.trim())
          .map((p) => ({
            medicine: toUpperTrim(p.medicine),
            qty: p.qty !== undefined && p.qty !== null ? toUpperTrim(p.qty) : '',
            morning: p.morning !== undefined ? toUpperTrim(p.morning) : '1',
            noon: p.noon !== undefined ? toUpperTrim(p.noon) : '0',
            evening: p.evening !== undefined ? toUpperTrim(p.evening) : '1',
            night: p.night !== undefined ? toUpperTrim(p.night) : '0',
            timing: toUpperTrim(p.timing || 'AF'),
            sosInstruction: p.sosInstruction ? toUpperTrim(p.sosInstruction) : '',
          }))
      : [];

    // Optional: Save or link attached Lab Report if present
    let savedLabReport = null;
    if (labReport && typeof labReport === 'object' && Object.keys(labReport).length > 0) {
      try {
        const summary = labReport.summary || generateLabSummary(labReport);
        if (labReport._id && mongoose.isValidObjectId(labReport._id)) {
          savedLabReport = await LabReport.findByIdAndUpdate(
            labReport._id,
            {
              ...labReport,
              patientId: finalPatientId.trim(),
              familyId: finalFamilyId.trim(),
              summary,
            },
            { new: true }
          );
        } else {
          const reportId = labReport.reportId || (await getNextReportId());
          savedLabReport = await LabReport.findOneAndUpdate(
            { reportId },
            {
              ...labReport,
              reportId,
              patientId: finalPatientId.trim(),
              familyId: finalFamilyId.trim(),
              patientName: labReport.patientName || patientName || 'Patient',
              summary,
            },
            { upsert: true, new: true }
          );
        }
      } catch (err) {
        console.error('Error auto-creating LabReport in recordVisit:', err.message);
      }
    }

    const visit = await Visit.create({
      patientId: finalPatientId.trim(),
      familyId: finalFamilyId.trim(),
      patientName: toUpperTrim(patientName) || 'PATIENT',
      visitDate: visitDate || new Date().toISOString().split('T')[0],
      bp: bp ? toUpperTrim(bp) : '120/80',
      sugar: toUpperTrim(sugar),
      other: toUpperTrim(other),
      reference: toUpperTrim(reference),
      investigation: cleanInvString,
      investigationList: cleanInvList,
      complaint: cleanCompString,
      complaintList: cleanCompList,
      treatments: cleanTreatments,
      prescriptions: cleanPrescriptions,
      dietary: toUpperTrim(dietary),
      ipdDetails: cleanIpdList,
      allergies: toUpperArray(allergies),
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

    // Sync patient demographic updates (dob, age, ageRecordedAt, phone, society, area, allergies)
    const patUpdates = {};
    if (req.body.phone !== undefined) patUpdates.phone = req.body.phone;
    if (req.body.age !== undefined) patUpdates.age = req.body.age;
    if (req.body.gender !== undefined) patUpdates.gender = req.body.gender;
    if (req.body.dob !== undefined) patUpdates.dob = req.body.dob;
    if (req.body.ageManuallyEdited) {
      patUpdates.ageRecordedAt = new Date();
    } else if (req.body.ageRecordedAt) {
      patUpdates.ageRecordedAt = req.body.ageRecordedAt;
    }
    if (req.body.houseNo !== undefined) patUpdates.houseNo = req.body.houseNo;
    if (req.body.society !== undefined) patUpdates.society = req.body.society;
    if (req.body.area !== undefined) patUpdates.area = req.body.area;
    if (Array.isArray(allergies)) patUpdates.allergies = allergies;

    // Recalculate dues & deposits + update patient in ONE atomic parallel aggregation
    const { patientDue, patientDeposit, famDue, famDeposit } = await recalculateDues(finalPatientId, finalFamilyId, patUpdates);

    // Auto-save individual terms to Master Data in background without blocking HTTP response
    dispatchAutoSaveMasterData(complaint, investigation, cleanPrescriptions, cleanTreatments, ipdDetails, dietary, req.body, allergies);

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

    let queryBuilder = Visit.find(query).sort({ updatedAt: -1, createdAt: -1 });
    if (limit) {
      queryBuilder = queryBuilder.limit(parseInt(limit, 10));
    }
    const rawVisits = await queryBuilder.lean();

    // Return all visits of this patient sorted by updatedAt/createdAt descending
    const uniqueVisits = [];
    const seenIds = new Set();
    for (const v of rawVisits) {
      const idKey = String(v._id);
      if (seenIds.has(idKey)) continue;
      seenIds.add(idKey);
      uniqueVisits.push(v);
    }

    return res.status(200).json({
      success: true,
      count: uniqueVisits.length,
      data: uniqueVisits,
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
      investigationList,
      complaint,
      complaintList,
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
      ? treatments
          .filter((t) => t.item && t.item.trim())
          .map((t) => ({
            ...t,
            item: toUpperTrim(t.item),
            qty: toUpperTrim(t.qty || '1'),
            morning: toUpperTrim(t.morning || '1'),
            noon: toUpperTrim(t.noon || '0'),
            evening: toUpperTrim(t.evening || '1'),
          }))
      : [];

    const cleanPrescriptions = Array.isArray(prescriptions)
      ? prescriptions
          .filter((p) => p.medicine && p.medicine.trim())
          .map((p) => ({
            medicine: toUpperTrim(p.medicine),
            qty: p.qty !== undefined && p.qty !== null ? toUpperTrim(p.qty) : '',
            morning: p.morning !== undefined ? toUpperTrim(p.morning) : '1',
            noon: p.noon !== undefined ? toUpperTrim(p.noon) : '0',
            evening: p.evening !== undefined ? toUpperTrim(p.evening) : '1',
            night: p.night !== undefined ? toUpperTrim(p.night) : '0',
            timing: toUpperTrim(p.timing || 'AF'),
            sosInstruction: p.sosInstruction ? toUpperTrim(p.sosInstruction) : '',
          }))
      : [];

    // Format clean investigation list and summary string
    const cleanInvList = Array.isArray(investigationList) && investigationList.length > 0
      ? investigationList
          .filter((i) => i && (i.reportType || typeof i === 'string'))
          .map((i) => ({
            id: String(i.id || Date.now() + '-' + Math.random()),
            reportType: String(i.reportType || i).trim().toUpperCase(),
            labName: String(i.labName || 'CARE').trim().toUpperCase(),
          }))
      : (investigation && typeof investigation === 'string'
          ? investigation.split(',').map((s, idx) => ({ id: `${Date.now()}-${idx}`, reportType: s.trim().toUpperCase(), labName: 'CARE' })).filter((i) => i.reportType)
          : (visit.investigationList || []));

    const cleanInvString = investigation && investigation.trim()
      ? investigation.trim().toUpperCase()
      : (cleanInvList.length > 0 ? cleanInvList.map((i) => i.reportType).join(', ') : visit.investigation);

    // Format clean complaint list and summary string
    const cleanCompList = Array.isArray(complaintList) && complaintList.length > 0
      ? complaintList.map((c) => String(c).trim().toUpperCase()).filter(Boolean)
      : (complaint && typeof complaint === 'string'
          ? complaint.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean)
          : (visit.complaintList || []));

    const cleanCompString = complaint && complaint.trim()
      ? complaint.trim().toUpperCase()
      : (cleanCompList.length > 0 ? cleanCompList.join(', ') : visit.complaint);

    // Format clean IPD details
    const cleanIpdList = ipdDetails !== undefined
      ? toUpperArray(ipdDetails)
      : (visit.ipdDetails || []);

    visit.visitDate = visitDate || visit.visitDate;
    visit.bp = bp !== undefined ? toUpperTrim(bp) : visit.bp;
    visit.sugar = sugar !== undefined ? toUpperTrim(sugar) : visit.sugar;
    visit.other = other !== undefined ? toUpperTrim(other) : visit.other;
    visit.reference = reference !== undefined ? toUpperTrim(reference) : visit.reference;
    visit.investigation = cleanInvString;
    visit.investigationList = cleanInvList;
    visit.markModified('investigationList');
    visit.complaint = cleanCompString;
    visit.complaintList = cleanCompList;
    visit.markModified('complaintList');
    visit.treatments = cleanTreatments;
    visit.markModified('treatments');
    visit.prescriptions = cleanPrescriptions;
    visit.markModified('prescriptions');
    if (dietary !== undefined) visit.dietary = toUpperTrim(dietary);
    visit.ipdDetails = cleanIpdList;
    visit.markModified('ipdDetails');
    if (allergies !== undefined) {
      visit.allergies = toUpperArray(allergies);
      visit.markModified('allergies');
    }
    visit.charge = numCharge;
    visit.received = numReceived;
    visit.due = numDue;

    if (labReport !== undefined) {
      visit.labReport = labReport;
      visit.markModified('labReport');
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

    visit.isEdited = true;
    visit.editedAt = new Date();
    visit.updatedAt = new Date();
    await visit.save();

    // Sync patient demographic updates (dob, age, ageRecordedAt, phone, society, area, allergies)
    const patUpdates = {};
    if (req.body.phone !== undefined) patUpdates.phone = req.body.phone;
    if (req.body.age !== undefined) patUpdates.age = req.body.age;
    if (req.body.gender !== undefined) patUpdates.gender = req.body.gender;
    if (req.body.dob !== undefined) patUpdates.dob = req.body.dob;
    if (req.body.ageManuallyEdited) {
      patUpdates.ageRecordedAt = new Date();
    } else if (req.body.ageRecordedAt) {
      patUpdates.ageRecordedAt = req.body.ageRecordedAt;
    }
    if (req.body.houseNo !== undefined) patUpdates.houseNo = req.body.houseNo;
    if (req.body.society !== undefined) patUpdates.society = req.body.society;
    if (req.body.area !== undefined) patUpdates.area = req.body.area;
    if (Array.isArray(allergies)) patUpdates.allergies = allergies;

    // Recalculate dues + update patient in ONE atomic parallel aggregation
    const { patientDue, patientDeposit, famDue, famDeposit } = await recalculateDues(visit.patientId, visit.familyId, patUpdates);

    // Auto-save individual terms to Master Data in background without blocking HTTP response
    dispatchAutoSaveMasterData(complaint, investigation, cleanPrescriptions, cleanTreatments, ipdDetails, dietary, req.body, allergies);

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
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      query.$or = [
        { visitDate: todayStr },
        { updatedAt: { $gte: startOfToday } },
        { createdAt: { $gte: startOfToday } },
      ];
    } else if (period === 'yesterday') {
      const yDate = new Date();
      yDate.setDate(yDate.getDate() - 1);
      const yStr = `${yDate.getFullYear()}-${pad(yDate.getMonth() + 1)}-${pad(yDate.getDate())}`;
      const startOfYesterday = new Date(yDate.getFullYear(), yDate.getMonth(), yDate.getDate(), 0, 0, 0, 0);
      const endOfYesterday = new Date(yDate.getFullYear(), yDate.getMonth(), yDate.getDate(), 23, 59, 59, 999);
      query.$or = [
        { visitDate: yStr },
        { updatedAt: { $gte: startOfYesterday, $lte: endOfYesterday } },
        { createdAt: { $gte: startOfYesterday, $lte: endOfYesterday } },
      ];
    } else if (period === 'custom' && date) {
      query.visitDate = date;
    }

    // Fast search: search directly on indexed Visit fields (patientName, patientId, complaint, reference)
    if (search && search.trim()) {
      const s = search.trim();
      const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');

      const searchConditions = [
        { patientName: regex },
        { patientId: regex },
        { complaint: regex },
        { reference: regex },
        { investigation: regex },
      ];

      if (query.$or) {
        // Combine period $or filter and search $or conditions cleanly with $and
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    const visits = await Visit.find(query)
      .select('patientId familyId patientName visitDate createdAt updatedAt isEdited editedAt complaint complaintList ipdDetails treatments prescriptions bp sugar other reference charge received due allergies investigation investigationList labReport labReportId dietary')
      .sort({ visitDate: -1, createdAt: -1 })
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

    // Attach complete lab reports if visit has labReportId or linked LabReport but no embedded parameters
    const visitsNeedingReport = visits.filter(
      (v) => (!v.labReport || Object.keys(v.labReport).length === 0) && (v.labReportId || v._id)
    );
    const labReportMap = {};
    if (visitsNeedingReport.length > 0) {
      const repIds = visitsNeedingReport.map((v) => v.labReportId).filter(Boolean);
      const vIds = visitsNeedingReport.map((v) => v._id).filter(Boolean);
      const orConditions = [];
      if (repIds.length > 0) orConditions.push({ reportId: { $in: repIds } });
      if (vIds.length > 0) orConditions.push({ visitId: { $in: vIds } });

      if (orConditions.length > 0) {
        const foundReports = await LabReport.find({ $or: orConditions }).lean();
        foundReports.forEach((r) => {
          if (r.reportId) labReportMap[r.reportId] = r;
          if (r._id) labReportMap[String(r._id)] = r;
          if (r.visitId) labReportMap[String(r.visitId)] = r;
        });
      }
    }

    const enriched = visits.map((v) => {
      const pat = patMap[v.patientId];
      const combinedAllergies = (pat?.allergies && pat.allergies.length > 0)
        ? pat.allergies
        : (v.allergies || []);

      const attachedReport = (v.labReport && Object.keys(v.labReport).length > 0)
        ? v.labReport
        : (v.labReportId ? labReportMap[v.labReportId] : null) || labReportMap[String(v._id)] || null;

      return {
        ...v,
        labReport: attachedReport,
        allergies: combinedAllergies,
      };
    });

    // Return all case entries so all patient visits are shown in Recent History
    const uniqueVisits = [];
    const seenIds = new Set();
    for (const v of enriched) {
      const idKey = String(v._id);
      if (seenIds.has(idKey)) continue;
      seenIds.add(idKey);
      uniqueVisits.push(v);
    }

    return res.status(200).json({
      success: true,
      count: uniqueVisits.length,
      visits: uniqueVisits,
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


