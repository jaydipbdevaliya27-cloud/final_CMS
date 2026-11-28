import dns from 'dns';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

import Family from '../src/models/Family.js';
import Patient from '../src/models/Patient.js';
import Visit from '../src/models/Visit.js';
import LabReport from '../src/models/LabReport.js';
import Cut from '../src/models/Cut.js';
import Expense from '../src/models/Expense.js';
import Counter from '../src/models/Counter.js';
import MasterData, { getMasterModel, MASTER_COLLECTION_MAP } from '../src/models/MasterData.js';

dotenv.config({ path: path.resolve('backend/.env') });

const EXPORT_JSON = 'C:/Users/ADMIN/.gemini/antigravity/brain/9b160865-ecc6-4bb0-9492-3dc2d4fca8c0/scratch/sqlite_export.json';

const upper = (v) => (v === undefined || v === null ? '' : String(v).trim().toUpperCase());

const safeJsonParse = (str, fallback) => {
  if (!str || typeof str !== 'string') return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
};

const parseDoseParts = (doseStr) => {
  const parts = String(doseStr || '1-0-1-0').split('-').map((x) => x.trim());
  return {
    morning: parts[0] || '0',
    noon: parts[1] || '0',
    evening: parts[2] || '0',
    night: parts[3] || '0',
  };
};

const mapTiming = (mealStr, doseStr) => {
  const m = upper(mealStr);
  if (m === 'BEFORE FOOD' || m === 'BF') return { timing: 'BF', sosInstruction: '' };
  if (m === 'AFTER FOOD' || m === 'AF') return { timing: 'AF', sosInstruction: '' };
  if (m === 'WITH FOOD' || m === 'WF') return { timing: 'WF', sosInstruction: '' };
  if (m) return { timing: 'SOS', sosInstruction: m };
  if (String(doseStr || '').trim() === '0-0-0-0') return { timing: 'SOS', sosInstruction: '' };
  return { timing: 'AF', sosInstruction: '' };
};

const toVisitDate = (ts) => {
  if (!ts) return new Date().toISOString().split('T')[0];
  const m = String(ts).trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : new Date().toISOString().split('T')[0];
};

const toDateObj = (ts) => {
  if (!ts) return new Date();
  const d = new Date(String(ts).replace(' ', 'T') + (String(ts).includes('Z') ? '' : '+05:30'));
  return isNaN(d.getTime()) ? new Date() : d;
};

const buildLabReportData = (labObj) => {
  const hematology = { hb: '', rbc: '', wbc: '', platelet: '', esr: '' };
  const bloodGlucoseRenal = { rbs: '', fbs: '', ppbs: '', screatinin: '', vitb12: '' };
  const differentialWbc = { bandCell: '', neutrophils: '', lymphocytes: '', eosinophils: '', monocytes: '', basophils: '', parasites: '' };
  const thyroid = { t3: '', t4: '', tsh: '' };
  const values = {};
  const specialFindings = [];
  const summaryParts = [];

  for (const [rawKey, rawVal] of Object.entries(labObj || {})) {
    const val = String(rawVal ?? '').trim();
    if (!val) continue;
    const k = rawKey.trim().toLowerCase();
    values[k] = val;
    summaryParts.push(`${k.toUpperCase()}: ${val}`);

    if (k in hematology) hematology[k] = val;
    else if (k in bloodGlucoseRenal) bloodGlucoseRenal[k] = val;
    else if (k in differentialWbc) differentialWbc[k] = val;
    else if (k in thyroid) thyroid[k] = val;
    else specialFindings.push({ key: k, title: k.toUpperCase(), notes: val });
  }

  return {
    hematology,
    bloodGlucoseRenal,
    differentialWbc,
    thyroid,
    specialFindings,
    values,
    summary: summaryParts.join(', '),
  };
};

async function run() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI not found in backend/.env');
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  // 1. FULL SAFETY BACKUP BEFORE ANY WRITES
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(`backend/backups/pre-migration-${stamp}`);
  fs.mkdirSync(backupDir, { recursive: true });
  const existingCols = await db.listCollections().toArray();
  const backupCounts = {};
  for (const col of existingCols) {
    const docs = await db.collection(col.name).find({}).toArray();
    fs.writeFileSync(path.join(backupDir, `${col.name}.json`), JSON.stringify(docs, null, 2), 'utf-8');
    backupCounts[col.name] = docs.length;
  }
  console.log(`Backup saved to ${backupDir}:`, backupCounts);

  // 2. MIGRATE EXISTING LEGACY masterdatas INTO DEDICATED COLLECTIONS
  const legacyMasterDocs = await MasterData.find({}).lean();
  let migratedLegacyMaster = 0;
  for (const doc of legacyMasterDocs) {
    const t = String(doc.type || '').trim().toLowerCase();
    if (!MASTER_COLLECTION_MAP[t]) continue;
    const Model = getMasterModel(t);
    const val = t === 'dietary' ? String(doc.value || '').trim() : upper(doc.value);
    if (!val) continue;
    await Model.updateOne(
      { value: val },
      { $setOnInsert: { type: t, value: val, shortcut: upper(doc.shortcut) } },
      { upsert: true }
    );
    migratedLegacyMaster++;
  }
  console.log(`Migrated ${migratedLegacyMaster} legacy masterdatas into dedicated collections.`);

  // 3. LOAD SQLITE EXPORT JSON
  const raw = JSON.parse(fs.readFileSync(EXPORT_JSON, 'utf-8'));

  // 4. IMPORT MASTER DATA INTO SEPARATE COLLECTIONS
  const masterImports = [
    ['medicine', raw.master_medicines, (r) => ({ value: upper(r.val), shortcut: '' })],
    ['complaint', raw.master_complaints, (r) => ({ value: upper(r.val), shortcut: '' })],
    ['area', raw.master_societies, (r) => ({ value: upper(r.val), shortcut: '' })],
    ['ipd', raw.master_ipd_details_list, (r) => ({ value: upper(r.val), shortcut: '' })],
    ['investigation', raw.master_lab_types, (r) => ({ value: upper(r.val), shortcut: '' })],
    ['allergy', raw.master_allergies, (r) => ({ value: upper(r.val), shortcut: '' })],
    ['sos', raw.master_sos_instructions, (r) => ({ value: upper(r.val), shortcut: '' })],
    ['dietary', raw.master_advice_templates, (r) => ({ value: String(r.content || '').trim(), shortcut: upper(r.code) })],
    ['lab_name', raw.master_lab_names, (r) => ({ value: upper(r.val), shortcut: '' })],
    ['cut_company', raw.master_cut_companies, (r) => ({ value: upper(r.val), shortcut: '' })],
    ['expense_company', raw.master_expense_companies, (r) => ({ value: upper(r.val), shortcut: '' })],
    ['expense_category', raw.master_expense_categories, (r) => ({ value: upper(r.val), shortcut: '' })],
  ];

  const masterStats = {};
  for (const [type, rows, mapper] of masterImports) {
    const Model = getMasterModel(type);
    const ops = [];
    const seen = new Set();
    for (const r of rows || []) {
      const mapped = mapper(r);
      if (!mapped.value || seen.has(mapped.value)) continue;
      seen.add(mapped.value);
      ops.push({
        updateOne: {
          filter: { value: mapped.value },
          update: { $setOnInsert: { type, value: mapped.value, shortcut: mapped.shortcut } },
          upsert: true,
        },
      });
    }
    if (ops.length > 0) {
      await Model.bulkWrite(ops, { ordered: false });
    }
    masterStats[MASTER_COLLECTION_MAP[type]] = await Model.countDocuments({});
  }
  console.log('Master Data collection counts:', masterStats);

  // 5. BUILD FAMILY MAP (preserve existing MongoDB families, add new ones from SQLite)
  const existingFamilies = await Family.find({}).lean();
  const famByHeadName = new Map();
  let maxFamSeq = 0;
  for (const f of existingFamilies) {
    const num = parseInt(String(f.familyId || '').replace(/\D/g, ''), 10);
    if (!isNaN(num) && num > maxFamSeq) maxFamSeq = num;
    if (f.headName) famByHeadName.set(upper(f.headName), f);
  }

  const famAddrMap = new Map();
  for (const a of raw.master_family_addresses || []) {
    const h = upper(a.family_id);
    if (h) famAddrMap.set(h, { houseNo: upper(a.house_no), area: upper(a.society) });
  }

  const famMetaMap = new Map();
  for (const f of raw.master_family_ids || []) {
    const h = upper(f.val);
    if (h && !famMetaMap.has(h)) famMetaMap.set(h, famAddrMap.get(h) || { houseNo: '', area: '' });
  }
  for (const p of raw.patients || []) {
    const h = upper(p.family_id);
    if (!h) continue;
    const prev = famMetaMap.get(h) || { houseNo: '', area: '', phone: '' };
    famMetaMap.set(h, {
      houseNo: prev.houseNo || upper(p.house_no),
      area: prev.area || upper(p.society),
      phone: prev.phone || String(p.phone || '').trim(),
    });
  }

  const newFamiliesToInsert = [];
  for (const [headName, meta] of famMetaMap.entries()) {
    if (famByHeadName.has(headName)) continue;
    maxFamSeq += 1;
    const familyId = String(maxFamSeq).padStart(5, '0');
    const famDoc = {
      familyId,
      headName,
      houseNo: meta.houseNo || '',
      area: meta.area || '',
      society: meta.area || '',
      phone: meta.phone || '',
      membersCount: 0,
      familyDue: 0,
      familyDeposit: 0,
      registrationDoneBy: 'Self (Head of Family)',
    };
    famByHeadName.set(headName, famDoc);
    newFamiliesToInsert.push(famDoc);
  }
  if (newFamiliesToInsert.length > 0) {
    await Family.insertMany(newFamiliesToInsert, { ordered: false });
  }
  await Counter.findOneAndUpdate(
    { id: 'familyId' },
    { $set: { seq: maxFamSeq + 1 } },
    { upsert: true }
  );
  console.log(`Families: ${existingFamilies.length} existing + ${newFamiliesToInsert.length} imported.`);

  // 6. BUILD PATIENT MAP (deduplicate by UPPER(name) + familyId)
  const existingPatients = await Patient.find({}).lean();
  const patByKey = new Map();
  const existingPatientIds = new Set();
  const famPatSeqMap = new Map();
  let maxIndSeq = 0;

  for (const p of existingPatients) {
    if (p.patientId) existingPatientIds.add(p.patientId);
    const key = `${upper(p.name)}|${p.familyId || ''}`;
    patByKey.set(key, p);
    if (p.familyId) {
      const m = String(p.patientId || '').match(/-(\d+)$/);
      const seq = m ? parseInt(m[1], 10) : 1;
      famPatSeqMap.set(p.familyId, Math.max(famPatSeqMap.get(p.familyId) || 0, seq));
    }
    if (String(p.patientId || '').startsWith('P-IND-')) {
      const seq = parseInt(String(p.patientId).replace('P-IND-', ''), 10) || 0;
      if (seq > maxIndSeq) maxIndSeq = seq;
    }
  }

  // Group SQLite visit rows by unique patient key
  const sqlitePatientMap = new Map();
  for (const row of raw.patients || []) {
    const pName = upper(row.name);
    if (!pName) continue;
    const headName = upper(row.family_id);
    const fam = headName ? famByHeadName.get(headName) : null;
    const familyId = fam ? fam.familyId : '';
    const key = `${pName}|${familyId}`;

    const rowAllergies = safeJsonParse(row.allergy, []).map(upper).filter(Boolean);
    const rowDate = toDateObj(row.date_created);
    const existing = sqlitePatientMap.get(key);
    if (!existing) {
      sqlitePatientMap.set(key, {
        name: pName,
        familyId,
        headName,
        age: upper(row.age),
        dob: String(row.dob || '').trim(),
        ageRecordedAt: rowDate,
        phone: String(row.phone || '').trim(),
        houseNo: upper(row.house_no),
        area: upper(row.society),
        allergies: new Set(rowAllergies),
        latestDate: rowDate,
      });
    } else {
      if (rowDate >= existing.latestDate) {
        if (upper(row.age)) {
          existing.age = upper(row.age);
          existing.ageRecordedAt = rowDate;
        }
        if (String(row.dob || '').trim()) existing.dob = String(row.dob).trim();
        existing.latestDate = rowDate;
      }
      if (!existing.phone && row.phone) existing.phone = String(row.phone).trim();
      if (!existing.houseNo && row.house_no) existing.houseNo = upper(row.house_no);
      if (!existing.area && row.society) existing.area = upper(row.society);
      rowAllergies.forEach((a) => existing.allergies.add(a));
    }
  }

  const newPatientsToInsert = [];
  for (const [key, info] of sqlitePatientMap.entries()) {
    if (patByKey.has(key)) continue;
    let patientId;
    if (info.familyId) {
      let nextSeq = (famPatSeqMap.get(info.familyId) || 0) + 1;
      patientId = `P-${info.familyId}-${nextSeq}`;
      while (existingPatientIds.has(patientId)) {
        nextSeq += 1;
        patientId = `P-${info.familyId}-${nextSeq}`;
      }
      famPatSeqMap.set(info.familyId, nextSeq);
    } else {
      do {
        maxIndSeq += 1;
        patientId = `P-IND-${maxIndSeq}`;
      } while (existingPatientIds.has(patientId));
    }
    existingPatientIds.add(patientId);
    const isHead = Boolean(info.familyId && info.name === info.headName);
    const doc = {
      patientId,
      familyId: info.familyId,
      name: info.name,
      age: info.age,
      dob: info.dob,
      ageRecordedAt: info.ageRecordedAt,
      gender: 'Male',
      phone: info.phone,
      houseNo: info.houseNo,
      area: info.area,
      society: info.area,
      allergies: Array.from(info.allergies),
      isHead,
      relation: info.familyId ? (isHead ? 'SELF' : 'MEMBER') : 'INDIVIDUAL',
      registrationDoneBy: info.familyId ? (isHead ? 'Self (Head of Family)' : 'Family Member') : 'Individual Patient',
      totalDue: 0,
      deposit: 0,
    };
    patByKey.set(key, doc);
    newPatientsToInsert.push(doc);
  }
  if (newPatientsToInsert.length > 0) {
    await Patient.insertMany(newPatientsToInsert, { ordered: false });
  }
  console.log(`Patients: ${existingPatients.length} existing + ${newPatientsToInsert.length} imported.`);

  // 7. IMPORT VISITS & LAB REPORTS (skip only if exact sqliteId already imported)
  const existingVisitsCount = await Visit.countDocuments({});
  const existingLabCount = await LabReport.countDocuments({});
  let nextLabSeq = existingLabCount + 1;

  const visitsToInsert = [];
  const labReportsToInsert = [];

  for (const row of raw.patients || []) {
    const pName = upper(row.name);
    if (!pName) continue;
    const headName = upper(row.family_id);
    const fam = headName ? famByHeadName.get(headName) : null;
    const familyId = fam ? fam.familyId : '';
    const pat = patByKey.get(`${pName}|${familyId}`);
    if (!pat) continue;

    const visitDate = toVisitDate(row.date_created);
    const createdAt = toDateObj(row.date_created);

    const compList = safeJsonParse(row.complaints, []).map(upper).filter(Boolean);
    const ipdList = safeJsonParse(row.ipd_details, []).map(upper).filter(Boolean);
    const allergyList = safeJsonParse(row.allergy, []).map(upper).filter(Boolean);

    const rawLabs = safeJsonParse(row.labs, []);
    const invList = (Array.isArray(rawLabs) ? rawLabs : [])
      .filter((l) => l && (l.type || typeof l === 'string'))
      .map((l, idx) => ({
        id: `${row.id}-${idx}`,
        reportType: upper(typeof l === 'string' ? l : l.type),
        labName: upper(typeof l === 'string' ? 'CARE' : l.name || 'CARE'),
      }));

    const rawClinicMeds = safeJsonParse(row.clinic_medicines, []);
    const treatments = (Array.isArray(rawClinicMeds) ? rawClinicMeds : [])
      .filter((m) => m && (m.name || m.item))
      .map((m) => {
        const d = parseDoseParts(m.dose);
        return {
          item: upper(m.name || m.item),
          qty: upper(m.qty || '1'),
          morning: d.morning,
          noon: d.noon,
          evening: d.evening,
        };
      });

    const rawRxMeds = safeJsonParse(row.prescription_medicines, []);
    const prescriptions = (Array.isArray(rawRxMeds) ? rawRxMeds : [])
      .filter((m) => m && (m.name || m.medicine))
      .map((m) => {
        const d = parseDoseParts(m.dose);
        const t = mapTiming(m.meal, m.dose);
        return {
          medicine: upper(m.name || m.medicine),
          qty: upper(m.qty || ''),
          morning: d.morning,
          noon: d.noon,
          evening: d.evening,
          night: d.night,
          timing: t.timing,
          sosInstruction: t.sosInstruction,
        };
      });

    const labDetailsObj = safeJsonParse(row.lab_details, {});
    const hasLabDetails = labDetailsObj && typeof labDetailsObj === 'object' && Object.values(labDetailsObj).some((v) => String(v || '').trim());

    const visitId = new mongoose.Types.ObjectId();
    let labReportId = null;
    let labReportDoc = null;

    if (hasLabDetails) {
      const reportId = `LAB-${String(nextLabSeq++).padStart(5, '0')}`;
      const structured = buildLabReportData(labDetailsObj);
      labReportDoc = {
        _id: new mongoose.Types.ObjectId(),
        reportId,
        patientId: pat.patientId,
        familyId,
        patientName: pName,
        labName: invList[0]?.labName || 'CARE',
        entryDate: visitDate,
        ...structured,
        visitId,
        createdAt,
        updatedAt: createdAt,
      };
      labReportId = labReportDoc._id;
      labReportsToInsert.push(labReportDoc);
    }

    const charge = Math.max(0, Number(row.charged_amount) || 0);
    const received = Math.max(0, Number(row.received_amount) || 0);
    const due = Math.max(0, Number(row.total_due) ?? Math.max(0, charge - received));

    visitsToInsert.push({
      _id: visitId,
      patientId: pat.patientId,
      familyId,
      patientName: pName,
      visitDate,
      bp: upper(row.bp),
      sugar: upper(row.sugar),
      other: upper(row.others),
      reference: `SQLITE-${row.id}`,
      investigation: invList.map((i) => i.reportType).join(', '),
      investigationList: invList,
      complaint: compList.join(', '),
      complaintList: compList,
      treatments,
      prescriptions,
      dietary: upper(row.advice),
      ipdDetails: ipdList,
      allergies: allergyList,
      charge,
      received,
      due,
      labReport: labReportDoc,
      labReportId,
      createdAt,
      updatedAt: createdAt,
    });
  }

  // Avoid re-inserting if script is re-run
  const alreadyImportedRefs = new Set(
    (await Visit.find({ reference: /^SQLITE-/ }).select('reference').lean()).map((v) => v.reference)
  );
  const filteredVisits = visitsToInsert.filter((v) => !alreadyImportedRefs.has(v.reference));
  const importedVisitIds = new Set(filteredVisits.map((v) => String(v._id)));
  const filteredLabs = labReportsToInsert.filter((l) => importedVisitIds.has(String(l.visitId)));

  if (filteredLabs.length > 0) {
    await LabReport.insertMany(filteredLabs, { ordered: false });
  }
  if (filteredVisits.length > 0) {
    const chunkSize = 1000;
    for (let i = 0; i < filteredVisits.length; i += chunkSize) {
      await Visit.insertMany(filteredVisits.slice(i, i + chunkSize), { ordered: false });
    }
  }
  console.log(`Visits: ${existingVisitsCount} existing + ${filteredVisits.length} imported. LabReports: +${filteredLabs.length}.`);

  // 8. IMPORT CUTS & EXPENSES
  const existingCutRefs = new Set(
    (await Cut.find({ reference: /^SQLITE-CUT-/ }).select('reference').lean()).map((c) => c.reference)
  );
  const cutsToInsert = (raw.cut_master_entries || [])
    .filter((c) => !existingCutRefs.has(`SQLITE-CUT-${c.id}`))
    .map((c) => ({
      date: toVisitDate(c.entry_date),
      centerName: upper(c.company_name),
      category: 'EXTRA INCOME',
      amount: Math.max(0, Number(c.amount) || 0),
      status: 'Paid',
      paymentMode: 'Cash',
      reference: `SQLITE-CUT-${c.id}`,
      createdAt: toDateObj(c.date_created),
      updatedAt: toDateObj(c.date_created),
    }));
  if (cutsToInsert.length > 0) await Cut.insertMany(cutsToInsert, { ordered: false });

  const existingExpDescs = new Set(
    (await Expense.find({ description: /^SQLITE-EXP-/ }).select('description').lean()).map((e) => e.description)
  );
  const expensesToInsert = (raw.expense_entries || [])
    .filter((e) => !existingExpDescs.has(`SQLITE-EXP-${e.id}`))
    .map((e) => ({
      date: toVisitDate(e.entry_date),
      companyName: upper(e.company_name),
      category: upper(e.category || 'BILL'),
      amount: Math.max(0, Number(e.amount) || 0),
      status: Number(e.is_paid) === 1 ? 'Paid' : 'Unpaid',
      paymentMode: 'Cash',
      description: `SQLITE-EXP-${e.id}`,
      createdAt: toDateObj(e.date_created),
      updatedAt: toDateObj(e.date_created),
    }));
  if (expensesToInsert.length > 0) await Expense.insertMany(expensesToInsert, { ordered: false });
  console.log(`Cuts imported: ${cutsToInsert.length}. Expenses imported: ${expensesToInsert.length}.`);

  // 9. RECALCULATE PATIENT & FAMILY DUES, MEMBERS COUNT & HEAD LINKS
  const patAgg = await Visit.aggregate([
    { $group: { _id: '$patientId', totalCharge: { $sum: '$charge' }, totalReceived: { $sum: '$received' } } },
  ]);
  const patBulk = patAgg.map((a) => {
    const net = a.totalCharge - a.totalReceived;
    return {
      updateOne: {
        filter: { patientId: a._id },
        update: { $set: { totalDue: Math.max(0, net), deposit: Math.max(0, -net) } },
      },
    };
  });
  if (patBulk.length > 0) await Patient.bulkWrite(patBulk);

  const famAgg = await Visit.aggregate([
    { $match: { familyId: { $ne: '' } } },
    { $group: { _id: '$familyId', totalCharge: { $sum: '$charge' }, totalReceived: { $sum: '$received' } } },
  ]);
  const famDueMap = new Map();
  for (const a of famAgg) {
    const net = a.totalCharge - a.totalReceived;
    famDueMap.set(a._id, { due: Math.max(0, net), deposit: Math.max(0, -net) });
  }

  const famMembersAgg = await Patient.aggregate([
    { $match: { familyId: { $ne: '' } } },
    { $group: { _id: '$familyId', count: { $sum: 1 }, headId: { $max: { $cond: ['$isHead', '$_id', null] } } } },
  ]);
  const famBulk = famMembersAgg.map((a) => {
    const d = famDueMap.get(a._id) || { due: 0, deposit: 0 };
    const upd = { membersCount: a.count, familyDue: d.due, familyDeposit: d.deposit };
    if (a.headId) upd.headPatientId = a.headId;
    return {
      updateOne: {
        filter: { familyId: a._id },
        update: { $set: upd },
      },
    };
  });
  if (famBulk.length > 0) await Family.bulkWrite(famBulk);

  console.log('Migration complete! Final collection counts:');
  console.log({
    families: await Family.countDocuments({}),
    patients: await Patient.countDocuments({}),
    visits: await Visit.countDocuments({}),
    labreports: await LabReport.countDocuments({}),
    cuts: await Cut.countDocuments({}),
    expenses: await Expense.countDocuments({}),
  });

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
