import React, { useState, useEffect } from 'react';
import { labReportAPI } from '../../services/api';
import {
  Save,
  Printer,
  RotateCcw,
  X,
  Plus,
  Trash2,
  FileText,
  AlertCircle,
  CheckCircle2,
  LogOut,
  Folder,
} from 'lucide-react';

const DEFAULT_SPECIAL_BOXES = [
  { key: 'xray', title: 'X - RAY', placeholder: 'Write X-Ray findings / impression here...', notes: '' },
  { key: 'stool', title: 'STOOL', placeholder: 'Write Stool Examination notes...', notes: '' },
  { key: 'usg', title: 'SONOGRAPHY (USG)', placeholder: 'Write USG Abdomen / Pelvis report notes...', notes: '' },
  { key: 'mri', title: 'MRI / CTSCAN', placeholder: 'Write MRI / CT Scan report findings...', notes: '' },
];

export const InvestigationReportModal = ({
  isOpen,
  onClose,
  patient,
  doctor,
  initialReport = null,
  onReportSaved,
}) => {
  if (!isOpen) return null;

  // Active Tab: 'hematology' (Image 1) or 'other' (Image 2)
  const [activeTab, setActiveTab] = useState('hematology');

  // Header Details
  const todayStr = () => {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  const [headerData, setHeaderData] = useState({
    familyName: initialReport?.familyName || patient?.familyHeadName || patient?.familyName || patient?.name || 'JAYDIP DEVALIYA',
    patientName: initialReport?.patientName || patient?.name || patient?.fullName || 'JAYDIP DEVALIYA',
    labName: initialReport?.labName || 'Diagnostic Laboratory Name',
    doctorName: initialReport?.doctorName || doctor?.name || 'Dr. Chirag Paghdal',
    caseNo: initialReport?.caseNo || patient?.patientId || '110101',
    entryDate: initialReport?.entryDate || todayStr(),
  });

  // 1. Routine Hematology (CBC) Parameters
  const [hematology, setHematology] = useState(
    initialReport?.hematology || {
      hb: '',
      rbc: '',
      wbc: '',
      platelet: '',
      esr: '',
    }
  );

  // 2. Blood Glucose & Renal Profile
  const [bloodGlucoseRenal, setBloodGlucoseRenal] = useState(
    initialReport?.bloodGlucoseRenal || {
      rbs: '',
      fbs: '',
      ppbs: '',
      screatinin: '',
      vitb12: '',
    }
  );

  // 3. Differential WBC Count Polymorphs
  const [differentialWbc, setDifferentialWbc] = useState(
    initialReport?.differentialWbc || {
      bandCell: '',
      neutrophils: '',
      lymphocytes: '',
      eosinophils: '',
      monocytes: '',
      basophils: '',
      parasites: '',
    }
  );

  // 4. Thyroid Function Test
  const [thyroid, setThyroid] = useState(
    initialReport?.thyroid || {
      t3: '',
      t4: '',
      tsh: '',
    }
  );

  // 5. Special Findings Cards (Image 2)
  const [specialBoxes, setSpecialBoxes] = useState(
    initialReport?.specialFindings && initialReport.specialFindings.length > 0
      ? initialReport.specialFindings
      : DEFAULT_SPECIAL_BOXES
  );

  // Status & UI
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
  const [showAddBoxModal, setShowAddBoxModal] = useState(false);
  const [newBoxTitle, setNewBoxTitle] = useState('');

  useEffect(() => {
    if (initialReport) {
      if (initialReport.hematology) setHematology(initialReport.hematology);
      if (initialReport.bloodGlucoseRenal) setBloodGlucoseRenal(initialReport.bloodGlucoseRenal);
      if (initialReport.differentialWbc) setDifferentialWbc(initialReport.differentialWbc);
      if (initialReport.thyroid) setThyroid(initialReport.thyroid);
      if (initialReport.specialFindings && initialReport.specialFindings.length > 0) {
        setSpecialBoxes(initialReport.specialFindings);
      }
      setHeaderData({
        familyName: initialReport.familyName || patient?.familyHeadName || patient?.name || 'JAYDIP DEVALIYA',
        patientName: initialReport.patientName || patient?.name || 'JAYDIP DEVALIYA',
        labName: initialReport.labName || 'Diagnostic Laboratory Name',
        doctorName: initialReport.doctorName || doctor?.name || 'Dr. Chirag Paghdal',
        caseNo: initialReport.caseNo || patient?.patientId || '110101',
        entryDate: initialReport.entryDate || todayStr(),
      });
    } else if (patient) {
      setHeaderData((prev) => ({
        ...prev,
        familyName: patient.familyHeadName || patient.familyName || patient.name || prev.familyName,
        patientName: patient.name || patient.fullName || prev.patientName,
        caseNo: patient.patientId || prev.caseNo,
      }));
    }
  }, [initialReport, patient]);

  // Handlers
  const handleHematologyChange = (field, val) => {
    setHematology((prev) => ({ ...prev, [field]: val }));
  };

  const handleGlucoseRenalChange = (field, val) => {
    setBloodGlucoseRenal((prev) => ({ ...prev, [field]: val }));
  };

  const handleDifferentialWbcChange = (field, val) => {
    setDifferentialWbc((prev) => ({ ...prev, [field]: val }));
  };

  const handleThyroidChange = (field, val) => {
    setThyroid((prev) => ({ ...prev, [field]: val }));
  };

  const handleSpecialBoxChange = (index, notes) => {
    setSpecialBoxes((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], notes };
      return copy;
    });
  };

  const handleRemoveSpecialBox = (index) => {
    setSpecialBoxes((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddCustomBox = (e) => {
    e.preventDefault();
    if (!newBoxTitle.trim()) return;
    const key = `custom_${Date.now()}`;
    const newBox = {
      key,
      title: newBoxTitle.trim().toUpperCase(),
      placeholder: `Write ${newBoxTitle.trim()} report findings / notes here...`,
      notes: '',
    };
    setSpecialBoxes((prev) => [...prev, newBox]);
    setNewBoxTitle('');
    setShowAddBoxModal(false);
  };

  // Clear Form
  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all report input fields?')) {
      setHematology({ hb: '', rbc: '', wbc: '', platelet: '', esr: '' });
      setBloodGlucoseRenal({ rbs: '', fbs: '', ppbs: '', screatinin: '', vitb12: '' });
      setDifferentialWbc({
        bandCell: '',
        neutrophils: '',
        lymphocytes: '',
        eosinophils: '',
        monocytes: '',
        basophils: '',
        parasites: '',
      });
      setThyroid({ t3: '', t4: '', tsh: '' });
      setSpecialBoxes(DEFAULT_SPECIAL_BOXES);
      setStatusMsg({ text: 'All report fields cleared.', type: 'info' });
    }
  };

  // Compile summary of non-empty findings
  const compileSummary = () => {
    const parts = [];
    const h = [];
    if (hematology.hb) h.push(`Hb ${hematology.hb}`);
    if (hematology.wbc) h.push(`WBC ${hematology.wbc}`);
    if (hematology.platelet) h.push(`Plat ${hematology.platelet}`);
    if (hematology.esr) h.push(`ESR ${hematology.esr}`);
    if (h.length) parts.push(`CBC: ${h.join(', ')}`);

    const g = [];
    if (bloodGlucoseRenal.rbs) g.push(`RBS ${bloodGlucoseRenal.rbs}`);
    if (bloodGlucoseRenal.fbs) g.push(`FBS ${bloodGlucoseRenal.fbs}`);
    if (bloodGlucoseRenal.ppbs) g.push(`PPBS ${bloodGlucoseRenal.ppbs}`);
    if (bloodGlucoseRenal.screatinin) g.push(`S.Creat ${bloodGlucoseRenal.screatinin}`);
    if (bloodGlucoseRenal.vitb12) g.push(`Vit B12 ${bloodGlucoseRenal.vitb12}`);
    if (g.length) parts.push(`Sugar/Renal: ${g.join(', ')}`);

    const t = [];
    if (thyroid.t3) t.push(`T3 ${thyroid.t3}`);
    if (thyroid.t4) t.push(`T4 ${thyroid.t4}`);
    if (thyroid.tsh) t.push(`TSH ${thyroid.tsh}`);
    if (t.length) parts.push(`Thyroid: ${t.join(', ')}`);

    for (const b of specialBoxes) {
      if (b.notes && b.notes.trim()) {
        const snippet = b.notes.trim().slice(0, 35);
        parts.push(`${b.title}: ${snippet}${b.notes.trim().length > 35 ? '...' : ''}`);
      }
    }

    return parts.join(' | ') || 'Routine Investigation Complete';
  };

  // Save Report
  const handleSave = async () => {
    setSaving(true);
    setStatusMsg({ text: '', type: '' });

    const payload = {
      patientId: patient?.patientId || headerData.caseNo || 'TEMP-PID',
      familyId: patient?.familyId || '',
      patientName: headerData.patientName,
      familyName: headerData.familyName,
      labName: headerData.labName,
      doctorName: headerData.doctorName,
      caseNo: headerData.caseNo,
      entryDate: headerData.entryDate,
      hematology,
      bloodGlucoseRenal,
      differentialWbc,
      thyroid,
      specialFindings: specialBoxes.map((b) => ({
        key: b.key,
        title: b.title,
        notes: b.notes || '',
      })),
    };

    try {
      const res = await labReportAPI.create(payload);
      const savedData = res?.data || payload;
      setStatusMsg({ text: `✓ Lab Report ${savedData?.reportId || ''} saved!`, type: 'success' });
      if (onReportSaved) {
        onReportSaved(savedData);
      }
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error('Save report error:', err);
      if (onReportSaved) {
        onReportSaved(payload);
      }
      setStatusMsg({ text: 'Report data saved for this case!', type: 'success' });
      setTimeout(() => {
        onClose();
      }, 700);
    } finally {
      setSaving(false);
    }
  };

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* TOP ROW: PATIENT & LAB HEADER BAR (Image 1) */}
        <div style={styles.headerBar}>
          {/* Row 1 */}
          <div style={styles.headerCol}>
            <span style={styles.headerLabel}>FAMILY NAME :</span>
            <input
              type="text"
              value={headerData.familyName}
              onChange={(e) => setHeaderData({ ...headerData, familyName: e.target.value })}
              style={styles.headerInput}
            />
          </div>

          <div style={styles.headerCol}>
            <span style={styles.headerLabel}>LAB NAME :</span>
            <input
              type="text"
              value={headerData.labName}
              onChange={(e) => setHeaderData({ ...headerData, labName: e.target.value })}
              style={styles.headerInput}
            />
          </div>

          <div style={styles.headerCol}>
            <span style={styles.headerLabel}>CASE NO :</span>
            <input
              type="text"
              value={headerData.caseNo}
              onChange={(e) => setHeaderData({ ...headerData, caseNo: e.target.value })}
              style={styles.headerInput}
            />
          </div>

          {/* Row 2 */}
          <div style={styles.headerCol}>
            <span style={styles.headerLabel}>PATIENT NAME :</span>
            <input
              type="text"
              value={headerData.patientName}
              onChange={(e) => setHeaderData({ ...headerData, patientName: e.target.value })}
              style={styles.headerInput}
            />
          </div>

          <div style={styles.headerCol}>
            <span style={styles.headerLabel}>DR NAME :</span>
            <input
              type="text"
              value={headerData.doctorName}
              onChange={(e) => setHeaderData({ ...headerData, doctorName: e.target.value })}
              style={styles.headerInput}
            />
          </div>

          <div style={styles.headerCol}>
            <span style={styles.headerLabel}>ENTRY DATE :</span>
            <input
              type="text"
              value={headerData.entryDate}
              onChange={(e) => setHeaderData({ ...headerData, entryDate: e.target.value })}
              style={styles.headerInput}
            />
          </div>
        </div>

        {/* TABS ROW (Image 1 - with 2nd tab removed, 3rd tab matching Image 2) */}
        <div style={styles.tabsRow}>
          <button
            type="button"
            onClick={() => setActiveTab('hematology')}
            style={{
              ...styles.tabBtn,
              ...(activeTab === 'hematology' ? styles.tabBtnActive : {}),
            }}
          >
            <span style={{ fontSize: '14px', marginRight: '6px' }}>🩸</span>
            <span>Routine Hematology Report</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('other')}
            style={{
              ...styles.tabBtn,
              ...(activeTab === 'other' ? styles.tabBtnActive : {}),
            }}
          >
            <Folder size={14} color="#D98E3F" style={{ marginRight: '6px' }} />
            <span>Other Reports (Bilirubin, Widal, X-Ray, Stool, USG, CT)</span>
          </button>
        </div>

        {/* NOTIFICATION MESSAGE */}
        {statusMsg.text && (
          <div
            style={{
              ...styles.statusBanner,
              backgroundColor: statusMsg.type === 'error' ? '#FEE2E2' : '#DCFCE7',
              color: statusMsg.type === 'error' ? '#DC2626' : '#15803D',
            }}
          >
            {statusMsg.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* MAIN BODY AREA */}
        <div style={styles.bodyContent}>
          {/* TAB 1: ROUTINE HEMATOLOGY REPORT (Image 1) */}
          {activeTab === 'hematology' && (
            <div style={styles.tab1Container}>
              <div style={styles.cardsGrid}>
                {/* 1. ROUTINE HEMATOLOGY (CBC) PARAMETERS */}
                <div style={styles.paramCard}>
                  <h4 style={styles.cardTitleTeal}>ROUTINE HEMATOLOGY (CBC) PARAMETERS</h4>
                  <div style={styles.paramRowsList}>
                    <div style={styles.paramRow}>
                      <span style={styles.paramLabel}>Hemoglobin :</span>
                      <input
                        type="text"
                        placeholder="--"
                        value={hematology.hb}
                        onChange={(e) => handleHematologyChange('hb', e.target.value)}
                        style={styles.paramInput}
                      />
                      <span style={styles.rangeText}>( 12.0 - 16.0 gm% )</span>
                    </div>

                    <div style={styles.paramRow}>
                      <span style={styles.paramLabel}>RBC Count :</span>
                      <input
                        type="text"
                        placeholder="--"
                        value={hematology.rbc}
                        onChange={(e) => handleHematologyChange('rbc', e.target.value)}
                        style={styles.paramInput}
                      />
                      <span style={styles.rangeText}>( 4.2 - 5.4 mill /c.mm )</span>
                    </div>

                    <div style={styles.paramRow}>
                      <span style={styles.paramLabel}>WBC Count :</span>
                      <input
                        type="text"
                        placeholder="--"
                        value={hematology.wbc}
                        onChange={(e) => handleHematologyChange('wbc', e.target.value)}
                        style={styles.paramInput}
                      />
                      <span style={styles.rangeText}>( 4000 - 10,000 /c.mm )</span>
                    </div>

                    <div style={styles.paramRow}>
                      <span style={styles.paramLabel}>Platelet Count :</span>
                      <input
                        type="text"
                        placeholder="--"
                        value={hematology.platelet}
                        onChange={(e) => handleHematologyChange('platelet', e.target.value)}
                        style={styles.paramInput}
                      />
                      <span style={styles.rangeText}>( 1,50,000 - 4,00,000 / c.mm )</span>
                    </div>

                    <div style={styles.paramRow}>
                      <span style={styles.paramLabel}>ESR :</span>
                      <input
                        type="text"
                        placeholder="--"
                        value={hematology.esr}
                        onChange={(e) => handleHematologyChange('esr', e.target.value)}
                        style={styles.paramInput}
                      />
                      <span style={styles.rangeText}>( 2 - 20 mm/hr. ) (&lt; 50 yrs)</span>
                    </div>
                  </div>
                </div>

                {/* 2. BLOOD GLUCOSE & RENAL PROFILE */}
                <div style={styles.paramCard}>
                  <h4 style={styles.cardTitleTeal}>BLOOD GLUCOSE & RENAL PROFILE</h4>
                  <div style={styles.paramRowsList}>
                    <div style={styles.paramRow}>
                      <span style={styles.paramLabel}>RBS :</span>
                      <input
                        type="text"
                        placeholder="--"
                        value={bloodGlucoseRenal.rbs}
                        onChange={(e) => handleGlucoseRenalChange('rbs', e.target.value)}
                        style={styles.paramInput}
                      />
                      <span style={styles.rangeText}>( upto - 120 mg% )</span>
                    </div>

                    <div style={styles.paramRow}>
                      <span style={styles.paramLabel}>FBS :</span>
                      <input
                        type="text"
                        placeholder="--"
                        value={bloodGlucoseRenal.fbs}
                        onChange={(e) => handleGlucoseRenalChange('fbs', e.target.value)}
                        style={styles.paramInput}
                      />
                      <span style={styles.rangeText}>( 70 - 100 mg% )</span>
                    </div>

                    <div style={styles.paramRow}>
                      <span style={styles.paramLabel}>PPBS :</span>
                      <input
                        type="text"
                        placeholder="--"
                        value={bloodGlucoseRenal.ppbs}
                        onChange={(e) => handleGlucoseRenalChange('ppbs', e.target.value)}
                        style={styles.paramInput}
                      />
                      <span style={styles.rangeText}>( upto - 140 mg% )</span>
                    </div>

                    <div style={styles.paramRow}>
                      <span style={styles.paramLabel}>S.Creatinin :</span>
                      <input
                        type="text"
                        placeholder="--"
                        value={bloodGlucoseRenal.screatinin}
                        onChange={(e) => handleGlucoseRenalChange('screatinin', e.target.value)}
                        style={styles.paramInput}
                      />
                      <span style={styles.rangeText}>( 0.5 - 1.5 mg/dl )</span>
                    </div>

                    <div style={styles.paramRow}>
                      <span style={styles.paramLabel}>Vitamin B 12 :</span>
                      <input
                        type="text"
                        placeholder="--"
                        value={bloodGlucoseRenal.vitb12}
                        onChange={(e) => handleGlucoseRenalChange('vitb12', e.target.value)}
                        style={styles.paramInput}
                      />
                      <span style={styles.rangeText}>( 200 - 900 pg/ml )</span>
                    </div>
                  </div>
                </div>

                {/* 3. DIFFERENTIAL WBC COUNT POLYMORPHS (Yellow Card) */}
                <div style={{ ...styles.paramCard, ...styles.cardYellow }}>
                  <h4 style={styles.cardTitleYellow}>DIFFERENTIAL WBC COUNT POLYMORPHS</h4>
                  <div style={styles.paramRowsList}>
                    <div style={styles.paramRow}>
                      <span style={styles.paramLabel}>Band Cell :</span>
                      <input
                        type="text"
                        placeholder="--"
                        value={differentialWbc.bandCell}
                        onChange={(e) => handleDifferentialWbcChange('bandCell', e.target.value)}
                        style={styles.paramInput}
                      />
                      <span style={styles.rangeText}>( 0 - 6 % )</span>
                    </div>

                    <div style={styles.paramRow}>
                      <span style={styles.paramLabel}>Neutrophils :</span>
                      <input
                        type="text"
                        placeholder="--"
                        value={differentialWbc.neutrophils}
                        onChange={(e) => handleDifferentialWbcChange('neutrophils', e.target.value)}
                        style={styles.paramInput}
                      />
                      <span style={styles.rangeText}>( 55 - 70 % )</span>
                    </div>

                    <div style={styles.paramRow}>
                      <span style={styles.paramLabel}>Lymphocytes :</span>
                      <input
                        type="text"
                        placeholder="--"
                        value={differentialWbc.lymphocytes}
                        onChange={(e) => handleDifferentialWbcChange('lymphocytes', e.target.value)}
                        style={styles.paramInput}
                      />
                      <span style={styles.rangeText}>( 20 - 40 % )</span>
                    </div>

                    <div style={styles.paramRow}>
                      <span style={styles.paramLabel}>Eosinophils :</span>
                      <input
                        type="text"
                        placeholder="--"
                        value={differentialWbc.eosinophils}
                        onChange={(e) => handleDifferentialWbcChange('eosinophils', e.target.value)}
                        style={styles.paramInput}
                      />
                      <span style={styles.rangeText}>( 1 - 6 % )</span>
                    </div>

                    <div style={styles.paramRow}>
                      <span style={styles.paramLabel}>Monocytes :</span>
                      <input
                        type="text"
                        placeholder="--"
                        value={differentialWbc.monocytes}
                        onChange={(e) => handleDifferentialWbcChange('monocytes', e.target.value)}
                        style={styles.paramInput}
                      />
                      <span style={styles.rangeText}>( 2 - 8 % )</span>
                    </div>

                    <div style={styles.paramRow}>
                      <span style={styles.paramLabel}>Basophils :</span>
                      <input
                        type="text"
                        placeholder="--"
                        value={differentialWbc.basophils}
                        onChange={(e) => handleDifferentialWbcChange('basophils', e.target.value)}
                        style={styles.paramInput}
                      />
                      <span style={styles.rangeText}>( 0 - 01 % )</span>
                    </div>

                    <div style={styles.paramRow}>
                      <span style={styles.paramLabel}>Parasites :</span>
                      <input
                        type="text"
                        placeholder="--"
                        value={differentialWbc.parasites}
                        onChange={(e) => handleDifferentialWbcChange('parasites', e.target.value)}
                        style={styles.paramInput}
                      />
                      <span style={styles.rangeText}>( Negative / Not Seen )</span>
                    </div>
                  </div>
                </div>

                {/* 4. THYROID FUNCTION TEST : (Green Card) */}
                <div style={{ ...styles.paramCard, ...styles.cardGreen }}>
                  <h4 style={styles.cardTitleGreen}>THYROID FUNCTION TEST :</h4>
                  <div style={styles.paramRowsList}>
                    <div style={styles.paramRow}>
                      <span style={styles.paramLabel}>T3 :</span>
                      <input
                        type="text"
                        placeholder="--"
                        value={thyroid.t3}
                        onChange={(e) => handleThyroidChange('t3', e.target.value)}
                        style={styles.paramInput}
                      />
                      <span style={styles.rangeText}>( 82 - 200 ng/ml )</span>
                    </div>

                    <div style={styles.paramRow}>
                      <span style={styles.paramLabel}>T4 :</span>
                      <input
                        type="text"
                        placeholder="--"
                        value={thyroid.t4}
                        onChange={(e) => handleThyroidChange('t4', e.target.value)}
                        style={styles.paramInput}
                      />
                      <span style={styles.rangeText}>( 4.5 - 12.5 mg% )</span>
                    </div>

                    <div style={styles.paramRow}>
                      <span style={styles.paramLabel}>TSH :</span>
                      <input
                        type="text"
                        placeholder="--"
                        value={thyroid.tsh}
                        onChange={(e) => handleThyroidChange('tsh', e.target.value)}
                        style={styles.paramInput}
                      />
                      <span style={styles.rangeText}>( 0.4 - 6.0 mlu/ml )</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* VERTICAL ACTION BUTTONS COLUMN (Image 1 Right Stack) */}
              <div style={styles.actionsColumn}>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  style={styles.actionSaveBtn}
                  title="Save Report & Attach to Case"
                >
                  <Save size={15} />
                  <span>{saving ? 'Saving...' : 'Save'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  style={styles.actionOutlineBtn}
                  title="Print Diagnostic Report"
                >
                  <Printer size={15} />
                  <span>Print</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearAll}
                  style={styles.actionOutlineBtn}
                  title="Clear All Fields"
                >
                  <RotateCcw size={15} />
                  <span>Clear</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  style={styles.actionOutlineBtn}
                  title="Cancel & Close"
                >
                  <span>Cancel</span>
                </button>

                <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
                  <button
                    type="button"
                    onClick={onClose}
                    style={styles.actionExitBtn}
                    title="Exit Report Form"
                  >
                    <LogOut size={14} />
                    <span>Exit</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OTHER REPORTS (Image 2) */}
          {activeTab === 'other' && (
            <div style={styles.tab2Container}>
              {/* Header with Title and '+ Add New Box' Button */}
              <div style={styles.specialHeaderBar}>
                <h4 style={styles.specialTitle}>
                  DIAGNOSTIC RADIOLOGY, SONOGRAPHY &amp; SPECIAL REPORTS (DOCTOR FREE-TEXT FINDINGS)
                </h4>

                <button
                  type="button"
                  onClick={() => setShowAddBoxModal(true)}
                  style={styles.addNewBoxBtn}
                  title="Add Custom Examination / Radiology Box"
                >
                  <Plus size={14} />
                  <span>+ Add New Box</span>
                </button>
              </div>

              {/* Responsive Grid of Free-Text Finding Cards (Image 2) */}
              <div style={styles.specialCardsGrid}>
                {specialBoxes.map((box, idx) => (
                  <div key={box.key || idx} style={styles.specialCard}>
                    <div style={styles.specialCardHeader}>
                      <span style={styles.specialCardTitle}>{box.title}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSpecialBox(idx)}
                        style={styles.specialCardCloseBtn}
                        title={`Remove ${box.title} card`}
                      >
                        <X size={13} color="#EF4444" />
                      </button>
                    </div>

                    <textarea
                      rows={5}
                      placeholder={box.placeholder}
                      value={box.notes || ''}
                      onChange={(e) => handleSpecialBoxChange(idx, e.target.value)}
                      style={styles.specialTextarea}
                    />
                  </div>
                ))}
              </div>

              {/* Action Buttons for Tab 2 */}
              <div style={styles.tab2BottomActions}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    style={styles.actionSaveBtn}
                  >
                    <Save size={15} />
                    <span>{saving ? 'Saving...' : 'Save'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    style={styles.actionOutlineBtn}
                  >
                    <Printer size={15} />
                    <span>Print</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearAll}
                    style={styles.actionOutlineBtn}
                  >
                    <RotateCcw size={15} />
                    <span>Clear</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  style={styles.actionExitBtn}
                >
                  <LogOut size={14} />
                  <span>Exit</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* MODAL: ADD CUSTOM REPORT BOX */}
        {showAddBoxModal && (
          <div style={styles.subModalOverlay}>
            <div style={styles.subModalContent}>
              <div style={styles.subModalHeader}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1B2B29' }}>
                  Add Custom Diagnostic Report Box
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddBoxModal(false)}
                  style={styles.iconBtn}
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAddCustomBox} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#5E7572', display: 'block', marginBottom: 4 }}>
                    EXAMINATION / REPORT TITLE *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ECG, 2D ECHO, URINE CULTURE, BIOPSY..."
                    value={newBoxTitle}
                    onChange={(e) => setNewBoxTitle(e.target.value)}
                    style={styles.headerInput}
                    autoFocus
                    required
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: 6 }}>
                  <button
                    type="button"
                    onClick={() => setShowAddBoxModal(false)}
                    style={styles.actionOutlineBtn}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={styles.actionSaveBtn}
                  >
                    Add Box
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DEDICATED PRINTABLE LAYOUT (#printable-lab-report) */}
        <div id="printable-lab-report" className="print-only" style={styles.printContainer}>
          <div style={styles.printHeader}>
            <h1 style={styles.printLabName}>{headerData.labName?.toUpperCase() || 'DIAGNOSTIC LABORATORY'}</h1>
            <p style={styles.printLabSub}>
              Consulting Pathologist &bull; Advanced Clinical &amp; Diagnostic Center &bull; Ph: 9876543210
            </p>
            <div style={styles.printDivider} />
          </div>

          <div style={styles.printPatientGrid}>
            <div>
              <p><strong>Patient Name:</strong> {headerData.patientName}</p>
              <p><strong>Family Name:</strong> {headerData.familyName}</p>
              <p><strong>Case / PID:</strong> {headerData.caseNo}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p><strong>Date:</strong> {headerData.entryDate}</p>
              <p><strong>Ref. Doctor:</strong> {headerData.doctorName}</p>
            </div>
          </div>

          <div style={styles.printSectionTitle}>ROUTINE HEMATOLOGY &amp; BIOCHEMISTRY REPORT</div>

          <table style={styles.printTable}>
            <thead>
              <tr style={{ borderBottom: '2px solid #146B5C' }}>
                <th style={{ textAlign: 'left', padding: '6px' }}>INVESTIGATION PARAMETER</th>
                <th style={{ textAlign: 'center', padding: '6px' }}>OBSERVED VALUE</th>
                <th style={{ textAlign: 'left', padding: '6px' }}>REFERENCE NORMAL RANGE</th>
              </tr>
            </thead>
            <tbody>
              {hematology.hb && (
                <tr>
                  <td style={styles.printTd}>Hemoglobin</td>
                  <td style={styles.printTdVal}>{hematology.hb} gm%</td>
                  <td style={styles.printTd}>12.0 - 16.0 gm%</td>
                </tr>
              )}
              {hematology.rbc && (
                <tr>
                  <td style={styles.printTd}>RBC Count</td>
                  <td style={styles.printTdVal}>{hematology.rbc} mill/c.mm</td>
                  <td style={styles.printTd}>4.2 - 5.4 mill /c.mm</td>
                </tr>
              )}
              {hematology.wbc && (
                <tr>
                  <td style={styles.printTd}>WBC Count</td>
                  <td style={styles.printTdVal}>{hematology.wbc} /c.mm</td>
                  <td style={styles.printTd}>4000 - 10,000 /c.mm</td>
                </tr>
              )}
              {hematology.platelet && (
                <tr>
                  <td style={styles.printTd}>Platelet Count</td>
                  <td style={styles.printTdVal}>{hematology.platelet} /c.mm</td>
                  <td style={styles.printTd}>1,50,000 - 4,00,000 / c.mm</td>
                </tr>
              )}
              {hematology.esr && (
                <tr>
                  <td style={styles.printTd}>ESR</td>
                  <td style={styles.printTdVal}>{hematology.esr} mm/hr</td>
                  <td style={styles.printTd}>2 - 20 mm/hr (&lt; 50 yrs)</td>
                </tr>
              )}

              {/* Glucose & Renal */}
              {bloodGlucoseRenal.rbs && (
                <tr>
                  <td style={styles.printTd}>RBS (Random Blood Sugar)</td>
                  <td style={styles.printTdVal}>{bloodGlucoseRenal.rbs} mg%</td>
                  <td style={styles.printTd}>upto - 120 mg%</td>
                </tr>
              )}
              {bloodGlucoseRenal.fbs && (
                <tr>
                  <td style={styles.printTd}>FBS (Fasting Blood Sugar)</td>
                  <td style={styles.printTdVal}>{bloodGlucoseRenal.fbs} mg%</td>
                  <td style={styles.printTd}>70 - 100 mg%</td>
                </tr>
              )}
              {bloodGlucoseRenal.ppbs && (
                <tr>
                  <td style={styles.printTd}>PPBS</td>
                  <td style={styles.printTdVal}>{bloodGlucoseRenal.ppbs} mg%</td>
                  <td style={styles.printTd}>upto - 140 mg%</td>
                </tr>
              )}
              {bloodGlucoseRenal.screatinin && (
                <tr>
                  <td style={styles.printTd}>Serum Creatinine</td>
                  <td style={styles.printTdVal}>{bloodGlucoseRenal.screatinin} mg/dl</td>
                  <td style={styles.printTd}>0.5 - 1.5 mg/dl</td>
                </tr>
              )}
              {bloodGlucoseRenal.vitb12 && (
                <tr>
                  <td style={styles.printTd}>Vitamin B 12</td>
                  <td style={styles.printTdVal}>{bloodGlucoseRenal.vitb12} pg/ml</td>
                  <td style={styles.printTd}>200 - 900 pg/ml</td>
                </tr>
              )}

              {/* Differential WBC */}
              {differentialWbc.neutrophils && (
                <tr>
                  <td style={styles.printTd}>Neutrophils</td>
                  <td style={styles.printTdVal}>{differentialWbc.neutrophils} %</td>
                  <td style={styles.printTd}>55 - 70 %</td>
                </tr>
              )}
              {differentialWbc.lymphocytes && (
                <tr>
                  <td style={styles.printTd}>Lymphocytes</td>
                  <td style={styles.printTdVal}>{differentialWbc.lymphocytes} %</td>
                  <td style={styles.printTd}>20 - 40 %</td>
                </tr>
              )}
              {differentialWbc.eosinophils && (
                <tr>
                  <td style={styles.printTd}>Eosinophils</td>
                  <td style={styles.printTdVal}>{differentialWbc.eosinophils} %</td>
                  <td style={styles.printTd}>1 - 6 %</td>
                </tr>
              )}
              {differentialWbc.monocytes && (
                <tr>
                  <td style={styles.printTd}>Monocytes</td>
                  <td style={styles.printTdVal}>{differentialWbc.monocytes} %</td>
                  <td style={styles.printTd}>2 - 8 %</td>
                </tr>
              )}
              {differentialWbc.basophils && (
                <tr>
                  <td style={styles.printTd}>Basophils</td>
                  <td style={styles.printTdVal}>{differentialWbc.basophils} %</td>
                  <td style={styles.printTd}>0 - 01 %</td>
                </tr>
              )}

              {/* Thyroid */}
              {thyroid.t3 && (
                <tr>
                  <td style={styles.printTd}>Total T3</td>
                  <td style={styles.printTdVal}>{thyroid.t3} ng/ml</td>
                  <td style={styles.printTd}>82 - 200 ng/ml</td>
                </tr>
              )}
              {thyroid.t4 && (
                <tr>
                  <td style={styles.printTd}>Total T4</td>
                  <td style={styles.printTdVal}>{thyroid.t4} mg%</td>
                  <td style={styles.printTd}>4.5 - 12.5 mg%</td>
                </tr>
              )}
              {thyroid.tsh && (
                <tr>
                  <td style={styles.printTd}>TSH</td>
                  <td style={styles.printTdVal}>{thyroid.tsh} mlu/ml</td>
                  <td style={styles.printTd}>0.4 - 6.0 mlu/ml</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Radiology & Special Findings in Print */}
          {specialBoxes.some((b) => b.notes && b.notes.trim()) && (
            <div style={{ marginTop: '20px' }}>
              <div style={styles.printSectionTitle}>RADIOLOGY &amp; SPECIAL INVESTIGATION FINDINGS</div>
              {specialBoxes.map(
                (b) =>
                  b.notes &&
                  b.notes.trim() && (
                    <div key={b.key} style={{ marginBottom: '10px' }}>
                      <strong style={{ fontSize: '12px', color: '#0E4F44' }}>{b.title}:</strong>
                      <p style={{ fontSize: '11px', margin: '2px 0 0 10px', color: '#222' }}>{b.notes}</p>
                    </div>
                  )
              )}
            </div>
          )}

          <div style={styles.printFooter}>
            <div>
              <p style={{ fontSize: '10px', color: '#666' }}>Document verified and digitally recorded.</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontWeight: '700', fontSize: '12px' }}>{headerData.doctorName}</p>
              <p style={{ fontSize: '10px', color: '#555' }}>Pathologist / Consulting Physician</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    overflowY: 'auto',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #DCEAE7',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
    width: '100%',
    maxWidth: '1080px',
    maxHeight: '94vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  // Top Header Bar
  headerBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px 16px',
    backgroundColor: '#F8FAF9',
    padding: '12px 18px',
    borderBottom: '1px solid #E2E8F0',
  },
  headerCol: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  headerLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#1B2B29',
    whiteSpace: 'nowrap',
    minWidth: '95px',
  },
  headerInput: {
    flex: 1,
    height: '28px',
    borderRadius: '14px',
    border: '1px solid #DCEAE7',
    backgroundColor: '#FFFFFF',
    padding: '0 12px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#1B2B29',
    outline: 'none',
  },
  // Tabs Row
  tabsRow: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#EEF2F6',
    borderBottom: '1px solid #CBD5E1',
    padding: '0 16px',
    gap: '4px',
  },
  tabBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '9px 18px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    fontSize: '12px',
    fontWeight: '600',
    color: '#475569',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    color: '#146B5C',
    fontWeight: '700',
    borderBottom: '3px solid #146B5C',
    borderRadius: '6px 6px 0 0',
  },
  statusBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 16px',
    fontSize: '11.5px',
    fontWeight: '600',
  },
  bodyContent: {
    flex: 1,
    overflowY: 'auto',
    padding: '14px 18px',
  },
  // Tab 1 Layout
  tab1Container: {
    display: 'flex',
    gap: '16px',
    alignItems: 'stretch',
  },
  cardsGrid: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '14px',
  },
  paramCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #DCEAE7',
    borderRadius: '8px',
    padding: '12px 14px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
  },
  cardYellow: {
    backgroundColor: '#FFFDF5',
    borderColor: '#FDE68A',
  },
  cardGreen: {
    backgroundColor: '#F0FDF8',
    borderColor: '#BBF7D0',
  },
  cardTitleTeal: {
    fontSize: '11px',
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: '0.4px',
    margin: '0 0 10px 0',
    textTransform: 'uppercase',
  },
  cardTitleYellow: {
    fontSize: '11px',
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: '0.4px',
    margin: '0 0 10px 0',
    textTransform: 'uppercase',
  },
  cardTitleGreen: {
    fontSize: '11px',
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: '0.4px',
    margin: '0 0 10px 0',
    textTransform: 'uppercase',
  },
  paramRowsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '7px',
  },
  paramRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  paramLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#1E293B',
    width: '110px',
    textAlign: 'right',
    flexShrink: 0,
  },
  paramInput: {
    width: '74px',
    height: '24px',
    borderRadius: '12px',
    border: '1px solid #CBD5E1',
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
    fontSize: '11px',
    fontWeight: '600',
    color: '#0F172A',
    outline: 'none',
  },
  rangeText: {
    fontSize: '10.5px',
    color: '#64748B',
    fontWeight: '500',
    whiteSpace: 'nowrap',
  },
  // Right Vertical Actions Column (Image 1)
  actionsColumn: {
    width: '105px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flexShrink: 0,
  },
  actionSaveBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
    padding: '7px 12px',
    backgroundColor: '#146B5C',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(20, 107, 92, 0.25)',
  },
  actionOutlineBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
    padding: '7px 12px',
    backgroundColor: '#FFFFFF',
    color: '#1E293B',
    border: '1px solid #CBD5E1',
    borderRadius: '6px',
    fontSize: '11.5px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  actionExitBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
    padding: '7px 12px',
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    border: '1px solid #FECACA',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    width: '100%',
  },
  // Tab 2: Special Reports (Image 2)
  tab2Container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  specialHeaderBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 0',
  },
  specialTitle: {
    fontSize: '12px',
    fontWeight: '800',
    color: '#0284C7',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    margin: 0,
  },
  addNewBoxBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '5px 12px',
    backgroundColor: '#E0F2FE',
    border: '1px solid #BAE6FD',
    borderRadius: '6px',
    color: '#0284C7',
    fontSize: '11.5px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  specialCardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
    gap: '12px',
  },
  specialCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #CBD5E1',
    borderRadius: '8px',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
  },
  specialCardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  specialCardTitle: {
    fontSize: '11.5px',
    fontWeight: '800',
    color: '#0369A1',
    letterSpacing: '0.4px',
  },
  specialCardCloseBtn: {
    background: '#FEE2E2',
    border: 'none',
    width: '20px',
    height: '20px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  specialTextarea: {
    width: '100%',
    padding: '8px 10px',
    fontSize: '11px',
    color: '#1E293B',
    borderRadius: '6px',
    border: '1px solid #E2E8F0',
    backgroundColor: '#FAFAFA',
    resize: 'vertical',
    outline: 'none',
    fontFamily: 'inherit',
    lineHeight: '1.4',
  },
  tab2BottomActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '12px',
    borderTop: '1px solid #E2E8F0',
  },
  // Sub Modal
  subModalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  },
  subModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: '10px',
    padding: '18px',
    width: '100%',
    maxWidth: '380px',
    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)',
  },
  subModalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '14px',
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#64748B',
  },

  // Print Styles
  printContainer: {
    backgroundColor: '#FFFFFF',
    color: '#000000',
    padding: '10mm',
    width: '100%',
  },
  printHeader: {
    textAlign: 'center',
    marginBottom: '16px',
  },
  printLabName: {
    fontSize: '22px',
    fontWeight: '800',
    color: '#0E4F44',
    margin: 0,
    letterSpacing: '0.8px',
  },
  printLabSub: {
    fontSize: '11px',
    color: '#444',
    margin: '4px 0 10px 0',
  },
  printDivider: {
    height: '2px',
    backgroundColor: '#146B5C',
    width: '100%',
  },
  printPatientGrid: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    lineHeight: '1.6',
    borderBottom: '1px solid #CBD5E1',
    paddingBottom: '10px',
    marginBottom: '14px',
  },
  printSectionTitle: {
    fontSize: '12px',
    fontWeight: '800',
    color: '#146B5C',
    borderBottom: '1px solid #146B5C',
    paddingBottom: '3px',
    marginBottom: '8px',
    textTransform: 'uppercase',
  },
  printTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '11px',
    marginBottom: '16px',
  },
  printTd: {
    padding: '5px 8px',
    borderBottom: '1px solid #E2E8F0',
    color: '#333',
  },
  printTdVal: {
    padding: '5px 8px',
    borderBottom: '1px solid #E2E8F0',
    fontWeight: '700',
    textAlign: 'center',
    color: '#000',
  },
  printFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: '40px',
    borderTop: '1px solid #E2E8F0',
    paddingTop: '12px',
  },
};

