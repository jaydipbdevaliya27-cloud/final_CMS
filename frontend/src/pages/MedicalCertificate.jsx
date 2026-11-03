import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { certificateAPI, patientAPI, masterDataAPI } from '../services/api';
import {
  Award,
  Printer,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCcw,
  ShieldCheck,
  Eye,
  Trash2,
  X,
  Edit3,
  Calendar,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export const MedicalCertificate = () => {
  const { doctor } = useAuth();

  // State: Core Form
  const [nextCertId, setNextCertId] = useState('CERT-2026-0001');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('fitness');

  // Patient Registration & Datalist Validation
  const [registeredPatients, setRegisteredPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientInput, setPatientInput] = useState('');
  const [isPatientValid, setIsPatientValid] = useState(false);

  // Form Fields
  const todayStr = new Date().toISOString().split('T')[0];
  const [patientFullName, setPatientFullName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [medicalDiagnosis, setMedicalDiagnosis] = useState('');
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [restDays, setRestDays] = useState(1);
  const [issuePlace, setIssuePlace] = useState('Ahmedabad');
  const [bodyText, setBodyText] = useState('');

  // Doctor Digital Signature
  const [digitalSignature, setDigitalSignature] = useState('Dr. Dhyey Patel');
  const [isCanvasSignature, setIsCanvasSignature] = useState(false);

  // Certificates Registry State
  const [certificates, setCertificates] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Active Certificate for Printing
  const [printCertificate, setPrintCertificate] = useState(null);

  // Modals
  const [showAddTemplateModal, setShowAddTemplateModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  // Add Template Modal State
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateBody, setNewTemplateBody] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState('General');

  // Verify Certificate Modal State
  const [verifyIdInput, setVerifyIdInput] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Signature Canvas Ref
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Auto-calculate Rest Days whenever fromDate or toDate changes
  useEffect(() => {
    if (fromDate && toDate) {
      const start = new Date(fromDate);
      const end = new Date(toDate);
      const diffTime = end - start;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setRestDays(diffDays > 0 ? diffDays : 1);
    }
  }, [fromDate, toDate]);

  // Load Initial Data: Next ID, Templates, Registered Patients, Registry List
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [idRes, tmplRes, patRes, certRes] = await Promise.all([
        certificateAPI.getNextId(),
        certificateAPI.getTemplates(),
        patientAPI.getAll(),
        certificateAPI.getAll('', 1, 10),
      ]);

      if (idRes?.success) setNextCertId(idRes.nextCertId);
      if (tmplRes?.success) {
        setTemplates(tmplRes.data || []);
        if (tmplRes.data && tmplRes.data.length > 0) {
          setSelectedTemplateKey(tmplRes.data[0].templateKey);
          setBodyText(tmplRes.data[0].defaultBodyText);
        }
      }
      if (patRes?.success) setRegisteredPatients(patRes.data || []);
      if (certRes?.success) {
        setCertificates(certRes.data || []);
        setTotalCount(certRes.pagination?.total || certRes.data?.length || 0);
      }
    } catch (err) {
      console.error('Error loading certificate data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Handle Search in Registry
  const fetchCertificatesList = async (search = '') => {
    try {
      const res = await certificateAPI.getAll(search);
      if (res?.success) {
        setCertificates(res.data || []);
        setTotalCount(res.pagination?.total || res.data?.length || 0);
      }
    } catch (err) {
      console.error('Fetch certificates list error:', err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCertificatesList(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle Patient Quick Selection & Validation (STRICT REQUIREMENT)
  const handleSelectPatient = (inputVal) => {
    setPatientInput(inputVal);

    // Look for matching patient by patientId or name in the registered list
    const clean = inputVal.trim().toLowerCase();
    const matched = registeredPatients.find(
      (p) =>
        p.patientId.toLowerCase() === clean ||
        p.name.toLowerCase() === clean ||
        `[${p.patientId.toLowerCase()}] ${p.name.toLowerCase()}`.includes(clean)
    );

    if (matched) {
      setSelectedPatient(matched);
      setIsPatientValid(true);
      setPatientFullName(matched.name);
      setAge(matched.age || '');
      setGender(matched.gender || 'Male');
      setErrorMsg('');
    } else {
      setSelectedPatient(null);
      setIsPatientValid(false);
      setPatientFullName(inputVal);
      if (inputVal.trim().length > 0) {
        setErrorMsg(
          '⚠️ Unregistered Patient: Certificate cannot be issued. Patient must be selected from the registered records.'
        );
      } else {
        setErrorMsg('');
      }
    }
  };

  // Change Template & update body text
  const handleTemplateChange = (tmplKey) => {
    setSelectedTemplateKey(tmplKey);
    const tmpl = templates.find((t) => t.templateKey === tmplKey);
    if (tmpl) {
      setBodyText(tmpl.defaultBodyText);
    }
  };

  // Reset Body Text to Template Default
  const handleResetBodyText = () => {
    const tmpl = templates.find((t) => t.templateKey === selectedTemplateKey);
    if (tmpl) {
      setBodyText(tmpl.defaultBodyText);
    }
  };

  // Insert Token into Body Text
  const insertToken = (token) => {
    setBodyText((prev) => `${prev} ${token}`);
  };

  // Live Interpolation for Preview & Print
  const currentFormattedBody = useMemo(() => {
    let text = bodyText || '';
    const pName = (patientFullName || '{PATIENT_NAME}').toUpperCase();
    const pAge = age ? `${age} Yrs` : '{AGE}';
    const pDiag = medicalDiagnosis ? medicalDiagnosis.trim() : '{DIAGNOSIS}';
    const fDate = fromDate || '{FROM_DATE}';
    const tDate = toDate || '{TO_DATE}';
    const rDays = restDays ? `${restDays}` : '{REST_DAYS}';
    const cId = nextCertId || '{CERT_ID}';
    const cName = doctor?.clinicName || 'Dhyey Main Clinic';

    text = text.replace(/\{PATIENT_NAME\}/g, pName);
    text = text.replace(/\{AGE\}/g, pAge);
    text = text.replace(/\{DIAGNOSIS\}/g, pDiag);
    text = text.replace(/\{FROM_DATE\}/g, fDate);
    text = text.replace(/\{TO_DATE\}/g, tDate);
    text = text.replace(/\{REST_DAYS\}/g, rDays);
    text = text.replace(/\{CERT_ID\}/g, cId);
    text = text.replace(/\{CLINIC_NAME\}/g, cName);

    return text;
  }, [bodyText, patientFullName, age, medicalDiagnosis, fromDate, toDate, restDays, nextCertId, doctor]);

  // Handle Form Submission & Print
  const handleIssueAndPrint = async (e) => {
    if (e) e.preventDefault();

    if (!isPatientValid || !selectedPatient) {
      setErrorMsg(
        '⚠️ Patient Validation Required: Patient must be selected from the registered records list before issuing a certificate.'
      );
      return;
    }

    if (!medicalDiagnosis.trim()) {
      setErrorMsg('Please specify the medical diagnosis.');
      return;
    }

    if (!fromDate || !toDate) {
      setErrorMsg('Please provide both From Date and To Date.');
      return;
    }

    setErrorMsg('');
    setFormSubmitting(true);

    try {
      const activeTmpl = templates.find((t) => t.templateKey === selectedTemplateKey);
      const payload = {
        patientId: selectedPatient.patientId,
        patientName: patientFullName.trim(),
        age,
        gender,
        templateId: selectedTemplateKey,
        templateName: activeTmpl?.name || 'Medical Fitness Certificate',
        medicalDiagnosis: medicalDiagnosis.trim(),
        fromDate,
        toDate,
        restDays,
        issuePlace: issuePlace.trim() || 'Ahmedabad',
        bodyText: currentFormattedBody,
        digitalSignature,
      };

      const res = await certificateAPI.issue(payload);

      if (res?.success) {
        setSuccessMsg(`✓ Certificate ${res.data?.certificateId} issued successfully!`);
        setPrintCertificate(res.data);

        // Refresh ID and List
        loadInitialData();

        // Trigger print after brief UI update
        setTimeout(() => {
          window.print();
        }, 300);
      } else {
        setErrorMsg(res?.message || 'Failed to issue certificate');
      }
    } catch (err) {
      console.error('Issue certificate error:', err);
      setErrorMsg(err?.response?.data?.message || err.message || 'Error issuing certificate');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Clear Form
  const handleClearForm = () => {
    setSelectedPatient(null);
    setPatientInput('');
    setIsPatientValid(false);
    setPatientFullName('');
    setAge('');
    setGender('Male');
    setMedicalDiagnosis('');
    setFromDate(todayStr);
    setToDate(todayStr);
    setRestDays(1);
    handleResetBodyText();
    setErrorMsg('');
    setSuccessMsg('');
  };

  // Direct Print of already issued certificate from registry
  const handlePrintExisting = (cert) => {
    setPrintCertificate(cert);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // Delete Certificate from registry
  const handleDeleteCertificate = async (id, certId) => {
    if (window.confirm(`Are you sure you want to delete certificate ${certId}?`)) {
      try {
        const res = await certificateAPI.delete(id);
        if (res?.success) {
          fetchCertificatesList(searchQuery);
        }
      } catch (err) {
        alert('Failed to delete certificate');
      }
    }
  };

  // Create Custom Template Modal Submit
  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    if (!newTemplateName.trim() || !newTemplateBody.trim()) {
      alert('Please fill in both template name and body text.');
      return;
    }
    try {
      const res = await certificateAPI.createTemplate({
        name: newTemplateName.trim(),
        category: newTemplateCategory.trim() || 'Custom',
        defaultBodyText: newTemplateBody.trim(),
      });
      if (res?.success) {
        setShowAddTemplateModal(false);
        setNewTemplateName('');
        setNewTemplateBody('');
        // Reload templates
        const tmplRes = await certificateAPI.getTemplates();
        if (tmplRes?.success) {
          setTemplates(tmplRes.data);
          setSelectedTemplateKey(res.data.templateKey);
          setBodyText(res.data.defaultBodyText);
        }
      }
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to create template');
    }
  };

  // Verify Certificate Modal Submit
  const handleVerifyCert = async (e) => {
    if (e) e.preventDefault();
    if (!verifyIdInput.trim()) return;
    setIsVerifying(true);
    setVerificationResult(null);
    try {
      const res = await certificateAPI.verify(verifyIdInput.trim());
      setVerificationResult(res);
    } catch (err) {
      setVerificationResult({
        success: false,
        isVerified: false,
        message: err?.response?.data?.message || 'Certificate verification failed.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Canvas Drawing Handlers
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0E4F44';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveCanvasSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setDigitalSignature(dataUrl);
    setIsCanvasSignature(true);
    setShowSignatureModal(false);
  };

  // Certificate active in print view
  const activePrintCert = printCertificate || {
    certificateId: nextCertId,
    patientName: (patientFullName || 'PATIENT NAME').toUpperCase(),
    age: age || '45',
    gender: gender || 'Male',
    templateName: templates.find((t) => t.templateKey === selectedTemplateKey)?.name || 'Medical Fitness Certificate',
    medicalDiagnosis: medicalDiagnosis || 'Acute Viral Pyrexia',
    fromDate,
    toDate,
    restDays,
    issuePlace: issuePlace || 'Ahmedabad',
    bodyText: currentFormattedBody,
    clinicName: doctor?.clinicName || 'Dhyey Main Clinic',
    doctorName: doctor?.name || 'Dr. Dhyey Patel',
    doctorQualifications: doctor?.specialization || 'Consulting Physician',
    doctorRegNo: 'G-14285',
    issueDate: todayStr,
    digitalSignature,
  };

  return (
    <div style={styles.container}>
      {/* 1. TOP HEADER BAR */}
      <div style={styles.topBar} className="no-print">
        <div style={styles.headerLeft}>
          <div style={styles.headerIconWrap}>
            <Award size={22} color="#146B5C" />
          </div>
          <div>
            <h2 style={styles.pageTitle}>Medical Fitness & Leave Certificates</h2>
            <p style={styles.pageSubtitle}>
              Issue official verifiable medical certificates with auto generated unique ID and custom templates
            </p>
          </div>
        </div>

        <div style={styles.headerRight}>
          {/* Next Cert ID Badge */}
          <div style={styles.nextCertBadge}>
            <span style={styles.nextCertLabel}>NEXT CERT ID:</span>
            <span style={styles.nextCertVal}>{nextCertId}</span>
          </div>

          {/* Add Digital Signature */}
          <button
            onClick={() => setShowSignatureModal(true)}
            style={styles.actionBtnOutline}
            title="Configure Digital Signature"
          >
            <Edit3 size={14} color="#146B5C" />
            <span>+ Add Digital Signature</span>
          </button>

          {/* Add Template */}
          <button
            onClick={() => setShowAddTemplateModal(true)}
            style={styles.actionBtnPrimary}
            title="Create Custom Certificate Template"
          >
            <Plus size={14} color="#FFFFFF" />
            <span>+ Add Template</span>
          </button>

          {/* Verify Certificate */}
          <button
            onClick={() => {
              setShowVerifyModal(true);
              setVerificationResult(null);
              setVerifyIdInput('');
            }}
            style={styles.actionBtnOutline}
            title="Verify Certificate Authenticity"
          >
            <ShieldCheck size={14} color="#146B5C" />
            <span>Verify Certificate</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN SPLIT SECTION: FORM (LEFT) + LIVE PREVIEW (RIGHT) */}
      <div style={styles.mainSplit} className="no-print">
        {/* LEFT PANE: CERTIFICATE ISSUE FORM */}
        <div style={styles.formPane}>
          <div style={styles.paneHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileText size={16} color="var(--primary)" />
              <h3 style={styles.paneTitle}>Issue Medical Certificate</h3>
            </div>
            <span style={styles.paneCertBadge}>Unique ID: {nextCertId}</span>
          </div>

          {/* Dynamic Clinic Header Banner */}
          <div style={styles.clinicBanner}>
            <span style={{ fontSize: '11px', color: 'var(--primary-dark)', fontWeight: '600' }}>
              {doctor?.clinicName || 'Dhyey Main Clinic'} &bull; Shop No. 1, Mahavir Heights, New Kosad Road, Amroli, Surat
            </span>
            <span style={styles.clinicHeaderTag}>Dynamic Clinic Header</span>
          </div>

          {/* Error & Success Messages */}
          {errorMsg && (
            <div style={styles.errorAlert}>
              <AlertCircle size={15} color="var(--danger)" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '11px', fontWeight: '500' }}>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div style={styles.successAlert}>
              <CheckCircle2 size={15} color="#15803D" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '11px', fontWeight: '500' }}>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleIssueAndPrint} style={styles.form}>
            {/* Template Selector Row */}
            <div style={styles.formRow}>
              <div style={{ flex: 1 }}>
                <div style={styles.fieldHeader}>
                  <label style={styles.label}>SELECT CERTIFICATE TEMPLATE *</label>
                  <button
                    type="button"
                    onClick={() => setShowAddTemplateModal(true)}
                    style={styles.inlineActionLink}
                  >
                    + New Template
                  </button>
                </div>
                <select
                  value={selectedTemplateKey}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  style={styles.select}
                >
                  {templates.map((t) => (
                    <option key={t.templateKey} value={t.templateKey}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Registered Patient Quick Select & Validation (STRICT USER REQUIREMENT) */}
            <div style={styles.formRow}>
              <div style={{ flex: 1 }}>
                <div style={styles.fieldHeader}>
                  <label style={styles.label}>
                    QUICK SELECT REGISTERED PATIENT <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  {isPatientValid && (
                    <span style={styles.verifiedTag}>
                      <CheckCircle2 size={12} color="#15803D" />
                      <span>Registered (PID: {selectedPatient?.patientId})</span>
                    </span>
                  )}
                </div>

                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    list="registered-patients-datalist"
                    placeholder="Type patient name or ID to auto-fill..."
                    value={patientInput}
                    onChange={(e) => handleSelectPatient(e.target.value)}
                    style={{
                      ...styles.input,
                      borderColor: isPatientValid
                        ? '#15803D'
                        : patientInput.trim()
                        ? 'var(--danger)'
                        : 'var(--border)',
                      backgroundColor: isPatientValid ? '#F0FDF4' : '#FFFFFF',
                    }}
                  />
                  <datalist id="registered-patients-datalist">
                    {registeredPatients.map((p) => (
                      <option key={p.patientId} value={p.name}>
                        PID: {p.patientId} &bull; Age: {p.age || '-'} &bull; Area: {p.area || '-'}
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <label style={styles.label}>PATIENT FULL NAME *</label>
                <input
                  type="text"
                  placeholder="Patient Name"
                  value={patientFullName}
                  onChange={(e) => setPatientFullName(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
            </div>

            {/* Age, Gender, Medical Diagnosis */}
            <div style={styles.formRow}>
              <div style={{ width: '80px' }}>
                <label style={styles.label}>AGE</label>
                <input
                  type="text"
                  placeholder="e.g. 45"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={{ width: '110px' }}>
                <label style={styles.label}>GENDER</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  style={styles.select}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div style={{ flex: 1 }}>
                <label style={styles.label}>MEDICAL DIAGNOSIS *</label>
                <input
                  type="text"
                  placeholder="e.g. Acute Viral Pyrexia, Gastroenteritis..."
                  value={medicalDiagnosis}
                  onChange={(e) => setMedicalDiagnosis(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
            </div>

            {/* From Date, To Date, Rest Days, Issue Place */}
            <div style={styles.formRow}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>FROM DATE *</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>

              <div style={{ flex: 1 }}>
                <label style={styles.label}>TO DATE *</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>

              <div style={{ width: '90px' }}>
                <label style={styles.label}>REST DAYS</label>
                <input
                  type="number"
                  min="1"
                  value={restDays}
                  onChange={(e) => setRestDays(Number(e.target.value))}
                  style={styles.input}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label style={styles.label}>ISSUE PLACE</label>
                <input
                  type="text"
                  placeholder="e.g. Ahmedabad"
                  value={issuePlace}
                  onChange={(e) => setIssuePlace(e.target.value)}
                  style={styles.input}
                />
              </div>
            </div>

            {/* Live Editable Certificate Body Text */}
            <div style={styles.formRow}>
              <div style={{ flex: 1 }}>
                <div style={styles.fieldHeader}>
                  <label style={styles.label}>CERTIFICATE BODY TEXT (LIVE EDITABLE + AUTO-FILLED)</label>
                  <button
                    type="button"
                    onClick={handleResetBodyText}
                    style={styles.inlineActionLink}
                    title="Reset to Template Default Text"
                  >
                    <RotateCcw size={12} />
                    <span>Reset to Template Default</span>
                  </button>
                </div>

                {/* Token Helper Pills */}
                <div style={styles.tokensRow}>
                  {[
                    '{PATIENT_NAME}',
                    '{DIAGNOSIS}',
                    '{FROM_DATE}',
                    '{TO_DATE}',
                    '{REST_DAYS}',
                    '{CERT_ID}',
                    '{CLINIC_NAME}',
                  ].map((tok) => (
                    <button
                      key={tok}
                      type="button"
                      onClick={() => insertToken(tok)}
                      style={styles.tokenPill}
                      title={`Insert ${tok} placeholder`}
                    >
                      +{tok}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={4}
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  style={styles.textarea}
                  required
                />
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={styles.formActions}>
              <button
                type="button"
                onClick={handleClearForm}
                style={styles.clearBtn}
              >
                Clear
              </button>

              <button
                type="submit"
                disabled={formSubmitting || !isPatientValid}
                style={{
                  ...styles.submitBtn,
                  opacity: isPatientValid ? 1 : 0.6,
                  cursor: isPatientValid ? 'pointer' : 'not-allowed',
                }}
                title={
                  !isPatientValid
                    ? 'Patient must be selected from the registered list to issue'
                    : 'Issue & Print Medical Certificate'
                }
              >
                <Printer size={15} />
                <span>
                  {formSubmitting
                    ? 'Issuing Certificate...'
                    : 'Issue & Print Medical Certificate'}
                </span>
                <span style={styles.keyTag}>Enter</span>
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT PANE: LIVE CERTIFICATE PREVIEW (A4 FORMATTED) */}
        <div style={styles.previewPane}>
          <div style={styles.paneHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Eye size={16} color="var(--primary)" />
              <h3 style={styles.paneTitle}>Live Certificate Preview (A4 Formatted)</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => setShowSignatureModal(true)}
                style={styles.miniLink}
              >
                + Add Digital Signature
              </button>
              <span style={styles.verifiableBadge}>Verifiable</span>
            </div>
          </div>

          {/* A4 Paper Certificate Container */}
          <div style={styles.a4Paper}>
            {/* Clinic Brand Header */}
            <div style={styles.a4ClinicHeader}>
              <h2 style={styles.a4ClinicTitle}>
                {doctor?.clinicName || 'Dhyey Main Clinic'}
              </h2>
              <p style={styles.a4ClinicSub}>
                Shop No. 1, Mahavir Heights, New Kosad Road, Amroli, Surat &bull; Ph: 9876543210
              </p>
              <div style={styles.a4DividerLine} />
            </div>

            {/* Certificate Title */}
            <div style={styles.a4TitleWrap}>
              <h3 style={styles.a4CertTitle}>
                <u>
                  {(
                    templates.find((t) => t.templateKey === selectedTemplateKey)?.name ||
                    'MEDICAL FITNESS CERTIFICATE'
                  ).toUpperCase()}
                </u>
              </h3>
            </div>

            {/* Cert ID & Security Badge */}
            <div style={styles.a4MetaBar}>
              <span style={styles.a4CertId}>CERTIFICATE ID: {nextCertId}</span>
              <span style={styles.a4VerifiablePill}>VERIFIABLE</span>
            </div>

            {/* Certificate Body Paragraph */}
            <div style={styles.a4BodyText}>
              {currentFormattedBody}
            </div>

            {/* Bottom Meta & Doctor Sign Off */}
            <div style={styles.a4Footer}>
              <div style={styles.a4FooterLeft}>
                <p style={styles.a4FootItem}>Date of Issue: {todayStr}</p>
                <p style={styles.a4FootItem}>Place of Issue: {issuePlace || 'Ahmedabad'}</p>
                <p style={styles.a4FootSecurity}>Security Verifiable Document</p>
              </div>

              <div style={styles.a4FooterRight}>
                {/* Doctor Signature Rendering */}
                <div style={styles.a4SignatureWrap}>
                  {isCanvasSignature && digitalSignature.startsWith('data:image') ? (
                    <img
                      src={digitalSignature}
                      alt="Doctor Signature"
                      style={{ maxHeight: '42px', objectFit: 'contain' }}
                    />
                  ) : (
                    <span style={styles.cursiveSignature}>
                      {digitalSignature || 'Dr. Dhyey Patel'}
                    </span>
                  )}
                </div>
                <p style={styles.a4DocName}>{doctor?.name || 'Dr. Dhyey Patel'}</p>
                <p style={styles.a4DocRole}>
                  {doctor?.specialization || 'Consulting Physician'} (Reg. No. G-14285)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM SECTION: ISSUED CERTIFICATES REGISTRY */}
      <div style={styles.registryCard} className="no-print">
        <div style={styles.registryHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={16} color="var(--primary)" />
            <h3 style={styles.registryTitle}>Issued Medical Certificates Registry</h3>
            <span style={styles.countBadge}>{totalCount} Issued</span>
          </div>

          <div style={styles.registrySearchWrap}>
            <Search size={14} color="var(--text-muted)" style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search by Certificate ID or Patient Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.registrySearchInput}
            />
          </div>
        </div>

        {/* Table */}
        <div style={styles.tableResponsive}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={styles.th}>CERTIFICATE ID</th>
                <th style={styles.th}>PATIENT NAME</th>
                <th style={styles.th}>TEMPLATE / TYPE</th>
                <th style={styles.th}>MEDICAL DIAGNOSIS</th>
                <th style={styles.th}>VALIDITY PERIOD</th>
                <th style={styles.th}>ISSUE DATE</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>STATUS</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {certificates.length === 0 ? (
                <tr>
                  <td colSpan={8} style={styles.emptyTd}>
                    No issued certificates found in database
                  </td>
                </tr>
              ) : (
                certificates.map((cert, idx) => (
                  <tr key={cert._id || idx} style={idx % 2 === 0 ? styles.trEven : styles.trOdd}>
                    <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: '700' }}>
                      <span style={styles.certIdBadge}>{cert.certificateId}</span>
                    </td>
                    <td style={{ ...styles.td, fontWeight: '600' }}>{cert.patientName}</td>
                    <td style={{ ...styles.td, color: 'var(--text-muted)' }}>{cert.templateName}</td>
                    <td style={{ ...styles.td, fontWeight: '500' }}>{cert.medicalDiagnosis}</td>
                    <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>
                      {cert.fromDate} to {cert.toDate} ({cert.restDays}d)
                    </td>
                    <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>{cert.issueDate}</td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <span style={styles.statusBadge}>{cert.status || 'Issued'}</span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          onClick={() => handlePrintExisting(cert)}
                          style={styles.iconBtnPrint}
                          title="Print this Certificate"
                        >
                          <Printer size={13} />
                          <span>Print</span>
                        </button>
                        <button
                          onClick={() => handleDeleteCertificate(cert._id, cert.certificateId)}
                          style={styles.iconBtnDelete}
                          title="Delete Certificate"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. DEDICATED PRINTABLE LAYOUT (#printable-cert) */}
      <div id="printable-cert" className="print-only" style={styles.printCertContainer}>
        <div style={styles.printInnerBorder}>
          {/* Header */}
          <div style={styles.printClinicHead}>
            <h1 style={styles.printClinicName}>
              {activePrintCert.clinicName || 'DHYEY MAIN CLINIC'}
            </h1>
            <p style={styles.printClinicSub}>
              Shop No. 1, Mahavir Heights, New Kosad Road, Amroli, Surat &bull; Phone: +91 98765 43210
            </p>
            <div style={styles.printDivider} />
          </div>

          {/* Certificate Title */}
          <div style={styles.printTitleWrap}>
            <h2 style={styles.printCertTitle}>
              <u>{activePrintCert.templateName?.toUpperCase() || 'MEDICAL FITNESS CERTIFICATE'}</u>
            </h2>
          </div>

          {/* Meta Bar */}
          <div style={styles.printMetaBar}>
            <span style={styles.printCertId}>
              CERTIFICATE ID: {activePrintCert.certificateId}
            </span>
            <span style={styles.printVerifiedTag}>OFFICIAL VERIFIABLE</span>
          </div>

          {/* Body Paragraph */}
          <div style={styles.printBodyText}>
            {activePrintCert.bodyText}
          </div>

          {/* Signatures & Footer */}
          <div style={styles.printFooter}>
            <div style={styles.printFootLeft}>
              <p><strong>Date of Issue:</strong> {activePrintCert.issueDate || todayStr}</p>
              <p><strong>Place of Issue:</strong> {activePrintCert.issuePlace || 'Ahmedabad'}</p>
              <p style={{ fontSize: '10px', color: '#666', marginTop: 4 }}>
                Security Verifiable Medical Document &bull; Reg: G-14285
              </p>
            </div>

            <div style={styles.printFootRight}>
              <div style={styles.printSigWrap}>
                {activePrintCert.digitalSignature?.startsWith('data:image') ? (
                  <img
                    src={activePrintCert.digitalSignature}
                    alt="Doctor Signature"
                    style={{ maxHeight: '48px', objectFit: 'contain' }}
                  />
                ) : (
                  <span style={styles.printCursiveSig}>
                    {activePrintCert.digitalSignature || 'Dr. Dhyey Patel'}
                  </span>
                )}
              </div>
              <div style={styles.printSignLine} />
              <p style={styles.printDocName}>{activePrintCert.doctorName || 'Dr. Dhyey Patel'}</p>
              <p style={styles.printDocRole}>
                {activePrintCert.doctorQualifications || 'Consulting Physician'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 5. MODAL: ADD CUSTOM TEMPLATE */}
      {showAddTemplateModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Create Custom Certificate Template</h3>
              <button
                onClick={() => setShowAddTemplateModal(false)}
                style={styles.modalCloseBtn}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateTemplate} style={styles.modalForm}>
              <div>
                <label style={styles.label}>TEMPLATE NAME *</label>
                <input
                  type="text"
                  placeholder="e.g. Fitness for Sports / Gym"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>

              <div>
                <label style={styles.label}>CATEGORY</label>
                <input
                  type="text"
                  placeholder="e.g. Fitness, Leave, Travel..."
                  value={newTemplateCategory}
                  onChange={(e) => setNewTemplateCategory(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label}>DEFAULT BODY TEXT *</label>
                <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: 4 }}>
                  Use placeholders: {'{PATIENT_NAME}'}, {'{AGE}'}, {'{DIAGNOSIS}'}, {'{FROM_DATE}'}, {'{TO_DATE}'}, {'{REST_DAYS}'}
                </p>
                <textarea
                  rows={4}
                  placeholder="This is to certify that {PATIENT_NAME}, aged {AGE}..."
                  value={newTemplateBody}
                  onChange={(e) => setNewTemplateBody(e.target.value)}
                  style={styles.textarea}
                  required
                />
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowAddTemplateModal(false)}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button type="submit" style={styles.submitBtn}>
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: VERIFY CERTIFICATE AUTHENTICITY */}
      {showVerifyModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={18} color="var(--primary)" />
                <h3 style={styles.modalTitle}>Verify Certificate Authenticity</h3>
              </div>
              <button
                onClick={() => setShowVerifyModal(false)}
                style={styles.modalCloseBtn}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleVerifyCert} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                type="text"
                placeholder="Enter Certificate ID (e.g. CERT-2026-0001)..."
                value={verifyIdInput}
                onChange={(e) => setVerifyIdInput(e.target.value)}
                style={{ ...styles.input, flex: 1 }}
                required
              />
              <button
                type="submit"
                disabled={isVerifying}
                style={styles.submitBtn}
              >
                <Search size={14} />
                <span>{isVerifying ? 'Verifying...' : 'Verify'}</span>
              </button>
            </form>

            {verificationResult && (
              <div
                style={{
                  ...styles.verificationCard,
                  borderColor: verificationResult.isVerified ? '#15803D' : 'var(--danger)',
                  backgroundColor: verificationResult.isVerified ? '#F0FDF4' : 'var(--danger-soft)',
                }}
              >
                {verificationResult.isVerified ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#15803D', fontWeight: '700' }}>
                      <CheckCircle2 size={18} />
                      <span>OFFICIAL AUTHENTIC CERTIFICATE CONFIRMED</span>
                    </div>
                    <div style={styles.verifyDetails}>
                      <div><strong>Certificate ID:</strong> {verificationResult.certificate.certificateId}</div>
                      <div><strong>Patient:</strong> {verificationResult.certificate.patientName} (PID: {verificationResult.certificate.patientId})</div>
                      <div><strong>Diagnosis:</strong> {verificationResult.certificate.diagnosis}</div>
                      <div><strong>Type:</strong> {verificationResult.certificate.templateName}</div>
                      <div><strong>Validity:</strong> {verificationResult.certificate.validityPeriod}</div>
                      <div><strong>Issued On:</strong> {verificationResult.certificate.issueDate}</div>
                      <div><strong>Practitioner:</strong> {verificationResult.certificate.doctorName}</div>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--danger)', fontWeight: '600' }}>
                    <AlertCircle size={18} />
                    <span>{verificationResult.message}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. MODAL: DIGITAL SIGNATURE CONFIGURATION */}
      {showSignatureModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Edit3 size={18} color="var(--primary)" />
                <h3 style={styles.modalTitle}>Doctor Digital Signature</h3>
              </div>
              <button
                onClick={() => setShowSignatureModal(false)}
                style={styles.modalCloseBtn}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 8 }}>
              Draw your digital signature on the pad below or select cursive signature style:
            </p>

            <div style={styles.canvasContainer}>
              <canvas
                ref={canvasRef}
                width={360}
                height={120}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                style={styles.canvas}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
              <button
                type="button"
                onClick={clearCanvas}
                style={styles.cancelBtn}
              >
                Clear Pad
              </button>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    setDigitalSignature('Dr. Dhyey Patel');
                    setIsCanvasSignature(false);
                    setShowSignatureModal(false);
                  }}
                  style={styles.cancelBtn}
                >
                  Use Cursive Text
                </button>
                <button
                  type="button"
                  onClick={saveCanvasSignature}
                  style={styles.submitBtn}
                >
                  Save Drawn Signature
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    height: '100%',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: '6px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
    flexWrap: 'wrap',
    gap: '8px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  headerIconWrap: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    backgroundColor: 'var(--primary-soft)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--text)',
    margin: 0,
  },
  pageSubtitle: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    margin: 0,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  nextCertBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '6px',
    border: '1px dashed #3B82F6',
    backgroundColor: '#EFF6FF',
    fontSize: '11px',
  },
  nextCertLabel: {
    fontWeight: '600',
    color: '#1E40AF',
  },
  nextCertVal: {
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#1E3A8A',
  },
  actionBtnOutline: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '5px 10px',
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--primary)',
    cursor: 'pointer',
  },
  actionBtnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '5px 12px',
    backgroundColor: '#146B5C',
    border: 'none',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#FFFFFF',
    cursor: 'pointer',
  },
  mainSplit: {
    display: 'grid',
    gridTemplateColumns: '1.05fr 0.95fr',
    gap: '10px',
    flex: 1,
    height: '100%',
    minHeight: 0,
  },
  formPane: {
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    height: '100%',
    minHeight: 0,
    overflowY: 'auto',
  },
  paneHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid var(--border)',
    paddingBottom: '6px',
  },
  paneTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text)',
    margin: 0,
  },
  paneCertBadge: {
    fontSize: '10px',
    fontFamily: 'monospace',
    fontWeight: '700',
    backgroundColor: 'var(--primary-soft)',
    color: 'var(--primary-dark)',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  clinicBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'var(--bg)',
    padding: '4px 8px',
    borderRadius: '5px',
    border: '1px solid var(--border)',
  },
  clinicHeaderTag: {
    fontSize: '9px',
    fontWeight: '700',
    color: 'var(--primary)',
    textTransform: 'uppercase',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'var(--danger-soft)',
    color: 'var(--danger)',
    padding: '5px 8px',
    borderRadius: '5px',
    border: '1px solid var(--danger)',
  },
  successAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#DCFCE7',
    color: '#15803D',
    padding: '5px 8px',
    borderRadius: '5px',
    border: '1px solid #16A34A',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '7px',
  },
  formRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
  },
  fieldHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '2px',
  },
  label: {
    fontSize: '10px',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  verifiedTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '10px',
    fontWeight: '600',
    color: '#15803D',
  },
  inlineActionLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '10px',
    fontWeight: '600',
    color: 'var(--primary)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },
  input: {
    width: '100%',
    padding: '5px 8px',
    borderRadius: '5px',
    border: '1px solid var(--border)',
    fontSize: '12px',
    color: 'var(--text)',
    outline: 'none',
  },
  select: {
    width: '100%',
    padding: '5px 8px',
    borderRadius: '5px',
    border: '1px solid var(--border)',
    fontSize: '12px',
    color: 'var(--text)',
    backgroundColor: '#FFFFFF',
    outline: 'none',
    cursor: 'pointer',
  },
  tokensRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexWrap: 'wrap',
    marginBottom: '4px',
  },
  tokenPill: {
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '9px',
    fontFamily: 'monospace',
    fontWeight: '600',
    backgroundColor: 'var(--surface-alt)',
    border: '1px solid var(--primary-soft)',
    color: 'var(--primary-dark)',
    cursor: 'pointer',
  },
  textarea: {
    width: '100%',
    padding: '6px 8px',
    borderRadius: '5px',
    border: '1px solid var(--border)',
    fontSize: '11px',
    color: 'var(--text)',
    fontFamily: 'inherit',
    lineHeight: '1.4',
    resize: 'vertical',
  },
  formActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '4px',
  },
  clearBtn: {
    padding: '5px 12px',
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border)',
    borderRadius: '5px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  submitBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 16px',
    backgroundColor: '#146B5C',
    border: 'none',
    borderRadius: '5px',
    fontSize: '12px',
    fontWeight: '700',
    color: '#FFFFFF',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(20, 107, 92, 0.2)',
  },
  keyTag: {
    padding: '1px 4px',
    borderRadius: '3px',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    fontSize: '9px',
  },
  previewPane: {
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    height: '100%',
    minHeight: 0,
    overflowY: 'auto',
  },
  miniLink: {
    fontSize: '10px',
    fontWeight: '600',
    color: 'var(--primary)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  verifiableBadge: {
    fontSize: '9px',
    fontWeight: '700',
    color: '#15803D',
    border: '1px solid #16A34A',
    borderRadius: '10px',
    padding: '1px 6px',
    textTransform: 'uppercase',
  },
  a4Paper: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
    flex: 1,
    minHeight: '290px',
  },
  a4ClinicHeader: {
    textAlign: 'center',
    marginBottom: '8px',
  },
  a4ClinicTitle: {
    fontSize: '15px',
    fontWeight: '800',
    color: '#0E4F44',
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  a4ClinicSub: {
    fontSize: '9px',
    color: '#666666',
    margin: '2px 0 6px 0',
  },
  a4DividerLine: {
    height: '1.5px',
    backgroundColor: '#146B5C',
    width: '100%',
  },
  a4TitleWrap: {
    textAlign: 'center',
    margin: '8px 0',
  },
  a4CertTitle: {
    fontSize: '12px',
    fontWeight: '800',
    color: '#111827',
    margin: 0,
    letterSpacing: '0.5px',
  },
  a4MetaBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  a4CertId: {
    fontSize: '9px',
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#111827',
  },
  a4VerifiablePill: {
    fontSize: '8px',
    fontWeight: '800',
    color: '#15803D',
    border: '1px solid #16A34A',
    padding: '1px 5px',
    borderRadius: '2px',
  },
  a4BodyText: {
    fontSize: '11px',
    lineHeight: '1.5',
    color: '#1F2937',
    flex: 1,
    textAlign: 'justify',
  },
  a4Footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTop: '1px solid #E5E7EB',
    paddingTop: '8px',
    marginTop: '10px',
  },
  a4FooterLeft: {
    fontSize: '9px',
    color: '#4B5563',
    lineHeight: '1.4',
  },
  a4FootItem: {
    margin: 0,
  },
  a4FootSecurity: {
    margin: '2px 0 0 0',
    fontSize: '8px',
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  a4FooterRight: {
    textAlign: 'right',
  },
  a4SignatureWrap: {
    height: '36px',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    marginBottom: '2px',
  },
  cursiveSignature: {
    fontFamily: '"Brush Script MT", cursive, sans-serif',
    fontSize: '18px',
    color: '#0E4F44',
  },
  a4DocName: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#111827',
    margin: 0,
  },
  a4DocRole: {
    fontSize: '8px',
    color: '#6B7280',
    margin: 0,
  },
  registryCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    overflow: 'hidden',
    marginTop: '2px',
  },
  registryHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 12px',
    borderBottom: '1px solid var(--border)',
    backgroundColor: 'var(--bg)',
  },
  registryTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text)',
    margin: 0,
  },
  countBadge: {
    fontSize: '10px',
    fontWeight: '600',
    backgroundColor: 'var(--primary-soft)',
    color: 'var(--primary-dark)',
    padding: '1px 6px',
    borderRadius: '10px',
  },
  registrySearchWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '8px',
    pointerEvents: 'none',
  },
  registrySearchInput: {
    padding: '4px 8px 4px 26px',
    borderRadius: '5px',
    border: '1px solid var(--border)',
    fontSize: '11px',
    width: '260px',
    backgroundColor: '#FFFFFF',
  },
  tableResponsive: {
    overflowX: 'auto',
    maxHeight: '190px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '11px',
  },
  theadRow: {
    backgroundColor: '#F9FAFB',
    borderBottom: '1px solid var(--border)',
  },
  th: {
    padding: '6px 8px',
    textAlign: 'left',
    fontSize: '10px',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
    whiteSpace: 'nowrap',
  },
  trEven: {
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid var(--border)',
  },
  trOdd: {
    backgroundColor: '#FDFEFE',
    borderBottom: '1px solid var(--border)',
  },
  td: {
    padding: '5px 8px',
    color: 'var(--text)',
  },
  certIdBadge: {
    backgroundColor: 'var(--surface-alt)',
    color: 'var(--primary-dark)',
    padding: '2px 5px',
    borderRadius: '3px',
    fontSize: '10px',
  },
  statusBadge: {
    backgroundColor: '#DCFCE7',
    color: '#15803D',
    padding: '2px 6px',
    borderRadius: '8px',
    fontSize: '9px',
    fontWeight: '700',
  },
  iconBtnPrint: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    padding: '2px 6px',
    backgroundColor: 'var(--primary-soft)',
    border: 'none',
    borderRadius: '3px',
    fontSize: '10px',
    fontWeight: '600',
    color: 'var(--primary-dark)',
    cursor: 'pointer',
  },
  iconBtnDelete: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 5px',
    backgroundColor: 'var(--danger-soft)',
    border: 'none',
    borderRadius: '3px',
    color: 'var(--danger)',
    cursor: 'pointer',
  },
  emptyTd: {
    padding: '20px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '11px',
  },

  // Print Styles
  printCertContainer: {
    backgroundColor: '#FFFFFF',
    color: '#000000',
    width: '100%',
  },
  printInnerBorder: {
    border: '2px solid #146B5C',
    borderRadius: '8px',
    padding: '24px 28px',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '800px',
  },
  printClinicHead: {
    textAlign: 'center',
    marginBottom: '16px',
  },
  printClinicName: {
    fontSize: '26px',
    fontWeight: '800',
    color: '#0E4F44',
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
  },
  printClinicSub: {
    fontSize: '12px',
    color: '#444444',
    margin: '4px 0 10px 0',
  },
  printDivider: {
    height: '2px',
    backgroundColor: '#146B5C',
    width: '100%',
  },
  printTitleWrap: {
    textAlign: 'center',
    margin: '20px 0',
  },
  printCertTitle: {
    fontSize: '18px',
    fontWeight: '800',
    color: '#111827',
    letterSpacing: '0.8px',
  },
  printMetaBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    borderBottom: '1px solid #E5E7EB',
    paddingBottom: '6px',
  },
  printCertId: {
    fontSize: '12px',
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  printVerifiedTag: {
    fontSize: '10px',
    fontWeight: '800',
    color: '#15803D',
    border: '1px solid #16A34A',
    padding: '2px 8px',
    borderRadius: '3px',
  },
  printBodyText: {
    fontSize: '14px',
    lineHeight: '1.9',
    color: '#1F2937',
    textAlign: 'justify',
    flex: 1,
    marginBottom: '40px',
  },
  printFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTop: '1px solid #D1D5DB',
    paddingTop: '16px',
  },
  printFootLeft: {
    fontSize: '12px',
    lineHeight: '1.6',
    color: '#374151',
  },
  printFootRight: {
    textAlign: 'right',
  },
  printSigWrap: {
    height: '50px',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  printCursiveSig: {
    fontFamily: '"Brush Script MT", cursive, sans-serif',
    fontSize: '26px',
    color: '#0E4F44',
  },
  printSignLine: {
    width: '190px',
    borderBottom: '1.5px solid #111827',
    margin: '4px 0 6px 0',
  },
  printDocName: {
    fontSize: '13px',
    fontWeight: '800',
    color: '#111827',
    margin: 0,
  },
  printDocRole: {
    fontSize: '11px',
    color: '#4B5563',
    margin: 0,
  },

  // Modal Styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    padding: '16px',
    width: '440px',
    maxWidth: '90%',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid var(--border)',
    paddingBottom: '8px',
    marginBottom: '12px',
  },
  modalTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--text)',
    margin: 0,
  },
  modalCloseBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '6px',
  },
  cancelBtn: {
    padding: '5px 12px',
    borderRadius: '5px',
    border: '1px solid var(--border)',
    backgroundColor: '#FFFFFF',
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  verificationCard: {
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '11px',
  },
  verifyDetails: {
    marginTop: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    color: '#1F2937',
  },
  canvasContainer: {
    border: '1px solid var(--border)',
    borderRadius: '6px',
    backgroundColor: '#F9FAFB',
    display: 'flex',
    justifyContent: 'center',
  },
  canvas: {
    cursor: 'crosshair',
  },
};

