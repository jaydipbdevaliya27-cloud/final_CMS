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
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';

export const MedicalCertificate = () => {
  const { doctor } = useAuth();

  // Active View Tab: 'studio' (Issue & Live Preview) vs 'registry' (All Issued Records)
  const [activeTab, setActiveTab] = useState('studio');

  // State: Core Form
  const [nextCertId, setNextCertId] = useState('CERT-2026-0001');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('fitness');

  // Patient Registration & Datalist Validation
  const [registeredPatients, setRegisteredPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientInput, setPatientInput] = useState('');
  const [isPatientValid, setIsPatientValid] = useState(false);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [patientHighlightIndex, setPatientHighlightIndex] = useState(0);
  const certPatientWrapRef = useRef(null);

  // Close patient dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (certPatientWrapRef.current && !certPatientWrapRef.current.contains(e.target)) {
        setShowPatientDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
  const [digitalSignature, setDigitalSignature] = useState('Dr. Chirag Paghdal');
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

  // Filtered patients for quick search
  const filteredPatients = registeredPatients.filter((p) => {
    if (!patientInput.trim()) return false;
    const clean = patientInput.trim().toLowerCase();
    return (
      p.name?.toLowerCase().includes(clean) ||
      p.patientId?.toLowerCase().includes(clean) ||
      (p.phone && p.phone.includes(clean))
    );
  });

  const handlePickPatient = (p) => {
    if (!p) return;
    setPatientInput(p.name);
    setSelectedPatient(p);
    setIsPatientValid(true);
    setPatientFullName(p.name);
    if (p.age) setAge(p.age);
    if (p.gender) setGender(p.gender);
    setShowPatientDropdown(false);
    setErrorMsg('');
  };

  const handlePatientInputChange = (val) => {
    setPatientInput(val);
    setPatientHighlightIndex(0); // Automatically select first match
    if (!val || !val.trim()) {
      setSelectedPatient(null);
      setIsPatientValid(false);
      setShowPatientDropdown(false);
      return;
    }
    setShowPatientDropdown(true);

    const clean = val.trim().toLowerCase();
    const matched = registeredPatients.find(
      (p) => p.patientId?.toLowerCase() === clean || p.name?.toLowerCase() === clean
    );
    if (matched) {
      setSelectedPatient(matched);
      setIsPatientValid(true);
      setPatientFullName(matched.name);
      if (matched.age) setAge(matched.age);
      if (matched.gender) setGender(matched.gender);
    } else {
      setSelectedPatient(null);
      setIsPatientValid(false);
      setPatientFullName(val);
    }
  };

  // Handle Patient Quick Selection & Validation
  const handleSelectPatient = (inputVal) => {
    handlePatientInputChange(inputVal);
  };

  const handlePatientNameChange = (val) => {
    setPatientFullName(val);
    const clean = val.trim().toLowerCase();
    if (!clean) {
      setSelectedPatient(null);
      setIsPatientValid(false);
      return;
    }
    const matched = registeredPatients.find(
      (p) =>
        p.name?.toLowerCase() === clean ||
        p.patientId?.toLowerCase() === clean
    );
    if (matched) {
      setSelectedPatient(matched);
      setIsPatientValid(true);
      if (!age && matched.age) setAge(matched.age);
      if (matched.gender) setGender(matched.gender);
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

    if (!patientFullName || !patientFullName.trim()) {
      setErrorMsg('Please enter or select the Patient Name.');
      return;
    }

    if (!medicalDiagnosis || !medicalDiagnosis.trim()) {
      setErrorMsg('Please specify the Diagnosis / Illness.');
      return;
    }

    if (!fromDate || !toDate) {
      setErrorMsg('Please provide both From Date and To Date.');
      return;
    }

    try {
      setFormSubmitting(true);
      setErrorMsg('');
      setSuccessMsg('');

      const activeTmpl = templates.find((t) => t.templateKey === selectedTemplateKey);

      const payload = {
        patientId: selectedPatient?.patientId || 'P-OPD',
        patientName: patientFullName.trim(),
        age: age ? Number(age) : undefined,
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

  // Active Certificate for Print View
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
    clinicName: doctor?.clinicName || 'Dhyey Clinic & Nursing Home',
    doctorName: doctor?.name || 'Dr. Chirag Paghdal',
    doctorQualifications: doctor?.specialization || 'FAMILY PHYSICIAN (B.H.M.S.)',
    doctorRegNo: doctor?.regNo || 'G-9035',
    issueDate: todayStr,
    digitalSignature,
  };

  const activeTemplateName =
    templates.find((t) => t.templateKey === selectedTemplateKey)?.name || 'Medical Fitness Certificate';

  return (
    <div style={styles.container}>
      {/* 1. TOP HEADER & NAVIGATION BAR */}
      <div style={styles.topBar} className="no-print">
        <div style={styles.headerLeft}>
          <div style={styles.headerIconWrap}>
            <Award size={20} color="#146B5C" />
          </div>
          <div>
            <h2 style={styles.pageTitle}>Medical Certificates</h2>
            <p style={styles.pageSubtitle}>Official verifiable fitness & leave certificates</p>
          </div>

          {/* View Mode Segmented Switcher */}
          <div style={styles.tabSwitcher}>
            <button
              type="button"
              onClick={() => setActiveTab('studio')}
              style={{
                ...styles.tabPill,
                backgroundColor: activeTab === 'studio' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'studio' ? '#FFFFFF' : 'var(--text-muted)',
                fontWeight: activeTab === 'studio' ? '700' : '500',
              }}
            >
              <FileText size={13} />
              <span>Issue Certificate</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('registry')}
              style={{
                ...styles.tabPill,
                backgroundColor: activeTab === 'registry' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'registry' ? '#FFFFFF' : 'var(--text-muted)',
                fontWeight: activeTab === 'registry' ? '700' : '500',
              }}
            >
              <Award size={13} />
              <span>Issued Registry</span>
              <span
                style={{
                  ...styles.tabBadge,
                  backgroundColor: activeTab === 'registry' ? 'rgba(255,255,255,0.25)' : 'var(--surface-alt)',
                  color: activeTab === 'registry' ? '#FFFFFF' : 'var(--primary)',
                }}
              >
                {totalCount}
              </span>
            </button>
          </div>
        </div>

        <div style={styles.headerRight}>
          {/* Next Cert ID Badge */}
          <div style={styles.nextCertBadge}>
            <span style={styles.nextCertLabel}>NEXT ID:</span>
            <span style={styles.nextCertVal}>{nextCertId}</span>
          </div>

          {/* Add Template */}
          <button
            type="button"
            onClick={() => setShowAddTemplateModal(true)}
            style={styles.actionBtnPrimary}
            title="Create Custom Certificate Template"
          >
            <Plus size={13} color="#FFFFFF" />
            <span>Template</span>
          </button>

          {/* Add Digital Signature */}
          <button
            type="button"
            onClick={() => setShowSignatureModal(true)}
            style={styles.actionBtnOutline}
            title="Configure Digital Signature"
          >
            <Edit3 size={13} color="var(--primary)" />
            <span>Signature</span>
          </button>

          {/* Verify Certificate */}
          <button
            type="button"
            onClick={() => {
              setShowVerifyModal(true);
              setVerificationResult(null);
              setVerifyIdInput('');
            }}
            style={styles.actionBtnOutline}
            title="Verify Certificate Authenticity"
          >
            <ShieldCheck size={13} color="var(--primary)" />
            <span>Verify</span>
          </button>
        </div>
      </div>

      {/* 2. TAB: STUDIO (FORM + LIVE PREVIEW) */}
      {activeTab === 'studio' && (
        <div style={styles.studioContainer} className="no-print">
          <div className="med-cert-split" style={styles.mainSplit}>
            {/* LEFT PANE: CERTIFICATE ISSUE FORM */}
            <div style={styles.formPane}>
              <div style={styles.paneHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={15} color="var(--primary)" />
                  <h3 style={styles.paneTitle}>Certificate Details</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={styles.paneCertBadge}>ID: {nextCertId}</span>
                  {selectedPatient && (
                    <span style={styles.verifiedTag}>
                      <CheckCircle2 size={12} color="#15803D" />
                      <span>{selectedPatient.patientId}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Error & Success Messages */}
              {errorMsg && (
                <div style={styles.errorAlert}>
                  <AlertCircle size={14} color="var(--danger)" style={{ flexShrink: 0 }} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div style={styles.successAlert}>
                  <CheckCircle2 size={14} color="#15803D" style={{ flexShrink: 0 }} />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleIssueAndPrint} style={styles.form}>
                {/* Row 1: Certificate Template */}
                <div style={styles.formGroup}>
                  <div style={styles.fieldHeader}>
                    <label style={styles.label}>Template *</label>
                    <button
                      type="button"
                      onClick={() => setShowAddTemplateModal(true)}
                      style={styles.inlineActionLink}
                    >
                      <Plus size={11} />
                      <span>New Template</span>
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

                {/* Row 2: Search Registered Patient & Patient Name */}
                <div style={styles.formRow}>
                  <div style={{ flex: 1, position: 'relative' }} ref={certPatientWrapRef}>
                    <div style={styles.fieldHeader}>
                      <label style={styles.label}>
                        Search Patient <span style={{ color: 'var(--danger)' }}>*</span>
                      </label>
                      {isPatientValid && (
                        <span style={styles.verifiedTagMini}>
                          <CheckCircle2 size={11} color="#15803D" />
                          <span>Matched</span>
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Type patient name or ID..."
                      value={patientInput}
                      onChange={(e) => handlePatientInputChange(e.target.value)}
                      onFocus={() => {
                        if (patientInput.trim()) {
                          setShowPatientDropdown(true);
                          setPatientHighlightIndex(0);
                        }
                      }}
                      onKeyDown={(e) => {
                        const list = filteredPatients;
                        if (e.key === 'ArrowDown') {
                          if (list.length > 0) {
                            e.preventDefault();
                            if (!showPatientDropdown) setShowPatientDropdown(true);
                            setPatientHighlightIndex((prev) => (prev < list.length - 1 ? prev + 1 : 0));
                          }
                        } else if (e.key === 'ArrowUp') {
                          if (list.length > 0) {
                            e.preventDefault();
                            if (!showPatientDropdown) setShowPatientDropdown(true);
                            setPatientHighlightIndex((prev) => (prev > 0 ? prev - 1 : list.length - 1));
                          }
                        } else if (e.key === 'Enter') {
                          if (list.length > 0) {
                            e.preventDefault();
                            const chosen = list[patientHighlightIndex] || list[0];
                            if (chosen) handlePickPatient(chosen);
                          }
                        } else if (e.key === 'Escape') {
                          setShowPatientDropdown(false);
                        }
                      }}
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

                    {/* Keyboard Navigable Patient Dropdown */}
                    {showPatientDropdown && patientInput.trim() && filteredPatients.length > 0 && (
                      <ul style={styles.patientDropdown}>
                        {filteredPatients.slice(0, 15).map((p, idx) => {
                          const isHighlighted = idx === patientHighlightIndex;
                          return (
                            <li
                              key={p._id || p.patientId}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handlePickPatient(p);
                              }}
                              onMouseEnter={() => setPatientHighlightIndex(idx)}
                              style={{
                                ...styles.patientDropdownItem,
                                backgroundColor: isHighlighted ? 'var(--primary-soft)' : '#FFFFFF',
                                borderLeft: isHighlighted ? '4px solid var(--primary)' : '4px solid transparent',
                              }}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <strong style={{ color: isHighlighted ? 'var(--primary-dark)' : 'var(--text)' }}>
                                    {p.name}
                                  </strong>
                                  <span style={styles.pidBadgeMini}>PID: {p.patientId}</span>
                                  {isHighlighted && (
                                    <span style={styles.enterBadgeMini}>↵ Enter</span>
                                  )}
                                </div>
                                <span style={{ fontSize: '11px', color: '#64748B' }}>
                                  Age: {p.age || '-'} &bull; Gender: {p.gender || '-'} &bull; Area: {p.area || '-'}
                                </span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={styles.fieldHeader}>
                      <label style={styles.label}>Patient Name *</label>
                      {selectedPatient ? (
                        <span style={styles.verifiedTagMini}>
                          <CheckCircle2 size={11} color="#15803D" />
                          <span>Linked (PID: {selectedPatient.patientId})</span>
                        </span>
                      ) : patientFullName.trim() ? (
                        <span style={{ fontSize: '10px', color: '#64748B', fontStyle: 'italic' }}>
                          Direct / OPD
                        </span>
                      ) : null}
                    </div>
                    <input
                      type="text"
                      placeholder="Patient Full Name"
                      value={patientFullName}
                      onChange={(e) => handlePatientNameChange(e.target.value)}
                      style={styles.input}
                      required
                    />
                  </div>
                </div>

                {/* Row 3: Age, Gender, Diagnosis */}
                <div style={styles.formRow}>
                  <div style={{ width: '85px' }}>
                    <label style={styles.label}>Age</label>
                    <input
                      type="text"
                      placeholder="e.g. 28"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      style={styles.input}
                    />
                  </div>

                  <div style={{ width: '110px' }}>
                    <label style={styles.label}>Gender</label>
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
                    <div style={styles.fieldHeader}>
                      <label style={styles.label}>Diagnosis / Illness *</label>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Acute Viral Pyrexia, Gastroenteritis..."
                      value={medicalDiagnosis}
                      onChange={(e) => setMedicalDiagnosis(e.target.value)}
                      style={styles.input}
                      required
                    />
                    {/* Quick Clinical Diagnosis Chips */}
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {[
                        'Acute Viral Pyrexia',
                        'Gastroenteritis',
                        'Viral Bronchitis',
                        'Typhoid Fever',
                        'Acute Lumbar Strain',
                      ].map((diag) => (
                        <button
                          key={diag}
                          type="button"
                          onClick={() => setMedicalDiagnosis(diag)}
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            border: '1px solid var(--border)',
                            backgroundColor: medicalDiagnosis === diag ? 'var(--primary-soft)' : '#FFFFFF',
                            color: medicalDiagnosis === diag ? 'var(--primary-dark)' : 'var(--text-muted)',
                            cursor: 'pointer',
                            fontWeight: medicalDiagnosis === diag ? 700 : 500,
                          }}
                        >
                          {diag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Row 4: From Date, To Date, Days, Issue Place */}
                <div style={styles.formRow}>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>From Date *</label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      style={styles.input}
                      required
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>To Date *</label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      style={styles.input}
                      required
                    />
                  </div>

                  <div style={{ width: '90px' }}>
                    <div style={styles.fieldHeader}>
                      <label style={styles.label}>Days</label>
                      <span style={styles.autoTag}>Auto</span>
                    </div>
                    <input
                      type="number"
                      min="1"
                      value={restDays}
                      onChange={(e) => setRestDays(Number(e.target.value))}
                      style={styles.input}
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Issue Place</label>
                    <input
                      type="text"
                      placeholder="e.g. Surat, Ahmedabad"
                      value={issuePlace}
                      onChange={(e) => setIssuePlace(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                </div>

                {/* Row 5: Certificate Content */}
                <div style={styles.formGroup}>
                  <div style={styles.fieldHeader}>
                    <label style={styles.label}>Certificate Content</label>
                    <button
                      type="button"
                      onClick={handleResetBodyText}
                      style={styles.inlineActionLink}
                      title="Reset to Template Default Text"
                    >
                      <RotateCcw size={11} />
                      <span>Reset Text</span>
                    </button>
                  </div>

                  {/* Clean Helper Tokens */}
                  <div style={styles.tokensRow}>
                    {[
                      { key: '{PATIENT_NAME}', label: '+ Name' },
                      { key: '{DIAGNOSIS}', label: '+ Diagnosis' },
                      { key: '{FROM_DATE}', label: '+ From' },
                      { key: '{TO_DATE}', label: '+ To' },
                      { key: '{REST_DAYS}', label: '+ Days' },
                      { key: '{CERT_ID}', label: '+ Cert ID' },
                      { key: '{CLINIC_NAME}', label: '+ Clinic' },
                    ].map((tok) => (
                      <button
                        key={tok.key}
                        type="button"
                        onClick={() => insertToken(tok.key)}
                        style={styles.tokenPill}
                        title={`Insert ${tok.key}`}
                      >
                        {tok.label}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={4}
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    style={styles.textarea}
                    placeholder="Enter certificate text..."
                    required
                  />
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
                    disabled={formSubmitting}
                    style={{
                      ...styles.submitBtn,
                      opacity: formSubmitting ? 0.7 : 1,
                      cursor: formSubmitting ? 'not-allowed' : 'pointer',
                    }}
                    title="Issue & Print Medical Certificate"
                  >
                    <Printer size={15} />
                    <span>
                      {formSubmitting
                        ? 'Issuing Certificate...'
                        : 'Issue & Print Certificate'}
                    </span>
                    <span style={styles.keyTag}>Enter</span>
                  </button>
                </div>
              </form>
            </div>

            {/* RIGHT PANE: LIVE CERTIFICATE PREVIEW (OFFICIAL AUTHENTIC A4 FORMAT) */}
            <div style={styles.previewPane}>
              <div style={styles.paneHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Eye size={15} color="var(--primary)" />
                  <h3 style={styles.paneTitle}>Live Certificate Preview</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setShowSignatureModal(true)}
                    style={styles.miniLink}
                  >
                    <Edit3 size={11} />
                    <span>Signature</span>
                  </button>
                  <span style={styles.verifiableBadge}>Official Verifiable</span>
                </div>
              </div>

              {/* A4 Paper Certificate Container */}
              <div style={styles.a4Paper}>
                <div style={styles.a4InnerBorder}>
                  {/* Clinic Crest & Brand Header */}
                  <div style={styles.a4ClinicHeader}>
                    <div style={styles.a4CrestBadge}>
                      <Award size={20} color="#146B5C" />
                    </div>
                    <h2 style={styles.a4ClinicTitle}>
                      {doctor?.clinicName || 'CLINIC MANAGEMENT SYSTEM'}
                    </h2>
                    <p style={styles.a4ClinicSub}>
                      Shop No. 1, Mahavir Heights, New Kosad Road, Amroli, Surat &bull; Ph: 9876543210
                    </p>
                    <div style={styles.a4OrnamentalDivider}>
                      <div style={styles.a4DividerLineLeft} />
                      <span style={styles.a4DividerEmblem}>✦</span>
                      <div style={styles.a4DividerLineRight} />
                    </div>
                  </div>

                  {/* Certificate Title Banner */}
                  <div style={styles.a4TitleWrap}>
                    <div style={styles.a4CertTitleBadge}>
                      {activeTemplateName.toUpperCase()}
                    </div>
                  </div>

                  {/* Cert ID & Security Bar */}
                  <div style={styles.a4MetaBar}>
                    <div style={styles.a4CertIdWrap}>
                      <span style={styles.a4CertIdLabel}>CERTIFICATE NO:</span>
                      <span style={styles.a4CertIdVal}>{nextCertId}</span>
                    </div>
                    <div style={styles.a4SecurityPill}>
                      <ShieldCheck size={12} color="#15803D" />
                      <span>AUTHENTIC & VERIFIABLE</span>
                    </div>
                  </div>

                  {/* Certificate Body Paragraph */}
                  <div style={styles.a4BodyBox}>
                    <p style={styles.a4BodyText}>
                      {currentFormattedBody}
                    </p>
                  </div>

                  {/* Bottom Meta & Doctor Sign Off */}
                  <div style={styles.a4Footer}>
                    <div style={styles.a4FooterLeft}>
                      {/* Circular Official Medical Seal Stamp */}
                      <div style={styles.a4SealStamp}>
                        <div style={styles.a4SealInner}>
                          <span style={styles.a4SealTextTop}>★ OFFICIAL CLINIC SEAL ★</span>
                          <span style={styles.a4SealEmblem}>✚</span>
                          <span style={styles.a4SealTextBottom}>VERIFIED & REGISTERED</span>
                        </div>
                      </div>
                      <div style={styles.a4IssueMeta}>
                        <p style={styles.a4FootItem}><strong>Date:</strong> {todayStr}</p>
                        <p style={styles.a4FootItem}><strong>Place:</strong> {issuePlace || 'Ahmedabad'}</p>
                        <p style={styles.a4FootSecurity}>Secure Document &bull; Reg: G-14285</p>
                      </div>
                    </div>

                    <div style={styles.a4FooterRight}>
                      {/* Doctor Signature Rendering */}
                      <div style={styles.a4SignatureWrap}>
                        {isCanvasSignature && digitalSignature.startsWith('data:image') ? (
                          <img
                            src={digitalSignature}
                            alt="Doctor Signature"
                            style={{ maxHeight: '44px', objectFit: 'contain' }}
                          />
                        ) : (
                          <span style={styles.cursiveSignature}>
                            {digitalSignature || 'Dr. Chirag Paghdal'}
                          </span>
                        )}
                      </div>
                      <div style={styles.a4SignRule} />
                      <p style={styles.a4DocName}>{doctor?.name || 'Dr. Chirag Paghdal'}</p>
                      <p style={styles.a4DocRole}>
                        {doctor?.specialization || 'FAMILY PHYSICIAN (B.H.M.S.)'}
                      </p>
                      <p style={styles.a4DocReg}>Reg. No. {doctor?.regNo || 'G-9035'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Footer Summary Bar */}
          <div style={styles.bottomQuickBar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px', color: 'var(--text-muted)' }}>
              <Award size={13} color="var(--primary)" />
              <span>
                Total <strong>{totalCount}</strong> medical certificates issued so far.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('registry')}
              style={styles.viewRegistryBtn}
            >
              <span>View Issued Registry</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* 3. TAB: REGISTRY (FULL SCREEN CERTIFICATE HISTORY TABLE) */}
      {activeTab === 'registry' && (
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
                  <th style={styles.th}>DIAGNOSIS</th>
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
                      No issued certificates found in database.
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
                            type="button"
                            onClick={() => handlePrintExisting(cert)}
                            style={styles.iconBtnPrint}
                            title="Print this Certificate"
                          >
                            <Printer size={13} />
                            <span>Print</span>
                          </button>
                          <button
                            type="button"
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
      )}

      {/* 4. DEDICATED PRINTABLE LAYOUT (#printable-cert) */}
      <div id="printable-cert" className="print-only" style={styles.printCertContainer}>
        <div style={styles.printOuterBorder}>
          <div style={styles.printInnerBorder}>
            {/* Header */}
            <div style={styles.printClinicHead}>
              <h1 style={styles.printClinicName}>
                {activePrintCert.clinicName || 'CLINIC MANAGEMENT SYSTEM'}
              </h1>
              <p style={styles.printClinicSub}>
                Shop No. 1, Mahavir Heights, New Kosad Road, Amroli, Surat &bull; Phone: +91 98765 43210
              </p>
              <div style={styles.printDivider} />
            </div>

            {/* Certificate Title */}
            <div style={styles.printTitleWrap}>
              <h2 style={styles.printCertTitle}>
                {activePrintCert.templateName?.toUpperCase() || 'MEDICAL FITNESS CERTIFICATE'}
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
                      {activePrintCert.digitalSignature || 'Dr. Chirag Paghdal'}
                    </span>
                  )}
                </div>
                <div style={styles.printSignLine} />
                <p style={styles.printDocName}>{activePrintCert.doctorName || 'Dr. Chirag Paghdal'}</p>
                <p style={styles.printDocRole}>
                  {activePrintCert.doctorQualifications || 'FAMILY PHYSICIAN (B.H.M.S.)'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. MODAL: ADD CUSTOM TEMPLATE */}
      {showAddTemplateModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Create Custom Template</h3>
              <button
                type="button"
                onClick={() => setShowAddTemplateModal(false)}
                style={styles.modalCloseBtn}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateTemplate} style={styles.modalForm}>
              <div>
                <label style={styles.label}>Template Name *</label>
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
                <label style={styles.label}>Category</label>
                <input
                  type="text"
                  placeholder="e.g. Fitness, Leave, Travel..."
                  value={newTemplateCategory}
                  onChange={(e) => setNewTemplateCategory(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label}>Default Body Text *</label>
                <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: 4 }}>
                  Available: {'{PATIENT_NAME}'}, {'{AGE}'}, {'{DIAGNOSIS}'}, {'{FROM_DATE}'}, {'{TO_DATE}'}, {'{REST_DAYS}'}
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
                <h3 style={styles.modalTitle}>Verify Certificate</h3>
              </div>
              <button
                type="button"
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
                type="button"
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
                    setDigitalSignature('Dr. Chirag Paghdal');
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
                  Save Signature
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
    gap: '10px',
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
    padding: '8px 14px',
    borderRadius: '10px',
    border: '1px solid var(--border)',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
    flexWrap: 'wrap',
    gap: '10px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  headerIconWrap: {
    width: '34px',
    height: '34px',
    borderRadius: '8px',
    backgroundColor: 'var(--primary-soft)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--text)',
    margin: 0,
    lineHeight: 1.2,
  },
  pageSubtitle: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    margin: 0,
  },
  tabSwitcher: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'var(--bg)',
    padding: '3px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    gap: '2px',
    marginLeft: '6px',
  },
  tabPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 12px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  tabBadge: {
    fontSize: '10px',
    fontWeight: '700',
    padding: '1px 6px',
    borderRadius: '10px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  nextCertBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '5px 10px',
    borderRadius: '6px',
    border: '1px solid #BFDBFE',
    backgroundColor: '#EFF6FF',
    fontSize: '11px',
  },
  nextCertLabel: {
    fontWeight: '700',
    color: '#1E40AF',
    fontSize: '10px',
  },
  nextCertVal: {
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#1E3A8A',
  },
  actionBtnOutline: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '6px 11px',
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--primary)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  actionBtnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '6px 12px',
    backgroundColor: '#146B5C',
    border: 'none',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#FFFFFF',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(20, 107, 92, 0.25)',
  },
  studioContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1,
    minHeight: 0,
    height: '100%',
  },
  mainSplit: {
    display: 'grid',
    gridTemplateColumns: '1.08fr 0.92fr',
    gap: '12px',
    flex: 1,
    height: '100%',
    minHeight: 0,
  },
  formPane: {
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    height: '100%',
    minHeight: 0,
    overflowY: 'auto',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
  },
  paneHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid var(--border)',
    paddingBottom: '8px',
  },
  paneTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--text)',
    margin: 0,
  },
  paneCertBadge: {
    fontSize: '11px',
    fontFamily: 'monospace',
    fontWeight: '700',
    backgroundColor: 'var(--primary-soft)',
    color: 'var(--primary-dark)',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'var(--danger-soft)',
    color: 'var(--danger)',
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid var(--danger)',
    fontSize: '11px',
    fontWeight: '500',
  },
  successAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#DCFCE7',
    color: '#15803D',
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid #16A34A',
    fontSize: '11px',
    fontWeight: '500',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '9px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  formRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
  },
  fieldHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '2px',
  },
  label: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#334155',
    letterSpacing: '0.1px',
  },
  autoTag: {
    fontSize: '9px',
    fontWeight: '700',
    color: '#1E40AF',
    backgroundColor: '#EFF6FF',
    padding: '1px 5px',
    borderRadius: '3px',
  },
  verifiedTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '10px',
    fontWeight: '700',
    color: '#15803D',
    backgroundColor: '#DCFCE7',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  verifiedTagMini: {
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
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--primary)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },
  input: {
    width: '100%',
    padding: '7px 10px',
    borderRadius: '6px',
    border: '1px solid #CBD5E1',
    fontSize: '12px',
    color: 'var(--text)',
    outline: 'none',
    backgroundColor: '#F8FAFC',
    transition: 'border-color 0.15s, background-color 0.15s',
  },
  select: {
    width: '100%',
    padding: '7px 10px',
    borderRadius: '6px',
    border: '1px solid #CBD5E1',
    fontSize: '12px',
    color: 'var(--text)',
    backgroundColor: '#F8FAFC',
    outline: 'none',
    cursor: 'pointer',
  },
  tokensRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    flexWrap: 'wrap',
    marginBottom: '4px',
  },
  tokenPill: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '600',
    backgroundColor: 'var(--surface-alt)',
    border: '1px solid var(--border)',
    color: 'var(--primary-dark)',
    cursor: 'pointer',
    transition: 'all 0.1s ease',
  },
  textarea: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid #CBD5E1',
    fontSize: '12px',
    color: 'var(--text)',
    fontFamily: 'inherit',
    lineHeight: '1.5',
    resize: 'vertical',
    backgroundColor: '#F8FAFC',
  },
  formActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '6px',
  },
  clearBtn: {
    padding: '7px 14px',
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  submitBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 18px',
    backgroundColor: '#146B5C',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '700',
    color: '#FFFFFF',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(20, 107, 92, 0.25)',
  },
  keyTag: {
    padding: '1px 5px',
    borderRadius: '3px',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    fontSize: '9px',
  },
  previewPane: {
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    height: '100%',
    minHeight: 0,
    overflowY: 'auto',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
  },
  miniLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
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
    backgroundColor: '#DCFCE7',
    border: '1px solid #86EFAC',
    borderRadius: '10px',
    padding: '2px 8px',
    textTransform: 'uppercase',
  },
  // Authentic A4 Certificate Styling
  a4Paper: {
    backgroundColor: '#FCFDFD',
    border: '2px solid #146B5C',
    borderRadius: '8px',
    padding: '6px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
    flex: 1,
    minHeight: '340px',
  },
  a4InnerBorder: {
    border: '1px solid #0F766E',
    borderRadius: '5px',
    padding: '16px 18px',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  a4ClinicHeader: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '8px',
  },
  a4CrestBadge: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#E6F4F1',
    border: '1.5px solid #146B5C',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '4px',
  },
  a4ClinicTitle: {
    fontSize: '16px',
    fontWeight: '800',
    color: '#0D483E',
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
  },
  a4ClinicSub: {
    fontSize: '9px',
    color: '#64748B',
    margin: '3px 0 6px 0',
  },
  a4OrnamentalDivider: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    gap: '8px',
    margin: '2px 0 6px 0',
  },
  a4DividerLineLeft: {
    flex: 1,
    height: '1px',
    backgroundColor: '#146B5C',
  },
  a4DividerEmblem: {
    fontSize: '10px',
    color: '#146B5C',
  },
  a4DividerLineRight: {
    flex: 1,
    height: '1px',
    backgroundColor: '#146B5C',
  },
  a4TitleWrap: {
    textAlign: 'center',
    margin: '6px 0 10px 0',
  },
  a4CertTitleBadge: {
    display: 'inline-block',
    padding: '4px 16px',
    backgroundColor: '#E6F4F1',
    border: '1px solid #146B5C',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '800',
    color: '#0D483E',
    letterSpacing: '0.8px',
  },
  a4MetaBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    paddingBottom: '5px',
    borderBottom: '1px dashed #CBD5E1',
  },
  a4CertIdWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  a4CertIdLabel: {
    fontSize: '9px',
    fontWeight: '700',
    color: '#64748B',
  },
  a4CertIdVal: {
    fontSize: '10px',
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#0F172A',
  },
  a4SecurityPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '8px',
    fontWeight: '800',
    color: '#15803D',
    backgroundColor: '#F0FDF4',
    border: '1px solid #86EFAC',
    padding: '1px 6px',
    borderRadius: '3px',
  },
  a4BodyBox: {
    flex: 1,
    marginBottom: '12px',
  },
  a4BodyText: {
    fontFamily: "'Georgia', 'Times New Roman', serif",
    fontSize: '12.5px',
    lineHeight: '1.75',
    color: '#1E293B',
    textAlign: 'justify',
    margin: 0,
  },
  a4Footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTop: '1px solid #E2E8F0',
    paddingTop: '8px',
    marginTop: 'auto',
  },
  a4FooterLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  a4SealStamp: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    border: '1.5px dashed #0D9488',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDFA',
  },
  a4SealInner: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    border: '1px solid #0D9488',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  a4SealTextTop: {
    fontSize: '5px',
    fontWeight: '800',
    color: '#0F766E',
    letterSpacing: '0.2px',
  },
  a4SealEmblem: {
    fontSize: '12px',
    color: '#0F766E',
    lineHeight: 1,
  },
  a4SealTextBottom: {
    fontSize: '4.5px',
    fontWeight: '700',
    color: '#0F766E',
  },
  a4IssueMeta: {
    fontSize: '9px',
    color: '#475569',
    lineHeight: '1.4',
  },
  a4FootItem: {
    margin: 0,
  },
  a4FootSecurity: {
    margin: '2px 0 0 0',
    fontSize: '8px',
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  a4FooterRight: {
    textAlign: 'right',
  },
  a4SignatureWrap: {
    height: '38px',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    marginBottom: '2px',
  },
  cursiveSignature: {
    fontFamily: '"Brush Script MT", cursive, sans-serif',
    fontSize: '20px',
    color: '#0D483E',
  },
  a4SignRule: {
    width: '130px',
    height: '1px',
    backgroundColor: '#334155',
    marginLeft: 'auto',
    marginBottom: '3px',
  },
  a4DocName: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#0F172A',
    margin: 0,
  },
  a4DocRole: {
    fontSize: '9px',
    color: '#64748B',
    margin: 0,
  },
  a4DocReg: {
    fontSize: '8px',
    color: '#94A3B8',
    margin: 0,
  },
  bottomQuickBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '7px 14px',
  },
  viewRegistryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--primary)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  registryCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    overflow: 'hidden',
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
  },
  registryHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    borderBottom: '1px solid var(--border)',
    backgroundColor: '#F8FAFC',
    flexWrap: 'wrap',
    gap: '8px',
  },
  registryTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--text)',
    margin: 0,
  },
  countBadge: {
    fontSize: '10px',
    fontWeight: '600',
    backgroundColor: 'var(--primary-soft)',
    color: 'var(--primary-dark)',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  patientDropdown: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
    maxHeight: '220px',
    overflowY: 'auto',
    listStyle: 'none',
    zIndex: 100,
    padding: '4px 0',
  },
  patientDropdownItem: {
    padding: '8px 12px',
    fontSize: '0.88rem',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  },
  pidBadgeMini: {
    fontSize: '10px',
    fontWeight: 700,
    backgroundColor: '#F1F5F9',
    color: '#475569',
    padding: '1px 6px',
    borderRadius: '4px',
    border: '1px solid #CBD5E1',
  },
  enterBadgeMini: {
    fontSize: '9.5px',
    fontWeight: 700,
    backgroundColor: 'var(--primary)',
    color: '#FFFFFF',
    padding: '1px 5px',
    borderRadius: '4px',
    marginLeft: 'auto',
  },
  registrySearchWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '9px',
    pointerEvents: 'none',
  },
  registrySearchInput: {
    padding: '6px 10px 6px 28px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    fontSize: '12px',
    width: '280px',
    backgroundColor: '#FFFFFF',
  },
  tableResponsive: {
    overflowX: 'auto',
    flex: 1,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px',
  },
  theadRow: {
    backgroundColor: '#F1F5F9',
    borderBottom: '1px solid var(--border)',
  },
  th: {
    padding: '8px 12px',
    textAlign: 'left',
    fontSize: '10px',
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
    whiteSpace: 'nowrap',
  },
  trEven: {
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid var(--border)',
  },
  trOdd: {
    backgroundColor: '#F8FAFC',
    borderBottom: '1px solid var(--border)',
  },
  td: {
    padding: '8px 12px',
    color: 'var(--text)',
  },
  certIdBadge: {
    backgroundColor: 'var(--surface-alt)',
    color: 'var(--primary-dark)',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '11px',
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  statusBadge: {
    backgroundColor: '#DCFCE7',
    color: '#15803D',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: '700',
  },
  iconBtnPrint: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    backgroundColor: 'var(--primary-soft)',
    border: 'none',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--primary-dark)',
    cursor: 'pointer',
  },
  iconBtnDelete: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 6px',
    backgroundColor: 'var(--danger-soft)',
    border: 'none',
    borderRadius: '4px',
    color: 'var(--danger)',
    cursor: 'pointer',
  },
  emptyTd: {
    padding: '30px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '12px',
  },

  // Dedicated Print Styles
  printCertContainer: {
    backgroundColor: '#FFFFFF',
    color: '#000000',
    width: '100%',
  },
  printOuterBorder: {
    border: '3px solid #146B5C',
    borderRadius: '10px',
    padding: '8px',
  },
  printInnerBorder: {
    border: '1px solid #146B5C',
    borderRadius: '6px',
    padding: '26px 30px',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '820px',
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
    letterSpacing: '1px',
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
    margin: '18px 0',
  },
  printCertTitle: {
    fontSize: '18px',
    fontWeight: '800',
    color: '#111827',
    letterSpacing: '0.8px',
    margin: 0,
  },
  printMetaBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    borderBottom: '1px solid #E5E7EB',
    paddingBottom: '8px',
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
    fontSize: '14.5px',
    lineHeight: '1.9',
    color: '#1F2937',
    fontFamily: "'Georgia', 'Times New Roman', serif",
    textAlign: 'justify',
    flex: 1,
    marginBottom: '40px',
  },
  printFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTop: '1px solid #CBD5E1',
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
    width: '180px',
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
    borderRadius: '10px',
    padding: '18px 20px',
    width: '450px',
    maxWidth: '92%',
    boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid var(--border)',
    paddingBottom: '10px',
    marginBottom: '14px',
  },
  modalTitle: {
    fontSize: '14px',
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
    gap: '12px',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '6px',
  },
  cancelBtn: {
    padding: '6px 14px',
    borderRadius: '6px',
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

export default MedicalCertificate;
