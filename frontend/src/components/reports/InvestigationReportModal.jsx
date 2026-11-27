import React, { useState, useEffect } from 'react';
import { labReportAPI } from '../../services/api';
import {
  LAB_COLUMNS,
  LAB_FINDING_BOXES,
  evaluateLabValue,
  isLabStatusAbnormal,
  extractFlatLabValues,
  extractFlatLabFindings,
} from '../../utils/labReportConfig';
import { Check, Printer, RotateCcw, X, FlaskConical } from 'lucide-react';

export const InvestigationReportModal = ({
  isOpen,
  onClose,
  patient,
  doctor,
  initialReport = null,
  onReportSaved,
}) => {
  const todayStr = () => {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  const [values, setValues] = useState(() => extractFlatLabValues(initialReport));
  const [findings, setFindings] = useState(() => extractFlatLabFindings(initialReport));
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });

  // Sync whenever modal opens or initialReport changes
  useEffect(() => {
    if (isOpen) {
      setValues(extractFlatLabValues(initialReport));
      setFindings(extractFlatLabFindings(initialReport));
      setStatusMsg({ text: '', type: '' });
    }
  }, [isOpen, initialReport]);

  if (!isOpen) return null;

  const handleValueChange = (key, val) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleFindingChange = (key, val) => {
    setFindings((prev) => ({ ...prev, [key]: val }));
  };

  const handleReset = () => {
    setValues(extractFlatLabValues({}));
    setFindings(extractFlatLabFindings({}));
    setStatusMsg({ text: 'Cleared all fields.', type: 'info' });
  };

  // Build backward-compatible nested sections alongside unified values/findings
  const buildPayload = () => {
    const hematology = {
      hb: values.hb || '',
      rbc: values.rbc || '',
      wbc: values.wbc || '',
      platelet: values.platelet || '',
      esr: values.esr || '',
    };
    const bloodGlucoseRenal = {
      rbs: values.rbs || '',
      fbs: values.fbs || '',
      ppbs: values.pp2bs || '',
      screatinin: values.screatinin || '',
      vitb12: values.vitb12 || '',
    };
    const differentialWbc = {
      bandCell: '',
      neutrophils: values.neutrophils || '',
      lymphocytes: values.lymphocytes || '',
      eosinophils: values.eosinophils || '',
      monocytes: values.monocytes || '',
      basophils: values.basophils || '',
      parasites: values.mp || '',
    };
    const thyroid = {
      t3: values.t3 || '',
      t4: values.t4 || '',
      tsh: values.tsh || '',
    };
    const specialFindings = LAB_FINDING_BOXES.map((b) => ({
      key: b.legacyKey || b.key,
      title: b.label.replace(':', ''),
      notes: findings[b.key] || '',
    }));

    return {
      patientId: patient?.patientId || initialReport?.patientId || 'TEMP-PID',
      familyId: patient?.familyId || initialReport?.familyId || '',
      patientName: initialReport?.patientName || patient?.name || patient?.fullName || 'Patient',
      familyName: initialReport?.familyName || patient?.familyHeadName || patient?.familyName || patient?.name || '',
      labName: initialReport?.labName || 'Clinic Lab Investigation',
      doctorName: initialReport?.doctorName || doctor?.name || 'Dr. Chirag Paghdal',
      caseNo: initialReport?.caseNo || patient?.patientId || '',
      entryDate: initialReport?.entryDate || todayStr(),
      values,
      findings,
      hematology,
      bloodGlucoseRenal,
      differentialWbc,
      thyroid,
      specialFindings,
    };
  };

  const handleSave = async () => {
    setSaving(true);
    setStatusMsg({ text: '', type: '' });
    const payload = buildPayload();

    try {
      const res = await labReportAPI.create(payload);
      const savedData = res?.data || payload;
      setStatusMsg({ text: 'Lab investigation details saved!', type: 'success' });
      if (onReportSaved) {
        onReportSaved(savedData);
      }
      setTimeout(() => {
        onClose();
      }, 300);
    } catch (err) {
      console.error('Save report error:', err);
      if (onReportSaved) {
        onReportSaved(payload);
      }
      setStatusMsg({ text: 'Lab details attached to case!', type: 'success' });
      setTimeout(() => {
        onClose();
      }, 300);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getInputStyle = (status) => {
    if (isLabStatusAbnormal(status)) {
      return {
        border: '1.5px solid #DC2626',
        backgroundColor: '#FEE2E2',
        color: '#991B1B',
        fontWeight: 800,
        boxShadow: '0 0 0 1px rgba(220, 38, 38, 0.2)',
      };
    }
    if (status === 'normal') {
      return {
        border: '1px solid #16A34A',
        backgroundColor: '#F0FDF4',
        color: '#166534',
        fontWeight: 600,
      };
    }
    return {
      border: '1px solid #94A3B8',
      backgroundColor: '#FFFFFF',
      color: '#0F172A',
      fontWeight: 500,
    };
  };

  const renderStatusTag = (status) => {
    if (status === 'danger') {
      return (
        <span style={styles.dangerTag} title="Manually flagged borderline/danger (*)">
          * HIGHLIGHT
        </span>
      );
    }
    if (status === 'high') {
      return (
        <span style={styles.dangerTag} title="Above normal range">
          HIGH
        </span>
      );
    }
    if (status === 'low') {
      return (
        <span style={styles.dangerTag} title="Below normal range">
          LOW
        </span>
      );
    }
    return null;
  };

  return (
    <div style={styles.overlay} className="lab-modal-overlay" onClick={onClose}>
      <div
        id="printable-lab-report"
        style={styles.modal}
        className="lab-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP BLUE TITLE BAR (MATCHING REFERENCE IMAGE) */}
        <div style={styles.topBlueBar} className="no-print">
          <div style={styles.topTitleWrap}>
            <FlaskConical size={16} color="#FFFFFF" />
            <span style={styles.topTitleText}>Lab Investigation Details</span>
            {(patient?.name || initialReport?.patientName) && (
              <span style={styles.patientPill}>
                {patient?.name || initialReport?.patientName}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={styles.topCloseBtn}
            title="Close (Esc)"
          >
            <X size={18} color="#FFFFFF" />
          </button>
        </div>

        {/* PRINT-ONLY HEADER */}
        <div style={styles.printOnlyHeader} className="print-only-lab-header">
          <strong style={{ fontSize: '15px' }}>Lab Investigation Details</strong>
          <span>
            Patient: <strong>{patient?.name || initialReport?.patientName || '-'}</strong> | Date:{' '}
            {initialReport?.entryDate || todayStr()}
          </span>
        </div>

        {/* 3-COLUMN LAB PARAMETERS GRID */}
        <div style={styles.bodyWrap}>
          <div style={styles.threeColGrid}>
            {LAB_COLUMNS.map((colTests, colIdx) => (
              <div key={colIdx} style={styles.colCard}>
                <table style={styles.colTable}>
                  <thead>
                    <tr style={styles.colTheadRow}>
                      <th style={{ ...styles.colTh, width: '34%', textAlign: 'left' }}>Test</th>
                      <th style={{ ...styles.colTh, width: '44%', textAlign: 'left' }}>Patient&apos;s Value</th>
                      <th style={{ ...styles.colTh, width: '22%', textAlign: 'left' }}>Normal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {colTests.map((test) => {
                      const rawVal = values[test.key] || '';
                      const status = evaluateLabValue(test, rawVal);
                      const abnormal = isLabStatusAbnormal(status);

                      return (
                        <tr
                          key={test.key}
                          style={{
                            ...styles.colTr,
                            backgroundColor: abnormal ? '#FFF5F5' : '#FFFFFF',
                          }}
                        >
                          <td
                            style={{
                              ...styles.colTdLabel,
                              color: abnormal ? '#B91C1C' : '#0F172A',
                            }}
                          >
                            {test.label}
                          </td>
                          <td style={styles.colTdInput}>
                            <div style={styles.inputWithBadgeWrap}>
                              <input
                                type="text"
                                value={rawVal}
                                onChange={(e) => handleValueChange(test.key, e.target.value)}
                                style={{
                                  ...styles.valInput,
                                  ...getInputStyle(status),
                                }}
                                placeholder=""
                              />
                              {renderStatusTag(status)}
                            </div>
                          </td>
                          <td style={styles.colTdNormal}>{test.normal}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* BOTTOM 5 TEXTAREA BOXES */}
          <div style={styles.bottomFiveGrid}>
            {LAB_FINDING_BOXES.map((box) => (
              <div key={box.key} style={styles.findingBoxCard}>
                <label style={styles.findingLabel}>{box.label}</label>
                <textarea
                  value={findings[box.key] || ''}
                  onChange={(e) => handleFindingChange(box.key, e.target.value)}
                  style={styles.findingTextarea}
                  rows={3}
                />
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER ACTION BAR */}
        <div style={styles.footerBar} className="no-print">
          <div style={styles.footerLeft}>
            <span style={styles.tipText}>
              Out-of-range values highlight automatically. Add <strong>*</strong> after borderline values (e.g. <strong>5.4*</strong>) to highlight as danger.
            </span>
            {statusMsg.text && (
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: statusMsg.type === 'success' ? '#15803D' : '#1D4ED8',
                }}
              >
                {statusMsg.text}
              </span>
            )}
          </div>

          <div style={styles.footerActions}>
            <button
              type="button"
              onClick={handleReset}
              style={styles.resetBtn}
              title="Clear all entered values"
            >
              <RotateCcw size={13} />
              <span>Clear</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              style={styles.printBtn}
              title="Print Lab Investigation Details"
            >
              <Printer size={13} />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={styles.doneBtn}
            >
              <Check size={15} strokeWidth={2.8} />
              <span>{saving ? 'Saving...' : 'Done'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelBtn}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '10px',
  },
  modal: {
    width: '98vw',
    maxWidth: '1380px',
    maxHeight: '95vh',
    backgroundColor: '#F1F5F9',
    borderRadius: '6px',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: '1px solid #94A3B8',
  },
  topBlueBar: {
    backgroundColor: '#1565C0',
    color: '#FFFFFF',
    padding: '8px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  topTitleWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  topTitleText: {
    fontSize: '15px',
    fontWeight: 700,
    letterSpacing: '0.2px',
  },
  patientPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: '#FFFFFF',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    marginLeft: '6px',
  },
  topCloseBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  printOnlyHeader: {
    display: 'none',
  },
  bodyWrap: {
    padding: '8px 10px',
    overflowY: 'auto',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  threeColGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '8px',
    alignItems: 'start',
  },
  colCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #CBD5E1',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  colTable: {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
  },
  colTheadRow: {
    backgroundColor: '#F8FAFC',
    borderBottom: '1px solid #CBD5E1',
  },
  colTh: {
    padding: '6px 8px',
    fontSize: '12px',
    fontWeight: 700,
    color: '#0F172A',
  },
  colTr: {
    borderBottom: '1px solid #E2E8F0',
  },
  colTdLabel: {
    padding: '4px 8px',
    fontSize: '12px',
    fontWeight: 700,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  colTdInput: {
    padding: '3px 6px',
  },
  inputWithBadgeWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  valInput: {
    width: '100%',
    minWidth: 0,
    height: '26px',
    padding: '2px 7px',
    fontSize: '12.5px',
    borderRadius: '4px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  dangerTag: {
    fontSize: '9px',
    fontWeight: 800,
    color: '#DC2626',
    backgroundColor: '#FEE2E2',
    border: '1px solid #FCA5A5',
    padding: '1px 4px',
    borderRadius: '3px',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  colTdNormal: {
    padding: '4px 6px',
    fontSize: '11px',
    color: '#64748B',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
  bottomFiveGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
    gap: '8px',
  },
  findingBoxCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #CBD5E1',
    borderRadius: '4px',
    padding: '6px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  findingLabel: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#1E3A8A',
  },
  findingTextarea: {
    width: '100%',
    minHeight: '64px',
    border: '1px solid #94A3B8',
    borderRadius: '4px',
    padding: '5px 7px',
    fontSize: '12px',
    color: '#0F172A',
    resize: 'vertical',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  footerBar: {
    backgroundColor: '#F8FAFC',
    borderTop: '1px solid #CBD5E1',
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexShrink: 0,
  },
  footerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  tipText: {
    fontSize: '11.5px',
    color: '#475569',
  },
  footerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  resetBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '6px 12px',
    borderRadius: '4px',
    border: '1px solid #CBD5E1',
    backgroundColor: '#FFFFFF',
    color: '#334155',
    fontSize: '12.5px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  printBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '6px 12px',
    borderRadius: '4px',
    border: '1px solid #93C5FD',
    backgroundColor: '#EFF6FF',
    color: '#1D4ED8',
    fontSize: '12.5px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  doneBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '6px 14px',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#15803D',
    color: '#FFFFFF',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  cancelBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px 14px',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#DC2626',
    color: '#FFFFFF',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
  },
};
