import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { patientAPI, visitAPI, masterDataAPI, familyAPI } from '../services/api';
import { MasterDataInput } from '../components/common/MasterDataInput';
import { useDebounce } from '../hooks/useDebounce';
import { InvestigationReportModal } from '../components/reports/InvestigationReportModal';
import {
  Search,
  User,
  Trash2,
  Edit3,
  Calendar,
  FileText,
  Plus,
  Minus,
  Printer,
  X,
  CheckCircle,
  AlertCircle,
  Save,
  Columns,
  Rows,
  GripHorizontal,
  GripVertical,
  Activity,
  Pill,
  Stethoscope,
  Receipt,
  Users,
  ExternalLink,
  Languages,
  UtensilsCrossed,
} from 'lucide-react';

// Format human-readable dosage instructions in selected language
const formatDoseInstruction = (m, n, e, ng, timing, langKey) => {
  const mVal = String(m ?? '').trim();
  const nVal = String(n ?? '').trim();
  const eVal = String(e ?? '').trim();
  const ngVal = String(ng ?? '').trim();
  const isBf = timing === 'BF';

  const parts = [];

  if (langKey === 'hi') {
    if (mVal && mVal !== '0') parts.push(`${mVal} सुबह (Morning)`);
    if (nVal && nVal !== '0') parts.push(`${nVal} दोपहर (Afternoon)`);
    if (eVal && eVal !== '0') parts.push(`${eVal} शाम (Evening)`);
    if (ngVal && ngVal !== '0') parts.push(`${ngVal} रात (Night)`);
    const timingStr = isBf ? 'खाने से पहले (भूखे पेट) - BF' : 'खाने के बाद - AF';
    const doseText = parts.length > 0 ? parts.join(', ') : 'डॉक्टर के निर्देशानुसार';
    return `${doseText} — ${timingStr}`;
  }

  if (langKey === 'gu') {
    if (mVal && mVal !== '0') parts.push(`${mVal} સવારે (Morning)`);
    if (nVal && nVal !== '0') parts.push(`${nVal} બપોરે (Afternoon)`);
    if (eVal && eVal !== '0') parts.push(`${eVal} સાંજે (Evening)`);
    if (ngVal && ngVal !== '0') parts.push(`${ngVal} રાત્રે (Night)`);
    const timingStr = isBf ? 'જમ્યા પહેલાં (ભૂખ્યા પેટે) - BF' : 'જમ્યા પછી - AF';
    const doseText = parts.length > 0 ? parts.join(', ') : 'ડોક્ટરની સલાહ મુજબ';
    return `${doseText} — ${timingStr}`;
  }

  // English default
  if (mVal && mVal !== '0') parts.push(`${mVal} Morning`);
  if (nVal && nVal !== '0') parts.push(`${nVal} Afternoon`);
  if (eVal && eVal !== '0') parts.push(`${eVal} Evening`);
  if (ngVal && ngVal !== '0') parts.push(`${ngVal} Night`);
  const timingStr = isBf ? 'Before Food (BF)' : 'After Food (AF)';
  const doseText = parts.length > 0 ? parts.join(', ') : 'As Directed';
  return `${doseText} — ${timingStr}`;
};

const RX_TRANSLATIONS = {
  en: {
    langKey: 'en',
    langName: 'English',
    patientLabel: 'PATIENT NAME:',
    ageGenderLabel: 'AGE / GENDER:',
    dateLabel: 'DATE:',
    caseNoLabel: 'CASE / PID:',
    rxTitle: 'PRESCRIPTION (Rx)',
    colNum: '#',
    colMedicine: 'MEDICINE NAME',
    colQty: 'QTY',
    colDosageInstructions: 'DOSAGE & WHEN TO TAKE',
    bfLabel: 'Before Food (BF)',
    afLabel: 'After Food (AF)',
    dietaryTitle: 'DIETARY SUGGESTIONS & LIFESTYLE ADVICE:',
    noPrescription: 'No medical store prescription prescribed for this visit.',
    footerAdvice: '* Please take medicines on time as prescribed. Keep this prescription for follow-up.',
    opdTimings: 'OPD Hours: Mon - Sat (9:00 AM - 1:00 PM, 5:00 PM - 9:00 PM)',
    timingHelp: (m, n, e, ng, timing) => formatDoseInstruction(m, n, e, ng, timing, 'en'),
  },
  hi: {
    langKey: 'hi',
    langName: 'हिंदी',
    patientLabel: 'मरीज़ का नाम:',
    ageGenderLabel: 'उम्र / लिंग:',
    dateLabel: 'दिनांक:',
    caseNoLabel: 'केस नंबर:',
    rxTitle: 'दवाइयों की पर्ची (Rx)',
    colNum: 'क्र.',
    colMedicine: 'दवा का नाम (Medicine Name)',
    colQty: 'मात्रा',
    colDosageInstructions: 'खुराक और लेने का समय (When to Take)',
    bfLabel: 'खाने से पहले (भूखे पेट) - BF',
    afLabel: 'खाने के बाद - AF',
    dietaryTitle: 'आहार एवं परहेज़ संबंधी सलाह:',
    noPrescription: 'इस विज़िट के लिए कोई दवा नहीं लिखी गई है।',
    footerAdvice: '* कृपया दवाइयाँ समय पर और निर्देशानुसार लें। अगली जांच के लिए यह पर्ची साथ लाएं।',
    opdTimings: 'ओपीडी समय: सोम - शनि (सुबह 9:00 - 1:00, शाम 5:00 - 9:00)',
    timingHelp: (m, n, e, ng, timing) => formatDoseInstruction(m, n, e, ng, timing, 'hi'),
  },
  gu: {
    langKey: 'gu',
    langName: 'ગુજરાતી',
    patientLabel: 'દર્દીનું નામ:',
    ageGenderLabel: 'ઉંમર / જાતિ:',
    dateLabel: 'તારીખ:',
    caseNoLabel: 'કેસ નં.:',
    rxTitle: 'દવાઓની યાદી (Rx)',
    colNum: 'ક્ર.',
    colMedicine: 'દવાનું નામ (Medicine Name)',
    colQty: 'જથ્થો',
    colDosageInstructions: 'માત્રા અને ક્યારે લેવી (When to Take)',
    bfLabel: 'જમ્યા પહેલાં (ભૂખ્યા પેટે) - BF',
    afLabel: 'જમ્યા પછી - AF',
    dietaryTitle: 'ખોરાક અને પરેજી અંગેની સૂચનાઓ:',
    noPrescription: 'આ મુલાકાત માટે કોઈ દવા લખેલ નથી.',
    footerAdvice: '* કૃપા કરીને દવાઓ સમયસર અને સૂચના મુજબ લો. ફરી મુલાકાતે આવો ત્યારે આ યાદી સાથે લાવવી.',
    opdTimings: 'ઓપીડી સમય: સોમ - શનિ (સવારે 9:00 - 1:00, સાંજે 5:00 - 9:00)',
    timingHelp: (m, n, e, ng, timing) => formatDoseInstruction(m, n, e, ng, timing, 'gu'),
  },
};

const formatRxDate = (dateVal) => {
  if (!dateVal) return new Date().toLocaleDateString('en-GB');
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return dateVal;
    return d.toLocaleDateString('en-GB');
  } catch (e) {
    return dateVal;
  }
};

export const PatientRecord = ({ selectedPatientId, onNavigateToAddMember }) => {
  const { doctor } = useAuth();
  // --- Search & Patient State ---
  const [patientSearch, setPatientSearch] = useState('');
  const debouncedSearch = useDebounce(patientSearch, 250);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchWrapRef = useRef(null);

  const [currentPatient, setCurrentPatient] = useState(null);
  const [patientVisits, setPatientVisits] = useState([]);
  const [loadingVisits, setLoadingVisits] = useState(false);
  const [toastMessage, setToastMessage] = useState({ text: '', type: 'success' });

  // --- Layout Mode & Dragger State ---
  // 'stacked' = Top Case Entry + Bottom History
  // 'side-by-side' = Left Case Entry + Right History
  const [layoutMode, setLayoutMode] = useState('stacked');
  const [splitWidthPercent, setSplitWidthPercent] = useState(62); // Side-by-side Left %
  const [historyHeight, setHistoryHeight] = useState(340); // Stacked Bottom History px - fits at least 3 past visit cards
  const [isDraggingH, setIsDraggingH] = useState(false);
  const [isDraggingV, setIsDraggingV] = useState(false);
  const splitContainerRef = useRef(null);
  const bpInputRef = useRef(null);

  // --- Modals State ---
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [editSaving, setEditSaving] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingPatient, setDeletingPatient] = useState(false);

  const [printVisit, setPrintVisit] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printLanguage, setPrintLanguage] = useState('en'); // 'en' | 'hi' | 'gu'
  const [printMode, setPrintMode] = useState('full'); // 'full' (plain paper/PDF with letterhead) | 'padOnly' (physical pre-printed letterpad)
  const [printDietary, setPrintDietary] = useState('');
  const [masterDietaryList, setMasterDietaryList] = useState([]);

  // Fetch Master Data Dietary suggestions when print modal opens
  useEffect(() => {
    if (showPrintModal) {
      masterDataAPI
        .getItems('dietary', '', 1, 50)
        .then((res) => {
          if (res && res.success && res.data) {
            setMasterDietaryList(res.data);
          }
        })
        .catch((err) => console.error('Error fetching dietary master items:', err));
    }
  }, [showPrintModal]);

  const handleToggleDietaryChip = (chipValue) => {
    const currentTokens = (printDietary || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const exists = currentTokens.some(
      (t) => t.toLowerCase() === chipValue.toLowerCase()
    );
    let newTokens;
    if (exists) {
      newTokens = currentTokens.filter(
        (t) => t.toLowerCase() !== chipValue.toLowerCase()
      );
    } else {
      newTokens = [...currentTokens, chipValue];
    }
    const updated = newTokens.join(', ');
    setPrintDietary(updated);

    if (printVisit?._id) {
      visitAPI.update(printVisit._id, { dietary: updated }).catch(() => {});
    }
  };

  const handleDietaryInputChange = (val) => {
    setPrintDietary(val);
    if (printVisit?._id) {
      visitAPI.update(printVisit._id, { dietary: val }).catch(() => {});
    }
  };

  // --- New Case Visibility & Edit Mode State ---
  const [showNewCaseForm, setShowNewCaseForm] = useState(false);
  const [editingVisitId, setEditingVisitId] = useState(null);

  // --- Case Lab Report State (Attached to Visit in MongoDB) ---
  const [showAddReportModal, setShowAddReportModal] = useState(false);
  const [attachedReport, setAttachedReport] = useState(null);
  const [viewingPastReport, setViewingPastReport] = useState(null);

  // --- Due Breakdown Modals State ---
  const [showTotalDueModal, setShowTotalDueModal] = useState(false);
  const [totalDueFilter, setTotalDueFilter] = useState('all'); // 'all' or 'dueOnly'
  const [showFamilyDueModal, setShowFamilyDueModal] = useState(false);
  const [loadingFamilyDue, setLoadingFamilyDue] = useState(false);
  const [familyData, setFamilyData] = useState(null);
  const [familyVisits, setFamilyVisits] = useState([]);
  const [familyDueTab, setFamilyDueTab] = useState('members'); // 'members' or 'visits'

  // --- New Visit Entry Form State (Matching Image) ---
  const getTodayDateStr = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const initialVisitForm = {
    visitDate: getTodayDateStr(),
    bp: '',
    sugar: '',
    other: '',
    reference: '',
    investigation: '',
    complaint: '',
    treatments: [{ id: Date.now() + '-t1', item: '', qty: '1' }],
    prescriptions: [
      {
        id: Date.now() + '-p1',
        medicine: '',
        qty: '',
        morning: '1',
        noon: '0',
        evening: '1',
        night: '0',
        timing: 'AF',
      },
    ],
    charge: '0',
    received: '0',
  };

  const [visitForm, setVisitForm] = useState(initialVisitForm);
  const [isSavingVisit, setIsSavingVisit] = useState(false);

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage({ text: '', type: 'success' }), 4000);
  };

  // --- Auto Focus BP Field on New Case Form Open ---
  useEffect(() => {
    if (showNewCaseForm) {
      setTimeout(() => {
        if (bpInputRef.current) {
          bpInputRef.current.focus();
          bpInputRef.current.select?.();
        }
      }, 60);
    }
  }, [showNewCaseForm]);

  // --- Global Keyboard Shortcuts: Alt+N or F3 for New Case, Ctrl+Enter for Save & Print ---
  useEffect(() => {
    const handleGlobalShortcuts = (e) => {
      // Don't intercept if an overlay modal is open
      if (showAddReportModal || showTotalDueModal || showFamilyDueModal || showPrintModal) {
        return;
      }

      const isAltN = e.altKey && (e.key === 'n' || e.key === 'N');
      const isF3 = e.key === 'F3';

      if (isAltN || (isF3 && !showNewCaseForm)) {
        e.preventDefault();
        handleOpenNewCase();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (showNewCaseForm) {
          e.preventDefault();
          handleSaveVisit(true);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [showNewCaseForm, showAddReportModal, showTotalDueModal, showFamilyDueModal, showPrintModal]);

  // --- Dragger Event Handlers ---
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingV && splitContainerRef.current) {
        const rect = splitContainerRef.current.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const newPercent = Math.max(35, Math.min(80, (offsetX / rect.width) * 100));
        setSplitWidthPercent(newPercent);
      } else if (isDraggingH) {
        // Dragging horizontal splitter to change history pane height
        const windowHeight = window.innerHeight;
        const newHeight = Math.max(160, Math.min(750, windowHeight - e.clientY - 20));
        setHistoryHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingV(false);
      setIsDraggingH(false);
    };

    if (isDraggingV || isDraggingH) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = isDraggingV ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDraggingV, isDraggingH]);

  // --- 1. Load Initial / Pre-selected Patient ---
  useEffect(() => {
    const initPatient = async () => {
      try {
        if (selectedPatientId) {
          const res = await patientAPI.getById(selectedPatientId);
          if (res.success && res.patient) {
            setCurrentPatient(res.patient);
            return;
          }
        }
        const allRes = await patientAPI.getAll('');
        if (allRes.success && allRes.data && allRes.data.length > 0) {
          setCurrentPatient(allRes.data[0]);
        }
      } catch (err) {
        console.error('Error loading initial patient:', err);
      }
    };
    initPatient();
  }, [selectedPatientId]);

  // --- 2. Live Debounced Search for Patients ---
  useEffect(() => {
    let active = true;
    const searchPatients = async () => {
      if (!debouncedSearch.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      try {
        setIsSearching(true);
        const res = await patientAPI.getAll(debouncedSearch);
        if (active && res.success) {
          setSearchResults(res.data || []);
          setShowSearchDropdown(true);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        if (active) setIsSearching(false);
      }
    };
    searchPatients();
    return () => {
      active = false;
    };
  }, [debouncedSearch]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- 3. Load Visits when currentPatient changes ---
  const loadPatientVisits = async (patientId) => {
    if (!patientId) return;
    try {
      setLoadingVisits(true);
      const res = await visitAPI.getByPatient(patientId);
      if (res.success) {
        setPatientVisits(res.data || []);
      }
    } catch (err) {
      console.error('Error loading patient visits:', err);
    } finally {
      setLoadingVisits(false);
    }
  };

  useEffect(() => {
    if (currentPatient?.patientId) {
      loadPatientVisits(currentPatient.patientId);
    }
  }, [currentPatient?.patientId]);

  const handleSelectPatient = (patient) => {
    setCurrentPatient(patient);
    setShowSearchDropdown(false);
    setPatientSearch('');
  };

  // --- Open Family Due Details Modal ---
  const handleOpenFamilyDueModal = async () => {
    const famId = currentPatient?.familyId || currentPatient?.family?.familyId;
    if (!famId) {
      showToast('No family ID associated with this patient', 'error');
      return;
    }
    setShowFamilyDueModal(true);
    setLoadingFamilyDue(true);
    try {
      const [famRes, visitsRes] = await Promise.all([
        familyAPI.getById(famId),
        visitAPI.getByFamily(famId),
      ]);
      setFamilyData(famRes);
      setFamilyVisits(visitsRes.data || []);
    } catch (err) {
      console.error('Failed to load family due details:', err);
      showToast('Failed to load family due details', 'error');
    } finally {
      setLoadingFamilyDue(false);
    }
  };

  // --- Calculated Due ---
  const chargeNum = Math.max(0, Number(visitForm.charge) || 0);
  const receivedNum = Math.max(0, Number(visitForm.received) || 0);
  const computedDue = Math.max(0, chargeNum - receivedNum);

  // --- Treatment Row Handlers (with Auto-Add on typing) ---
  const handleAddTreatment = () => {
    setVisitForm((prev) => ({
      ...prev,
      treatments: [
        ...prev.treatments,
        { id: Date.now() + '-' + Math.random(), item: '', qty: '1' },
      ],
    }));
  };

  const handleUpdateTreatment = (id, field, value) => {
    setVisitForm((prev) => {
      const idx = prev.treatments.findIndex((t) => t.id === id);
      const isLast = idx === prev.treatments.length - 1;
      const updated = prev.treatments.map((t) =>
        t.id === id ? { ...t, [field]: value } : t
      );

      // Auto add new row when writing in the item field of the last row
      if (isLast && field === 'item' && value && value.trim().length > 0) {
        updated.push({
          id: Date.now() + '-' + Math.random(),
          item: '',
          qty: '1',
        });
      }

      return { ...prev, treatments: updated };
    });
  };

  const handleRemoveTreatment = (id) => {
    setVisitForm((prev) => {
      const filtered = prev.treatments.filter((t) => t.id !== id);
      return {
        ...prev,
        treatments: filtered.length > 0 ? filtered : [{ id: Date.now() + '-t1', item: '', qty: '1' }],
      };
    });
  };

  // --- Prescription Row Handlers (with Auto-Add on typing) ---
  const handleAddPrescription = () => {
    setVisitForm((prev) => ({
      ...prev,
      prescriptions: [
        ...prev.prescriptions,
        {
          id: Date.now() + '-' + Math.random(),
          medicine: '',
          qty: '',
          morning: '1',
          noon: '0',
          evening: '1',
          night: '0',
          timing: 'AF',
        },
      ],
    }));
  };

  const handleUpdatePrescription = (id, field, value) => {
    setVisitForm((prev) => {
      const idx = prev.prescriptions.findIndex((p) => p.id === id);
      const isLast = idx === prev.prescriptions.length - 1;
      const updated = prev.prescriptions.map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      );

      // Auto add new row when writing in the medicine field of the last row
      if (isLast && field === 'medicine' && value && value.trim().length > 0) {
        updated.push({
          id: Date.now() + '-' + Math.random(),
          medicine: '',
          qty: '',
          morning: '1',
          noon: '0',
          evening: '1',
          night: '0',
          timing: 'AF',
        });
      }

      return { ...prev, prescriptions: updated };
    });
  };

  const handleRemovePrescription = (id) => {
    setVisitForm((prev) => {
      const filtered = prev.prescriptions.filter((p) => p.id !== id);
      return {
        ...prev,
        prescriptions:
          filtered.length > 0
            ? filtered
            : [
              {
                id: Date.now() + '-p1',
                medicine: '',
                qty: '',
                morning: '1',
                noon: '0',
                evening: '1',
                night: '0',
                timing: 'AF',
              },
            ],
      };
    });
  };

  // --- Open New Case Form ---
  const handleOpenNewCase = () => {
    setEditingVisitId(null);
    setVisitForm({
      ...initialVisitForm,
      visitDate: getTodayDateStr(),
      bp: '',
    });
    setShowNewCaseForm(true);
    setTimeout(() => {
      if (bpInputRef.current) {
        bpInputRef.current.focus();
        bpInputRef.current.select?.();
      }
    }, 80);
  };

  // --- Start Edit on an Existing Past Visit ---
  const handleStartEditVisit = (visit) => {
    setEditingVisitId(visit._id);
    setVisitForm({
      visitDate: visit.visitDate || getTodayDateStr(),
      bp: visit.bp || '',
      sugar: visit.sugar || '',
      other: visit.other || '',
      reference: visit.reference || '',
      investigation: visit.investigation || '',
      complaint: visit.complaint || '',
      treatments:
        visit.treatments && visit.treatments.length > 0
          ? visit.treatments.map((t, idx) => ({
            id: t._id || `${Date.now()}-${idx}`,
            item: t.item,
            qty: t.qty || '1',
          }))
          : [{ id: Date.now() + '-t1', item: '', qty: '1' }],
      prescriptions:
        visit.prescriptions && visit.prescriptions.length > 0
          ? visit.prescriptions.map((p, idx) => ({
            id: p._id || `${Date.now()}-${idx}`,
            medicine: p.medicine,
            qty: p.qty !== undefined && p.qty !== null ? String(p.qty) : '',
            morning: p.morning || '1',
            noon: p.noon || '0',
            evening: p.evening || '1',
            night: p.night || '0',
            timing: p.timing || 'AF',
          }))
          : [
            {
              id: Date.now() + '-p1',
              medicine: '',
              qty: '',
              morning: '1',
              noon: '0',
              evening: '1',
              night: '0',
              timing: 'AF',
            },
          ],
      charge: String(visit.charge || 0),
      received: String(visit.received || 0),
    });
    setAttachedReport(visit.labReport || null);
    setShowNewCaseForm(true);
    setTimeout(() => {
      if (bpInputRef.current) {
        bpInputRef.current.focus();
      }
    }, 80);
  };

  // --- Save / Update Visit & Optional Print ---
  const handleSaveVisit = async (andPrint = false) => {
    if (!currentPatient) {
      showToast('Please select a patient first', 'error');
      return;
    }

    try {
      setIsSavingVisit(true);
      const payload = {
        patientId: currentPatient.patientId,
        familyId: currentPatient.familyId,
        patientName: currentPatient.name,
        visitDate: visitForm.visitDate,
        bp: visitForm.bp,
        sugar: visitForm.sugar,
        other: visitForm.other,
        reference: visitForm.reference,
        investigation: (visitForm.investigation || '').replace(/,\s*$/, '').trim(),
        complaint: (visitForm.complaint || '').replace(/,\s*$/, '').trim(),
        treatments: visitForm.treatments
          .filter((t) => t.item && t.item.trim())
          .map((t) => ({ item: t.item.trim(), qty: t.qty.trim() || '1' })),
        prescriptions: visitForm.prescriptions
          .filter((p) => p.medicine && p.medicine.trim())
          .map((p) => ({
            medicine: p.medicine.trim(),
            qty: p.qty.trim(),
            morning: p.morning.trim() || '1',
            noon: p.noon.trim() || '0',
            evening: p.evening.trim() || '1',
            night: p.night.trim() || '0',
            timing: p.timing || 'AF',
          })),
        charge: chargeNum,
        received: receivedNum,
        labReport: attachedReport || null,
      };

      let res;
      if (editingVisitId) {
        res = await visitAPI.update(editingVisitId, payload);
      } else {
        res = await visitAPI.create(payload);
      }

      if (res.success) {
        showToast(
          editingVisitId
            ? 'Visit record updated successfully!'
            : 'New visit saved successfully and dues updated!'
        );

        setCurrentPatient((prev) => ({
          ...prev,
          totalDue: res.totalDue !== undefined ? res.totalDue : prev.totalDue,
          family: prev?.family
            ? {
              ...prev.family,
              familyDue:
                res.familyDue !== undefined ? res.familyDue : prev.family.familyDue,
            }
            : null,
        }));

        loadPatientVisits(currentPatient.patientId);

        // Reset and close case form
        setVisitForm({
          ...initialVisitForm,
          visitDate: getTodayDateStr(),
        });
        setEditingVisitId(null);
        setAttachedReport(null);
        setShowNewCaseForm(false);

        if (andPrint && res.visit) {
          setPrintVisit({
            ...res.visit,
            patient: currentPatient,
          });
          setPrintDietary(res.visit.dietary || visitForm.dietary || '');
          setPrintLanguage('en');
          setShowPrintModal(true);
        }
      }
    } catch (err) {
      console.error('Error saving visit:', err);
      showToast(err.response?.data?.message || 'Failed to save visit record', 'error');
    } finally {
      setIsSavingVisit(false);
    }
  };

  const handleDeleteVisit = async (visitId) => {
    if (!window.confirm('Are you sure you want to delete this visit record?')) return;
    try {
      const res = await visitAPI.delete(visitId);
      if (res.success) {
        showToast('Visit record deleted and dues updated');
        const patRes = await patientAPI.getById(currentPatient.patientId);
        if (patRes.success && patRes.patient) {
          setCurrentPatient(patRes.patient);
        }
        loadPatientVisits(currentPatient.patientId);
      }
    } catch (err) {
      showToast('Failed to delete visit', 'error');
    }
  };

  const handleOpenEditModal = () => {
    if (!currentPatient) return;
    setEditFormData({
      name: currentPatient.name || '',
      relation: currentPatient.relation || 'Member',
      age: currentPatient.age || '',
      gender: currentPatient.gender || 'Not Specified',
      bloodGroup: currentPatient.bloodGroup || '',
      allergies: Array.isArray(currentPatient.allergies)
        ? currentPatient.allergies.join(', ')
        : currentPatient.allergies || '',
      society: currentPatient.society || '',
      area: currentPatient.area || '',
      phone: currentPatient.phone || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEditPatient = async (e) => {
    e.preventDefault();
    if (!editFormData.name.trim()) {
      showToast('Patient name is required', 'error');
      return;
    }
    try {
      setEditSaving(true);
      const res = await patientAPI.update(currentPatient._id, editFormData);
      if (res.success && res.patient) {
        setCurrentPatient((prev) => ({
          ...prev,
          ...res.patient,
        }));
        setShowEditModal(false);
        showToast('Patient details updated successfully!');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update patient', 'error');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeletePatient = async () => {
    try {
      setDeletingPatient(true);
      const res = await patientAPI.delete(currentPatient._id);
      if (res.success) {
        setShowDeleteModal(false);
        showToast(`Patient ${currentPatient.name} deleted successfully.`);
        const listRes = await patientAPI.getAll('');
        if (listRes.success && listRes.data && listRes.data.length > 0) {
          setCurrentPatient(listRes.data[0]);
        } else {
          setCurrentPatient(null);
          setPatientVisits([]);
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete patient', 'error');
    } finally {
      setDeletingPatient(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Toast Notification */}
      {toastMessage.text && (
        <div
          style={{
            ...styles.toast,
            backgroundColor:
              toastMessage.type === 'error' ? 'var(--danger)' : 'var(--primary)',
          }}
        >
          {toastMessage.type === 'error' ? (
            <AlertCircle size={16} color="#FFF" />
          ) : (
            <CheckCircle size={16} color="#FFF" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* COMPACT TOP ROW: SEARCH BAR + VIEW MODE CONTROLS */}
      <div style={styles.topControlRow}>
        <div style={styles.searchSection} ref={searchWrapRef}>
          <div style={styles.searchInputWrapper}>
            <Search size={15} color="var(--text-muted)" style={styles.searchIcon} />
            <input
              type="text"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setShowSearchDropdown(true);
              }}
              placeholder="Universal Search: Name, Family ID (shows all members), Patient ID, Area..."
              style={styles.searchInput}
            />
            {patientSearch && (
              <button
                type="button"
                onClick={() => {
                  setPatientSearch('');
                  setSearchResults([]);
                  setShowSearchDropdown(false);
                }}
                style={styles.clearSearchBtn}
              >
                <X size={14} color="var(--text-muted)" />
              </button>
            )}
          </div>

          {/* Floating Patient Suggestions Dropdown */}
          {showSearchDropdown && searchResults.length > 0 && (
            <div style={styles.dropdownMenu}>
              <div style={styles.dropdownHeader}>
                <span>Found {searchResults.length} matching patients</span>
              </div>
              {searchResults.map((p) => {
                const pDue = p.totalDue || 0;
                const isSelected = currentPatient?.patientId === p.patientId;
                return (
                  <div
                    key={p._id || p.patientId}
                    onClick={() => handleSelectPatient(p)}
                    style={{
                      ...styles.dropdownItem,
                      backgroundColor: isSelected ? 'var(--primary-soft)' : '#FFFFFF',
                    }}
                  >
                    <div style={styles.dropdownItemLeft}>
                      <div style={styles.dropdownItemNameRow}>
                        <span style={styles.dropdownItemName}>{p.name}</span>
                        <span style={styles.dropdownItemBadge}>{p.patientId}</span>
                        {p.isHead && <span style={styles.headTag}>HEAD</span>}
                      </div>
                      <div style={styles.dropdownItemSub}>
                        <span>
                          Family: {p.family?.headName || 'Self'} (FAM-{p.familyId})
                        </span>
                        <span>&bull;</span>
                        <span>
                          {p.relation} &bull; Age {p.age || '-'} &bull; {p.bloodGroup || 'Blood N/A'}
                        </span>
                        {p.area && (
                          <>
                            <span>&bull;</span>
                            <span>{p.area}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div style={styles.dropdownItemRight}>
                      {pDue > 0 ? (
                        <span style={styles.dueBadgeDropdown}>Due: ₹{pDue}</span>
                      ) : (
                        <span style={styles.clearBadgeDropdown}>Clear</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* View Layout Mode Buttons (Stacked vs Side-by-Side) */}
        <div style={styles.viewModeButtonGroup}>
          <button
            type="button"
            onClick={() => setLayoutMode('stacked')}
            style={{
              ...styles.viewModeBtn,
              backgroundColor: layoutMode === 'stacked' ? 'var(--primary-soft)' : '#FFFFFF',
              color: layoutMode === 'stacked' ? 'var(--primary-dark)' : 'var(--text-muted)',
              borderColor: layoutMode === 'stacked' ? 'var(--primary)' : 'var(--border)',
            }}
            title="Stacked View (Top Form / Bottom History)"
          >
            <Rows size={14} />
            <span>Stacked</span>
          </button>
          <button
            type="button"
            onClick={() => setLayoutMode('side-by-side')}
            style={{
              ...styles.viewModeBtn,
              backgroundColor: layoutMode === 'side-by-side' ? 'var(--primary-soft)' : '#FFFFFF',
              color: layoutMode === 'side-by-side' ? 'var(--primary-dark)' : 'var(--text-muted)',
              borderColor: layoutMode === 'side-by-side' ? 'var(--primary)' : 'var(--border)',
            }}
            title="Side-by-Side View (Left Form / Right History)"
          >
            <Columns size={14} />
            <span>Split View</span>
          </button>
        </div>
      </div>

      {/* ULTRA-COMPACT PATIENT INFO BANNER CARD */}
      {currentPatient ? (
        <div style={styles.patientBannerCard}>
          <div style={styles.bannerTopRow}>
            {/* Left: Patient Name, Patient ID Badge & Total Due Pill */}
            <div style={styles.bannerNameCol}>
              <h2 style={styles.patientNameHeading}>{currentPatient.name}</h2>
              <span style={styles.patientIdBadgeDisplay}>
                PID: {currentPatient.patientId}
              </span>
              <button
                type="button"
                onClick={() => setShowTotalDueModal(true)}
                style={{
                  ...styles.totalDuePillBtn,
                  backgroundColor:
                    (currentPatient.totalDue || 0) > 0 ? '#B3524A' : '#146B5C',
                }}
                title="Click to view Patient Personal Due Breakdown"
              >
                <Receipt size={12} />
                <span>TOTAL DUE: ₹{currentPatient.totalDue || 0}</span>
                <ExternalLink size={10} style={{ opacity: 0.85 }} />
              </button>
            </div>

            {/* Right: Delete & Edit Patient Buttons */}
            <div style={styles.bannerActionsCol}>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                style={styles.deletePatientBtn}
                title="Delete this patient record"
              >
                <Trash2 size={13} color="#B3524A" />
                <span>Delete</span>
              </button>

              <button
                type="button"
                onClick={handleOpenEditModal}
                style={styles.editPatientBtn}
                title="Edit patient demographic details"
              >
                <Edit3 size={13} color="#146B5C" />
                <span>Edit</span>
              </button>
            </div>
          </div>

          {/* Bottom Subtitle Row */}
          <div style={styles.bannerBottomRow}>
            <span style={styles.bannerFamilyText}>
              Family:{' '}
              <strong>
                {currentPatient.family?.headName || currentPatient.name}
              </strong>
              {currentPatient.area ? ` (${currentPatient.area.toUpperCase()})` : ''}
            </span>

            <button
              type="button"
              onClick={handleOpenFamilyDueModal}
              style={{
                ...styles.famDuePillBtn,
                backgroundColor:
                  (currentPatient.family?.familyDue || 0) > 0 ? '#FEF2F2' : '#F0FDF4',
                borderColor:
                  (currentPatient.family?.familyDue || 0) > 0 ? '#FECACA' : '#BBF7D0',
                color:
                  (currentPatient.family?.familyDue || 0) > 0 ? '#DC2626' : '#16A34A',
              }}
              title="Click to view Family Due Breakdown across all members"
            >
              <Users size={11} />
              <span>FAM DUE: ₹{currentPatient.family?.familyDue || 0}</span>
              <ExternalLink size={10} style={{ opacity: 0.85 }} />
            </button>

            <span style={styles.dotSeparator}>&bull;</span>
            <span style={styles.subDetailText}>
              {currentPatient.relation || 'Member'}
            </span>

            <span style={styles.dotSeparator}>&bull;</span>
            <span style={styles.subDetailText}>
              Age {currentPatient.age || 'N/A'}
            </span>

            <span style={styles.dotSeparator}>&bull;</span>
            <span style={styles.subDetailText}>
              {currentPatient.bloodGroup || 'Blood: --'}
            </span>

            {currentPatient.phone && (
              <>
                <span style={styles.dotSeparator}>&bull;</span>
                <span style={styles.subDetailText}>
                  📞 {currentPatient.phone}
                </span>
              </>
            )}

            {Array.isArray(currentPatient.allergies) &&
              currentPatient.allergies.length > 0 && (
                <>
                  <span style={styles.dotSeparator}>&bull;</span>
                  <span style={styles.allergiesPill}>
                    ⚠️ Allergies: {currentPatient.allergies.join(', ')}
                  </span>
                </>
              )}
          </div>
        </div>
      ) : (
        <div style={styles.noPatientSelected}>
          <User size={30} color="var(--text-muted)" />
          <p style={styles.noPatientText}>
            No patient selected. Search by name, Patient ID, or Family ID above.
          </p>
          <button
            type="button"
            onClick={onNavigateToAddMember}
            style={styles.registerNewMemberBtn}
          >
            + Register New Member
          </button>
        </div>
      )}

      {/* CLINICAL VISIT SECTION: SUPPORTING STACKED OR SIDE-BY-SIDE WITH DRAGGERS */}
      {currentPatient && (
        <div
          ref={splitContainerRef}
          style={{
            ...styles.visitLayoutWrapper,
            flexDirection: layoutMode === 'side-by-side' ? 'row' : 'column',
          }}
        >
          {/* LEFT / TOP PANE: THE CASE ENTRY FORM (SHOWN WHEN showNewCaseForm IS TRUE) */}
          {showNewCaseForm && (
            <div
              style={{
                ...styles.visitFormPane,
                width: layoutMode === 'side-by-side' ? `${splitWidthPercent}%` : '100%',
                flexShrink: 0,
              }}
            >
              <div style={styles.highlightedVisitCard}>
                {/* Header Row: Title, Date, Add Report Button (Right Corner), and Close */}
                <div style={styles.caseEntryHeaderRow}>
                  <div style={styles.caseHeaderLeft}>
                    <span style={styles.caseEntryHeaderTitle}>
                      {editingVisitId ? 'Edit Clinical Case Entry' : 'Clinical Case Entry (New Visit)'}
                    </span>
                    {editingVisitId && (
                      <span style={styles.editingTag}>Editing Past Case</span>
                    )}

                    {/* Date Input right in the row of new case title */}
                    <div style={styles.titleDateWrap}>
                      <span style={styles.titleDateLabel}>Date:</span>
                      <input
                        type="date"
                        value={visitForm.visitDate}
                        onChange={(e) =>
                          setVisitForm({ ...visitForm, visitDate: e.target.value })
                        }
                        style={styles.titleDateInput}
                      />
                    </div>
                  </div>

                  {/* Right corner of same row: Report Add / Attached Badge & Close Button */}
                  <div style={styles.caseHeaderRight}>
                    {attachedReport ? (
                      <div style={styles.attachedReportGroup}>
                        <button
                          type="button"
                          onClick={() => setShowAddReportModal(true)}
                          style={styles.reportAttachedBtn}
                          title="Click to View or Edit Attached Lab Report"
                        >
                          <FileText size={13} color="#15803D" />
                          <span>Report Attached ({attachedReport.reportId || 'Ready'})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAttachedReport(null)}
                          style={styles.detachReportBtn}
                          title="Detach this report from case"
                        >
                          <X size={12} color="#DC2626" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowAddReportModal(true)}
                        style={styles.reportAddBtn}
                        title="Add Diagnostic Lab Report"
                      >
                        <FileText size={14} color="#146B5C" />
                        <span>+ Add Report</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setShowNewCaseForm(false);
                        setEditingVisitId(null);
                        setAttachedReport(null);
                      }}
                      style={styles.closeCaseBtn}
                      title="Close case entry form"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>

                {/* Vitals Grid: BP, Sugar, Other, Reference, Investigation, Complaint, Dietary */}
                <div style={styles.vitalsRowGrid}>
                  <div style={{ ...styles.fieldCol, width: '74px', flex: 'none' }}>
                    <label style={styles.miniLabel}>BP</label>
                    <input
                      ref={bpInputRef}
                      type="text"
                      placeholder="e.g. 120/80"
                      value={visitForm.bp}
                      onChange={(e) =>
                        setVisitForm({ ...visitForm, bp: e.target.value })
                      }
                      style={styles.vitalsInput}
                    />
                  </div>

                  <div style={{ ...styles.fieldCol, width: '70px', flex: 'none' }}>
                    <label style={styles.miniLabel}>SUGAR</label>
                    <input
                      type="text"
                      placeholder="mg/dL"
                      value={visitForm.sugar}
                      onChange={(e) =>
                        setVisitForm({ ...visitForm, sugar: e.target.value })
                      }
                      style={styles.vitalsInput}
                    />
                  </div>

                  <div style={{ ...styles.fieldCol, width: '80px', flex: 'none' }}>
                    <label style={styles.miniLabel}>OTHER</label>
                    <input
                      type="text"
                      placeholder="Pulse/Temp"
                      value={visitForm.other}
                      onChange={(e) =>
                        setVisitForm({ ...visitForm, other: e.target.value })
                      }
                      style={styles.vitalsInput}
                    />
                  </div>

                  <div style={{ ...styles.fieldCol, width: '90px', flex: 'none' }}>
                    <label style={styles.miniLabel}>REFERENCE</label>
                    <input
                      type="text"
                      placeholder="Dr. Ref"
                      value={visitForm.reference}
                      onChange={(e) =>
                        setVisitForm({ ...visitForm, reference: e.target.value })
                      }
                      style={styles.vitalsInput}
                    />
                  </div>

                  <div style={{ ...styles.fieldCol, flex: 1.2, minWidth: '140px' }}>
                    <label style={styles.miniLabel}>INVESTIGATION</label>
                    <MasterDataInput
                      type="investigation"
                      allowMultiple={true}
                      value={visitForm.investigation}
                      onChange={(val) =>
                        setVisitForm({ ...visitForm, investigation: val })
                      }
                      placeholder="CBC, X-Ray, etc."
                      inputStyle={styles.vitalsInput}
                    />
                  </div>

                  <div style={{ ...styles.fieldCol, flex: 1.6, minWidth: '160px' }}>
                    <label style={styles.miniLabel}>COMPLAINT</label>
                    <MasterDataInput
                      type="complaint"
                      allowMultiple={true}
                      value={visitForm.complaint}
                      onChange={(val) =>
                        setVisitForm({ ...visitForm, complaint: val })
                      }
                      placeholder="Fever, Cough, etc."
                      inputStyle={styles.vitalsInput}
                    />
                  </div>
                </div>

                {/* TREATMENT AND PRESCRIPTION BOTH SECTION IN THE SAME ROW */}
                <div style={styles.treatmentPrescriptionGrid}>
                  {/* Left Column: TREATMENT (CLINIC) with Data Dictionary */}
                  <div style={styles.halfSectionBlock}>
                    <div style={styles.subSectionHeader}>
                      <span style={styles.subSectionTitle}>TREATMENT (CLINIC)</span>
                    </div>

                    {visitForm.treatments.map((treatment, idx) => (
                      <div key={treatment.id} style={styles.treatmentRow}>
                        {/* Data dictionary autocomplete for treatment */}
                        <div style={{ flex: 1 }}>
                          <MasterDataInput
                            type="medicine"
                            value={treatment.item}
                            onChange={(val) =>
                              handleUpdateTreatment(treatment.id, 'item', val)
                            }
                            placeholder="Item (e.g. Dressing, PCM)"
                            inputStyle={styles.tableInput}
                          />
                        </div>

                        <div style={{ width: '48px', flexShrink: 0 }}>
                          <input
                            type="number"
                            min="1"
                            placeholder="Qty"
                            value={treatment.qty}
                            onChange={(e) =>
                              handleUpdateTreatment(treatment.id, 'qty', e.target.value)
                            }
                            style={{ ...styles.tableInput, textAlign: 'center', padding: '0 2px' }}
                          />
                        </div>

                        <div style={styles.actionBtnCol}>
                          {idx === visitForm.treatments.length - 1 ? (
                            <button
                              type="button"
                              onClick={handleAddTreatment}
                              style={styles.addRowBtn}
                              title="Add treatment row"
                            >
                              <Plus size={14} color="var(--primary)" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRemoveTreatment(treatment.id)}
                              style={styles.removeRowBtn}
                              title="Remove treatment row"
                            >
                              <Minus size={14} color="var(--danger)" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Right Column: PRESCRIPTION (MEDICAL STORE) */}
                  <div style={styles.halfSectionBlock}>
                    <div style={styles.subSectionHeader}>
                      <span style={styles.subSectionTitle}>PRESCRIPTION (MEDICAL STORE)</span>
                    </div>

                    {visitForm.prescriptions.map((rx, idx) => (
                      <div key={rx.id} style={styles.prescriptionRow}>
                        {/* Medicine Autocomplete */}
                        <div style={{ flex: 1.8, minWidth: '120px' }}>
                          <MasterDataInput
                            type="medicine"
                            value={rx.medicine}
                            onChange={(val) =>
                              handleUpdatePrescription(rx.id, 'medicine', val)
                            }
                            placeholder="Medicine name"
                            inputStyle={styles.tableInput}
                          />
                        </div>

                        {/* Quantity */}
                        <div style={{ width: '48px', flexShrink: 0 }}>
                          <input
                            type="number"
                            min="1"
                            placeholder="Qty"
                            value={rx.qty}
                            onChange={(e) =>
                              handleUpdatePrescription(rx.id, 'qty', e.target.value)
                            }
                            style={{ ...styles.tableInput, textAlign: 'center', padding: '0 2px' }}
                          />
                        </div>

                        {/* M, N, E, Ng inputs */}
                        <div style={{ width: '30px' }}>
                          <input
                            type="text"
                            placeholder="M"
                            value={rx.morning}
                            onChange={(e) =>
                              handleUpdatePrescription(rx.id, 'morning', e.target.value)
                            }
                            style={styles.doseInput}
                            title="Morning dose"
                          />
                        </div>

                        <div style={{ width: '30px' }}>
                          <input
                            type="text"
                            placeholder="N"
                            value={rx.noon}
                            onChange={(e) =>
                              handleUpdatePrescription(rx.id, 'noon', e.target.value)
                            }
                            style={styles.doseInput}
                            title="Noon dose"
                          />
                        </div>

                        <div style={{ width: '30px' }}>
                          <input
                            type="text"
                            placeholder="E"
                            value={rx.evening}
                            onChange={(e) =>
                              handleUpdatePrescription(rx.id, 'evening', e.target.value)
                            }
                            style={styles.doseInput}
                            title="Evening dose"
                          />
                        </div>

                        <div style={{ width: '30px' }}>
                          <input
                            type="text"
                            placeholder="Ng"
                            value={rx.night}
                            onChange={(e) =>
                              handleUpdatePrescription(rx.id, 'night', e.target.value)
                            }
                            style={styles.doseInput}
                            title="Night dose"
                          />
                        </div>

                        {/* Timing Radio (BF / AF) */}
                        <div style={styles.timingRadioGroup}>
                          <label style={styles.radioLabel}>
                            <input
                              type="radio"
                              name={`timing-${rx.id}`}
                              value="BF"
                              checked={rx.timing === 'BF'}
                              onChange={() =>
                                handleUpdatePrescription(rx.id, 'timing', 'BF')
                              }
                            />
                            <span>BF</span>
                          </label>
                          <label style={styles.radioLabel}>
                            <input
                              type="radio"
                              name={`timing-${rx.id}`}
                              value="AF"
                              checked={rx.timing === 'AF'}
                              onChange={() =>
                                handleUpdatePrescription(rx.id, 'timing', 'AF')
                              }
                            />
                            <span>AF</span>
                          </label>
                        </div>

                        {/* Add / Remove Button */}
                        <div style={styles.actionBtnCol}>
                          {idx === visitForm.prescriptions.length - 1 ? (
                            <button
                              type="button"
                              onClick={handleAddPrescription}
                              style={styles.addRowBtn}
                              title="Add medicine row"
                            >
                              <Plus size={14} color="var(--primary)" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRemovePrescription(rx.id)}
                              style={styles.removeRowBtn}
                              title="Remove medicine row"
                            >
                              <Minus size={14} color="var(--danger)" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* BILLING & ACTIONS FOOTER ROW */}
                <div style={styles.billingActionsRow}>
                  {/* Left: Charge, Received, Due */}
                  <div style={styles.billingInputsGroup}>
                    <div style={styles.billingField}>
                      <label style={styles.billingLabel}>CHARGE</label>
                      <input
                        type="number"
                        min="0"
                        value={visitForm.charge}
                        onChange={(e) =>
                          setVisitForm({ ...visitForm, charge: e.target.value })
                        }
                        style={styles.billingInput}
                      />
                    </div>

                    <div style={styles.billingField}>
                      <label style={styles.billingLabel}>RECEIVED</label>
                      <input
                        type="number"
                        min="0"
                        value={visitForm.received}
                        onChange={(e) =>
                          setVisitForm({ ...visitForm, received: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveVisit(true);
                          }
                        }}
                        style={styles.billingInput}
                        title="Press Enter to Save & Print Case"
                      />
                    </div>

                    <div style={styles.billingField}>
                      <label style={styles.billingLabel}>DUE</label>
                      <div
                        style={{
                          ...styles.dueDisplayBox,
                          color: computedDue > 0 ? '#B3524A' : '#146B5C',
                        }}
                      >
                        ₹{computedDue}
                      </div>
                    </div>
                  </div>

                  {/* Right: Cancel & Save Buttons */}
                  <div style={styles.actionButtonsGroup}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewCaseForm(false);
                        setEditingVisitId(null);
                      }}
                      style={styles.cancelDraftBtn}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveVisit(false)}
                      disabled={isSavingVisit}
                      style={styles.saveOnlyBtn}
                    >
                      <Save size={14} />
                      <span>{isSavingVisit ? 'Saving...' : editingVisitId ? 'Update Case' : 'Save Case'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveVisit(true)}
                      disabled={isSavingVisit}
                      style={styles.saveAndPrintBtn}
                      title="Save and print case (Enter / Ctrl+Enter)"
                    >
                      <Printer size={14} />
                      <span>
                        {isSavingVisit ? 'Recording...' : editingVisitId ? 'Update & Print' : 'Save & Print'}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          opacity: 0.9,
                          backgroundColor: 'rgba(255,255,255,0.22)',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          marginLeft: '4px',
                          fontWeight: 'bold',
                        }}
                      >
                        Enter
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DRAGGER HANDLE: WHEN showNewCaseForm IS ACTIVE */}
          {showNewCaseForm && (
            layoutMode === 'side-by-side' ? (
              <div
                onMouseDown={() => setIsDraggingV(true)}
                style={{
                  ...styles.verticalDraggerBar,
                  backgroundColor: isDraggingV ? 'var(--primary)' : 'var(--border)',
                }}
                title="Drag border to resize Case Entry vs History width"
              >
                <div style={styles.draggerGripV}>
                  <GripVertical size={14} color="var(--text-muted)" />
                </div>
              </div>
            ) : (
              <div
                onMouseDown={() => setIsDraggingH(true)}
                style={{
                  ...styles.horizontalDraggerBar,
                  backgroundColor: isDraggingH ? 'var(--primary)' : 'var(--border)',
                }}
                title="Drag border to resize Case Entry vs History height"
              >
                <div style={styles.draggerGripH}>
                  <GripHorizontal size={14} color="var(--text-muted)" />
                  <span style={styles.draggerHintText}>
                    Drag border to resize sections
                  </span>
                </div>
              </div>
            )
          )}

          {/* RIGHT / BOTTOM PANE: PREVIOUS RECORDED VISITS LIST */}
          <div
            style={{
              ...styles.visitHistoryPane,
              width: showNewCaseForm && layoutMode === 'side-by-side' ? `${100 - splitWidthPercent}%` : '100%',
              height: showNewCaseForm && layoutMode === 'stacked' ? `${historyHeight}px` : '100%',
              maxHeight: showNewCaseForm && layoutMode === 'stacked' ? `${historyHeight}px` : 'none',
              minHeight: showNewCaseForm && layoutMode === 'stacked' ? '280px' : 0,
              flex: 1,
              overflowY: 'auto',
            }}
          >
            <div style={styles.historyListSection}>
              <div style={styles.historySectionHeaderRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h4 style={styles.historySectionSubTitle}>
                    Visit History ({patientVisits.length})
                  </h4>
                </div>

                {/* Prominent Button for New Case when form is not open */}
                {!showNewCaseForm && (
                  <button
                    type="button"
                    onClick={handleOpenNewCase}
                    style={styles.openNewCaseBtn}
                    title="Open clinical case entry form (Alt+N or F3)"
                  >
                    <Plus size={14} />
                    <span>New Case</span>
                    <span
                      style={{
                        fontSize: '10px',
                        opacity: 0.9,
                        backgroundColor: 'rgba(255,255,255,0.22)',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        marginLeft: '3px',
                        fontWeight: 'bold',
                      }}
                    >
                      Alt+N
                    </span>
                  </button>
                )}
              </div>

              {loadingVisits ? (
                <div style={styles.emptyState}>Loading visits...</div>
              ) : patientVisits.length === 0 ? (
                <div style={styles.emptyState}>
                  <p style={{ margin: 0, fontWeight: 500 }}>No visits recorded yet.</p>
                  {!showNewCaseForm && (
                    <button
                      type="button"
                      onClick={handleOpenNewCase}
                      style={{ ...styles.openNewCaseBtn, marginTop: 8 }}
                    >
                      <Plus size={14} />
                      <span>Start First Case Entry</span>
                    </button>
                  )}
                </div>
              ) : (
                <div style={styles.visitsListGrid}>
                  {patientVisits.map((visit) => (
                    <div key={visit._id} style={styles.visitHistoryCard}>
                      {/* CARD HEADER: Date, Vitals & Actions */}
                      <div style={styles.visitCardHeader}>
                        <div style={styles.visitCardDate}>
                          <Calendar size={14} color="#146B5C" />
                          <span style={styles.visitDateText}>
                            {new Date(visit.visitDate).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                          {visit.bp && <span style={styles.vitalsBadgeBP}>BP: {visit.bp}</span>}
                          {visit.sugar && (
                            <span style={styles.vitalsBadgeSugar}>
                              Sugar: {visit.sugar}
                            </span>
                          )}
                          {visit.other && (
                            <span style={styles.vitalsBadgeOther}>{visit.other}</span>
                          )}
                        </div>

                        <div style={styles.visitCardActions}>
                          <span
                            style={{
                              ...styles.visitDueBadge,
                              backgroundColor:
                                visit.due > 0 ? '#FEF2F2' : '#F0FDF4',
                              borderColor:
                                visit.due > 0 ? '#FECACA' : '#BBF7D0',
                              color:
                                visit.due > 0 ? '#DC2626' : '#16A34A',
                            }}
                          >
                            {visit.due > 0 ? `Due: ₹${visit.due}` : '✓ Settled'}
                          </span>

                          {/* LAB REPORT BUTTON IF ATTACHED */}
                          {visit.labReport && (
                            <button
                              type="button"
                              onClick={() => setViewingPastReport(visit.labReport)}
                              style={styles.viewPastReportBtn}
                              title="Click to View Diagnostic Lab Report"
                            >
                              <FileText size={12} color="#0F766E" />
                              <span>🔬 Lab Report ({visit.labReport.reportId || 'Attached'})</span>
                            </button>
                          )}

                          {/* EDIT CASE OPTION FOR PAST RECORDED VISITS */}
                          <button
                            type="button"
                            onClick={() => handleStartEditVisit(visit)}
                            style={styles.editVisitBtn}
                            title="Edit this recorded case"
                          >
                            <Edit3 size={12} />
                            <span>Edit</span>
                          </button>

                          {/* PRINT CASE PRESCRIPTION */}
                          <button
                            type="button"
                            onClick={() => {
                              setPrintVisit({
                                ...visit,
                                patient: currentPatient,
                              });
                              setPrintDietary(visit.dietary || '');
                              setPrintLanguage('en');
                              setShowPrintModal(true);
                            }}
                            style={styles.printPastRxBtn}
                            title="Print Prescription"
                          >
                            <Printer size={12} />
                            <span>Print</span>
                          </button>

                          {/* DELETE CASE OPTION FOR PAST RECORDED VISITS */}
                          <button
                            type="button"
                            onClick={() => handleDeleteVisit(visit._id)}
                            style={styles.deleteVisitBtn}
                            title="Delete this visit record"
                          >
                            <Trash2 size={12} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>

                      {/* ROW 1: CLINICAL FINDINGS (Complaints & Investigations in SAME ROW) */}
                      {(visit.complaint || visit.investigation) && (
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns:
                              visit.complaint && visit.investigation ? '1fr 1fr' : '1fr',
                            gap: '6px',
                          }}
                        >
                          {visit.complaint && (
                            <div style={styles.complaintBlock}>
                              <div style={styles.complaintHeaderRow}>
                                <Stethoscope size={11} color="#DC2626" />
                                <span style={styles.complaintHeaderLabel}>Complaint:</span>
                              </div>
                              <div style={styles.clinicalChipsRow}>
                                {visit.complaint.split(',').map((c, i) => {
                                  const trimmed = c.trim();
                                  if (!trimmed) return null;
                                  return (
                                    <span key={i} style={styles.complaintChip}>
                                      {trimmed}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {visit.investigation && (
                            <div style={styles.investigationBlock}>
                              <div style={styles.investigationHeaderRow}>
                                <Activity size={11} color="#2563EB" />
                                <span style={styles.investigationHeaderLabel}>Investigation:</span>
                              </div>
                              <div style={styles.clinicalChipsRow}>
                                {visit.investigation.split(',').map((inv, i) => {
                                  const trimmed = inv.trim();
                                  if (!trimmed) return null;
                                  return (
                                    <span key={i} style={styles.investigationChip}>
                                      {trimmed}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ROW 2: THERAPEUTICS (Treatments & Prescriptions in SAME ROW) */}
                      {((visit.treatments && visit.treatments.length > 0) ||
                        (visit.prescriptions && visit.prescriptions.length > 0)) && (
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns:
                              visit.treatments?.length > 0 && visit.prescriptions?.length > 0
                                ? 'minmax(180px, 1fr) minmax(260px, 1.4fr)'
                                : '1fr',
                            gap: '6px',
                          }}
                        >
                          {/* TREATMENT (CLINIC) */}
                          {visit.treatments && visit.treatments.length > 0 && (
                            <div style={styles.pastTreatmentsBlock}>
                              <div style={styles.treatmentHeaderRow}>
                                <span style={styles.treatmentHeaderLabel}>Treatment:</span>
                              </div>
                              <div style={styles.treatmentChipsRow}>
                                {visit.treatments.map((t, tIdx) => (
                                  <span key={tIdx} style={styles.treatmentChip}>
                                    {t.item} {t.qty ? `(${t.qty})` : ''}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* PRESCRIPTIONS (Rx) */}
                          {visit.prescriptions && visit.prescriptions.length > 0 && (
                            <div style={styles.pastPrescriptionBlock}>
                              <div style={styles.rxHeaderRow}>
                                <Pill size={11} color="#0F766E" />
                                <span style={styles.rxHeaderLabel}>Rx:</span>
                              </div>
                              <div style={styles.pastRxChips}>
                                {visit.prescriptions.map((rx, rIdx) => (
                                  <div key={rIdx} style={styles.rxCard}>
                                    <span style={styles.rxMedName}>{rx.medicine}</span>
                                    {rx.qty && (
                                      <span style={styles.rxQtyBadge}>
                                        {String(rx.qty).toLowerCase().includes('tab') ? rx.qty : `${rx.qty} Tab`}
                                      </span>
                                    )}
                                    <span style={styles.rxDoseBadge}>
                                      {rx.morning ?? 0}-{rx.noon ?? 0}-{rx.evening ?? 0}-{rx.night ?? 0}
                                    </span>
                                    {rx.timing && (
                                      <span style={styles.rxTimingBadge}>
                                        {rx.timing === 'AF' ? 'AF' : rx.timing === 'BF' ? 'BF' : rx.timing}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* SUBTLE FINANCIAL BREAKDOWN FOOTER */}
                      {(visit.charge > 0 || visit.received > 0 || visit.due > 0) && (
                        <div style={styles.visitFinancialStrip}>
                          <span>Charge: <strong>₹{visit.charge || 0}</strong></span>
                          <span style={styles.stripDot}>•</span>
                          <span>Paid: <strong style={{ color: '#16A34A' }}>₹{visit.received || 0}</strong></span>
                          <span style={styles.stripDot}>•</span>
                          <span>Due: <strong style={{ color: visit.due > 0 ? '#DC2626' : '#16A34A' }}>₹{visit.due || 0}</strong></span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: EDIT PATIENT DETAILS */}
      {showEditModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div style={styles.modalHeaderTitle}>
                <Edit3 size={16} color="var(--primary)" />
                <h3>Edit Patient Demographics</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                style={styles.closeModalBtn}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEditPatient} style={styles.modalForm}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Patient Full Name *</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                  style={styles.modalInput}
                />
              </div>

              <div style={styles.formGrid2}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Relation to Family Head</label>
                  <input
                    type="text"
                    value={editFormData.relation}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        relation: e.target.value,
                      })
                    }
                    style={styles.modalInput}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Age (e.g. 45, 6M, 2Y)</label>
                  <input
                    type="text"
                    value={editFormData.age}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, age: e.target.value })
                    }
                    style={styles.modalInput}
                  />
                </div>
              </div>

              <div style={styles.formGrid2}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Blood Group</label>
                  <select
                    value={editFormData.bloodGroup}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        bloodGroup: e.target.value,
                      })
                    }
                    style={styles.modalInput}
                  >
                    <option value="">-- Select --</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Contact Phone</label>
                  <input
                    type="text"
                    value={editFormData.phone}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, phone: e.target.value })
                    }
                    style={styles.modalInput}
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Known Allergies</label>
                <MasterDataInput
                  type="allergy"
                  value={editFormData.allergies}
                  onChange={(val) =>
                    setEditFormData({ ...editFormData, allergies: val })
                  }
                  placeholder="e.g. Penicillin, Sulfa"
                  inputStyle={styles.modalInput}
                />
              </div>

              <div style={styles.formGrid2}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Society / Flat</label>
                  <MasterDataInput
                    type="society"
                    value={editFormData.society}
                    onChange={(val) =>
                      setEditFormData({ ...editFormData, society: val })
                    }
                    placeholder="e.g. Shanti Niketan"
                    inputStyle={styles.modalInput}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Area / Location</label>
                  <MasterDataInput
                    type="area"
                    value={editFormData.area}
                    onChange={(val) =>
                      setEditFormData({ ...editFormData, area: val })
                    }
                    placeholder="e.g. Vastrapur"
                    inputStyle={styles.modalInput}
                  />
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={styles.modalCancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  style={styles.modalSubmitBtn}
                >
                  {editSaving ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DELETE PATIENT CONFIRMATION */}
      {showDeleteModal && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalCard, maxWidth: '420px' }}>
            <div style={styles.modalHeader}>
              <div style={styles.modalHeaderTitle}>
                <AlertCircle size={18} color="var(--danger)" />
                <h3 style={{ color: 'var(--danger)', fontSize: '15px' }}>
                  Confirm Patient Deletion
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                style={styles.closeModalBtn}
              >
                <X size={16} />
              </button>
            </div>

            <div style={styles.modalBodyText}>
              <p>
                Delete patient <strong>{currentPatient?.name}</strong> (
                {currentPatient?.patientId})?
              </p>
              <p style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                This removes patient profile and associated visits. Family dues will
                recalculate automatically.
              </p>
            </div>

            <div style={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                style={styles.modalCancelBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePatient}
                disabled={deletingPatient}
                style={styles.dangerConfirmBtn}
              >
                {deletingPatient ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: PRINTABLE PRESCRIPTION PREVIEW (CLEAN LETTERHEAD MODE WITH LANGUAGE & DIETARY SUPPORT) */}
      {showPrintModal && printVisit && (() => {
        const t = RX_TRANSLATIONS[printLanguage] || RX_TRANSLATIONS.en;
        const formattedDate = formatRxDate(printVisit.visitDate);
        const dietaryItems = (printDietary || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);

        return (
          <div style={styles.modalOverlay}>
            <div style={styles.printModalCard}>
              {/* MODAL TOP HEADER (NON-PRINTABLE) */}
              <div style={styles.printModalHeader} className="no-print">
                <div style={styles.printClinicBadge}>
                  <Printer size={16} color="var(--primary)" />
                  <span>Prescription Print Center</span>
                </div>
                <div style={styles.printActionButtons}>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    style={styles.printTriggerBtn}
                    title="Click or press Ctrl+P to Print Prescription"
                  >
                    <Printer size={14} />
                    <span>Print Prescription</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPrintModal(false)}
                    style={styles.closeModalBtn}
                    title="Close"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* CONTROLS BAR: LANGUAGE SELECTION, STATIONERY MODE & DIETARY SUGGESTIONS (NON-PRINTABLE) */}
              <div style={styles.printControlPanel} className="no-print">
                {/* 1. Language Preference & Stationery Mode Selector */}
                <div style={styles.printOptionRow}>
                  <div style={styles.printOptionLabelCol}>
                    <Languages size={15} color="var(--primary)" />
                    <span style={styles.printOptionHeading}>Prescription Language:</span>
                  </div>
                  <div style={styles.langPillsGroup}>
                    {[
                      { key: 'en', label: 'English', flag: '🇬🇧' },
                      { key: 'hi', label: 'हिंदी (Hindi)', flag: '🇮🇳' },
                      { key: 'gu', label: 'ગુજરાતી (Gujarati)', flag: '🇮🇳' },
                    ].map((lang) => {
                      const isActive = printLanguage === lang.key;
                      return (
                        <button
                          key={lang.key}
                          type="button"
                          onClick={() => setPrintLanguage(lang.key)}
                          style={{
                            ...styles.langPillBtn,
                            backgroundColor: isActive ? 'var(--primary)' : 'var(--surface)',
                            color: isActive ? '#FFFFFF' : 'var(--text)',
                            borderColor: isActive ? 'var(--primary-dark)' : 'var(--border)',
                            fontWeight: isActive ? 700 : 500,
                            boxShadow: isActive ? '0 2px 6px rgba(20, 107, 92, 0.25)' : 'none',
                          }}
                        >
                          <span>{lang.flag}</span>
                          <span>{lang.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Letterpad Paper Print Mode Selector */}
                <div style={styles.printOptionRow}>
                  <div style={styles.printOptionLabelCol}>
                    <Printer size={15} color="var(--primary)" />
                    <span style={styles.printOptionHeading}>Print Stationery Mode:</span>
                  </div>
                  <div style={styles.langPillsGroup}>
                    <button
                      type="button"
                      onClick={() => setPrintMode('full')}
                      style={{
                        ...styles.langPillBtn,
                        backgroundColor: printMode === 'full' ? 'var(--primary)' : 'var(--surface)',
                        color: printMode === 'full' ? '#FFFFFF' : 'var(--text)',
                        borderColor: printMode === 'full' ? 'var(--primary-dark)' : 'var(--border)',
                        fontWeight: printMode === 'full' ? 700 : 500,
                      }}
                      title="Prints full Dr. Chirag Paghdal letterhead with address, Caduceus watermark & medical store footer"
                    >
                      <span>📄 Full Letterhead (Plain Paper / PDF)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintMode('padOnly')}
                      style={{
                        ...styles.langPillBtn,
                        backgroundColor: printMode === 'padOnly' ? 'var(--accent)' : 'var(--surface)',
                        color: printMode === 'padOnly' ? '#FFFFFF' : 'var(--text)',
                        borderColor: printMode === 'padOnly' ? '#B87428' : 'var(--border)',
                        fontWeight: printMode === 'padOnly' ? 700 : 500,
                      }}
                      title="Hides printed letterhead graphics so you can feed your physical clinic letterpad into the printer"
                    >
                      <span>🖨️ Feed Pre-Printed Pad (Stationery Mode)</span>
                    </button>
                  </div>
                </div>

                {/* 3. Dietary Suggestions Selection from Master Data */}
                <div style={styles.dietaryControlBox}>
                  <div style={styles.dietaryControlHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <UtensilsCrossed size={14} color="var(--primary)" />
                      <span style={styles.printOptionHeading}>Dietary Advice & Lifestyle (From Master Data):</span>
                    </div>
                    {dietaryItems.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleDietaryInputChange('')}
                        style={styles.clearDietaryBtn}
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {/* Autocomplete Input */}
                  <MasterDataInput
                    type="dietary"
                    allowMultiple={true}
                    value={printDietary}
                    onChange={(val) => handleDietaryInputChange(val)}
                    placeholder="Search or enter dietary advice (e.g. Low Salt, Diabetic Diet, Warm Water)..."
                    inputStyle={styles.dietarySearchInput}
                  />

                  {/* Quick Master Data Chips (Loaded from clinic_management_db) */}
                  {masterDietaryList.length > 0 && (
                    <div style={styles.quickChipsWrapper}>
                      <span style={styles.quickChipsLabel}>Click Master Data items to add/remove:</span>
                      <div style={styles.quickChipsRow}>
                        {masterDietaryList.map((d) => {
                          const isSelected = dietaryItems.some(
                            (it) => it.toLowerCase() === d.value.toLowerCase()
                          );
                          return (
                            <button
                              key={d._id || d.value}
                              type="button"
                              onClick={() => handleToggleDietaryChip(d.value)}
                              style={{
                                ...styles.masterDietaryChip,
                                backgroundColor: isSelected ? 'var(--primary)' : 'var(--surface-alt)',
                                color: isSelected ? '#FFFFFF' : 'var(--primary-dark)',
                                borderColor: isSelected ? 'var(--primary-dark)' : 'var(--border)',
                              }}
                              title={d.shortcut ? `Shortcut: ${d.shortcut}` : ''}
                            >
                              <span>{isSelected ? '✓ ' : '+ '}</span>
                              {d.shortcut && <span style={{ opacity: 0.85, marginRight: '4px' }}>[{d.shortcut}]</span>}
                              <span>{d.value}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Active Selected Dietary Items Badges */}
                  {dietaryItems.length > 0 && (
                    <div style={styles.selectedDietaryPillsRow}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#047857' }}>
                        Selected on Prescription:
                      </span>
                      {dietaryItems.map((item, idx) => (
                        <span key={idx} style={styles.activeDietaryTag}>
                          <span>{item}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleDietaryChip(item)}
                            style={styles.removeDietaryTagBtn}
                            title="Remove"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={styles.printHelpNotice}>
                  {printMode === 'full' ? (
                    <span>ℹ️ <strong>Full Letterhead Mode</strong>: Prints complete <strong>Dr. Chirag Paghdal</strong> letterpad with watermark, patient details, converted Rx dosage, dietary advice & Harsh Medical footer.</span>
                  ) : (
                    <span>🖨️ <strong>Pre-Printed Pad Mode</strong>: Letterhead graphics are hidden during print so you can insert your <strong>physical printed paper pad</strong> directly into printer!</span>
                  )}
                </div>
              </div>

              {/* PRINTABLE PRESCRIPTION PAPER (#printable-rx) */}
              <div
                style={styles.cleanRxPaper}
                id="printable-rx"
                className={printMode === 'padOnly' ? 'pad-only-mode' : 'full-pad-mode'}
              >
                {/* WATERMARK: CADUCEUS SEAL OF DR. CHIRAG PAGHDAL (DHYEY CLINIC) */}
                <div
                  className="letterpad-watermark"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 0,
                    opacity: 0.08,
                    display: printMode === 'padOnly' ? 'none' : 'block',
                  }}
                >
                  <svg width="270" height="270" viewBox="0 0 300 300">
                    <defs>
                      <path id="watermarkTopArc" d="M 45,150 A 105,105 0 0,1 255,150" fill="none" />
                      <path id="watermarkBottomArc" d="M 255,150 A 105,105 0 0,1 45,150" fill="none" />
                    </defs>
                    <circle cx="150" cy="150" r="138" fill="none" stroke="#0B63AC" strokeWidth="2.5" />
                    <circle cx="150" cy="150" r="128" fill="none" stroke="#0B63AC" strokeWidth="1" strokeDasharray="4 3" />
                    <circle cx="150" cy="150" r="86" fill="none" stroke="#0B63AC" strokeWidth="1.5" />
                    <text fill="#0B63AC" fontSize="13" fontWeight="900" letterSpacing="3.5" textAnchor="middle">
                      <textPath href="#watermarkTopArc" startOffset="50%">
                        DR. CHIRAG PAGHDAL
                      </textPath>
                    </text>
                    <text fill="#0B63AC" fontSize="12" fontWeight="800" letterSpacing="4" textAnchor="middle">
                      <textPath href="#watermarkBottomArc" startOffset="50%">
                        ★ DHYEY CLINIC ★
                      </textPath>
                    </text>
                    <g transform="translate(150, 150) scale(0.9) translate(-50, -60)" stroke="#0B63AC" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="50" y1="15" x2="50" y2="105" strokeWidth="3" />
                      <circle cx="50" cy="12" r="4.5" fill="#0B63AC" />
                      <polygon points="50,110 47,104 53,104" fill="#0B63AC" />
                      <path d="M 50,25 C 32,15 15,18 8,28 C 18,32 30,34 50,38" fill="none" strokeWidth="2.2" />
                      <path d="M 50,25 C 68,15 85,18 92,28 C 82,32 70,34 50,38" fill="none" strokeWidth="2.2" />
                      <path d="M 50,32 C 36,25 22,27 16,35 C 25,38 36,40 50,44" fill="none" strokeWidth="1.8" />
                      <path d="M 50,32 C 64,25 78,27 84,35 C 75,38 64,40 50,44" fill="none" strokeWidth="1.8" />
                      <path d="M 50,42 C 30,48 28,62 50,68 C 72,74 70,88 50,96" strokeWidth="2.2" />
                      <path d="M 50,42 C 70,48 72,62 50,68 C 28,74 30,88 50,96" strokeWidth="2.2" />
                      <circle cx="43" cy="40" r="2" fill="#0B63AC" />
                      <circle cx="57" cy="40" r="2" fill="#0B63AC" />
                    </g>
                  </svg>
                </div>

                {/* 1. DOCTOR'S LETTERPAD HEADER (MATCHING CLINIC STATIONERY) */}
                <div
                  className="letterpad-preprinted-header"
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    visibility: printMode === 'padOnly' ? 'hidden' : 'visible',
                    marginBottom: '4px',
                  }}
                >
                  <div style={styles.letterpadTopRow}>
                    <div>
                      <div style={styles.letterpadDocName}>
                        {doctor?.name || 'Dr. Chirag Paghdal'}
                      </div>
                      <div style={styles.letterpadDocSubRow}>
                        <span style={styles.letterpadDocSpecialty}>
                          {doctor?.specialization?.includes('B.H.M.S') ? 'FAMILY PHYSICIAN' : (doctor?.specialization || 'FAMILY PHYSICIAN')}
                        </span>
                        <span style={styles.letterpadDocDegree}>
                          ({doctor?.degree || 'B.H.M.S.'})
                        </span>
                      </div>
                    </div>

                    <div style={styles.letterpadRightContact}>
                      <div style={styles.letterpadContactLine}>
                        <span>Mo.: </span>
                        <strong>{doctor?.phone || '98793 80508'}</strong>
                      </div>
                      <div style={styles.letterpadContactLine}>
                        <span>Reg. No. </span>
                        <strong>{doctor?.regNo || 'G-9035'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Sleek Grey Clinic Address Banner */}
                  <div style={styles.letterpadAddressBar}>
                    {doctor?.clinicName || 'Dhyey Clinic & Nursing Home'} : {doctor?.address || 'Shop No. 1, Mahavir Heights, New Kosad Road, Amroli, Surat.'}
                  </div>
                </div>

                {/* 2. PATIENT INFO BAR (FOR, ________  DATE : _________) */}
                <div style={styles.letterpadPatientRow}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flex: 1, minWidth: 0, paddingRight: '12px' }}>
                    <span style={{ fontWeight: '900', letterSpacing: '0.5px', fontSize: '13px', color: '#000000' }}>
                      FOR,
                    </span>
                    <span style={styles.letterpadForUnderline}>
                      {printVisit.patientName || currentPatient?.name}
                      {currentPatient?.age && (
                        <span style={{ fontWeight: '700', color: '#1F2937' }}>
                          {' '}({currentPatient.age} Yrs{currentPatient.gender ? ` / ${currentPatient.gender}` : ''})
                        </span>
                      )}
                      {currentPatient?.patientId && (
                        <span style={{ fontSize: '11px', color: '#475569', marginLeft: '6px', fontWeight: '600' }}>
                          [{currentPatient.patientId}]
                        </span>
                      )}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexShrink: 0 }}>
                    <span style={{ fontWeight: '900', letterSpacing: '0.5px', fontSize: '13px', color: '#000000' }}>
                      DATE :
                    </span>
                    <span style={styles.letterpadDateUnderline}>
                      {formattedDate}
                    </span>
                  </div>
                </div>

                {/* 3. PRESCRIPTION BODY */}
                <div style={styles.cleanRxBody}>
                  <div style={styles.cleanRxTitleRow}>
                    <span style={styles.cleanRxSymbol}>&#8478;</span>
                    <span style={styles.cleanRxTitle}>{t.rxTitle}</span>
                  </div>

                  {printVisit.prescriptions && printVisit.prescriptions.length > 0 ? (
                    <table style={styles.cleanRxTable}>
                      <thead>
                        <tr>
                          <th style={{ ...styles.cleanTh, width: '36px', textAlign: 'center' }}>
                            {t.colNum}
                          </th>
                          <th style={{ ...styles.cleanTh, textAlign: 'left', minWidth: '160px' }}>
                            {t.colMedicine}
                          </th>
                          <th style={{ ...styles.cleanTh, width: '65px', textAlign: 'center' }}>
                            {t.colQty}
                          </th>
                          <th style={{ ...styles.cleanTh, textAlign: 'left' }}>
                            {t.colDosageInstructions}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {printVisit.prescriptions.map((rx, idx) => {
                          const doseNumbers = `${rx.morning || '0'} - ${rx.noon || '0'} - ${rx.evening || '0'} - ${rx.night || '0'}`;
                          const isBf = rx.timing === 'BF';
                          const humanDose = formatDoseInstruction(rx.morning, rx.noon, rx.evening, rx.night, rx.timing, printLanguage);

                          return (
                            <tr key={idx}>
                              <td style={{ ...styles.cleanTd, textAlign: 'center', fontWeight: 'bold' }}>
                                {idx + 1}
                              </td>
                              <td style={styles.cleanTd}>
                                <strong style={styles.cleanMedName}>{rx.medicine}</strong>
                              </td>
                              <td style={{ ...styles.cleanTd, textAlign: 'center', fontWeight: 'bold', fontSize: '12.5px' }}>
                                {rx.qty || '-'}
                              </td>
                              <td style={styles.cleanTd}>
                                <div style={styles.dosageCellWrapper}>
                                  <div style={styles.dosageHeaderRow}>
                                    <span style={styles.dosePillBadge}>{doseNumbers}</span>
                                    <span style={{
                                      ...styles.timingPillBadge,
                                      backgroundColor: isBf ? '#FEF3C7' : '#DCFCE7',
                                      color: isBf ? '#92400E' : '#166534',
                                      borderColor: isBf ? '#FDE68A' : '#BBF7D0',
                                    }}>
                                      {isBf ? t.bfLabel : t.afLabel}
                                    </span>
                                  </div>
                                  <div style={styles.humanDoseInstruction}>
                                    {humanDose}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <p style={{ fontStyle: 'italic', color: '#6B7280', padding: '16px 0' }}>
                      {t.noPrescription}
                    </p>
                  )}

                  {/* 4. DIETARY SUGGESTIONS (IF SELECTED / ADDED) */}
                  {dietaryItems.length > 0 && (
                    <div style={styles.cleanDietaryBox} className="clean-dietary-box">
                      <strong style={styles.cleanDietaryTitle}>{t.dietaryTitle}</strong>
                      <ul style={styles.cleanDietaryList}>
                        {dietaryItems.map((item, idx) => (
                          <li key={idx} style={styles.cleanDietaryItem}>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* 5. DOCTOR LETTERPAD FOOTER WITH DIGITAL SIGNATURE */}
                <div style={styles.letterpadFooterRow}>
                  <div style={styles.letterpadFooterAdviceCol}>
                    <p style={styles.letterpadFooterAdviceText}>
                      {t.footerAdvice}
                    </p>
                    <p style={styles.letterpadFooterTimingsText}>
                      {t.opdTimings}
                    </p>
                  </div>
                  <div style={styles.letterpadSignCol}>
                    <div style={styles.letterpadCursiveSignature}>
                      {doctor?.name || 'Dr. Chirag Paghdal'}
                    </div>
                    <div style={styles.letterpadSignLine} />
                    <div style={styles.letterpadSignName}>
                      {doctor?.name || 'Dr. Chirag Paghdal'}
                    </div>
                    <div style={styles.letterpadSignRole}>
                      FAMILY PHYSICIAN (B.H.M.S.) &bull; Reg. No. {doctor?.regNo || 'G-9035'}
                    </div>
                  </div>
                </div>

                {/* 6. BOTTOM PHARMACY SPONSOR BAR (+ HARSH MEDICAL & GENERAL STORES +) */}
                <div
                  className="letterpad-preprinted-footer"
                  style={{
                    ...styles.letterpadPharmacyBar,
                    visibility: printMode === 'padOnly' ? 'hidden' : 'visible',
                  }}
                >
                  <span style={styles.letterpadPharmacyPlus}>+</span>
                  <span style={styles.letterpadPharmacyText}>
                    {doctor?.medicalStore || 'Harsh Medical & General Stores'}
                  </span>
                  <span style={styles.letterpadPharmacyPlus}>+</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {/* MODAL 4: INVESTIGATION & LAB REPORT FORM */}
      <InvestigationReportModal
        isOpen={showAddReportModal}
        onClose={() => setShowAddReportModal(false)}
        patient={currentPatient}
        doctor={{ name: doctor?.name || 'Dr. Chirag Paghdal' }}
        initialReport={attachedReport}
        onReportSaved={(reportData) => {
          setAttachedReport(reportData);
          showToast('✓ Diagnostic Lab Report saved & attached to current case!');
        }}
      />

      {/* MODAL 5: VIEWING PAST CASE'S ATTACHED LAB REPORT */}
      {viewingPastReport && (
        <InvestigationReportModal
          isOpen={!!viewingPastReport}
          onClose={() => setViewingPastReport(null)}
          patient={currentPatient}
          doctor={{ name: viewingPastReport.doctorName || 'Dr. Chirag Paghdal' }}
          initialReport={viewingPastReport}
          onReportSaved={() => {
            setViewingPastReport(null);
            showToast('✓ Attached Lab Report updated!');
            if (currentPatient?.patientId) {
              loadPatientVisits(currentPatient.patientId);
            }
          }}
        />
      )}

      {/* MODAL 6: TOTAL DUE BREAKDOWN MODAL */}
      {showTotalDueModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.dueModalCard}>
            {/* Header */}
            <div style={styles.dueModalHeader}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Receipt size={16} color="#B3524A" />
                  <h3 style={styles.dueModalTitle}>Patient Due Breakdown</h3>
                </div>
                <p style={styles.dueModalSubtitle}>
                  {currentPatient.name} &bull; PID: {currentPatient.patientId} &bull; Phone: {currentPatient.phone || 'N/A'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTotalDueModal(false)}
                style={styles.closeModalBtn}
              >
                <X size={16} />
              </button>
            </div>

            {/* Summary KPI Cards */}
            <div style={styles.dueModalStatsRow}>
              <div style={styles.dueKpiCard}>
                <span style={styles.dueKpiLabel}>TOTAL CHARGED</span>
                <span style={styles.dueKpiValue}>
                  ₹{patientVisits.reduce((acc, v) => acc + (v.charge || 0), 0)}
                </span>
              </div>
              <div style={styles.dueKpiCard}>
                <span style={styles.dueKpiLabel}>TOTAL RECEIVED</span>
                <span style={{ ...styles.dueKpiValue, color: '#16A34A' }}>
                  ₹{patientVisits.reduce((acc, v) => acc + (v.received || 0), 0)}
                </span>
              </div>
              <div
                style={{
                  ...styles.dueKpiCard,
                  borderColor: (currentPatient.totalDue || 0) > 0 ? '#FECACA' : '#BBF7D0',
                  backgroundColor: (currentPatient.totalDue || 0) > 0 ? '#FEF2F2' : '#F0FDF4',
                }}
              >
                <span
                  style={{
                    ...styles.dueKpiLabel,
                    color: (currentPatient.totalDue || 0) > 0 ? '#DC2626' : '#16A34A',
                  }}
                >
                  OUTSTANDING DUE
                </span>
                <span
                  style={{
                    ...styles.dueKpiValue,
                    color: (currentPatient.totalDue || 0) > 0 ? '#DC2626' : '#16A34A',
                  }}
                >
                  ₹{currentPatient.totalDue || 0}
                </span>
              </div>
            </div>

            {/* Filter Tabs */}
            <div style={styles.dueFilterRow}>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setTotalDueFilter('all')}
                  style={{
                    ...styles.dueFilterBtn,
                    backgroundColor: totalDueFilter === 'all' ? '#146B5C' : '#F1F5F9',
                    color: totalDueFilter === 'all' ? '#FFFFFF' : '#475569',
                  }}
                >
                  All Visits ({patientVisits.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTotalDueFilter('dueOnly')}
                  style={{
                    ...styles.dueFilterBtn,
                    backgroundColor: totalDueFilter === 'dueOnly' ? '#DC2626' : '#F1F5F9',
                    color: totalDueFilter === 'dueOnly' ? '#FFFFFF' : '#475569',
                  }}
                >
                  Visits with Due ({patientVisits.filter((v) => (v.due || 0) > 0).length})
                </button>
              </div>
              <span style={{ fontSize: 11, color: '#64748B' }}>
                Showing {totalDueFilter === 'dueOnly' ? patientVisits.filter((v) => (v.due || 0) > 0).length : patientVisits.length} record(s)
              </span>
            </div>

            {/* Table of Visits */}
            <div style={styles.dueTableWrap}>
              {patientVisits.filter((v) => totalDueFilter === 'all' || (v.due || 0) > 0).length === 0 ? (
                <div style={styles.dueEmptyBox}>
                  <CheckCircle size={24} color="#16A34A" />
                  <p style={{ margin: 0, fontWeight: 600, color: '#166534', fontSize: 12 }}>
                    {totalDueFilter === 'dueOnly'
                      ? 'No pending dues! All past visits for this patient are fully settled.'
                      : 'No visits recorded for this patient yet.'}
                  </p>
                </div>
              ) : (
                <table style={styles.dueTable}>
                  <thead>
                    <tr style={styles.dueTableHeadTr}>
                      <th style={styles.dueTh}>DATE</th>
                      <th style={styles.dueTh}>COMPLAINT / RX</th>
                      <th style={{ ...styles.dueTh, textAlign: 'right' }}>CHARGE</th>
                      <th style={{ ...styles.dueTh, textAlign: 'right' }}>PAID</th>
                      <th style={{ ...styles.dueTh, textAlign: 'right' }}>DUE</th>
                      <th style={{ ...styles.dueTh, textAlign: 'center' }}>STATUS</th>
                      <th style={{ ...styles.dueTh, textAlign: 'center' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patientVisits
                      .filter((v) => totalDueFilter === 'all' || (v.due || 0) > 0)
                      .map((v) => {
                        const isDue = (v.due || 0) > 0;
                        return (
                          <tr
                            key={v._id}
                            style={{
                              ...styles.dueTableTr,
                              backgroundColor: isDue ? '#FFFBFB' : '#FFFFFF',
                            }}
                          >
                            <td style={styles.dueTd}>
                              <strong>
                                {new Date(v.visitDate).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </strong>
                            </td>
                            <td style={styles.dueTd}>
                              <div style={{ fontSize: 11, color: '#0F172A', fontWeight: 600 }}>
                                {v.complaint || 'General Consultation'}
                              </div>
                              {v.prescriptions?.length > 0 && (
                                <div style={{ fontSize: 10, color: '#64748B' }}>
                                  {v.prescriptions.map((p) => p.medicine).slice(0, 2).join(', ')}
                                  {v.prescriptions.length > 2 ? ` +${v.prescriptions.length - 2} more` : ''}
                                </div>
                              )}
                            </td>
                            <td style={{ ...styles.dueTd, textAlign: 'right', fontWeight: 600 }}>
                              ₹{v.charge || 0}
                            </td>
                            <td style={{ ...styles.dueTd, textAlign: 'right', color: '#16A34A', fontWeight: 600 }}>
                              ₹{v.received || 0}
                            </td>
                            <td style={{ ...styles.dueTd, textAlign: 'right', color: isDue ? '#DC2626' : '#16A34A', fontWeight: 700 }}>
                              ₹{v.due || 0}
                            </td>
                            <td style={{ ...styles.dueTd, textAlign: 'center' }}>
                              <span
                                style={{
                                  ...styles.dueStatusBadge,
                                  backgroundColor: isDue ? '#FEF2F2' : '#F0FDF4',
                                  borderColor: isDue ? '#FECACA' : '#BBF7D0',
                                  color: isDue ? '#DC2626' : '#16A34A',
                                }}
                              >
                                {isDue ? `Pending: ₹${v.due}` : '✓ Settled'}
                              </span>
                            </td>
                            <td style={{ ...styles.dueTd, textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowTotalDueModal(false);
                                  handleStartEditVisit(v);
                                }}
                                style={styles.dueActionBtn}
                                title="Open case to update charges or payment"
                              >
                                <Edit3 size={11} />
                                <span>Edit Case</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div style={styles.dueModalFooter}>
              <div style={{ fontSize: 11, color: '#64748B' }}>
                * Click <strong>Edit Case</strong> to record payments or adjust charges on any visit.
              </div>
              <button
                type="button"
                onClick={() => setShowTotalDueModal(false)}
                style={styles.modalCancelBtn}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: FAMILY DUE BREAKDOWN MODAL */}
      {showFamilyDueModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.dueModalCard}>
            {/* Header */}
            <div style={styles.dueModalHeader}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Users size={16} color="#B3524A" />
                  <h3 style={styles.dueModalTitle}>Family Due Details</h3>
                </div>
                <p style={styles.dueModalSubtitle}>
                  Family Head: <strong>{familyData?.family?.headName || currentPatient.family?.headName || currentPatient.name}</strong> &bull; FAM-{currentPatient.familyId} &bull; Area: {familyData?.family?.area || currentPatient.area || 'N/A'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFamilyDueModal(false)}
                style={styles.closeModalBtn}
              >
                <X size={16} />
              </button>
            </div>

            {loadingFamilyDue ? (
              <div style={{ padding: '36px', textAlign: 'center', color: '#64748B', fontSize: 12 }}>
                Loading family members and dues breakdown...
              </div>
            ) : (
              <>
                {/* Summary KPI Cards */}
                <div style={styles.dueModalStatsRow}>
                  <div
                    style={{
                      ...styles.dueKpiCard,
                      borderColor: (currentPatient.family?.familyDue || familyData?.family?.familyDue || 0) > 0 ? '#FECACA' : '#BBF7D0',
                      backgroundColor: (currentPatient.family?.familyDue || familyData?.family?.familyDue || 0) > 0 ? '#FEF2F2' : '#F0FDF4',
                    }}
                  >
                    <span
                      style={{
                        ...styles.dueKpiLabel,
                        color: (currentPatient.family?.familyDue || familyData?.family?.familyDue || 0) > 0 ? '#DC2626' : '#16A34A',
                      }}
                    >
                      TOTAL FAMILY DUE
                    </span>
                    <span
                      style={{
                        ...styles.dueKpiValue,
                        color: (currentPatient.family?.familyDue || familyData?.family?.familyDue || 0) > 0 ? '#DC2626' : '#16A34A',
                      }}
                    >
                      ₹{currentPatient.family?.familyDue || familyData?.family?.familyDue || 0}
                    </span>
                  </div>
                  <div style={styles.dueKpiCard}>
                    <span style={styles.dueKpiLabel}>TOTAL MEMBERS</span>
                    <span style={styles.dueKpiValue}>
                      {familyData?.members?.length || 1} Member(s)
                    </span>
                  </div>
                  <div style={styles.dueKpiCard}>
                    <span style={styles.dueKpiLabel}>MEMBERS WITH DUE</span>
                    <span
                      style={{
                        ...styles.dueKpiValue,
                        color: (familyData?.members?.filter((m) => (m.totalDue || 0) > 0).length || 0) > 0 ? '#DC2626' : '#16A34A',
                      }}
                    >
                      {familyData?.members?.filter((m) => (m.totalDue || 0) > 0).length || 0} Member(s)
                    </span>
                  </div>
                </div>

                {/* Tab Navigation */}
                <div style={styles.dueFilterRow}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setFamilyDueTab('members')}
                      style={{
                        ...styles.dueFilterBtn,
                        backgroundColor: familyDueTab === 'members' ? '#146B5C' : '#F1F5F9',
                        color: familyDueTab === 'members' ? '#FFFFFF' : '#475569',
                      }}
                    >
                      👥 Member Dues ({familyData?.members?.length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFamilyDueTab('visits')}
                      style={{
                        ...styles.dueFilterBtn,
                        backgroundColor: familyDueTab === 'visits' ? '#DC2626' : '#F1F5F9',
                        color: familyDueTab === 'visits' ? '#FFFFFF' : '#475569',
                      }}
                    >
                      📋 Visits with Pending Due ({familyVisits.filter((v) => (v.due || 0) > 0).length})
                    </button>
                  </div>
                  <span style={{ fontSize: 11, color: '#64748B' }}>
                    {familyDueTab === 'members' ? 'Family member dues' : 'Family visit dues'}
                  </span>
                </div>

                {/* Tab Content */}
                <div style={styles.dueTableWrap}>
                  {familyDueTab === 'members' ? (
                    <table style={styles.dueTable}>
                      <thead>
                        <tr style={styles.dueTableHeadTr}>
                          <th style={styles.dueTh}>MEMBER NAME</th>
                          <th style={styles.dueTh}>PID</th>
                          <th style={styles.dueTh}>RELATION</th>
                          <th style={styles.dueTh}>AGE / BLOOD</th>
                          <th style={{ ...styles.dueTh, textAlign: 'right' }}>OUTSTANDING DUE</th>
                          <th style={{ ...styles.dueTh, textAlign: 'center' }}>ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(familyData?.members || []).map((m) => {
                          const isCurrent = m.patientId === currentPatient.patientId;
                          const hasDue = (m.totalDue || 0) > 0;
                          return (
                            <tr
                              key={m._id || m.patientId}
                              style={{
                                ...styles.dueTableTr,
                                backgroundColor: isCurrent ? '#F0FDF4' : hasDue ? '#FFFBFB' : '#FFFFFF',
                              }}
                            >
                              <td style={styles.dueTd}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <strong style={{ color: '#0F172A', fontSize: 11.5 }}>{m.name}</strong>
                                  {m.isHead && <span style={styles.headTag}>HEAD</span>}
                                  {isCurrent && (
                                    <span style={{ ...styles.vitalsBadgeBP, fontSize: 9, padding: '0 4px' }}>
                                      SELECTED
                                    </span>
                                  )}
                                </div>
                                {m.phone && <div style={{ fontSize: 10, color: '#64748B' }}>📞 {m.phone}</div>}
                              </td>
                              <td style={styles.dueTd}>
                                <span style={styles.dropdownItemBadge}>{m.patientId}</span>
                              </td>
                              <td style={styles.dueTd}>
                                <span style={styles.subDetailText}>
                                  {m.relation || (m.isHead ? 'Head' : 'Member')}
                                </span>
                              </td>
                              <td style={styles.dueTd}>
                                <span style={{ fontSize: 10.5, color: '#475569' }}>
                                  {m.age ? `${m.age} Y` : '-'} &bull; {m.bloodGroup || '--'}
                                </span>
                              </td>
                              <td style={{ ...styles.dueTd, textAlign: 'right' }}>
                                <span
                                  style={{
                                    ...styles.dueStatusBadge,
                                    backgroundColor: hasDue ? '#FEF2F2' : '#F0FDF4',
                                    borderColor: hasDue ? '#FECACA' : '#BBF7D0',
                                    color: hasDue ? '#DC2626' : '#16A34A',
                                    fontWeight: 700,
                                  }}
                                >
                                  {hasDue ? `Due: ₹${m.totalDue}` : '✓ Settled'}
                                </span>
                              </td>
                              <td style={{ ...styles.dueTd, textAlign: 'center' }}>
                                {isCurrent ? (
                                  <span style={{ fontSize: 10, color: '#16A34A', fontWeight: 600 }}>Active Patient</span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleSelectPatient(m);
                                      setShowFamilyDueModal(false);
                                    }}
                                    style={styles.dueActionBtn}
                                    title="Switch to this family member"
                                  >
                                    <span>Switch to Member &rarr;</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    /* Visits with pending due */
                    familyVisits.filter((v) => (v.due || 0) > 0).length === 0 ? (
                      <div style={styles.dueEmptyBox}>
                        <CheckCircle size={24} color="#16A34A" />
                        <p style={{ margin: 0, fontWeight: 600, color: '#166534', fontSize: 12 }}>
                          All family visits are settled! No pending visit dues.
                        </p>
                      </div>
                    ) : (
                      <table style={styles.dueTable}>
                        <thead>
                          <tr style={styles.dueTableHeadTr}>
                            <th style={styles.dueTh}>PATIENT</th>
                            <th style={styles.dueTh}>DATE</th>
                            <th style={styles.dueTh}>COMPLAINT</th>
                            <th style={{ ...styles.dueTh, textAlign: 'right' }}>CHARGE</th>
                            <th style={{ ...styles.dueTh, textAlign: 'right' }}>PAID</th>
                            <th style={{ ...styles.dueTh, textAlign: 'right' }}>DUE</th>
                            <th style={{ ...styles.dueTh, textAlign: 'center' }}>ACTION</th>
                          </tr>
                        </thead>
                        <tbody>
                          {familyVisits
                            .filter((v) => (v.due || 0) > 0)
                            .map((v) => {
                              const member = (familyData?.members || []).find((m) => m.patientId === v.patientId);
                              return (
                                <tr key={v._id} style={{ ...styles.dueTableTr, backgroundColor: '#FFFBFB' }}>
                                  <td style={styles.dueTd}>
                                    <div style={{ fontWeight: 600, color: '#0F172A', fontSize: 11 }}>
                                      {member?.name || v.patientId}
                                    </div>
                                    <span style={styles.dropdownItemBadge}>{v.patientId}</span>
                                  </td>
                                  <td style={styles.dueTd}>
                                    <strong>
                                      {new Date(v.visitDate).toLocaleDateString('en-GB', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                      })}
                                    </strong>
                                  </td>
                                  <td style={styles.dueTd}>
                                    <div style={{ fontSize: 11, color: '#475569' }}>
                                      {v.complaint || 'Consultation'}
                                    </div>
                                  </td>
                                  <td style={{ ...styles.dueTd, textAlign: 'right', fontWeight: 600 }}>
                                    ₹{v.charge || 0}
                                  </td>
                                  <td style={{ ...styles.dueTd, textAlign: 'right', color: '#16A34A', fontWeight: 600 }}>
                                    ₹{v.received || 0}
                                  </td>
                                  <td style={{ ...styles.dueTd, textAlign: 'right', color: '#DC2626', fontWeight: 700 }}>
                                    ₹{v.due || 0}
                                  </td>
                                  <td style={{ ...styles.dueTd, textAlign: 'center' }}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (member) handleSelectPatient(member);
                                        setShowFamilyDueModal(false);
                                        handleStartEditVisit(v);
                                      }}
                                      style={styles.dueActionBtn}
                                      title="Open this case to update payment"
                                    >
                                      <Edit3 size={11} />
                                      <span>Edit Case</span>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    )
                  )}
                </div>

                {/* Footer */}
                <div style={styles.dueModalFooter}>
                  <div style={{ fontSize: 11, color: '#64748B' }}>
                    Family ID: <strong>FAM-{currentPatient.familyId}</strong> &bull; Total Pending: <strong style={{ color: '#DC2626' }}>₹{currentPatient.family?.familyDue || familyData?.family?.familyDue || 0}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFamilyDueModal(false)}
                    style={styles.modalCancelBtn}
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// --- HIGH DENSITY COMPACT STYLES OBJECT ---
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    width: '100%',
    height: '100%',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },

  toast: {
    position: 'fixed',
    top: '14px',
    right: '16px',
    color: '#FFF',
    padding: '8px 14px',
    borderRadius: '6px',
    boxShadow: 'var(--shadow-md)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    zIndex: 9999,
    fontSize: '12px',
    fontWeight: 600,
  },

  // Top Control Row
  topControlRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    width: '100%',
  },
  searchSection: {
    position: 'relative',
    flex: 1,
  },
  searchInputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  },
  searchIcon: {
    position: 'absolute',
    left: '10px',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    height: '30px',
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '0 30px 0 32px',
    fontSize: '12px',
    color: 'var(--text)',
    boxShadow: 'var(--shadow-sm)',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: '8px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewModeButtonGroup: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
  },
  viewModeBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    height: '30px',
    padding: '0 8px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
  },

  // Dropdown Menu
  dropdownMenu: {
    position: 'absolute',
    top: '34px',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    boxShadow: 'var(--shadow-lg)',
    maxHeight: '260px',
    overflowY: 'auto',
    zIndex: 200,
  },
  dropdownHeader: {
    padding: '5px 10px',
    fontSize: '10px',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    backgroundColor: 'var(--surface-alt)',
    borderBottom: '1px solid var(--border)',
  },
  dropdownItem: {
    padding: '7px 10px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--border)',
    cursor: 'pointer',
  },
  dropdownItemLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  dropdownItemNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  dropdownItemName: {
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--text)',
  },
  dropdownItemBadge: {
    fontSize: '10px',
    fontWeight: 600,
    backgroundColor: 'var(--surface-alt)',
    color: 'var(--primary)',
    padding: '1px 5px',
    borderRadius: '3px',
  },
  headTag: {
    fontSize: '9px',
    fontWeight: 800,
    backgroundColor: 'var(--primary-soft)',
    color: 'var(--primary-dark)',
    padding: '1px 4px',
    borderRadius: '2px',
  },
  dropdownItemSub: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '10px',
    color: 'var(--text-muted)',
  },
  dropdownItemRight: {
    display: 'flex',
    alignItems: 'center',
  },
  dueBadgeDropdown: {
    fontSize: '10px',
    fontWeight: 700,
    backgroundColor: 'var(--danger-soft)',
    color: 'var(--danger)',
    padding: '2px 6px',
    borderRadius: '10px',
  },
  clearBadgeDropdown: {
    fontSize: '10px',
    fontWeight: 600,
    backgroundColor: 'var(--primary-soft)',
    color: 'var(--primary)',
    padding: '2px 6px',
    borderRadius: '10px',
  },

  // Ultra-Compact Patient Info Banner
  patientBannerCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border)',
    borderLeft: '4px solid var(--primary)',
    borderRadius: '6px',
    padding: '7px 12px',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  bannerTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
  },
  bannerNameCol: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  patientNameHeading: {
    fontSize: '15px',
    fontWeight: 800,
    color: 'var(--text)',
    textTransform: 'uppercase',
    margin: 0,
  },
  patientIdBadgeDisplay: {
    backgroundColor: 'var(--surface-alt)',
    border: '1px solid var(--border)',
    color: 'var(--primary-dark)',
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.4px',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  totalDuePillBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    color: '#FFFFFF',
    fontSize: '10.5px',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
    transition: 'all 0.15s ease',
  },
  bannerActionsCol: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  deletePatientBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: 'var(--danger-soft)',
    border: '1px solid #EBC6C3',
    color: 'var(--danger)',
    fontSize: '11px',
    fontWeight: 600,
    padding: '4px 8px',
    borderRadius: '5px',
    cursor: 'pointer',
  },
  editPatientBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: 'var(--primary-soft)',
    border: '1px solid #B8DFD5',
    color: 'var(--primary)',
    fontSize: '11px',
    fontWeight: 600,
    padding: '4px 8px',
    borderRadius: '5px',
    cursor: 'pointer',
  },
  bannerBottomRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: 'var(--text-muted)',
    flexWrap: 'wrap',
  },
  bannerFamilyText: {
    color: 'var(--text)',
  },
  famDuePillBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '10px',
    fontWeight: 700,
    padding: '1px 7px',
    borderRadius: '12px',
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  dotSeparator: {
    color: 'var(--border)',
    fontWeight: 700,
  },
  subDetailText: {
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
  allergiesPill: {
    backgroundColor: '#FFF4E5',
    color: '#B26200',
    fontSize: '10px',
    fontWeight: 600,
    padding: '1px 6px',
    borderRadius: '3px',
  },

  noPatientSelected: {
    backgroundColor: '#FFFFFF',
    border: '1px dashed var(--border)',
    borderRadius: '6px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    textAlign: 'center',
  },
  noPatientText: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  registerNewMemberBtn: {
    backgroundColor: 'var(--primary)',
    color: '#FFFFFF',
    padding: '5px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
  },

  // Visit Layout Wrapper
  visitLayoutWrapper: {
    display: 'flex',
    width: '100%',
    height: '100%',
    flex: 1,
    minHeight: 0,
    gap: '6px',
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  visitFormPane: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: '320px',
    overflowY: 'auto',
  },

  // Highlighted New Visit Card
  highlightedVisitCard: {
    backgroundColor: '#FDF6EE',
    border: '1px solid #F1DAC2',
    borderRadius: '6px',
    padding: '6px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    boxShadow: 'var(--shadow-sm)',
  },
  caseEntryHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px dashed #EAD2B8',
    paddingBottom: '2px',
    flexWrap: 'wrap',
    gap: '6px',
  },
  caseHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  caseHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  caseEntryHeaderTitle: {
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.4px',
    color: '#8C6339',
    textTransform: 'uppercase',
  },
  editingTag: {
    fontSize: '9px',
    fontWeight: 800,
    backgroundColor: '#FEE2E2',
    color: '#B91C1C',
    padding: '1px 5px',
    borderRadius: '3px',
  },
  titleDateWrap: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #D6C2AC',
    borderRadius: '4px',
    padding: '1px 6px',
  },
  titleDateLabel: {
    fontSize: '9px',
    fontWeight: 800,
    color: '#7D5A38',
    textTransform: 'uppercase',
  },
  titleDateInput: {
    border: 'none',
    outline: 'none',
    fontSize: '11px',
    color: 'var(--text)',
    backgroundColor: 'transparent',
    fontWeight: 600,
  },
  reportAddBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #146B5C',
    borderRadius: '4px',
    color: '#146B5C',
    fontSize: '11px',
    fontWeight: 700,
    padding: '3px 8px',
    cursor: 'pointer',
  },
  attachedReportGroup: {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    border: '1px solid #86EFAC',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  reportAttachedBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '11px',
    fontWeight: 700,
    color: '#15803D',
    padding: '3px 8px',
    cursor: 'pointer',
  },
  detachReportBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3px 6px',
    backgroundColor: 'transparent',
    border: 'none',
    borderLeft: '1px solid #86EFAC',
    cursor: 'pointer',
  },
  viewPastReportBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    backgroundColor: '#EEF6F4',
    border: '1px solid #C4DFD9',
    borderRadius: '12px',
    fontSize: '10.5px',
    fontWeight: 700,
    color: '#146B5C',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  closeCaseBtn: {
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#8C6339',
    cursor: 'pointer',
    borderRadius: '3px',
  },
  openNewCaseBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#146B5C',
    border: 'none',
    borderRadius: '6px',
    color: '#FFFFFF',
    fontSize: '12px',
    fontWeight: 700,
    padding: '6px 14px',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(20, 107, 92, 0.25)',
    transition: 'all 0.15s ease',
  },
  treatmentPrescriptionGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.3fr',
    gap: '6px',
    paddingTop: '2px',
    borderTop: '1px dashed #E5CDAF',
  },
  halfSectionBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    padding: '4px 6px',
    borderRadius: '4px',
    border: '1px solid #F1DAC2',
  },
  shortcutCaseTag: {
    fontSize: '9px',
    fontWeight: 700,
    backgroundColor: '#FFF',
    border: '1px solid #D6C2AC',
    padding: '1px 5px',
    borderRadius: '3px',
    color: '#8C6339',
  },

  vitalsRowGrid: {
    display: 'flex',
    gap: '5px',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  fieldCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  miniLabel: {
    fontSize: '8.5px',
    fontWeight: 800,
    letterSpacing: '0.3px',
    color: '#7D5A38',
    textTransform: 'uppercase',
  },
  vitalsInput: {
    width: '100%',
    height: '24px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #D6C2AC',
    borderRadius: '4px',
    padding: '0 5px',
    fontSize: '11px',
    color: 'var(--text)',
  },
  rxIconCol: {
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 2px',
  },

  subSectionBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    paddingTop: '2px',
    borderTop: '1px dashed #E5CDAF',
  },
  subSectionHeader: {
    display: 'flex',
    alignItems: 'center',
  },
  subSectionTitle: {
    fontSize: '8.5px',
    fontWeight: 800,
    letterSpacing: '0.4px',
    color: '#8C6339',
    textTransform: 'uppercase',
  },
  treatmentRow: {
    display: 'flex',
    gap: '5px',
    alignItems: 'center',
  },
  prescriptionRow: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  tableInput: {
    width: '100%',
    height: '24px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #D6C2AC',
    borderRadius: '4px',
    padding: '0 5px',
    fontSize: '11px',
    color: 'var(--text)',
  },
  doseInput: {
    width: '100%',
    height: '24px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #D6C2AC',
    borderRadius: '4px',
    padding: '0 2px',
    fontSize: '11px',
    textAlign: 'center',
    fontWeight: 600,
    color: 'var(--text)',
  },
  timingRadioGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#FFFFFF',
    height: '24px',
    border: '1px solid #D6C2AC',
    borderRadius: '4px',
    padding: '0 4px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    fontSize: '9.5px',
    fontWeight: 700,
    color: 'var(--text)',
    cursor: 'pointer',
  },
  actionBtnCol: {
    display: 'flex',
    alignItems: 'center',
  },
  addRowBtn: {
    width: '24px',
    height: '24px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #D6C2AC',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  removeRowBtn: {
    width: '24px',
    height: '24px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #EBC6C3',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },

  billingActionsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: '6px',
    paddingTop: '3px',
    borderTop: '1px solid #EAD2B8',
  },
  billingInputsGroup: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '6px',
    flexWrap: 'wrap',
  },
  billingField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  billingLabel: {
    fontSize: '8.5px',
    fontWeight: 800,
    letterSpacing: '0.4px',
    color: '#8C6339',
    textTransform: 'uppercase',
  },
  billingInput: {
    width: '68px',
    height: '24px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #D6C2AC',
    borderRadius: '4px',
    padding: '0 5px',
    fontSize: '11.5px',
    fontWeight: 700,
    color: 'var(--text)',
  },
  dueDisplayBox: {
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    fontSize: '13px',
    fontWeight: 800,
    padding: '0 4px',
  },
  actionButtonsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  cancelDraftBtn: {
    height: '26px',
    padding: '0 8px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #D6C2AC',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text)',
    cursor: 'pointer',
  },
  saveOnlyBtn: {
    height: '26px',
    padding: '0 10px',
    backgroundColor: 'var(--surface-alt)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
  },
  saveAndPrintBtn: {
    height: '26px',
    padding: '0 12px',
    backgroundColor: 'var(--primary)',
    border: 'none',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 700,
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    cursor: 'pointer',
  },

  // Dragger Bars
  verticalDraggerBar: {
    width: '8px',
    cursor: 'col-resize',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    flexShrink: 0,
    transition: 'background-color 0.15s ease',
    userSelect: 'none',
  },
  draggerGripV: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    pointerEvents: 'none',
  },
  horizontalDraggerBar: {
    height: '14px',
    cursor: 'row-resize',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    margin: '2px 0',
    flexShrink: 0,
    transition: 'background-color 0.15s ease',
    userSelect: 'none',
  },
  draggerGripH: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    pointerEvents: 'none',
  },
  draggerHintText: {
    fontSize: '9px',
    color: 'var(--text-muted)',
    fontWeight: 600,
    letterSpacing: '0.2px',
  },

  // Visit History Pane
  visitHistoryPane: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: '240px',
    flex: 1,
    height: '100%',
    minHeight: 0,
    overflowY: 'auto',
  },
  historyListSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  historySectionHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historySectionSubTitle: {
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--text)',
    margin: 0,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    border: '1px dashed var(--border)',
    borderRadius: '6px',
    padding: '12px',
    textAlign: 'center',
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  visitsListGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  visitHistoryCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderLeft: '3px solid #146B5C',
    borderRadius: '6px',
    padding: '6px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
    transition: 'all 0.15s ease',
  },
  visitCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '6px',
    paddingBottom: '3px',
    borderBottom: '1px solid #F1F5F9',
  },
  visitCardDate: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: '#0F172A',
    flexWrap: 'wrap',
  },
  visitDateText: {
    fontWeight: 700,
    fontSize: '11.5px',
    color: '#0F172A',
  },
  vitalsBadgeBP: {
    backgroundColor: '#EFF6FF',
    border: '1px solid #BFDBFE',
    color: '#1D4ED8',
    fontSize: '9.5px',
    fontWeight: 600,
    padding: '1px 6px',
    borderRadius: '10px',
  },
  vitalsBadgeSugar: {
    backgroundColor: '#FFFBEB',
    border: '1px solid #FDE68A',
    color: '#B45309',
    fontSize: '9.5px',
    fontWeight: 600,
    padding: '1px 6px',
    borderRadius: '10px',
  },
  vitalsBadgeOther: {
    backgroundColor: '#FAF5FF',
    border: '1px solid #E9D5FF',
    color: '#7E22CE',
    fontSize: '9.5px',
    fontWeight: 600,
    padding: '1px 6px',
    borderRadius: '10px',
  },
  visitCardActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexWrap: 'wrap',
  },
  visitDueBadge: {
    fontSize: '9.5px',
    fontWeight: 700,
    padding: '1px 6px',
    borderRadius: '10px',
    border: '1px solid transparent',
  },
  editVisitBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    backgroundColor: '#F8FAFC',
    border: '1px solid #CBD5E1',
    color: '#334155',
    fontSize: '10px',
    fontWeight: 600,
    padding: '2px 7px',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  printPastRxBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    backgroundColor: '#EFF6FF',
    border: '1px solid #BFDBFE',
    color: '#1D4ED8',
    fontSize: '10px',
    fontWeight: 600,
    padding: '2px 7px',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  deleteVisitBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    backgroundColor: '#FEF2F2',
    border: '1px solid #FECACA',
    color: '#DC2626',
    fontSize: '10px',
    fontWeight: 600,
    padding: '2px 7px',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  complaintBlock: {
    backgroundColor: '#FFF7F7',
    border: '1px solid #FECACA',
    borderRadius: '4px',
    padding: '3px 8px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },
  complaintHeaderRow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    flexShrink: 0,
  },
  complaintHeaderLabel: {
    fontSize: '10px',
    fontWeight: 800,
    color: '#B91C1C',
    textTransform: 'uppercase',
    letterSpacing: '0.2px',
  },
  investigationBlock: {
    backgroundColor: '#F0F9FF',
    border: '1px solid #BAE6FD',
    borderRadius: '4px',
    padding: '3px 8px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },
  investigationHeaderRow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    flexShrink: 0,
  },
  investigationHeaderLabel: {
    fontSize: '10px',
    fontWeight: 800,
    color: '#0369A1',
    textTransform: 'uppercase',
    letterSpacing: '0.2px',
  },
  clinicalChipsRow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    flexWrap: 'wrap',
  },
  complaintChip: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #FECACA',
    color: '#991B1B',
    fontSize: '10px',
    fontWeight: 700,
    padding: '1px 6px',
    borderRadius: '3px',
    boxShadow: '0 1px 1px rgba(0,0,0,0.02)',
  },
  investigationChip: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #BAE6FD',
    color: '#0369A1',
    fontSize: '10px',
    fontWeight: 700,
    padding: '1px 6px',
    borderRadius: '3px',
    boxShadow: '0 1px 1px rgba(0,0,0,0.02)',
  },
  pastTreatmentsBlock: {
    backgroundColor: '#FFFDF9',
    border: '1px solid #FED7AA',
    borderRadius: '4px',
    padding: '3px 8px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },
  treatmentHeaderRow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    flexShrink: 0,
  },
  treatmentHeaderLabel: {
    fontSize: '10px',
    fontWeight: 800,
    color: '#C2410C',
    textTransform: 'uppercase',
    letterSpacing: '0.2px',
  },
  treatmentChipsRow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    flexWrap: 'wrap',
  },
  treatmentChip: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #FDBA74',
    color: '#9A3412',
    fontSize: '10px',
    fontWeight: 700,
    padding: '1px 6px',
    borderRadius: '3px',
    boxShadow: '0 1px 1px rgba(0,0,0,0.02)',
  },
  pastPrescriptionBlock: {
    backgroundColor: '#F0FDF4',
    border: '1px solid #BBF7D0',
    borderRadius: '4px',
    padding: '3px 8px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },
  rxHeaderRow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    flexShrink: 0,
  },
  rxHeaderLabel: {
    fontSize: '10px',
    fontWeight: 800,
    color: '#15803D',
    textTransform: 'uppercase',
    letterSpacing: '0.2px',
  },
  pastRxChips: {
    display: 'inline-flex',
    flexWrap: 'wrap',
    gap: '4px',
  },
  rxCard: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #86EFAC',
    borderRadius: '4px',
    padding: '1px 6px',
    fontSize: '10px',
    boxShadow: '0 1px 1px rgba(0,0,0,0.02)',
  },
  rxMedName: {
    fontWeight: 700,
    color: '#0F172A',
  },
  rxQtyBadge: {
    backgroundColor: '#F1F5F9',
    color: '#475569',
    fontSize: '9px',
    fontWeight: 600,
    padding: '0 4px',
    borderRadius: '3px',
  },
  rxDoseBadge: {
    backgroundColor: '#EFF6FF',
    border: '1px solid #BFDBFE',
    color: '#1D4ED8',
    fontSize: '9.5px',
    fontWeight: 700,
    padding: '0 4px',
    borderRadius: '3px',
    letterSpacing: '0.2px',
  },
  rxTimingBadge: {
    backgroundColor: '#FEF3C7',
    border: '1px solid #FDE68A',
    color: '#92400E',
    fontSize: '9px',
    fontWeight: 700,
    padding: '0 4px',
    borderRadius: '3px',
  },
  visitFinancialStrip: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '10px',
    color: '#64748B',
    paddingTop: '2px',
    borderTop: '1px dashed #E2E8F0',
  },
  stripDot: {
    color: '#CBD5E1',
    fontWeight: 700,
  },

  // Modals
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    padding: '14px',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    width: '100%',
    maxWidth: '520px',
    boxShadow: 'var(--shadow-lg)',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    borderBottom: '1px solid var(--border)',
    backgroundColor: 'var(--surface-alt)',
  },
  modalHeaderTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    fontWeight: 700,
    color: 'var(--text)',
  },
  closeModalBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    padding: '2px',
  },
  modalForm: {
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  formLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--text)',
  },
  modalInput: {
    width: '100%',
    height: '32px',
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border)',
    borderRadius: '5px',
    padding: '0 10px',
    fontSize: '12px',
    color: 'var(--text)',
  },
  formGrid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '6px',
    paddingTop: '10px',
    borderTop: '1px solid var(--border)',
  },
  modalCancelBtn: {
    height: '30px',
    padding: '0 12px',
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border)',
    borderRadius: '5px',
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text)',
    cursor: 'pointer',
  },
  modalSubmitBtn: {
    height: '30px',
    padding: '0 16px',
    backgroundColor: 'var(--primary)',
    border: 'none',
    borderRadius: '5px',
    fontSize: '11px',
    fontWeight: 700,
    color: '#FFFFFF',
    cursor: 'pointer',
  },
  modalBodyText: {
    padding: '14px',
    fontSize: '13px',
    color: 'var(--text)',
    lineHeight: '1.4',
  },
  dangerConfirmBtn: {
    height: '30px',
    padding: '0 14px',
    backgroundColor: 'var(--danger)',
    border: 'none',
    borderRadius: '5px',
    fontSize: '11px',
    fontWeight: 700,
    color: '#FFFFFF',
    cursor: 'pointer',
  },

  // Print Modal
  printModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    width: '100%',
    maxWidth: '840px',
    maxHeight: '94vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'var(--shadow-lg)',
    overflow: 'hidden',
  },
  printModalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    backgroundColor: 'var(--surface-alt)',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  printClinicBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--primary)',
  },
  printActionButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  printTriggerBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'var(--primary)',
    color: '#FFFFFF',
    fontSize: '12px',
    fontWeight: 700,
    padding: '6px 14px',
    borderRadius: '5px',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 2px 5px rgba(20, 107, 92, 0.25)',
  },

  // Print Modal Interactive Controls Bar
  printControlPanel: {
    backgroundColor: '#F8FAF9',
    borderBottom: '1px solid var(--border)',
    padding: '10px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    flexShrink: 0,
  },
  printOptionRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '8px',
  },
  printOptionLabelCol: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  printOptionHeading: {
    fontSize: '11.5px',
    fontWeight: 800,
    color: 'var(--text)',
    letterSpacing: '0.2px',
  },
  langPillsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  langPillBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '4px 12px',
    borderRadius: '16px',
    border: '1px solid var(--border)',
    fontSize: '11px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  dietaryControlBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '8px 12px',
  },
  dietaryControlHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clearDietaryBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--danger)',
    fontSize: '10.5px',
    fontWeight: 600,
    cursor: 'pointer',
    padding: '0 4px',
  },
  dietarySearchInput: {
    width: '100%',
    height: '28px',
    fontSize: '11px',
    backgroundColor: 'var(--surface-alt)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    padding: '0 8px',
  },
  quickChipsWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginTop: '2px',
  },
  quickChipsLabel: {
    fontSize: '10px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  quickChipsRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '5px',
  },
  masterDietaryChip: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    fontSize: '10px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  selectedDietaryPillsRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '2px',
    paddingTop: '4px',
    borderTop: '1px dashed var(--border)',
  },
  activeDietaryTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#D1FAE5',
    color: '#065F46',
    border: '1px solid #6EE7B7',
    padding: '1px 7px',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: 600,
  },
  removeDietaryTagBtn: {
    background: 'none',
    border: 'none',
    color: '#047857',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
    padding: 0,
    lineHeight: 1,
  },
  printHelpNotice: {
    fontSize: '10.5px',
    color: '#0E4F44',
    backgroundColor: '#E6F4EA',
    padding: '4px 8px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },

  // Doctor's Letterpad Printable Paper Document (#printable-rx)
  cleanRxPaper: {
    padding: '24px 30px',
    overflowY: 'auto',
    backgroundColor: '#FFFFFF',
    color: '#000000',
    minHeight: '480px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    position: 'relative',
  },
  letterpadTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
  },
  letterpadDocName: {
    fontSize: '27px',
    fontWeight: '900',
    color: '#0B63AC',
    letterSpacing: '0.4px',
    lineHeight: 1.1,
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
    textShadow: '0.5px 0.5px 0px rgba(11,99,172,0.15)',
  },
  letterpadDocSubRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px',
    marginTop: '2px',
  },
  letterpadDocSpecialty: {
    fontSize: '12.5px',
    fontWeight: '800',
    color: '#0088CC',
    letterSpacing: '0.6px',
    textTransform: 'uppercase',
  },
  letterpadDocDegree: {
    fontSize: '11.5px',
    fontWeight: '700',
    color: '#334155',
  },
  letterpadRightContact: {
    textAlign: 'right',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flexShrink: 0,
  },
  letterpadContactLine: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#1E293B',
  },
  letterpadAddressBar: {
    backgroundColor: '#DCE2E6',
    border: '1px solid #CBD5E1',
    padding: '3px 8px',
    margin: '6px 0 8px 0',
    textAlign: 'center',
    fontSize: '11px',
    fontWeight: '600',
    color: '#1E293B',
    letterSpacing: '0.2px',
  },
  letterpadPatientRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: '4px 0 8px 0',
    borderBottom: '1px solid #94A3B8',
    marginBottom: '8px',
    position: 'relative',
    zIndex: 1,
  },
  letterpadForUnderline: {
    fontWeight: '800',
    fontSize: '14px',
    color: '#000000',
    borderBottom: '1px dashed #64748B',
    paddingBottom: '1px',
    flex: 1,
    textTransform: 'uppercase',
  },
  letterpadDateUnderline: {
    fontWeight: '800',
    fontSize: '13px',
    color: '#000000',
    borderBottom: '1px dashed #64748B',
    paddingBottom: '1px',
    minWidth: '95px',
    textAlign: 'center',
  },
  letterpadPharmacyBar: {
    marginTop: '22px',
    padding: '6px 12px',
    borderTop: '1.5px solid #CBD5E1',
    backgroundColor: '#F8FAFC',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '12px',
    position: 'relative',
    zIndex: 1,
  },
  letterpadPharmacyPlus: {
    fontSize: '18px',
    fontWeight: '900',
    color: '#0B63AC',
    lineHeight: 1,
  },
  letterpadPharmacyText: {
    fontSize: '13.5px',
    fontWeight: '800',
    color: '#0B63AC',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    fontFamily: "'Segoe UI', -apple-system, Roboto, sans-serif",
  },
  letterpadHeader: {
    textAlign: 'center',
    paddingBottom: '8px',
    marginBottom: '4px',
  },
  letterpadClinicTitle: {
    fontSize: '22px',
    fontWeight: '900',
    color: '#0D483E',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    margin: '0 0 3px 0',
  },
  letterpadClinicSub: {
    fontSize: '11px',
    fontWeight: '500',
    color: '#4B5563',
    margin: '0 0 3px 0',
  },
  letterpadDoctorLine: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#1F2937',
    margin: '0 0 8px 0',
  },
  letterpadDividerLine: {
    height: '2.5px',
    backgroundColor: '#146B5C',
    width: '100%',
    margin: '0 auto',
  },
  letterpadPatientGrid: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    padding: '6px 0',
    flexWrap: 'wrap',
    gap: '8px',
  },
  letterpadPatientDivider: {
    height: '1px',
    backgroundColor: '#CBD5E1',
    width: '100%',
    marginBottom: '6px',
  },
  cleanPatientBlock: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
    flexWrap: 'wrap',
  },
  cleanLabel: {
    fontSize: '12px',
    fontWeight: 800,
    color: '#000000',
    letterSpacing: '0.4px',
    textTransform: 'uppercase',
  },
  cleanPatientName: {
    fontSize: '16px',
    fontWeight: 800,
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: '0.2px',
  },
  cleanAge: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#333333',
  },
  cleanDateBlock: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px',
  },
  cleanDateValue: {
    fontSize: '13.5px',
    fontWeight: 700,
    color: '#000000',
  },
  cleanRxBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '2px',
  },
  cleanRxTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '2px',
  },
  cleanRxSymbol: {
    fontSize: '24px',
    fontWeight: 900,
    color: '#146B5C',
    fontFamily: 'serif',
    lineHeight: 1,
  },
  cleanRxTitle: {
    fontSize: '13px',
    fontWeight: 800,
    color: '#0D483E',
    letterSpacing: '0.4px',
  },
  cleanRxTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '11.5px',
    color: '#000000',
    marginTop: '2px',
  },
  cleanTh: {
    padding: '7px 8px',
    backgroundColor: '#F3F4F6',
    border: '1px solid #000000',
    color: '#000000',
    fontWeight: 800,
    fontSize: '11px',
    letterSpacing: '0.3px',
  },
  cleanTd: {
    padding: '7px 8px',
    border: '1px solid #000000',
    color: '#000000',
    verticalAlign: 'middle',
  },
  cleanMedName: {
    fontSize: '12.5px',
    fontWeight: 800,
    color: '#000000',
  },
  dosageCellWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  dosageHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },
  dosePillBadge: {
    fontSize: '11px',
    fontWeight: '800',
    color: '#0F172A',
    backgroundColor: '#F1F5F9',
    padding: '1px 6px',
    borderRadius: '4px',
    border: '1px solid #CBD5E1',
    letterSpacing: '0.6px',
  },
  timingPillBadge: {
    fontSize: '10px',
    fontWeight: '700',
    padding: '1px 6px',
    borderRadius: '4px',
    border: '1px solid transparent',
  },
  humanDoseInstruction: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#0D483E',
    marginTop: '1px',
  },
  letterpadFooterRow: {
    marginTop: '20px',
    paddingTop: '14px',
    borderTop: '1px dashed #CBD5E1',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: '14px',
  },
  letterpadFooterAdviceCol: {
    flex: 1,
    minWidth: '200px',
  },
  letterpadFooterAdviceText: {
    margin: 0,
    fontSize: '11px',
    fontWeight: '600',
    color: '#4B5563',
  },
  letterpadFooterTimingsText: {
    margin: '3px 0 0 0',
    fontSize: '10.5px',
    fontWeight: '500',
    color: '#64748B',
  },
  letterpadSignCol: {
    textAlign: 'center',
    minWidth: '170px',
  },
  letterpadCursiveSignature: {
    fontFamily: '"Brush Script MT", cursive, sans-serif',
    fontSize: '22px',
    color: '#0D483E',
    display: 'block',
    lineHeight: 1,
    marginBottom: '2px',
  },
  letterpadSignLine: {
    height: '1px',
    backgroundColor: '#0D483E',
    width: '140px',
    margin: '2px auto 4px auto',
  },
  letterpadSignName: {
    fontSize: '12px',
    fontWeight: '800',
    color: '#111827',
    display: 'block',
  },
  letterpadSignRole: {
    fontSize: '10px',
    fontWeight: '600',
    color: '#4B5563',
    display: 'block',
  },
  cleanTimingBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 700,
    backgroundColor: '#F3F4F6',
    color: '#000000',
    border: '1px solid #000000',
  },
  cleanDietaryBox: {
    marginTop: '14px',
    padding: '9px 12px',
    border: '1.5px solid #0D483E',
    borderRadius: '6px',
    backgroundColor: '#F0FDF4',
  },
  cleanDietaryTitle: {
    fontSize: '11.5px',
    fontWeight: 800,
    color: '#0D483E',
    letterSpacing: '0.3px',
    marginBottom: '5px',
    display: 'block',
  },
  cleanDietaryList: {
    margin: 0,
    paddingLeft: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  cleanDietaryItem: {
    fontSize: '11.5px',
    fontWeight: 600,
    color: '#166534',
    lineHeight: '1.4',
  },

  // Due Breakdown Modals
  dueModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    width: '100%',
    maxWidth: '720px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'var(--shadow-lg)',
    overflow: 'hidden',
  },
  dueModalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  dueModalTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#0F172A',
    margin: 0,
  },
  dueModalSubtitle: {
    fontSize: '11px',
    color: '#64748B',
    margin: '3px 0 0 0',
  },
  dueModalStatsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: '#FAFAFA',
    borderBottom: '1px solid #E2E8F0',
  },
  dueKpiCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '8px 10px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '6px',
    textAlign: 'center',
  },
  dueKpiLabel: {
    fontSize: '9.5px',
    fontWeight: 800,
    letterSpacing: '0.4px',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  dueKpiValue: {
    fontSize: '16px',
    fontWeight: 800,
    color: '#0F172A',
  },
  dueFilterRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 16px',
    borderBottom: '1px solid #F1F5F9',
    backgroundColor: '#FFFFFF',
    flexWrap: 'wrap',
    gap: '8px',
  },
  dueFilterBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 10px',
    borderRadius: '12px',
    border: 'none',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  dueTableWrap: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 16px',
    maxHeight: '340px',
  },
  dueTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '11px',
  },
  dueTableHeadTr: {
    backgroundColor: '#F8FAFC',
    borderBottom: '1px solid #E2E8F0',
    position: 'sticky',
    top: 0,
    zIndex: 1,
  },
  dueTh: {
    padding: '8px 6px',
    fontSize: '10px',
    fontWeight: 700,
    color: '#64748B',
    letterSpacing: '0.3px',
    textAlign: 'left',
  },
  dueTableTr: {
    borderBottom: '1px solid #F1F5F9',
    transition: 'background-color 0.1s ease',
  },
  dueTd: {
    padding: '8px 6px',
    verticalAlign: 'middle',
  },
  dueStatusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: 600,
    border: '1px solid',
  },
  dueActionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    backgroundColor: '#EFF6FF',
    border: '1px solid #BFDBFE',
    color: '#1D4ED8',
    fontSize: '10px',
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  dueEmptyBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '36px 16px',
    backgroundColor: '#F0FDF4',
    borderRadius: '6px',
    margin: '16px 0',
  },
  dueModalFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 16px',
    borderTop: '1px solid #E2E8F0',
    backgroundColor: '#F8FAFC',
  },
};
