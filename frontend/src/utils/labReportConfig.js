// Shared Lab Investigation Configuration (Single Source of Truth)
// Matches the 3-column Lab Investigation Details layout and normal ranges

export const LAB_COLUMNS = [
  // Column 1 (15 tests)
  [
    { key: 'hb', label: 'HB', normal: '13-17', min: 13, max: 17, legacySection: 'hematology', legacyKey: 'hb' },
    { key: 'rbc', label: 'RBC', normal: '4.5-5.5', min: 4.5, max: 5.5, legacySection: 'hematology', legacyKey: 'rbc' },
    { key: 'wbc', label: 'WBC', normal: '4000-11000', min: 4000, max: 11000, legacySection: 'hematology', legacyKey: 'wbc' },
    { key: 'platelet', label: 'Platelet', normal: '1.5L-4L', min: 1.5, max: 4.0, isLakhs: true, legacySection: 'hematology', legacyKey: 'platelet' },
    { key: 'neutrophils', label: 'Neutrophils', normal: '38-70', min: 38, max: 70, legacySection: 'differentialWbc', legacyKey: 'neutrophils' },
    { key: 'lymphocytes', label: 'Lymphocytes', normal: '20-45', min: 20, max: 45, legacySection: 'differentialWbc', legacyKey: 'lymphocytes' },
    { key: 'eosinophils', label: 'Eosinophils', normal: '0-6', min: 0, max: 6, legacySection: 'differentialWbc', legacyKey: 'eosinophils' },
    { key: 'monocytes', label: 'Monocytes', normal: '2-8', min: 2, max: 8, legacySection: 'differentialWbc', legacyKey: 'monocytes' },
    { key: 'basophils', label: 'Basophils', normal: '0-1', min: 0, max: 1, legacySection: 'differentialWbc', legacyKey: 'basophils' },
    { key: 'crp', label: 'CRP', normal: '0-6', min: 0, max: 6 },
    { key: 'esr', label: 'ESR', normal: '0-20', min: 0, max: 20, legacySection: 'hematology', legacyKey: 'esr' },
    { key: 'mp', label: 'MP', normal: '-' },
    { key: 'widal', label: 'Widal', normal: '-' },
    { key: 'typhiDot', label: 'Typhi dot', normal: '-' },
    { key: 'dengue', label: 'Dengue', normal: '-' },
  ],
  // Column 2 (10 tests)
  [
    { key: 'sgpt', label: 'SGPT', normal: '0-50', min: 0, max: 50 },
    { key: 'sgot', label: 'SGOT', normal: '0-50', min: 0, max: 50 },
    { key: 'totalBilirubin', label: 'Total Billirubin', normal: '0.3-1.2', min: 0.3, max: 1.2 },
    { key: 'directBilirubin', label: 'Direct Billirubin', normal: '0-0.2', min: 0, max: 0.2 },
    { key: 'indirectBilirubin', label: 'Indirect Billirubin', normal: '0-1.1', min: 0, max: 1.1 },
    { key: 'screatinin', label: 'Serum Creatinine', normal: '0.7-1.3', min: 0.7, max: 1.3, legacySection: 'bloodGlucoseRenal', legacyKey: 'screatinin' },
    { key: 'fbs', label: 'FBS', normal: '70-100', min: 70, max: 100, legacySection: 'bloodGlucoseRenal', legacyKey: 'fbs' },
    { key: 'pp2bs', label: 'PP2BS', normal: '70-140', min: 70, max: 140, legacySection: 'bloodGlucoseRenal', legacyKey: 'ppbs' },
    { key: 'rbs', label: 'RBS', normal: '70-140', min: 70, max: 140, legacySection: 'bloodGlucoseRenal', legacyKey: 'rbs' },
    { key: 'hba1c', label: 'HBA1AC', normal: '-' },
  ],
  // Column 3 (12 tests)
  [
    { key: 'cholesterol', label: 'Cholesterol', normal: '0-200', min: 0, max: 200 },
    { key: 'triglycerides', label: 'Triglycerides', normal: '0-150', min: 0, max: 150 },
    { key: 'ldl', label: 'LDL', normal: '0-100', min: 0, max: 100 },
    { key: 'hdl', label: 'HDL', normal: '40-60', min: 40, max: 60 },
    { key: 't3', label: 'T3', normal: '0.87-1.78', min: 0.87, max: 1.78, legacySection: 'thyroid', legacyKey: 't3' },
    { key: 't4', label: 'T4', normal: '5.48-14.28', min: 5.48, max: 14.28, legacySection: 'thyroid', legacyKey: 't4' },
    { key: 'tsh', label: 'TSH', normal: '0.38-5.33', min: 0.38, max: 5.33, legacySection: 'thyroid', legacyKey: 'tsh' },
    { key: 'vitb12', label: 'Vit B12', normal: '222-1440', min: 222, max: 1440, legacySection: 'bloodGlucoseRenal', legacyKey: 'vitb12' },
    { key: 'vitD3', label: 'Vit D3', normal: '0-20', min: 0, max: 20 },
    { key: 'calcium', label: 'Calcium', normal: '8.8-10.6', min: 8.8, max: 10.6 },
    { key: 'uricAcid', label: 'Uric Acid', normal: '3.5-7.2', min: 3.5, max: 7.2 },
    { key: 'raFactor', label: 'RA Factor', normal: '0-14', min: 0, max: 14 },
  ],
];

export const ALL_LAB_TESTS = LAB_COLUMNS.flat();

export const LAB_FINDING_BOXES = [
  { key: 'urineAnalysis', label: 'Urine Analysis:' },
  { key: 'usg', label: 'USG (Sonography):', legacyKey: 'usg' },
  { key: 'xray', label: 'X-RAY:', legacyKey: 'xray' },
  { key: 'ctMri', label: 'CT / MRI:', legacyKey: 'mri' },
  { key: 'others', label: 'OTHERS:', legacyKey: 'stool' },
];

/**
 * Evaluate a lab test value against its normal range and manual '*' danger flag.
 * Returns: 'danger' (manual *), 'low', 'high', 'normal', or null (empty/unknown).
 */
export const evaluateLabValue = (testDef, rawVal) => {
  if (rawVal === undefined || rawVal === null) return null;
  const str = String(rawVal).trim();
  if (!str) return null;

  // Manual borderline / danger marker '*' (e.g. "5.4*")
  if (str.includes('*')) {
    return 'danger';
  }

  const lower = str.toLowerCase();

  // Qualitative tests (MP, Widal, Typhi dot, Dengue, HBA1AC if text)
  if (testDef.min === undefined || testDef.max === undefined) {
    if (
      lower.includes('pos') ||
      lower.includes('+ve') ||
      lower === '+' ||
      lower.includes('react') ||
      lower.includes('detect')
    ) {
      return 'high';
    }
    if (lower.includes('neg') || lower.includes('-ve') || lower.includes('non') || lower.includes('nil')) {
      return 'normal';
    }
    return null;
  }

  const cleanStr = str.replace(/,/g, '').replace(/lakh(s)?/gi, '').replace(/l$/i, '').trim();
  let num = parseFloat(cleanStr);
  if (isNaN(num)) return null;

  // Platelet support: accept both "1.8L" / "1.8" and "180000"
  if (testDef.isLakhs && num > 100) {
    num = num / 100000;
  }

  if (num < testDef.min) return 'low';
  if (num > testDef.max) return 'high';
  return 'normal';
};

export const isLabStatusAbnormal = (status) => status === 'high' || status === 'low' || status === 'danger';

/**
 * Normalize either new `report.values` or legacy nested report structure into flat values map.
 */
export const extractFlatLabValues = (report) => {
  const flat = {};
  if (!report || typeof report !== 'object') return flat;

  for (const test of ALL_LAB_TESTS) {
    let val = '';
    if (report.values && report.values[test.key] !== undefined && report.values[test.key] !== '') {
      val = report.values[test.key];
    } else if (test.legacySection && test.legacyKey && report[test.legacySection]) {
      val = report[test.legacySection][test.legacyKey] || '';
    }
    flat[test.key] = val !== undefined && val !== null ? String(val) : '';
  }
  return flat;
};

/**
 * Normalize either new `report.findings` or legacy `report.specialFindings` into flat findings map.
 */
export const extractFlatLabFindings = (report) => {
  const flat = {};
  for (const box of LAB_FINDING_BOXES) {
    let notes = '';
    if (report?.findings && report.findings[box.key] !== undefined) {
      notes = report.findings[box.key];
    } else if (Array.isArray(report?.specialFindings) && box.legacyKey) {
      const found = report.specialFindings.find((s) => s.key === box.legacyKey || s.key === box.key);
      if (found) notes = found.notes || '';
    }
    flat[box.key] = notes || '';
  }
  return flat;
};

/**
 * Extract abnormal/out-of-range and '*'-marked lab alerts for Recent History & Patient Record summaries.
 */
export const extractLabAlerts = (report) => {
  const alerts = [];
  if (!report || typeof report !== 'object') return alerts;

  const flat = extractFlatLabValues(report);
  for (const test of ALL_LAB_TESTS) {
    const valStr = (flat[test.key] || '').trim();
    if (!valStr) continue;
    const status = evaluateLabValue(test, valStr);
    if (status === 'danger') {
      alerts.push({ type: 'lab', text: `${test.label}: ${valStr}`, variant: 'red' });
    } else if (status === 'low') {
      alerts.push({ type: 'lab', text: `${test.label}: ${valStr} (Low)`, variant: 'red' });
    } else if (status === 'high') {
      alerts.push({ type: 'lab', text: `${test.label}: ${valStr} (High)`, variant: 'red' });
    }
  }

  return alerts;
};
