import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { patientAPI, visitAPI, masterDataAPI, familyAPI } from '../services/api';
import {
  MasterDataInput,
  preloadMasterData,
  resolveMasterShortcut,
} from '../components/common/MasterDataInput';
import {
  preloadPatients,
  searchPatientsInMemory,
  updateCachedPatient,
} from '../utils/patientCache';
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
  UserPlus,
  ExternalLink,
  Languages,
  UtensilsCrossed,
  Syringe,
  FlaskConical,
  ShieldAlert,
  Clock,
} from 'lucide-react';

// Format human-readable dosage instructions in selected language
const formatDoseInstruction = (m, n, e, ng, timing, langKey, sosInstruction = '') => {
  const mVal = String(m ?? '').trim();
  const nVal = String(n ?? '').trim();
  const eVal = String(e ?? '').trim();
  const ngVal = String(ng ?? '').trim();
  const isBf = timing === 'BF';
  const isSos = timing === 'SOS';

  if (isSos) {
    const customText = sosInstruction ? ` (${sosInstruction})` : '';
    if (langKey === 'hi') return `ज़रूरत पड़ने पर (SOS)${customText}`;
    if (langKey === 'gu') return `જરૂર પડ્યે (SOS)${customText}`;
    return `As Needed (SOS)${customText}`;
  }

  const parts = [];

  if (langKey === 'hi') {
    if (mVal && mVal !== '0') parts.push(`${mVal} सुबह (Morning)`);
    if (nVal && nVal !== '0') parts.push(`${nVal} दोपहर (Afternoon)`);
    if (eVal && eVal !== '0') parts.push(`${eVal} शाम (Evening)`);
    if (ngVal && ngVal !== '0') parts.push(`${ngVal} रात (Night)`);
    const timingStr = isBf ? 'खाने से पहले (भूखे पेट)' : 'खाने के बाद';
    const doseText = parts.length > 0 ? parts.join(', ') : 'डॉक्टर के निर्देशानुसार';
    return `${doseText} — ${timingStr}`;
  }

  if (langKey === 'gu') {
    if (mVal && mVal !== '0') parts.push(`${mVal} સવારે (Morning)`);
    if (nVal && nVal !== '0') parts.push(`${nVal} બપોરે (Afternoon)`);
    if (eVal && eVal !== '0') parts.push(`${eVal} સાંજે (Evening)`);
    if (ngVal && ngVal !== '0') parts.push(`${ngVal} રાત્રે (Night)`);
    const timingStr = isBf ? 'જમ્યા પહેલાં (ભૂખ્યા પેટે)' : 'જમ્યા પછી';
    const doseText = parts.length > 0 ? parts.join(', ') : 'ડોક્ટરની સલાહ મુજબ';
    return `${doseText} — ${timingStr}`;
  }

  // English default
  if (mVal && mVal !== '0') parts.push(`${mVal} Morning`);
  if (nVal && nVal !== '0') parts.push(`${nVal} Afternoon`);
  if (eVal && eVal !== '0') parts.push(`${eVal} Evening`);
  if (ngVal && ngVal !== '0') parts.push(`${ngVal} Night`);
  const timingStr = isBf ? 'Before Food' : 'After Food';
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
    bfLabel: 'Before Food',
    afLabel: 'After Food',
    sosLabel: 'SOS (As Needed)',
    dietaryTitle: 'DIETARY SUGGESTIONS',
    noPrescription: 'No medical store prescription prescribed for this visit.',
    footerAdvice: '* Please take medicines on time as prescribed.',
    opdTimings: 'OPD Hours: Mon - Sat (9:00 AM - 1:00 PM, 5:00 PM - 9:00 PM)',
    timingHelp: (m, n, e, ng, timing, sosInstruction) => formatDoseInstruction(m, n, e, ng, timing, 'en', sosInstruction),
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
    bfLabel: 'खाने से पहले (भूखे पेट)',
    afLabel: 'खाने के बाद ',
    sosLabel: 'ज़रूरत पड़ने पर (SOS)',
    dietaryTitle: 'आहार एवं परहेज़ संबंधी सलाह:',
    noPrescription: 'इस विज़िट के लिए कोई दवा नहीं लिखी गई है।',
    footerAdvice: '* कृपया दवाइयाँ समय पर और निर्देशानुसार लें।',
    opdTimings: 'ओपीडी समय: सोम - शनि (सुबह 9:00 - 1:00, शाम 5:00 - 9:00)',
    timingHelp: (m, n, e, ng, timing, sosInstruction) => formatDoseInstruction(m, n, e, ng, timing, 'hi', sosInstruction),
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
    bfLabel: 'જમ્યા પહેલાં (ભૂખ્યા પેટે)',
    afLabel: 'જમ્યા પછી',
    sosLabel: 'જરૂર પડ્યે (SOS)',
    dietaryTitle: 'ખોરાક અને પરેજી અંગેની સૂચનાઓ:',
    noPrescription: 'આ મુલાકાત માટે કોઈ દવા લખેલ નથી.',
    footerAdvice: '* કૃપા કરીને દવાઓ સમયસર અને સૂચના મુજબ લો.',
    opdTimings: 'ઓપીડી સમય: સોમ - શનિ (સવારે 9:00 - 1:00, સાંજે 5:00 - 9:00)',
    timingHelp: (m, n, e, ng, timing, sosInstruction) => formatDoseInstruction(m, n, e, ng, timing, 'gu', sosInstruction),
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

export const PatientRecord = ({
  selectedPatientId,
  onNavigateToAddMember,
  isActiveTab = true,
  initialPatientForNewCase = null,
  initialVisitToEdit = null,
  onClearNavigationCase = null,
}) => {
  const { doctor } = useAuth();
  // --- Search & Patient State ---
  const [patientSearch, setPatientSearch] = useState('');
  const debouncedSearch = useDebounce(patientSearch, 250);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [patientHighlightIndex, setPatientHighlightIndex] = useState(0);
  const searchWrapRef = useRef(null);
  const patientSearchInputRef = useRef(null);
  const [recentPatientsList, setRecentPatientsList] = useState([]);

  const [currentPatient, setCurrentPatient] = useState(null);
  const [patientVisits, setPatientVisits] = useState([]);
  const [loadingVisits, setLoadingVisits] = useState(false);
  const [toastMessage, setToastMessage] = useState({ text: '', type: 'success' });

  // --- Layout Mode State ---
  // 'stacked' = Top Case Entry + Bottom History
  // 'side-by-side' = Left Case Entry + Right History
  const [layoutMode, setLayoutMode] = useState('stacked');
  const splitContainerRef = useRef(null);
  const bpInputRef = useRef(null);
  const caseFormPaneRef = useRef(null);

  // Refs for keyboard navigation: Clinic Medicine
  const clinicMedQtyRef = useRef(null);
  const clinicMedMorningRef = useRef(null);
  const clinicMedNoonRef = useRef(null);
  const clinicMedEveningRef = useRef(null);

  // Refs for keyboard navigation: Prescription
  const rxQtyRef = useRef(null);
  const rxMorningRef = useRef(null);
  const rxNoonRef = useRef(null);
  const rxEveningRef = useRef(null);
  const rxNightRef = useRef(null);
  const rxTimingRef = useRef(null);

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
      visitAPI.update(printVisit._id, { dietary: updated }).catch(() => { });
    }
  };

  const handleDietaryInputChange = (val) => {
    setPrintDietary(val);
    if (printVisit?._id) {
      visitAPI.update(printVisit._id, { dietary: val }).catch(() => { });
    }
  };

  // --- New Case Visibility & Edit Mode State ---
  const [showNewCaseForm, setShowNewCaseForm] = useState(false);
  const [editingVisitId, setEditingVisitId] = useState(null);
  const [editingVisit, setEditingVisit] = useState(null);

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
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showInlineHistory, setShowInlineHistory] = useState(false);

  // Editable Demographics & Auto-calculated Age
  const [patientDob, setPatientDob] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientHouseNo, setPatientHouseNo] = useState('');
  const [patientSociety, setPatientSociety] = useState('');
  const [patientArea, setPatientArea] = useState('');

  // Automatically vanish case history when switching to another tab
  useEffect(() => {
    if (!isActiveTab) {
      setShowInlineHistory(false);
    }
  }, [isActiveTab]);

  // Age calculation helper in Years, Months, and Days
  const calculateDetailedAge = (dobString) => {
    if (!dobString) return '';
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return '';
    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();

    if (days < 0) {
      months -= 1;
      const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    if (years < 0) return '0 Y';

    const parts = [];
    if (years > 0) parts.push(`${years} Y`);
    if (months > 0 || years === 0) parts.push(`${months} M`);
    if (days > 0 || (years === 0 && months === 0)) parts.push(`${days} D`);
    return parts.join(' ');
  };

  const handleDobChange = (dobVal) => {
    setPatientDob(dobVal);
    if (dobVal) {
      const birthDate = new Date(dobVal);
      if (!isNaN(birthDate.getTime())) {
        const today = new Date();
        let y = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          y--;
        }
        setPatientAge(String(Math.max(0, y)));
      }
    }
  };

  // Quick inputs state for new layout cards
  const [tempAllergy, setTempAllergy] = useState('');
  const [tempComplaint, setTempComplaint] = useState('');
  const [tempInvestigation, setTempInvestigation] = useState('');
  const [tempLabName, setTempLabName] = useState('CARE');
  const [tempIpd, setTempIpd] = useState('');
  const [clinicMedForm, setClinicMedForm] = useState({
    medicine: '',
    qty: '1',
    morning: '1',
    noon: '0',
    evening: '1',
  });
  const [rxForm, setRxForm] = useState({
    medicine: '',
    qty: '10',
    morning: '1',
    noon: '0',
    evening: '1',
    night: '0',
    timing: 'AF',
    sosInstruction: '',
  });
  const [dietaryCodeInput, setDietaryCodeInput] = useState('');
  const [dietaryTextInput, setDietaryTextInput] = useState('');
  const [dietaryMasterList, setDietaryMasterList] = useState([]);
  const [dietarySuggestions, setDietarySuggestions] = useState([]);
  const [showDietaryDropdown, setShowDietaryDropdown] = useState(false);
  const [dietaryHighlightIndex, setDietaryHighlightIndex] = useState(0);
  const dietaryCodeWrapRef = useRef(null);
  const dietaryCodeInputRef = useRef(null);
  const dietaryAdviceInputRef = useRef(null);

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
    investigationList: [],
    complaint: '',
    complaintList: [],
    allergyList: [],
    ipdDetails: [],
    treatments: [],
    prescriptions: [],
    dietary: '',
    charge: '0',
    received: '0',
  };

  const [visitForm, setVisitForm] = useState(initialVisitForm);
  const [isSavingVisit, setIsSavingVisit] = useState(false);

  // Preload master data in memory on component mount for zero-latency shortcut auto-resolve
  useEffect(() => {
    preloadMasterData('medicine');
    preloadMasterData('complaint');
    preloadMasterData('investigation');
    preloadMasterData('allergy');
    preloadMasterData('ipd');
    preloadMasterData('area');
    preloadMasterData('society');
    preloadMasterData('dietary').then((items) => {
      if (Array.isArray(items) && items.length > 0) {
        setDietaryMasterList(items);
      }
    });

    // Also fetch fresh dietary items directly from API to guarantee latest codes
    masterDataAPI
      .getItems('dietary', '', 1, 200)
      .then((res) => {
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          setDietaryMasterList(res.data);
        }
      })
      .catch(() => {});
  }, []);

  // Synchronous references to eliminate stale closures in keyboard shortcuts
  const visitFormRef = useRef(visitForm);
  useEffect(() => {
    visitFormRef.current = visitForm;
  }, [visitForm]);

  const editingVisitIdRef = useRef(editingVisitId);
  useEffect(() => {
    editingVisitIdRef.current = editingVisitId;
  }, [editingVisitId]);

  const editingVisitRef = useRef(editingVisit);
  useEffect(() => {
    editingVisitRef.current = editingVisit;
  }, [editingVisit]);

  const currentPatientRef = useRef(currentPatient);
  useEffect(() => {
    currentPatientRef.current = currentPatient;
  }, [currentPatient]);

  const attachedReportRef = useRef(attachedReport);
  useEffect(() => {
    attachedReportRef.current = attachedReport;
  }, [attachedReport]);

  const showNewCaseFormRef = useRef(showNewCaseForm);
  useEffect(() => {
    showNewCaseFormRef.current = showNewCaseForm;
  }, [showNewCaseForm]);

  // --- Draft Persistence: Keep typed data safe across tab switches and refreshes ---
  const DRAFT_KEY = 'cms_patient_record_draft';
  const isInitialDraftLoaded = useRef(false);
  const hasJustSavedRef = useRef(false);

  useEffect(() => {
    if (isInitialDraftLoaded.current) return;
    isInitialDraftLoaded.current = true;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.currentPatient) {
          setCurrentPatient(d.currentPatient);
          currentPatientRef.current = d.currentPatient;
        }
        if (d.visitForm) {
          setVisitForm(d.visitForm);
          visitFormRef.current = d.visitForm;
        }
        if (d.patientDob !== undefined) setPatientDob(d.patientDob);
        if (d.patientAge !== undefined) setPatientAge(d.patientAge);
        if (d.patientPhone !== undefined) setPatientPhone(d.patientPhone);
        if (d.patientHouseNo !== undefined) setPatientHouseNo(d.patientHouseNo);
        if (d.patientSociety !== undefined) setPatientSociety(d.patientSociety);
        if (d.patientArea !== undefined) setPatientArea(d.patientArea);
      }
    } catch (e) {
      console.warn('Could not restore draft:', e);
    }
  }, []);

  useEffect(() => {
    if (!isInitialDraftLoaded.current) return;
    if (hasJustSavedRef.current) {
      hasJustSavedRef.current = false;
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch (e) {}
      return;
    }
    const hasData =
      currentPatient ||
      visitForm.bp ||
      visitForm.sugar ||
      visitForm.complaint ||
      (visitForm.treatments || []).length > 0 ||
      (visitForm.prescriptions || []).length > 0 ||
      (visitForm.allergyList || []).length > 0 ||
      (visitForm.complaintList || []).length > 0 ||
      (visitForm.ipdDetails || []).length > 0;

    if (!hasData) {
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch (e) {}
      return;
    }
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          currentPatient,
          visitForm,
          patientDob,
          patientAge,
          patientPhone,
          patientHouseNo,
          patientSociety,
          patientArea,
        })
      );
    } catch (e) {}
  }, [currentPatient, visitForm, patientDob, patientAge, patientPhone, patientHouseNo, patientSociety, patientArea]);

  const handleSaveVisitRef = useRef();
  const isSavingVisitRef = useRef(false);

  // Helper to reliably update form field and sync ref immediately
  const updateFormField = (field, value) => {
    setVisitForm((prev) => {
      const current = prev || visitFormRef.current || visitForm;
      const updated = { ...current, [field]: value };
      visitFormRef.current = updated;
      return updated;
    });
  };

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

  // --- Global Keyboard Shortcuts: Alt+N/F3 for New Case, Ctrl+S for Save Case, Ctrl+Enter for Save & Print ---
  useEffect(() => {
    const handleGlobalShortcuts = (e) => {
      // Don't intercept if an overlay modal is open
      if (showAddReportModal || showTotalDueModal || showFamilyDueModal || showPrintModal) {
        return;
      }

      // 1. Open New Case: Alt+N or F3
      const isAltN = e.altKey && (e.key === 'n' || e.key === 'N');
      const isF3 = e.key === 'F3';
      if (isAltN || isF3) {
        if (!showNewCaseFormRef.current) {
          e.preventDefault();
          e.stopPropagation();
          handleOpenNewCase();
        } else {
          // If already open, focus BP without wiping data
          e.preventDefault();
          e.stopPropagation();
          if (bpInputRef.current) {
            bpInputRef.current.focus();
            bpInputRef.current.select?.();
          }
        }
        return;
      }

      // 2. Case Form Shortcuts: Active when New Case / Edit Visit Form is visible
      if (showNewCaseFormRef.current) {
        // A. Save Case without print: Ctrl+S or Alt+S
        const isCtrlS = (e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S');
        const isAltS = e.altKey && (e.key === 's' || e.key === 'S');
        if (isCtrlS || isAltS) {
          e.preventDefault();
          e.stopPropagation();
          if (document.activeElement && typeof document.activeElement.blur === 'function') {
            document.activeElement.blur();
          }
          setTimeout(() => {
            if (handleSaveVisitRef.current && !isSavingVisitRef.current) {
              handleSaveVisitRef.current(false);
            }
          }, 35);
          return;
        }

        // B. Save & Print Case: Ctrl+Enter or Alt+P
        const isCtrlEnter = (e.ctrlKey || e.metaKey) && e.key === 'Enter';
        const isAltP = e.altKey && (e.key === 'p' || e.key === 'P');
        if (isCtrlEnter || isAltP) {
          e.preventDefault();
          e.stopPropagation();
          if (document.activeElement && typeof document.activeElement.blur === 'function') {
            document.activeElement.blur();
          }
          setTimeout(() => {
            if (handleSaveVisitRef.current && !isSavingVisitRef.current) {
              handleSaveVisitRef.current(true);
            }
          }, 35);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [showAddReportModal, showTotalDueModal, showFamilyDueModal, showPrintModal]);

  // --- 1. Load Initial / Pre-selected Patient ---
  useEffect(() => {
    const initPatient = async () => {
      try {
        if (initialPatientForNewCase || initialVisitToEdit) {
          return; // Managed by dedicated navigation effects
        }
        if (selectedPatientId) {
          const res = await patientAPI.getById(selectedPatientId);
          if (res?.success && res.patient) {
            handleSelectPatient(res.patient, true);
            return;
          }
        }
        // Do NOT auto-load any patient by default!
        // Start in search mode so doctor can search by patient name first.
        if (!currentPatientRef.current) {
          setCurrentPatient(null);
          setShowNewCaseForm(false);
          showNewCaseFormRef.current = false;
        }
      } catch (err) {
        console.error('Error loading initial patient:', err);
      }
    };
    initPatient();
  }, [selectedPatientId]);

  useEffect(() => {
    if (initialPatientForNewCase) {
      const startCase = async () => {
        try {
          let pat = initialPatientForNewCase;
          if (pat.patientId && pat.patientId !== 'NEW' && (!pat.age || !pat.family)) {
            try {
              const res = await patientAPI.getById(pat.patientId);
              if (res?.success && res.patient) {
                pat = res.patient;
              }
            } catch (e) {
              console.warn('Could not fetch full patient for new case:', e);
            }
          }
          handleSelectPatient(pat, true);
          handleOpenNewCase(pat);
        } catch (err) {
          console.error('Error handling new case navigation:', err);
        } finally {
          if (onClearNavigationCase) onClearNavigationCase();
        }
      };
      startCase();
    }
  }, [initialPatientForNewCase]);

  useEffect(() => {
    if (initialVisitToEdit) {
      const loadEdit = async () => {
        try {
          if (initialVisitToEdit.patientId) {
            const res = await patientAPI.getById(initialVisitToEdit.patientId);
            if (res?.success && res.patient) {
              handleSelectPatient(res.patient, false);
            }
          }
          handleStartEditVisit(initialVisitToEdit);
          if (onClearNavigationCase) onClearNavigationCase();
        } catch (e) {
          console.error('Error loading visit for edit:', e);
        }
      };
      loadEdit();
    }
  }, [initialVisitToEdit]);

  // --- Persistent Recently Searched OPD Patients Helpers ---
  const RECENT_SEARCHED_KEY = 'cms_recent_opd_searched_patients';

  const getStoredSearchedPatients = () => {
    try {
      const raw = localStorage.getItem(RECENT_SEARCHED_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error reading recent searches from storage:', e);
    }
    return [];
  };

  const addToRecentSearched = (patient) => {
    if (!patient || (!patient.patientId && !patient._id)) return;
    try {
      const pidToMatch = patient.patientId || patient._id;
      const currentList = getStoredSearchedPatients();
      const filtered = currentList.filter(
        (p) => (p.patientId || p._id) !== pidToMatch
      );

      const itemToAdd = {
        _id: patient._id,
        patientId: patient.patientId,
        name: patient.name,
        relation: patient.relation,
        isHead: patient.isHead,
        age: patient.age,
        gender: patient.gender,
        bloodGroup: patient.bloodGroup,
        phone: patient.phone,
        area: patient.area || patient.family?.area || '',
        society: patient.society || patient.family?.society || '',
        allergies: patient.allergies,
        familyId: patient.familyId,
        family: patient.family,
        searchedAt: Date.now(),
        isRecentlySearched: true,
      };

      const updated = [itemToAdd, ...filtered].slice(0, 15);
      localStorage.setItem(RECENT_SEARCHED_KEY, JSON.stringify(updated));

      // Update state immediately if landing page is open
      setRecentPatientsList((prev) => {
        const remaining = prev.filter((p) => (p.patientId || p._id) !== pidToMatch);
        return [itemToAdd, ...remaining].slice(0, 8);
      });
    } catch (err) {
      console.error('Error saving recent searched patient:', err);
    }
  };

  // --- Load Recent Patients for Landing Search View (At least 6 items guaranteed) ---
  const loadRecentOPDPatients = async () => {
    try {
      const searched = getStoredSearchedPatients();

      // If we already have 6 or more searched patients, show top 8
      if (searched.length >= 6) {
        setRecentPatientsList(searched.slice(0, 8));
        return;
      }

      // If fewer than 6, backfill with clinic's registered/visited patients to ensure at least 6
      const patientsRes = await patientAPI.getAll('');
      const allPatients =
        patientsRes.success && Array.isArray(patientsRes.data)
          ? patientsRes.data
          : [];

      const existingPids = new Set(searched.map((p) => p.patientId || p._id));
      const fillList = [];

      for (const p of allPatients) {
        const pid = p.patientId || p._id;
        if (!existingPids.has(pid)) {
          existingPids.add(pid);
          fillList.push(p);
          if (searched.length + fillList.length >= 8) {
            break;
          }
        }
      }

      const combined = [...searched, ...fillList];
      setRecentPatientsList(combined.slice(0, 8));
    } catch (err) {
      console.error('Error loading recent OPD patients:', err);
    }
  };

  useEffect(() => {
    if (!currentPatient) {
      loadRecentOPDPatients();
    }
  }, [currentPatient]);

  // --- Auto-focus Search Bar when in Search Mode ---
  useEffect(() => {
    if (!currentPatient) {
      setTimeout(() => {
        patientSearchInputRef.current?.focus();
      }, 100);
    }
  }, [currentPatient]);

  // --- 2. Live Instant In-Memory + Debounced Search for Patients ---
  useEffect(() => {
    preloadPatients().catch(() => {});
  }, []);

  const handlePatientSearchChange = (val) => {
    setPatientSearch(val);
    if (!val || !val.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }
    // Instant 0ms synchronous in-memory search from RAM
    const instantMatches = searchPatientsInMemory(val);
    if (instantMatches.length > 0) {
      setSearchResults(instantMatches.slice(0, 30));
      setPatientHighlightIndex(0);
      setShowSearchDropdown(true);
    }
  };

  useEffect(() => {
    let active = true;
    const searchPatients = async () => {
      if (!debouncedSearch.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      // Check RAM cache first
      const instantMatches = searchPatientsInMemory(debouncedSearch);
      if (instantMatches.length > 0) {
        setSearchResults(instantMatches.slice(0, 30));
        setPatientHighlightIndex(0);
        setShowSearchDropdown(true);
        return;
      }

      try {
        setIsSearching(true);
        const res = await patientAPI.getAll(debouncedSearch);
        if (active && res.success) {
          setSearchResults(res.data || []);
          setPatientHighlightIndex(0); // Automatically select first match
          setShowSearchDropdown(true);
          if (Array.isArray(res.data)) {
            res.data.forEach((p) => updateCachedPatient(p));
          }
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
      if (dietaryCodeWrapRef.current && !dietaryCodeWrapRef.current.contains(e.target)) {
        setShowDietaryDropdown(false);
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
    if (currentPatient?.patientId && currentPatient.patientId !== 'NEW') {
      loadPatientVisits(currentPatient.patientId);
    } else if (currentPatient?.patientId === 'NEW') {
      setPatientVisits([]);
    }
  }, [currentPatient?.patientId]);

  const handleSelectPatient = (patient, autoStartCase = true) => {
    if (!patient) return;
    addToRecentSearched(patient);
    setCurrentPatient(patient);
    setPatientDob(patient.dob || '');
    setPatientAge(patient.age !== undefined && patient.age !== null ? String(patient.age) : '');
    setPatientPhone(patient.phone || '');
    setPatientHouseNo(patient.houseNo || patient.family?.houseNo || '');
    setPatientSociety(patient.society || patient.family?.society || '');
    setPatientArea(patient.area || patient.family?.area || '');
    setShowInlineHistory(true); // Automatically show case history just below
    setShowSearchDropdown(false);
    setPatientSearch('');
    if (autoStartCase) {
      handleOpenNewCase(patient);
    }
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

  // --- Calculated Due vs Deposit for current case and patient overall ---
  const chargeNum = Math.max(0, Number(visitForm.charge) || 0);
  const receivedNum = Math.max(0, Number(visitForm.received) || 0);
  const computedDue = Math.max(0, chargeNum - receivedNum);

  // Existing recorded patient balance before this session (positive = due, negative = deposit)
  const recordedPatientDue = Math.max(0, Number(currentPatient?.totalDue) || 0);
  const recordedPatientDeposit = Math.max(0, Number(currentPatient?.deposit) || 0);
  const recordedPatientBalance = recordedPatientDue - recordedPatientDeposit;

  // If editing an existing stored visit, subtract its original net impact (charge - received)
  // so that we don't double count the visit that is ALREADY stored in recordedPatientBalance!
  const activeEditingVisit = editingVisit || (editingVisitId ? (patientVisits || []).find((v) => v._id === editingVisitId) : null);
  const origVisitNet = activeEditingVisit
    ? ((Math.max(0, Number(activeEditingVisit.charge) || 0)) - (Math.max(0, Number(activeEditingVisit.received) || 0)))
    : 0;

  // Baseline patient balance prior to this visit
  const baselinePatientBalance = recordedPatientBalance - origVisitNet;

  // Net projected patient balance after current form's charge and received are applied:
  const newNetBalance = baselinePatientBalance + (chargeNum - receivedNum);
  const finalPatientDue = newNetBalance > 0 ? newNetBalance : 0;
  const finalPatientDeposit = newNetBalance < 0 ? Math.abs(newNetBalance) : 0;

  // Personal Due & Family Due values for display in Billing Details section
  const personalDue = recordedPatientDue;
  const personalDeposit = recordedPatientDeposit;

  const familyDue = Math.max(0, Number(
    currentPatient?.family?.familyDue !== undefined
      ? currentPatient.family.familyDue
      : (currentPatient?.familyDue || familyData?.family?.familyDue || 0)
  ));
  const familyDeposit = Math.max(0, Number(
    currentPatient?.family?.familyDeposit !== undefined
      ? currentPatient.family.familyDeposit
      : (currentPatient?.familyDeposit || familyData?.family?.familyDeposit || 0)
  ));

  // --- New Card Quick Handlers for Exact Photo Layout ---
  const handleAddAllergy = (valToAdd = null) => {
    const raw = (typeof valToAdd === 'string' && valToAdd.trim() ? valToAdd : tempAllergy).trim();
    if (!raw) return;
    setVisitForm((prev) => {
      const current = prev || visitFormRef.current || visitForm;
      const list = current.allergyList || [];
      if (!list.includes(raw.toUpperCase())) {
        const updated = { ...current, allergyList: [...list, raw.toUpperCase()] };
        visitFormRef.current = updated;
        return updated;
      }
      return current;
    });
    setTempAllergy('');
  };

  const handleRemoveAllergy = (itemToRemove) => {
    setVisitForm((prev) => {
      const current = prev || visitFormRef.current || visitForm;
      const list = (current.allergyList || []).filter((i) => i !== itemToRemove);
      const updated = { ...current, allergyList: list };
      visitFormRef.current = updated;
      return updated;
    });
  };

  const handleAddComplaint = (valToAdd = null) => {
    const raw = (typeof valToAdd === 'string' && valToAdd.trim() ? valToAdd : tempComplaint).trim();
    if (!raw) return;
    const tokens = raw.split(',').map((t) => t.trim().toUpperCase()).filter(Boolean);
    setVisitForm((prev) => {
      const current = prev || visitFormRef.current || visitForm;
      const list = current.complaintList || [];
      const merged = [...list];
      tokens.forEach((tok) => {
        if (!merged.includes(tok)) merged.push(tok);
      });
      const updated = {
        ...current,
        complaintList: merged,
        complaint: merged.join(', '),
      };
      visitFormRef.current = updated;
      return updated;
    });
    setTempComplaint('');
  };

  const handleRemoveComplaint = (itemToRemove) => {
    setVisitForm((prev) => {
      const current = prev || visitFormRef.current || visitForm;
      const list = (current.complaintList || []).filter((i) => i !== itemToRemove);
      const updated = {
        ...current,
        complaintList: list,
        complaint: list.join(', '),
      };
      visitFormRef.current = updated;
      return updated;
    });
  };

  const handleAddInvestigation = (valToAdd = null) => {
    const repType = (typeof valToAdd === 'string' && valToAdd.trim() ? valToAdd : tempInvestigation).trim().toUpperCase();
    if (!repType) return;
    const labName = (tempLabName.trim() || 'CARE').toUpperCase();
    setVisitForm((prev) => {
      const current = prev || visitFormRef.current || visitForm;
      const list = current.investigationList || [];
      const updatedList = [...list, { id: Date.now() + '-' + Math.random(), reportType: repType, labName }];
      const updated = {
        ...current,
        investigationList: updatedList,
        investigation: updatedList.map((i) => i.reportType).join(', '),
      };
      visitFormRef.current = updated;
      return updated;
    });
    setTempInvestigation('');
  };

  const handleRemoveInvestigation = (idToRemove) => {
    setVisitForm((prev) => {
      const current = prev || visitFormRef.current || visitForm;
      const list = (current.investigationList || []).filter((i) => i.id !== idToRemove);
      const updated = {
        ...current,
        investigationList: list,
        investigation: list.map((i) => i.reportType).join(', '),
      };
      visitFormRef.current = updated;
      return updated;
    });
  };

  const handleAddIpdDetail = (valToAdd = null) => {
    const raw = (typeof valToAdd === 'string' && valToAdd.trim() ? valToAdd : tempIpd).trim();
    if (!raw) return;
    setVisitForm((prev) => {
      const current = prev || visitFormRef.current || visitForm;
      const list = current.ipdDetails || [];
      const updatedList = [...list, raw];
      const updated = { ...current, ipdDetails: updatedList };
      visitFormRef.current = updated;
      return updated;
    });
    setTempIpd('');
  };

  const handleRemoveIpdDetail = (idxToRemove) => {
    setVisitForm((prev) => {
      const current = prev || visitFormRef.current || visitForm;
      const list = (current.ipdDetails || []).filter((_, idx) => idx !== idxToRemove);
      const updated = { ...current, ipdDetails: list };
      visitFormRef.current = updated;
      return updated;
    });
  };

  const handleAddClinicMedicine = () => {
    const med = (clinicMedForm.medicine || '').trim();
    if (!med) return;
    const resolvedMed = resolveMasterShortcut('medicine', med);
    const newTr = {
      id: Date.now() + '-' + Math.random(),
      item: resolvedMed,
      qty: String(clinicMedForm.qty || '1').trim() || '1',
      morning: String(clinicMedForm.morning || '1').trim(),
      noon: String(clinicMedForm.noon || '0').trim(),
      evening: String(clinicMedForm.evening || '1').trim(),
    };
    setVisitForm((prev) => {
      const current = prev || visitFormRef.current || visitForm;
      const treatments = [...(current.treatments || []), newTr];
      const updated = { ...current, treatments };
      visitFormRef.current = updated;
      return updated;
    });
    setClinicMedForm({ medicine: '', qty: '1', morning: '1', noon: '0', evening: '1' });
  };

  const handleAddPrescriptionItem = () => {
    const med = (rxForm.medicine || '').trim();
    if (!med) return;
    const resolvedMed = resolveMasterShortcut('medicine', med);
    const newRx = {
      id: Date.now() + '-' + Math.random(),
      medicine: resolvedMed,
      qty: String(rxForm.qty || '').trim(),
      morning: String(rxForm.morning || '1').trim(),
      noon: String(rxForm.noon || '0').trim(),
      evening: String(rxForm.evening || '1').trim(),
      night: String(rxForm.night || '0').trim(),
      timing: rxForm.timing || 'AF',
      sosInstruction: (rxForm.sosInstruction || '').trim(),
    };
    setVisitForm((prev) => {
      const current = prev || visitFormRef.current || visitForm;
      const prescriptions = [...(current.prescriptions || []), newRx];
      const updated = { ...current, prescriptions };
      visitFormRef.current = updated;
      return updated;
    });
    setRxForm({ medicine: '', qty: '10', morning: '1', noon: '0', evening: '1', night: '0', timing: 'AF', sosInstruction: '' });
  };

  const handleDietaryCodeChange = (rawVal) => {
    const code = rawVal.toUpperCase();
    setDietaryCodeInput(code);
    const token = code.trim();
    if (!token) {
      setDietarySuggestions([]);
      setShowDietaryDropdown(false);
      return;
    }
    const list = masterDataCache['dietary'] || dietaryMasterList || [];
    const matches = list.filter((item) => {
      const short = (item.shortcut || '').toUpperCase();
      const val = (item.value || '').toUpperCase();
      return short.startsWith(token) || short.includes(token) || val.includes(token);
    });
    setDietarySuggestions(matches);
    setDietaryHighlightIndex(0);
    setShowDietaryDropdown(matches.length > 0);

    // Auto-fill advice text if exact shortcut matches!
    const exactMatch = list.find((i) => i.shortcut && i.shortcut.trim().toUpperCase() === token);
    if (exactMatch) {
      setDietaryTextInput(exactMatch.value);
    }
  };

  const handleSelectDietarySuggestion = (item) => {
    setDietaryCodeInput(item.shortcut || '');
    setDietaryTextInput(item.value || '');
    setShowDietaryDropdown(false);
    handleApplyDietaryItem(item.value);
  };

  const handleApplyDietary = async () => {
    let advice = (dietaryTextInput || '').trim();
    const code = (dietaryCodeInput || '').trim().toUpperCase();

    // If advice is empty but code is given, resolve code from Master Data
    if (!advice && code) {
      const list = masterDataCache['dietary'] || dietaryMasterList || [];
      let match = list.find(
        (i) => (i.shortcut && i.shortcut.trim().toUpperCase() === code) ||
               (i.value && i.value.trim().toUpperCase() === code)
      );
      if (!match) {
        try {
          const res = await masterDataAPI.getItems('dietary', code, 1, 10);
          if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
            match = res.data.find(
              (i) => (i.shortcut && i.shortcut.trim().toUpperCase() === code) ||
                     (i.value && i.value.trim().toUpperCase() === code)
            ) || res.data[0];
          }
        } catch (e) {}
      }
      if (match) {
        advice = match.value;
      } else {
        advice = code;
      }
    } else if (code && !advice) {
      const list = masterDataCache['dietary'] || dietaryMasterList || [];
      const match = list.find((i) => i.shortcut && i.shortcut.trim().toUpperCase() === code);
      if (match) advice = match.value;
    }

    if (!advice) return;
    handleApplyDietaryItem(advice);
  };

  const handleApplyDietaryItem = (adviceText) => {
    if (!adviceText || !adviceText.trim()) return;
    const clean = adviceText.trim();
    setVisitForm((prev) => {
      const current = prev || visitFormRef.current || visitForm;
      const currentList = (current.dietary || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (!currentList.includes(clean)) {
        const updatedList = [...currentList, clean];
        const updatedStr = updatedList.join(', ');
        const updated = { ...current, dietary: updatedStr };
        visitFormRef.current = updated;
        return updated;
      }
      return current;
    });
    setDietaryCodeInput('');
    setDietaryTextInput('');
    setShowDietaryDropdown(false);
  };

  const handleRemoveDietaryItem = (itemToRemove) => {
    setVisitForm((prev) => {
      const current = prev || visitFormRef.current || visitForm;
      const currentList = (current.dietary || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const updatedList = currentList.filter((i) => i !== itemToRemove);
      const updatedStr = updatedList.join(', ');
      const updated = { ...current, dietary: updatedStr };
      visitFormRef.current = updated;
      return updated;
    });
  };

  // --- Treatment Row Handlers (with Auto-Add on typing) ---
  const handleAddTreatment = () => {
    setVisitForm((prev) => {
      const current = prev || visitFormRef.current || visitForm;
      const updated = {
        ...current,
        treatments: [
          ...(current.treatments || []),
          { id: Date.now() + '-' + Math.random(), item: '', qty: '1' },
        ],
      };
      visitFormRef.current = updated;
      return updated;
    });
  };

  const handleUpdateTreatment = (id, field, value) => {
    setVisitForm((prev) => {
      const current = prev || visitFormRef.current || visitForm;
      const treatments = current.treatments || [];
      const idx = treatments.findIndex((t) => t.id === id);
      const isLast = idx === treatments.length - 1;
      const updated = treatments.map((t) =>
        t.id === id ? { ...t, [field]: value } : t
      );

      // Auto add new row when writing in the item field of the last row
      if (isLast && field === 'item' && value && String(value).trim().length > 0) {
        updated.push({
          id: Date.now() + '-' + Math.random(),
          item: '',
          qty: '1',
        });
      }

      const res = { ...current, treatments: updated };
      visitFormRef.current = res;
      return res;
    });
  };

  const handleRemoveTreatment = (id) => {
    setVisitForm((prev) => {
      const current = prev || visitFormRef.current || visitForm;
      const filtered = (current.treatments || []).filter((t) => t.id !== id);
      const res = {
        ...current,
        treatments: filtered.length > 0 ? filtered : [{ id: Date.now() + '-t1', item: '', qty: '1' }],
      };
      visitFormRef.current = res;
      return res;
    });
  };

  // --- Prescription Row Handlers (with Auto-Add on typing) ---
  const handleAddPrescription = () => {
    setVisitForm((prev) => {
      const current = prev || visitFormRef.current || visitForm;
      const updated = {
        ...current,
        prescriptions: [
          ...(current.prescriptions || []),
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
      };
      visitFormRef.current = updated;
      return updated;
    });
  };

  const handleUpdatePrescription = (id, field, value) => {
    setVisitForm((prev) => {
      const current = prev || visitFormRef.current || visitForm;
      const prescriptions = current.prescriptions || [];
      const idx = prescriptions.findIndex((p) => p.id === id);
      const isLast = idx === prescriptions.length - 1;
      const updated = prescriptions.map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      );

      // Auto add new row when writing in the medicine field of the last row
      if (isLast && field === 'medicine' && value && String(value).trim().length > 0) {
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

      const res = { ...current, prescriptions: updated };
      visitFormRef.current = res;
      return res;
    });
  };

  const handleRemovePrescription = (id) => {
    setVisitForm((prev) => {
      const current = prev || visitFormRef.current || visitForm;
      const filtered = (current.prescriptions || []).filter((p) => p.id !== id);
      const res = {
        ...current,
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
      visitFormRef.current = res;
      return res;
    });
  };

  // --- Open New Case Form ---
  const handleOpenNewCase = (targetPatient = null) => {
    const patientToUse = targetPatient || currentPatientRef.current || currentPatient;
    if (!patientToUse) {
      showToast('Please search and select a patient first to start a new case visit.', 'error');
      return;
    }
    setEditingVisitId(null);
    editingVisitIdRef.current = null;
    setEditingVisit(null);
    editingVisitRef.current = null;
    setAttachedReport(null);
    attachedReportRef.current = null;

    const patientAllergies = Array.isArray(patientToUse.allergies)
      ? patientToUse.allergies.map((a) => String(a).toUpperCase())
      : patientToUse.allergies
        ? [String(patientToUse.allergies).toUpperCase()]
        : [];

    const freshForm = {
      ...initialVisitForm,
      visitDate: getTodayDateStr(),
      bp: '',
      sugar: '',
      other: '',
      reference: '',
      allergyList: patientAllergies,
      complaintList: [],
      investigationList: [],
      ipdDetails: [],
      treatments: [],
      prescriptions: [],
      dietary: '',
      charge: '0',
      received: '0',
      due: '0',
    };
    visitFormRef.current = freshForm;
    setVisitForm(freshForm);
    setShowNewCaseForm(true);
    showNewCaseFormRef.current = true;
  };

  // --- Start New Case (Alias for handleOpenNewCase) ---
  const handleStartNewCase = (targetPatient = null) => {
    handleOpenNewCase(targetPatient);
  };

  // --- Start Edit on an Existing Past Visit ---
  const handleStartEditVisit = (visit) => {
    setEditingVisitId(visit._id);
    editingVisitIdRef.current = visit._id;
    setEditingVisit(visit);
    editingVisitRef.current = visit;
    const compList = visit.complaint
      ? visit.complaint.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean)
      : [];
    const invList = visit.investigation
      ? visit.investigation.split(',').map((i, idx) => ({
          id: `${Date.now()}-${idx}`,
          reportType: i.trim().toUpperCase(),
          labName: 'CARE',
        }))
      : [];
    const ipdList = Array.isArray(visit.ipdDetails)
      ? visit.ipdDetails
      : visit.ipdDetails
        ? [visit.ipdDetails]
        : [];
    const algList = Array.isArray(visit.allergies) && visit.allergies.length > 0
      ? visit.allergies
      : Array.isArray(currentPatient?.allergies)
        ? currentPatient.allergies
        : [];

    const formVals = {
      visitDate: visit.visitDate || getTodayDateStr(),
      bp: visit.bp || '',
      sugar: visit.sugar || '',
      other: visit.other || '',
      reference: visit.reference || '',
      investigation: visit.investigation || '',
      investigationList: invList,
      complaint: visit.complaint || '',
      complaintList: compList,
      allergyList: algList,
      ipdDetails: ipdList,
      treatments:
        visit.treatments && visit.treatments.length > 0
          ? visit.treatments.map((t, idx) => ({
              id: t._id || `${Date.now()}-${idx}`,
              item: t.item,
              qty: t.qty !== undefined && t.qty !== null ? String(t.qty) : '1',
              morning: t.morning || '1',
              noon: t.noon || '0',
              evening: t.evening || '1',
            }))
          : [],
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
          : [],
      dietary: visit.dietary || '',
      charge: String(visit.charge || 0),
      received: String(visit.received || 0),
    };
    setVisitForm(formVals);
    visitFormRef.current = formVals;
    setAttachedReport(visit.labReport || null);
    attachedReportRef.current = visit.labReport || null;
    setShowNewCaseForm(true);
    showNewCaseFormRef.current = true;
    setShowHistoryModal(false);
    showToast('Loaded visit from ' + (visit.visitDate || 'past record') + ' into form for editing.');
  };

  // --- Save / Update Visit & Optional Print ---
  const handleSaveVisit = async (andPrint = false) => {
    if (isSavingVisitRef.current) return;

    const patient = currentPatientRef.current || currentPatient;
    if (!patient) {
      showToast('Please search and select a patient first.', 'error');
      return;
    }

    // Always read from the synchronous ref to guarantee the freshest user-entered values
    const form = visitFormRef.current || visitForm;
    const editingId =
      editingVisitIdRef.current !== undefined && editingVisitIdRef.current !== null
        ? editingVisitIdRef.current
        : editingVisitId;
    const labReport = attachedReportRef.current || attachedReport;

    const formCharge = Math.max(0, Number(form.charge) || 0);
    const formReceived = Math.max(0, Number(form.received) || 0);

    // Auto-resolve any shortcuts typed in treatments & prescriptions using master data cache
    const validTreatments = (form.treatments || [])
      .map((t) => {
        const rawItem = (t?.item || '').trim();
        const resolvedItem = resolveMasterShortcut('medicine', rawItem);
        return {
          item: resolvedItem,
          qty: String(t?.qty || '').trim() || '1',
          morning: String(t?.morning || '1').trim(),
          noon: String(t?.noon || '0').trim(),
          evening: String(t?.evening || '1').trim(),
        };
      })
      .filter((t) => t && t.item && String(t.item).trim());

    const validPrescriptions = (form.prescriptions || [])
      .map((p) => {
        const rawMed = (p?.medicine || '').trim();
        const resolvedMed = resolveMasterShortcut('medicine', rawMed);
        return {
          medicine: resolvedMed,
          qty: String(p?.qty || '').trim(),
          morning: String(p?.morning || '').trim() || '1',
          noon: String(p?.noon || '').trim() || '0',
          evening: String(p?.evening || '').trim() || '1',
          night: String(p?.night || '').trim() || '0',
          timing: p?.timing || 'AF',
          sosInstruction: (p?.sosInstruction || '').trim(),
        };
      })
      .filter((p) => p && p.medicine && String(p.medicine).trim());

    const cleanAllergies = form.allergyList || [];
    const cleanComplaints = (form.complaintList && form.complaintList.length > 0)
      ? form.complaintList.join(', ')
      : (form.complaint || '').trim();
    const cleanInvestigations = (form.investigationList && form.investigationList.length > 0)
      ? form.investigationList.map((i) => i.reportType).join(', ')
      : (form.investigation || '').trim();
    const cleanIpd = form.ipdDetails || [];

    const hasAnyData =
      (form.bp && form.bp.trim()) ||
      (form.sugar && form.sugar.trim()) ||
      (form.other && form.other.trim()) ||
      (form.reference && form.reference.trim()) ||
      cleanInvestigations ||
      cleanComplaints ||
      cleanAllergies.length > 0 ||
      cleanIpd.length > 0 ||
      validTreatments.length > 0 ||
      validPrescriptions.length > 0 ||
      (form.dietary && form.dietary.trim()) ||
      formCharge > 0 ||
      labReport;

    if (!hasAnyData) {
      showToast('Please enter at least one clinical detail, complaint, injection/IPD, or medicine before saving.', 'error');
      return;
    }

    try {
      isSavingVisitRef.current = true;
      setIsSavingVisit(true);
      const payload = {
        patientId: patient.patientId,
        familyId: patient.familyId,
        patientName: patient.name,
        visitDate: form.visitDate || getTodayDateStr(),
        dob: patientDob,
        age: patientAge,
        phone: patientPhone,
        society: patientSociety,
        area: patientArea,
        bp: form.bp || '',
        sugar: form.sugar || '',
        other: form.other || '',
        reference: form.reference || '',
        investigation: cleanInvestigations,
        complaint: cleanComplaints,
        allergies: cleanAllergies,
        ipdDetails: cleanIpd,
        treatments: validTreatments,
        prescriptions: validPrescriptions,
        dietary: form.dietary || '',
        charge: formCharge,
        received: formReceived,
        labReport: labReport || null,
      };

      let res;
      if (editingId) {
        res = await visitAPI.update(editingId, payload);
      } else {
        res = await visitAPI.create(payload);
      }

      if (res.success) {
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch (e) {}

        showToast(
          editingId
            ? 'Visit record updated successfully!'
            : 'New visit saved successfully and dues updated!'
        );

        addToRecentSearched(patient);

        setCurrentPatient((prev) => ({
          ...prev,
          totalDue: res.totalDue !== undefined ? res.totalDue : prev.totalDue,
          deposit: res.deposit !== undefined ? res.deposit : (prev?.deposit || 0),
          allergies: cleanAllergies,
          family: prev?.family
            ? {
                ...prev.family,
                familyDue:
                  res.familyDue !== undefined ? res.familyDue : prev.family.familyDue,
                familyDeposit:
                  res.familyDeposit !== undefined ? res.familyDeposit : (prev.family.familyDeposit || 0),
              }
            : null,
        }));

        // Reload patient visits and refresh in-memory search cache
        if (patient.patientId && patient.patientId !== 'NEW') {
          loadPatientVisits(patient.patientId);
        }
        preloadPatients().catch(() => {});

        if (andPrint) {
          const visitForPrint = res.visit || {
            ...payload,
            _id: editingId || 'printed-case',
          };
          setPrintVisit({
            ...visitForPrint,
            patient,
          });
          setPrintDietary(form.dietary || '');
          setPrintLanguage('en');
          setShowPrintModal(true);
        }

        // Reset ALL form fields and clear active patient so next entry is completely clean
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch (e) {}

        hasJustSavedRef.current = true;
        setCurrentPatient(null);
        currentPatientRef.current = null;
        setPatientSearch('');
        setPatientDob('');
        setPatientAge('');
        setPatientPhone('');
        setPatientHouseNo('');
        setPatientSociety('');
        setPatientArea('');
        setTempAllergy('');
        setTempComplaint('');
        setTempInvestigation('');
        setTempIpd('');
        setDietaryTextInput('');
        setDietaryCodeInput('');
        setClinicMedForm({ medicine: '', qty: '', morning: '1', noon: '0', evening: '1' });
        setRxForm({
          medicine: '',
          qty: '',
          morning: '1',
          noon: '0',
          evening: '1',
          night: '0',
          timing: 'AF',
          sosInstruction: '',
        });
        setShowInlineHistory(false);
        setVisitForm(initialVisitForm);
        visitFormRef.current = initialVisitForm;
        setEditingVisitId(null);
        editingVisitIdRef.current = null;
        setEditingVisit(null);
        editingVisitRef.current = null;
        setAttachedReport(null);
        attachedReportRef.current = null;
      } else {
        showToast(res.message || 'Failed to save visit', 'error');
      }
    } catch (err) {
      console.error('Error saving visit:', err);
      showToast('Error saving visit: ' + (err.message || 'Server error'), 'error');
    } finally {
      setIsSavingVisit(false);
      isSavingVisitRef.current = false;
    }
  };

  handleSaveVisitRef.current = handleSaveVisit;

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
      gender: currentPatient.gender || 'Male',
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
    <div className="patient-record-container" style={styles.container}>
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

      {/* 2-COLUMN MAIN CLINICAL WORKSPACE (FULL RESPONSIVE & FULL SPACE UTILIZATION) */}
      <div className="patient-record-main" style={styles.photoLayoutMain}>
        {/* LEFT COLUMN (~50% width on desktop, 100% on mobile/tablet) */}
        <div className="patient-record-left-col" style={styles.photoLeftCol}>
          {/* CARD 1: Patient Details (Blue Theme) */}
          <div style={{ ...styles.photoCard, borderColor: '#93C5FD', position: 'relative', zIndex: 50, overflow: 'visible' }}>
            <div style={styles.photoHeaderBlue}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <User size={14} color="#1E40AF" />
                <span style={styles.photoHeaderTitle}>Patient Details</span>
              </div>
              {currentPatient && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    onClick={handleOpenEditModal}
                    style={styles.photoMiniActionBtn}
                    title="Edit Patient Demographics"
                  >
                    <Edit3 size={11} />
                    <span>Edit Patient</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPatient(null);
                      setEditingVisitId(null);
                      setEditingVisit(null);
                      setPatientSearch('');
                      setSearchResults([]);
                    }}
                    style={styles.photoMiniActionBtn}
                    title="Switch / Search another patient"
                  >
                    <Search size={11} />
                    <span>Change</span>
                  </button>
                </div>
              )}
            </div>

            <div style={styles.photoCardBody}>
              {/* Row 1: Entry Date & Patient Full Name */}
              <div style={styles.photoRow2Col}>
                <div style={{ ...styles.photoFieldGroup, width: '135px', flexShrink: 0 }}>
                  <label style={styles.photoLabel}>Entry Date:</label>
                  <input
                    type="date"
                    value={visitForm.visitDate}
                    onChange={(e) => updateFormField('visitDate', e.target.value)}
                    style={styles.photoInput}
                  />
                </div>

                <div style={{ ...styles.photoFieldGroup, flex: 1, position: 'relative' }} ref={searchWrapRef}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={styles.photoLabel}>
                      Patient Full Name: <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    {currentPatient && (
                      <button
                        type="button"
                        onClick={() => setShowInlineHistory((prev) => !prev)}
                        style={styles.photoHistoryLinkBtn}
                        title="Click to toggle full past visits & case history"
                      >
                        *(History {patientVisits.length > 0 ? `(${patientVisits.length})` : ''} {showInlineHistory ? '▲' : '▼'})*
                      </button>
                    )}
                  </div>
                  <input
                    ref={patientSearchInputRef}
                    type="text"
                    value={currentPatient ? currentPatient.name : patientSearch}
                    placeholder="TYPE OR SEARCH PATIENT NAME (0ms RAM SEARCH)..."
                    onChange={(e) => {
                      if (currentPatient) {
                        setCurrentPatient(null);
                      }
                      handlePatientSearchChange(e.target.value);
                    }}
                    onFocus={() => {
                      if (searchResults.length > 0) setShowSearchDropdown(true);
                    }}
                    onKeyDown={(e) => {
                      const list = Array.isArray(searchResults) ? searchResults : [];
                      if (e.key === 'ArrowDown') {
                        if (list.length > 0) {
                          e.preventDefault();
                          if (!showSearchDropdown) setShowSearchDropdown(true);
                          setPatientHighlightIndex((prev) => (prev < list.length - 1 ? prev + 1 : 0));
                        }
                      } else if (e.key === 'ArrowUp') {
                        if (list.length > 0) {
                          e.preventDefault();
                          if (!showSearchDropdown) setShowSearchDropdown(true);
                          setPatientHighlightIndex((prev) => (prev > 0 ? prev - 1 : list.length - 1));
                        }
                      } else if (e.key === 'Enter') {
                        if (list.length > 0) {
                          e.preventDefault();
                          const chosen = list[patientHighlightIndex] || list[0];
                          if (chosen) handleSelectPatient(chosen);
                        } else if (patientSearch && patientSearch.trim()) {
                          // Patient not found in search results: auto-create new patient with entered name and start case
                          e.preventDefault();
                          const newName = patientSearch.trim().toUpperCase();
                          setShowSearchDropdown(false);
                          const newPat = {
                            name: newName,
                            patientId: 'NEW',
                            familyId: 'NEW',
                            isNewPatient: true,
                            totalDue: 0,
                            deposit: 0,
                          };
                          handleSelectPatient(newPat, true);
                        }
                      } else if (e.key === 'Escape') {
                        setShowSearchDropdown(false);
                      }
                    }}
                    style={{
                      ...styles.photoInput,
                      fontWeight: currentPatient ? 800 : 500,
                      color: currentPatient ? '#1E40AF' : '#0F172A',
                      backgroundColor: currentPatient ? '#F0F9FF' : '#FFFFFF',
                    }}
                  />

                  {/* Dropdown suggestions */}
                  {showSearchDropdown && searchResults.length > 0 && (
                    <div style={styles.photoPatientDropdown}>
                      {searchResults.map((p, idx) => (
                        <div
                          key={p._id || p.patientId}
                          onClick={() => handleSelectPatient(p)}
                          onMouseEnter={() => setPatientHighlightIndex(idx)}
                          style={{
                            ...styles.photoDropdownItem,
                            backgroundColor: idx === patientHighlightIndex ? '#E0F2FE' : '#FFFFFF',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 700, color: '#1E293B' }}>{p.name}</span>
                            <span style={styles.photoMiniBadge}>{p.patientId}</span>
                            {p.isHead && <span style={styles.photoHeadBadge}>HEAD</span>}
                          </div>
                          <div style={{ fontSize: 10, color: '#64748B' }}>
                            {p.phone || ''} &bull; Age {p.age || '-'} &bull; {p.area || p.family?.area || ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: Family Head / ID: (Auto address & due) */}
              <div style={styles.photoRow1Col}>
                <div style={styles.photoFieldGroup}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={styles.photoLabel}>Family Head / ID: (Auto address & due)</label>
                    {currentPatient && (
                      <button
                        type="button"
                        onClick={handleOpenFamilyDueModal}
                        style={{
                          ...styles.photoDueLink,
                          color: (currentPatient.deposit || 0) > 0 ? '#10B981' : ((currentPatient.totalDue || 0) > 0 ? '#DC2626' : '#64748B'),
                          fontWeight: (currentPatient.deposit || 0) > 0 || (currentPatient.totalDue || 0) > 0 ? 700 : 500,
                        }}
                        title="Click to view family due and deposit breakdown"
                      >
                        {(currentPatient.deposit || 0) > 0
                          ? `🟢 DEPOSIT: ₹${currentPatient.deposit}`
                          : `Total Due: ₹${currentPatient.totalDue || 0}`}
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={
                      currentPatient
                        ? `${currentPatient.family?.headName || (currentPatient.isHead ? currentPatient.name : 'Family Head')} (FAM ID: ${currentPatient.familyId || currentPatient.family?.familyId || '-'})`
                        : ''
                    }
                    placeholder="AUTO-POPULATED UPON PATIENT SELECTION"
                    style={{ ...styles.photoInput, backgroundColor: '#F8FAFC', color: '#334155' }}
                  />
                </div>
              </div>

              {/* Row 3: Age, DOB (Select), Mobile No */}
              <div style={styles.photoRow3Col}>
                <div style={styles.photoFieldGroup}>
                  <label style={styles.photoLabel}>Age: <span style={{ color: '#DC2626' }}>*</span></label>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    <input
                      type="text"
                      value={patientAge}
                      onChange={(e) => setPatientAge(e.target.value)}
                      placeholder="e.g. 23"
                      style={{ ...styles.photoInput, width: '42px', flexShrink: 0 }}
                    />
                    <input
                      type="text"
                      readOnly
                      value={calculateDetailedAge(patientDob)}
                      placeholder="Years Months Days"
                      title="Auto-calculated exact age in Years, Months, and Days from DOB"
                      style={{ ...styles.photoInput, flex: 1, backgroundColor: '#F8FAFC', color: '#1E40AF', fontWeight: 600, fontSize: '10px' }}
                    />
                  </div>
                </div>

                <div style={styles.photoFieldGroup}>
                  <label style={styles.photoLabel}>DOB (Select):</label>
                  <input
                    type="date"
                    value={patientDob}
                    onChange={(e) => handleDobChange(e.target.value)}
                    style={styles.photoInput}
                  />
                </div>

                <div style={styles.photoFieldGroup}>
                  <label style={styles.photoLabel}>Mobile No:</label>
                  <input
                    type="tel"
                    inputMode="tel"
                    pattern="[0-9]*"
                    maxLength={15}
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    placeholder="Mobile No"
                    style={styles.photoInput}
                  />
                </div>
              </div>

              {/* Row 4: House No, Society / Area */}
              <div style={styles.photoRow2Col}>
                <div style={{ ...styles.photoFieldGroup, width: '110px', flexShrink: 0 }}>
                  <label style={styles.photoLabel}>House No:</label>
                  <input
                    type="text"
                    value={patientHouseNo}
                    onChange={(e) => setPatientHouseNo(e.target.value)}
                    placeholder="House #"
                    style={styles.photoInput}
                  />
                </div>

                <div style={{ ...styles.photoFieldGroup, flex: 1 }}>
                  <label style={styles.photoLabel}>Society / Area: <span style={{ color: '#DC2626' }}>*</span></label>
                  <input
                    type="text"
                    value={patientSociety}
                    onChange={(e) => setPatientSociety(e.target.value)}
                    placeholder="Society / Area (Auto-saves to Master Data)"
                    style={styles.photoInput}
                  />
                </div>
              </div>

              {/* Row 5: B.P., Blood Sugar, Others / Spo2 */}
              <div style={styles.photoRow3Col}>
                <div style={styles.photoFieldGroup}>
                  <label style={styles.photoLabel}>B.P.:</label>
                  <input
                    ref={bpInputRef}
                    type="text"
                    value={visitForm.bp}
                    onChange={(e) => updateFormField('bp', e.target.value)}
                    placeholder="120/80"
                    style={styles.photoInput}
                  />
                </div>

                <div style={styles.photoFieldGroup}>
                  <label style={styles.photoLabel}>Blood Sugar:</label>
                  <input
                    type="text"
                    value={visitForm.sugar}
                    onChange={(e) => updateFormField('sugar', e.target.value)}
                    placeholder="mg/dL"
                    style={styles.photoInput}
                  />
                </div>

                <div style={styles.photoFieldGroup}>
                  <label style={styles.photoLabel}>Others / Spo2:</label>
                  <input
                    type="text"
                    value={visitForm.other}
                    onChange={(e) => updateFormField('other', e.target.value)}
                    placeholder="Pulse / Spo2"
                    style={styles.photoInput}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* CASE HISTORY TABLE (MATCHING PHOTO: SCROLLABLE, DISAPPEARS ON TAB SWITCH, TOGGLES ON CLICK) */}
          {showInlineHistory && currentPatient && (
            <div style={styles.photoHistoryContainer}>
              <div style={styles.photoHistoryHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={13} color="#1E40AF" />
                  <span style={styles.photoHistoryTitle}>
                    Case History: {currentPatient.name} ({patientVisits.length} Records)
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setShowInlineHistory(false)}
                    style={styles.photoHistoryCloseBtn}
                    title="Hide Case History (Click *(History)* to show again)"
                  >
                    <span>Hide History ▲</span>
                  </button>
                </div>
              </div>

              <div style={styles.photoHistoryScrollArea}>
                {loadingVisits ? (
                  <div style={styles.photoHistoryLoading}>Loading patient visits...</div>
                ) : patientVisits.length === 0 ? (
                  <div style={styles.photoHistoryEmpty}>No prior visits recorded for this patient.</div>
                ) : (
                  <table style={styles.photoHistoryTable}>
                    <thead>
                      <tr>
                        <th style={{ ...styles.photoHistoryTh, width: '105px' }}>Date & Time</th>
                        <th style={{ ...styles.photoHistoryTh, width: '130px' }}>Patient Name</th>
                        <th style={styles.photoHistoryTh}>Complaints</th>
                        <th style={{ ...styles.photoHistoryTh, width: '85px' }}>IPD Detail</th>
                        <th style={styles.photoHistoryTh}>Clinic Med</th>
                        <th style={styles.photoHistoryTh}>Prescription</th>
                        <th style={{ ...styles.photoHistoryTh, width: '100px' }}>Lab Alerts</th>
                        <th style={{ ...styles.photoHistoryTh, width: '65px', textAlign: 'right' }}>Charged (₹)</th>
                        <th style={{ ...styles.photoHistoryTh, width: '55px', textAlign: 'right' }}>Due (₹)</th>
                        <th style={{ ...styles.photoHistoryTh, width: '85px', textAlign: 'center' }}>Act</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patientVisits.map((v) => {
                        const formattedDate = v.visitDate || (v.createdAt ? v.createdAt.split('T')[0] : '');
                        const formattedTime = v.createdAt
                          ? new Date(v.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                          : '';
                        const ipdList = Array.isArray(v.ipdDetails) ? v.ipdDetails : (v.ipdDetails ? [v.ipdDetails] : []);
                        
                        return (
                          <tr key={v._id} style={styles.photoHistoryTr}>
                            <td style={styles.photoHistoryTd}>
                              <div style={{ fontWeight: 700, color: '#1E293B', fontSize: 10 }}>{formattedDate}</div>
                              <div style={{ fontSize: 9, color: '#2563EB', fontWeight: 600 }}>{formattedTime}</div>
                            </td>
                            <td style={styles.photoHistoryTdBold}>{v.patientName || currentPatient.name}</td>
                            <td style={styles.photoHistoryTd}>
                              {v.complaint || '-'}
                            </td>
                            <td style={styles.photoHistoryTd}>
                              {ipdList.length > 0
                                ? ipdList.map((ipd, idx) => (
                                    <div key={idx} style={{ fontSize: 10, color: '#9A3412', fontWeight: 600 }}>
                                      {typeof ipd === 'string' ? ipd : ipd?.item}
                                    </div>
                                  ))
                                : '-'}
                            </td>
                            <td style={styles.photoHistoryTd}>
                              {v.treatments && v.treatments.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                  {v.treatments.map((t, idx) => (
                                    <span key={idx} style={{ fontSize: 10, color: '#334155' }}>
                                      &bull; {t.item} ({t.qty || 1})
                                    </span>
                                  ))}
                                </div>
                              ) : '-'}
                            </td>
                            <td style={styles.photoHistoryTd}>
                              {v.prescriptions && v.prescriptions.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                  {v.prescriptions.map((p, idx) => (
                                    <span key={idx} style={{ fontSize: 10, color: '#1E40AF' }}>
                                      &bull; {p.medicine} ({p.qty || '-'}) {p.timing === 'SOS' ? `[SOS${p.sosInstruction ? `: ${p.sosInstruction}` : ''}]` : `[${p.timing}]`}
                                    </span>
                                  ))}
                                </div>
                              ) : '-'}
                            </td>
                            <td style={styles.photoHistoryTd}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                {v.bp && <span style={styles.historyAlertBp}>BP: {v.bp}</span>}
                                {v.sugar && <span style={styles.historyAlertSugar}>SUG: {v.sugar}</span>}
                                {v.other && <span style={styles.historyAlertOther}>{v.other}</span>}
                                {v.investigation && (
                                  <span style={styles.historyAlertLab}>{v.investigation}</span>
                                )}
                                {!v.bp && !v.sugar && !v.other && !v.investigation && <span style={{ color: '#94A3B8' }}>-</span>}
                              </div>
                            </td>
                            <td style={{ ...styles.photoHistoryTd, textAlign: 'right', fontWeight: 800, color: '#EA580C' }}>
                              ₹{v.charge || 0}
                            </td>
                            <td style={{ ...styles.photoHistoryTd, textAlign: 'right', fontWeight: 700, color: (v.due || 0) > 0 ? '#DC2626' : '#166534' }}>
                              ₹{v.due || 0}
                            </td>
                            <td style={{ ...styles.photoHistoryTd, textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                {/* View Chit */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPrintVisit({ ...v, patient: currentPatient });
                                    setPrintDietary(v.dietary || '');
                                    setShowPrintModal(true);
                                  }}
                                  style={styles.historyActBtn}
                                  title="View Medical Chit / Prescription"
                                >
                                  <FileText size={12} color="#0284C7" />
                                </button>

                                {/* Edit Visit */}
                                <button
                                  type="button"
                                  onClick={() => handleStartEditVisit(v)}
                                  style={styles.historyActBtn}
                                  title="Edit / Reload Case into Form"
                                >
                                  <Edit3 size={12} color="#D97706" />
                                </button>

                                {/* Print */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPrintVisit({ ...v, patient: currentPatient });
                                    setPrintDietary(v.dietary || '');
                                    setShowPrintModal(true);
                                  }}
                                  style={styles.historyActBtn}
                                  title="Print Prescription"
                                >
                                  <Printer size={12} color="#2563EB" />
                                </button>

                                {/* Delete */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteVisit(v._id)}
                                  style={styles.historyActBtn}
                                  title="Delete Visit Record"
                                >
                                  <Trash2 size={12} color="#DC2626" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* CARD 2: Allergy (Red Theme) */}
          <div style={{ ...styles.photoCard, borderColor: '#FCA5A5', position: 'relative', zIndex: 40, overflow: 'visible' }}>
            <div style={styles.photoHeaderRed}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldAlert size={14} color="#DC2626" />
                <span style={{ ...styles.photoHeaderTitle, color: '#991B1B' }}>Allergy</span>
              </div>
            </div>
            <div style={{ ...styles.photoCardBody, overflow: 'visible' }}>
              <div style={{ ...styles.photoInputAddRow, position: 'relative' }}>
                <div style={{ flex: 1 }}>
                  <MasterDataInput
                    type="allergy"
                    value={tempAllergy}
                    onChange={(val) => setTempAllergy(val)}
                    onEnterNext={(chosen) => handleAddAllergy(chosen)}
                    onSelectCallback={(chosen) => setTempAllergy(chosen)}
                    placeholder="TYPE OR SELECT ALLERGY..."
                    inputStyle={styles.photoInput}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleAddAllergy()}
                  style={styles.photoAddBtnRed}
                >
                  + Add
                </button>
              </div>

              {/* Pills row */}
              <div style={styles.photoPillsContainer}>
                {(visitForm.allergyList || []).length === 0 ? (
                  <span style={styles.photoNoItemsText}>No allergies recorded</span>
                ) : (
                  (visitForm.allergyList || []).map((alg, idx) => (
                    <span key={idx} style={styles.photoPillRed}>
                      <ShieldAlert size={11} color="#DC2626" />
                      <span>{alg}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAllergy(alg)}
                        style={styles.photoPillCloseBtn}
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* CARD 3: Complaints (Green Theme) */}
          <div style={{ ...styles.photoCard, borderColor: '#6EE7B7', position: 'relative', zIndex: 30, overflow: 'visible' }}>
            <div style={styles.photoHeaderGreen}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Stethoscope size={14} color="#059669" />
                <span style={{ ...styles.photoHeaderTitle, color: '#065F46' }}>Complaints</span>
              </div>
            </div>
            <div style={{ ...styles.photoCardBody, overflow: 'visible' }}>
              <div style={{ ...styles.photoInputAddRow, position: 'relative' }}>
                <div style={{ flex: 1 }}>
                  <MasterDataInput
                    type="complaint"
                    value={tempComplaint}
                    onChange={(val) => setTempComplaint(val)}
                    onEnterNext={(chosen) => handleAddComplaint(chosen)}
                    onSelectCallback={(chosen) => setTempComplaint(chosen)}
                    placeholder="TYPE OR SELECT COMPLAINT..."
                    inputStyle={styles.photoInput}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleAddComplaint()}
                  style={styles.photoAddBtnGreen}
                >
                  + Add
                </button>
              </div>

              {/* Pills row */}
              <div style={styles.photoPillsContainer}>
                {(visitForm.complaintList || []).length === 0 ? (
                  <span style={styles.photoNoItemsText}>No complaints added</span>
                ) : (
                  (visitForm.complaintList || []).map((cmp, idx) => (
                    <span key={idx} style={styles.photoPillGreen}>
                      <span>{cmp}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveComplaint(cmp)}
                        style={styles.photoPillCloseBtn}
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* CARD 4: Lab Investigation (Purple Theme) */}
          <div style={{ ...styles.photoCard, borderColor: '#C4B5FD', position: 'relative', zIndex: 20, overflow: 'visible' }}>
            <div style={styles.photoHeaderPurple}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FlaskConical size={14} color="#7C3AED" />
                <span style={{ ...styles.photoHeaderTitle, color: '#5B21B6' }}>Lab Investigation</span>
              </div>
            </div>
            <div style={{ ...styles.photoCardBody, overflow: 'visible' }}>
              <div style={{ ...styles.photoInputAddRow, position: 'relative' }}>
                <div style={{ flex: '1 1 180px' }}>
                  <MasterDataInput
                    type="investigation"
                    value={tempInvestigation}
                    onChange={(val) => setTempInvestigation(val)}
                    onEnterNext={(chosen) => handleAddInvestigation(chosen)}
                    onSelectCallback={(chosen) => setTempInvestigation(chosen)}
                    placeholder="REPORT TYPE..."
                    inputStyle={styles.photoInput}
                  />
                </div>
                <div style={{ width: '120px', flexShrink: 0 }}>
                  <input
                    type="text"
                    value={tempLabName}
                    onChange={(e) => setTempLabName(e.target.value)}
                    placeholder="LAB NAME..."
                    style={styles.photoInput}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleAddInvestigation()}
                  style={styles.photoAddBtnPurple}
                >
                  + Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddReportModal(true)}
                  style={styles.photoLabEntryBtn}
                  title="Open Detailed Lab Report Values Modal"
                >
                  <FileText size={12} />
                  <span>Lab Entry</span>
                </button>
              </div>

              {/* Table of Added Investigations */}
              <div style={styles.photoTableWrap}>
                <table style={styles.photoTable}>
                  <thead>
                    <tr style={styles.photoTableThTr}>
                      <th style={styles.photoTh}>Report Type</th>
                      <th style={styles.photoTh}>Lab Name</th>
                      <th style={{ ...styles.photoTh, width: '32px', textAlign: 'center' }}>X</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(visitForm.investigationList || []).length === 0 ? (
                      <tr>
                        <td colSpan={3} style={styles.photoTableEmptyTd}>
                          No lab investigations added yet.
                        </td>
                      </tr>
                    ) : (
                      (visitForm.investigationList || []).map((inv) => (
                        <tr key={inv.id} style={styles.photoTableTr}>
                          <td style={styles.photoTdBold}>{inv.reportType}</td>
                          <td style={styles.photoTd}>{inv.labName || 'CARE'}</td>
                          <td style={{ ...styles.photoTd, textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveInvestigation(inv.id)}
                              style={styles.photoRowDeleteBtn}
                            >
                              <X size={12} color="#DC2626" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* CARD 5: IPD Detail (Amber/Orange Theme) - Injections & IV Bottles */}
          <div className="patient-card-ipd" style={{ ...styles.photoCard, ...styles.photoCardIpd, borderColor: '#FDBA74', position: 'relative', zIndex: 10, overflow: 'visible' }}>
            <div style={styles.photoHeaderAmber}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Syringe size={14} color="#EA580C" />
                <span style={{ ...styles.photoHeaderTitle, color: '#9A3412' }}>IPD Detail</span>
              </div>
              <span style={{ fontSize: 10, color: '#9A3412', fontWeight: 600 }}>Injections, IV Bottles & Procedures</span>
            </div>
            <div style={{ ...styles.photoCardBody, flex: 1, minHeight: 0, overflow: 'visible' }}>
              <div style={{ ...styles.photoInputAddRow, position: 'relative' }}>
                <div style={{ flex: 1 }}>
                  <MasterDataInput
                    type="medicine"
                    value={tempIpd}
                    onChange={(val) => setTempIpd(val)}
                    onEnterNext={(chosen) => handleAddIpdDetail(chosen)}
                    onSelectCallback={(chosen) => setTempIpd(chosen)}
                    placeholder="TYPE OR SELECT IPD DETAIL (e.g. RL 500ml IV, Inj. Voveran 2ml IM)..."
                    inputStyle={styles.photoInput}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleAddIpdDetail()}
                  style={styles.photoAddBtnAmber}
                >
                  + Add
                </button>
              </div>

              {/* Pills row (Expands vertically to use full available space) */}
              <div style={styles.photoIpdPillsContainer}>
                {(visitForm.ipdDetails || []).length === 0 ? (
                  <span style={styles.photoNoItemsText}>No IPD details/injections added (Type above & click + Add)</span>
                ) : (
                  (visitForm.ipdDetails || []).map((ipd, idx) => (
                    <span key={idx} style={styles.photoPillAmber}>
                      <Syringe size={11} color="#EA580C" />
                      <span>{typeof ipd === 'string' ? ipd : ipd?.item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveIpdDetail(idx)}
                        style={styles.photoPillCloseBtn}
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (~50% width on desktop, 100% on mobile/tablet) */}
        <div className="patient-record-right-col" style={styles.photoRightCol}>
          {/* CARD 1: 1. Clinic Medicine (Blue Theme) */}
          <div className="patient-card-clinic-med" style={{ ...styles.photoCard, ...styles.photoCardClinicMed, borderColor: '#93C5FD', position: 'relative', zIndex: 40, overflow: 'visible' }}>
            <div style={styles.photoHeaderBlue}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Pill size={14} color="#1E40AF" />
                <span style={styles.photoHeaderTitle}>1. Clinic Medicine</span>
              </div>
            </div>
            <div style={{ ...styles.photoCardBody, flex: 1, minHeight: 0, overflow: 'visible' }}>
              <div style={{ ...styles.photoInputAddRow, position: 'relative' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <MasterDataInput
                    type="medicine"
                    value={clinicMedForm.medicine}
                    onChange={(val) => setClinicMedForm((prev) => ({ ...prev, medicine: val }))}
                    onEnterNext={(chosen) => {
                      const med = chosen || clinicMedForm.medicine;
                      if (med) {
                        setClinicMedForm((prev) => ({ ...prev, medicine: med }));
                      }
                      setTimeout(() => {
                        clinicMedQtyRef.current?.focus();
                        clinicMedQtyRef.current?.select();
                      }, 30);
                    }}
                    onSelectCallback={(chosen) => {
                      if (chosen) {
                        setClinicMedForm((prev) => ({ ...prev, medicine: chosen }));
                      }
                      setTimeout(() => {
                        clinicMedQtyRef.current?.focus();
                        clinicMedQtyRef.current?.select();
                      }, 30);
                    }}
                    placeholder="MEDICINE..."
                    inputStyle={styles.photoInput}
                  />
                </div>
                <div style={{ width: '48px', flexShrink: 0 }}>
                  <input
                    ref={clinicMedQtyRef}
                    type="number"
                    min="1"
                    value={clinicMedForm.qty}
                    onChange={(e) => setClinicMedForm((prev) => ({ ...prev, qty: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        clinicMedMorningRef.current?.focus();
                        clinicMedMorningRef.current?.select();
                      }
                    }}
                    placeholder="QTY"
                    style={{ ...styles.photoInput, textAlign: 'center' }}
                  />
                </div>
                {/* M, N, E dosage inputs */}
                <div style={{ width: '30px', flexShrink: 0 }}>
                  <input
                    ref={clinicMedMorningRef}
                    type="text"
                    value={clinicMedForm.morning}
                    onChange={(e) => setClinicMedForm((prev) => ({ ...prev, morning: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        clinicMedNoonRef.current?.focus();
                        clinicMedNoonRef.current?.select();
                      }
                    }}
                    placeholder="M"
                    style={{ ...styles.photoInput, textAlign: 'center' }}
                    title="Morning"
                  />
                </div>
                <div style={{ width: '30px', flexShrink: 0 }}>
                  <input
                    ref={clinicMedNoonRef}
                    type="text"
                    value={clinicMedForm.noon}
                    onChange={(e) => setClinicMedForm((prev) => ({ ...prev, noon: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        clinicMedEveningRef.current?.focus();
                        clinicMedEveningRef.current?.select();
                      }
                    }}
                    placeholder="N"
                    style={{ ...styles.photoInput, textAlign: 'center' }}
                    title="Noon"
                  />
                </div>
                <div style={{ width: '30px', flexShrink: 0 }}>
                  <input
                    ref={clinicMedEveningRef}
                    type="text"
                    value={clinicMedForm.evening}
                    onChange={(e) => setClinicMedForm((prev) => ({ ...prev, evening: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddClinicMedicine();
                      }
                    }}
                    placeholder="E"
                    style={{ ...styles.photoInput, textAlign: 'center' }}
                    title="Evening"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddClinicMedicine}
                  style={styles.photoAddBtnBlue}
                >
                  +
                </button>
              </div>

              {/* Clinic Medicines Table (Expands to fill available space) */}
              <div style={styles.photoTableWrapFlex}>
                <table style={styles.photoTable}>
                  <thead>
                    <tr style={styles.photoTableThTr}>
                      <th style={styles.photoTh}>Medicine</th>
                      <th style={{ ...styles.photoTh, width: '45px', textAlign: 'center' }}>Qty</th>
                      <th style={{ ...styles.photoTh, width: '70px', textAlign: 'center' }}>M N E</th>
                      <th style={{ ...styles.photoTh, width: '32px', textAlign: 'center' }}>X</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(visitForm.treatments || []).length === 0 ? (
                      <tr>
                        <td colSpan={4} style={styles.photoTableEmptyTdFlex}>
                          No clinic medicines added yet. Type medicine above and press Enter or +
                        </td>
                      </tr>
                    ) : (
                      (visitForm.treatments || []).map((tr) => (
                        <tr key={tr.id} style={styles.photoTableTr}>
                          <td style={styles.photoTdBold}>{tr.item}</td>
                          <td style={{ ...styles.photoTd, textAlign: 'center' }}>{tr.qty || '1'}</td>
                          <td style={{ ...styles.photoTd, textAlign: 'center' }}>
                            {tr.morning || '1'}-{tr.noon || '0'}-{tr.evening || '1'}
                          </td>
                          <td style={{ ...styles.photoTd, textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveTreatment(tr.id)}
                              style={styles.photoRowDeleteBtn}
                            >
                              <X size={12} color="#DC2626" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* CARD 2: 2. Prescription (Blue Theme) */}
          <div className="patient-card-prescription" style={{ ...styles.photoCard, ...styles.photoCardPrescription, borderColor: '#93C5FD', position: 'relative', zIndex: 30, overflow: 'visible' }}>
            <div style={styles.photoHeaderBlue}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={14} color="#1E40AF" />
                <span style={styles.photoHeaderTitle}>2. Prescription</span>
              </div>
            </div>
            <div style={{ ...styles.photoCardBody, flex: 1, minHeight: 0, overflow: 'visible' }}>
              <div style={{ ...styles.photoInputAddRow, position: 'relative' }}>
                <div style={{ flex: '1 1 180px' }}>
                  <MasterDataInput
                    type="medicine"
                    value={rxForm.medicine}
                    onChange={(val) => setRxForm((prev) => ({ ...prev, medicine: val }))}
                    onEnterNext={(chosen) => {
                      const med = chosen || rxForm.medicine;
                      if (med) {
                        setRxForm((prev) => ({ ...prev, medicine: med }));
                      }
                      setTimeout(() => {
                        rxQtyRef.current?.focus();
                        rxQtyRef.current?.select();
                      }, 30);
                    }}
                    onSelectCallback={(chosen) => {
                      if (chosen) {
                        setRxForm((prev) => ({ ...prev, medicine: chosen }));
                      }
                      setTimeout(() => {
                        rxQtyRef.current?.focus();
                        rxQtyRef.current?.select();
                      }, 30);
                    }}
                    placeholder="MEDICINE..."
                    inputStyle={styles.photoInput}
                  />
                </div>
                <div style={{ width: '45px', flexShrink: 0 }}>
                  <input
                    ref={rxQtyRef}
                    type="number"
                    min="1"
                    value={rxForm.qty}
                    onChange={(e) => setRxForm((prev) => ({ ...prev, qty: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        rxMorningRef.current?.focus();
                        rxMorningRef.current?.select();
                      }
                    }}
                    placeholder="QTY"
                    style={{ ...styles.photoInput, textAlign: 'center' }}
                  />
                </div>
                {/* M, N, E, NT */}
                <div style={{ width: '26px', flexShrink: 0 }}>
                  <input
                    ref={rxMorningRef}
                    type="text"
                    value={rxForm.morning}
                    onChange={(e) => setRxForm((prev) => ({ ...prev, morning: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        rxNoonRef.current?.focus();
                        rxNoonRef.current?.select();
                      }
                    }}
                    placeholder="M"
                    style={{ ...styles.photoInput, textAlign: 'center', padding: '2px 0' }}
                    title="Morning"
                  />
                </div>
                <div style={{ width: '26px', flexShrink: 0 }}>
                  <input
                    ref={rxNoonRef}
                    type="text"
                    value={rxForm.noon}
                    onChange={(e) => setRxForm((prev) => ({ ...prev, noon: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        rxEveningRef.current?.focus();
                        rxEveningRef.current?.select();
                      }
                    }}
                    placeholder="N"
                    style={{ ...styles.photoInput, textAlign: 'center', padding: '2px 0' }}
                    title="Noon"
                  />
                </div>
                <div style={{ width: '26px', flexShrink: 0 }}>
                  <input
                    ref={rxEveningRef}
                    type="text"
                    value={rxForm.evening}
                    onChange={(e) => setRxForm((prev) => ({ ...prev, evening: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        rxNightRef.current?.focus();
                        rxNightRef.current?.select();
                      }
                    }}
                    placeholder="E"
                    style={{ ...styles.photoInput, textAlign: 'center', padding: '2px 0' }}
                    title="Evening"
                  />
                </div>
                <div style={{ width: '26px', flexShrink: 0 }}>
                  <input
                    ref={rxNightRef}
                    type="text"
                    value={rxForm.night}
                    onChange={(e) => setRxForm((prev) => ({ ...prev, night: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        rxTimingRef.current?.focus();
                      }
                    }}
                    placeholder="NT"
                    style={{ ...styles.photoInput, textAlign: 'center', padding: '2px 0' }}
                    title="Night"
                  />
                </div>
                {/* Meal Instruction select with AF, BF, SOS */}
                <div style={{ width: rxForm.timing === 'SOS' ? '70px' : '92px', flexShrink: 0 }}>
                  <select
                    ref={rxTimingRef}
                    value={rxForm.timing}
                    onChange={(e) => setRxForm((prev) => ({ ...prev, timing: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && rxForm.timing !== 'SOS') {
                        e.preventDefault();
                        handleAddPrescriptionItem();
                      }
                    }}
                    style={styles.photoSelect}
                  >
                    <option value="AF">After Food</option>
                    <option value="BF">Before Food</option>
                    <option value="SOS">SOS</option>
                  </select>
                </div>

                {/* Custom SOS Datalist Input (Shown when SOS is selected) */}
                {rxForm.timing === 'SOS' && (
                  <div style={{ width: '135px', flexShrink: 0 }}>
                    <input
                      type="text"
                      list="sosSuggestionsList"
                      value={rxForm.sosInstruction || ''}
                      onChange={(e) => setRxForm((prev) => ({ ...prev, sosInstruction: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddPrescriptionItem();
                        }
                      }}
                      placeholder="Custom SOS (e.g. In severe pain)..."
                      style={styles.photoInput}
                    />
                    <datalist id="sosSuggestionsList">
                      <option value="Only if severe pain" />
                      <option value="Only if fever > 100°F" />
                      <option value="When headache occurs" />
                      <option value="If vomiting occurs" />
                      <option value="At bedtime if needed" />
                      <option value="Only during cough attack" />
                      <option value="If gas or acidity occurs" />
                      <option value="When needed for allergy" />
                    </datalist>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleAddPrescriptionItem}
                  style={styles.photoAddBtnBlue}
                >
                  +
                </button>
              </div>

              {/* Prescription Table (Expands to fill available space) */}
              <div style={styles.photoTableWrapFlex}>
                <table style={styles.photoTable}>
                  <thead>
                    <tr style={styles.photoTableThTr}>
                      <th style={styles.photoTh}>Medicine</th>
                      <th style={{ ...styles.photoTh, width: '42px', textAlign: 'center' }}>Qty</th>
                      <th style={{ ...styles.photoTh, width: '76px', textAlign: 'center' }}>M-N-E-Nt</th>
                      <th style={{ ...styles.photoTh, width: '95px', textAlign: 'center' }}>Meal/Instruction</th>
                      <th style={{ ...styles.photoTh, width: '32px', textAlign: 'center' }}>X</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(visitForm.prescriptions || []).length === 0 ? (
                      <tr>
                        <td colSpan={5} style={styles.photoTableEmptyTdFlex}>
                          No prescriptions added yet. Type medicine above and press Enter or +
                        </td>
                      </tr>
                    ) : (
                      (visitForm.prescriptions || []).map((rx) => (
                        <tr key={rx.id} style={styles.photoTableTr}>
                          <td style={styles.photoTdBold}>{rx.medicine}</td>
                          <td style={{ ...styles.photoTd, textAlign: 'center' }}>{rx.qty || '-'}</td>
                          <td style={{ ...styles.photoTd, textAlign: 'center' }}>
                            {rx.morning || '1'}-{rx.noon || '0'}-{rx.evening || '1'}-{rx.night || '0'}
                          </td>
                          <td style={{ ...styles.photoTd, textAlign: 'center' }}>
                            {rx.timing === 'SOS'
                              ? `SOS${rx.sosInstruction ? ` (${rx.sosInstruction})` : ''}`
                              : rx.timing === 'BF'
                              ? 'Before Food'
                              : 'After Food'}
                          </td>
                          <td style={{ ...styles.photoTd, textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleRemovePrescription(rx.id)}
                              style={styles.photoRowDeleteBtn}
                            >
                              <X size={12} color="#DC2626" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* CARD 3: 3. Advice / Diet / Food Instructions (Green Theme) */}
          <div style={{ ...styles.photoCard, borderColor: '#86EFAC', position: 'relative', zIndex: 20, overflow: 'visible' }}>
            <div style={styles.photoHeaderGreen}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <UtensilsCrossed size={14} color="#166534" />
                <span style={{ ...styles.photoHeaderTitle, color: '#166534' }}>
                  3. Advice / Diet / Food Instructions
                </span>
              </div>
              {dietaryMasterList.length > 0 && (
                <span style={{ fontSize: '10px', color: '#166534', fontWeight: 600 }}>
                  {dietaryMasterList.length} Master Codes
                </span>
              )}
            </div>
            <div style={{ ...styles.photoCardBody, overflow: 'visible' }}>
              <div style={{ ...styles.photoInputAddRow, position: 'relative', zIndex: 60 }}>
                {/* Dietary Code Input with Suggestions Dropdown */}
                <div style={{ width: '135px', flexShrink: 0, position: 'relative' }} ref={dietaryCodeWrapRef}>
                  <input
                    ref={dietaryCodeInputRef}
                    type="text"
                    value={dietaryCodeInput}
                    onChange={(e) => handleDietaryCodeChange(e.target.value)}
                    onFocus={() => {
                      const list = masterDataCache['dietary'] || dietaryMasterList || [];
                      if (list.length > 0) {
                        if (dietaryCodeInput.trim()) {
                          const token = dietaryCodeInput.trim().toUpperCase();
                          setDietarySuggestions(list.filter((i) => (i.shortcut || '').toUpperCase().includes(token) || (i.value || '').toUpperCase().includes(token)));
                        } else {
                          setDietarySuggestions(list.slice(0, 10));
                        }
                        setShowDietaryDropdown(true);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown') {
                        if (dietarySuggestions.length > 0) {
                          e.preventDefault();
                          if (!showDietaryDropdown) setShowDietaryDropdown(true);
                          setDietaryHighlightIndex((prev) => (prev < dietarySuggestions.length - 1 ? prev + 1 : 0));
                        }
                      } else if (e.key === 'ArrowUp') {
                        if (dietarySuggestions.length > 0) {
                          e.preventDefault();
                          setDietaryHighlightIndex((prev) => (prev > 0 ? prev - 1 : dietarySuggestions.length - 1));
                        }
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (showDietaryDropdown && dietarySuggestions.length > 0 && dietaryHighlightIndex >= 0) {
                          handleSelectDietarySuggestion(dietarySuggestions[dietaryHighlightIndex]);
                        } else {
                          handleApplyDietary();
                        }
                      } else if (e.key === 'Tab') {
                        if (showDietaryDropdown && dietarySuggestions.length > 0 && dietaryHighlightIndex >= 0) {
                          const item = dietarySuggestions[dietaryHighlightIndex];
                          setDietaryCodeInput(item.shortcut || '');
                          setDietaryTextInput(item.value || '');
                          setShowDietaryDropdown(false);
                        }
                      } else if (e.key === 'Escape') {
                        setShowDietaryDropdown(false);
                      }
                    }}
                    placeholder="CODE (E.G. DIAB, LSD)"
                    style={styles.photoInput}
                    title="Type dietary shortcut code from Master Data"
                  />

                  {/* Dropdown suggestions list for dietary codes */}
                  {showDietaryDropdown && dietarySuggestions.length > 0 && (
                    <ul style={styles.photoDietaryDropdown}>
                      {dietarySuggestions.map((item, idx) => {
                        const isHighlighted = idx === dietaryHighlightIndex;
                        return (
                          <li
                            key={item._id || idx}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectDietarySuggestion(item);
                            }}
                            onMouseEnter={() => setDietaryHighlightIndex(idx)}
                            style={{
                              ...styles.photoDietaryDropdownItem,
                              backgroundColor: isHighlighted ? '#DCFCE7' : '#FFFFFF',
                              color: isHighlighted ? '#14532D' : '#0F172A',
                              fontWeight: isHighlighted ? 700 : 400,
                              borderLeft: isHighlighted ? '3px solid #16A34A' : '3px solid transparent',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%' }}>
                              <span style={{ fontWeight: 800, color: '#166534', backgroundColor: '#F0FDF4', padding: '1px 5px', borderRadius: '3px', border: '1px solid #BBF7D0', fontSize: '10.5px' }}>
                                {item.shortcut || 'CODE'}
                              </span>
                              <span style={{ flex: 1, fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
                                {item.value}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Specific Food Advice Input */}
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    ref={dietaryAdviceInputRef}
                    type="text"
                    value={dietaryTextInput}
                    onChange={(e) => setDietaryTextInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleApplyDietary();
                      }
                    }}
                    placeholder="SPECIFIC FOOD ADVICE (AUTO-FILLS FROM CODE OR TYPE DIRECTLY)..."
                    style={styles.photoInput}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleApplyDietary}
                  style={styles.photoApplyBtnGreen}
                  title="Apply dietary instruction to case"
                >
                  + Apply
                </button>
              </div>

              {/* Quick Master Data Chips (One-click toggle from Master Data) */}
              {dietaryMasterList.length > 0 && (
                <div style={styles.photoDietaryChipsRow}>
                  <span style={{ fontSize: '10px', color: '#166534', fontWeight: 700 }}>Quick Codes:</span>
                  {dietaryMasterList.slice(0, 12).map((item, idx) => {
                    const code = item.shortcut || item.value.slice(0, 8);
                    const isAlreadyAdded = (visitForm.dietary || '').toLowerCase().includes((item.value || '').toLowerCase());
                    return (
                      <button
                        key={item._id || idx}
                        type="button"
                        onClick={() => {
                          if (isAlreadyAdded) {
                            handleRemoveDietaryItem(item.value);
                          } else {
                            handleApplyDietaryItem(item.value);
                          }
                        }}
                        style={{
                          ...styles.photoDietaryChipBtn,
                          backgroundColor: isAlreadyAdded ? '#166534' : '#F0FDF4',
                          color: isAlreadyAdded ? '#FFFFFF' : '#166534',
                          borderColor: isAlreadyAdded ? '#14532D' : '#86EFAC',
                          fontWeight: isAlreadyAdded ? 800 : 600,
                        }}
                        title={`${item.shortcut ? `[${item.shortcut}] ` : ''}${item.value}`}
                      >
                        <span>{code}</span>
                        {isAlreadyAdded && <span>✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Applied Dietary Advice Pills Row */}
              <div style={styles.photoPillsContainer}>
                {(visitForm.dietary || '').split(',').map((s) => s.trim()).filter(Boolean).length === 0 ? (
                  <span style={styles.photoNoItemsText}>
                    No custom food advice added (default Gujarati clinic advice will print on letterhead)
                  </span>
                ) : (
                  (visitForm.dietary || '').split(',').map((s) => s.trim()).filter(Boolean).map((item, idx) => (
                    <span key={idx} style={styles.photoPillGreen}>
                      <UtensilsCrossed size={11} color="#166534" />
                      <span>{item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDietaryItem(item)}
                        style={styles.photoPillCloseBtn}
                        title="Remove this advice"
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* CARD 4: Billing Details (Amber/Yellow Theme) */}
          <div style={{ ...styles.photoCard, borderColor: '#FCD34D', position: 'relative', zIndex: 10, overflow: 'visible' }}>
            <div style={styles.photoHeaderAmber}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Receipt size={14} color="#854D0E" />
                <span style={{ ...styles.photoHeaderTitle, color: '#854D0E' }}>Billing Details</span>
                {activeEditingVisit && (
                  <span style={styles.photoEditingBadge}>
                    ✏️ EDITING CASE ({activeEditingVisit.visitDate || 'RECORD'})
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {activeEditingVisit && (
                  <button
                    type="button"
                    onClick={() => handleOpenNewCase()}
                    style={styles.photoCancelEditBtn}
                    title="Cancel editing and switch to fresh new case entry"
                  >
                    ✕ Cancel Edit (New Case)
                  </button>
                )}
                {personalDue > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowTotalDueModal(true)}
                    style={styles.photoBillingTagRed}
                    title="Click to view all past pending visits"
                  >
                    <span>👤 Personal Due: ₹{personalDue}</span>
                  </button>
                ) : personalDeposit > 0 ? (
                  <span style={styles.photoBillingTagGreen}>
                    🟢 Personal Deposit: ₹{personalDeposit}
                  </span>
                ) : null}

                {familyDue > 0 ? (
                  <button
                    type="button"
                    onClick={handleOpenFamilyDueModal}
                    style={styles.photoBillingTagAmber}
                    title="Click to view full family due breakdown across members"
                  >
                    <span>👥 Family Due: ₹{familyDue}</span>
                  </button>
                ) : familyDeposit > 0 ? (
                  <span style={styles.photoBillingTagGreen}>
                    🟢 Family Deposit: ₹{familyDeposit}
                  </span>
                ) : null}
              </div>
            </div>

            <div style={styles.photoCardBody}>
              {/* Main Fields Row: Clean 3-column layout */}
              <div style={styles.photoRow3Col}>
                <div style={styles.photoFieldGroup}>
                  <label style={styles.photoLabel}>Charged Amount (₹):</label>
                  <input
                    type="number"
                    min="0"
                    value={visitForm.charge}
                    onChange={(e) => updateFormField('charge', e.target.value)}
                    style={styles.photoInput}
                  />
                </div>

                <div style={styles.photoFieldGroup}>
                  <label style={styles.photoLabel}>Received Amount (₹):</label>
                  <input
                    type="number"
                    min="0"
                    value={visitForm.received}
                    onChange={(e) => updateFormField('received', e.target.value)}
                    style={styles.photoInput}
                  />
                </div>

                <div style={styles.photoFieldGroup}>
                  <label
                    style={{
                      ...styles.photoLabel,
                      color: finalPatientDeposit > 0 ? '#15803D' : (finalPatientDue > 0 ? '#B91C1C' : '#475569'),
                      fontWeight: 700,
                    }}
                  >
                    {finalPatientDeposit > 0 ? 'Patient Deposit (₹):' : 'Patient Total Due (₹):'}
                  </label>
                  <div
                    style={{
                      ...styles.photoDueDisplay,
                      backgroundColor: finalPatientDeposit > 0 ? '#DCFCE7' : (finalPatientDue > 0 ? '#FEE2E2' : '#F1F5F9'),
                      color: finalPatientDeposit > 0 ? '#15803D' : (finalPatientDue > 0 ? '#B91C1C' : '#475569'),
                      borderColor: finalPatientDeposit > 0 ? '#86EFAC' : (finalPatientDue > 0 ? '#FCA5A5' : '#CBD5E1'),
                      fontWeight: 800,
                    }}
                  >
                    {finalPatientDeposit > 0 ? `🟢 DEPOSIT: ₹${finalPatientDeposit}` : `₹${finalPatientDue}`}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM ACTION BUTTONS */}
          <div style={styles.photoBottomActionsRow}>
            <button
              type="button"
              onClick={() => handleSaveVisit(false)}
              disabled={isSavingVisit}
              style={styles.photoSaveActionBtn}
              title="Save clinical case (Ctrl+S / Alt+S)"
            >
              <Save size={15} />
              <span>{isSavingVisit ? 'SAVING...' : 'SAVE'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveVisit(true)}
              disabled={isSavingVisit}
              style={styles.photoSavePrintActionBtn}
              title="Save case and open printable prescription (Ctrl+Enter / Alt+P)"
            >
              <Printer size={15} />
              <span>{isSavingVisit ? 'SAVING...' : 'SAVE & PRINT'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* HISTORY MODAL / SLIDE-OVER DRAWER (CLICKING *(History)* NEXT TO PATIENT NAME) */}
      {showHistoryModal && (
        <div style={styles.modalOverlay} onClick={() => setShowHistoryModal(false)}>
          <div style={{ ...styles.modalCard, maxWidth: '820px', width: '92%' }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalHeaderTitle}>
                <Clock size={16} color="var(--primary)" />
                <h3>Past Consultations & Visits - {currentPatient?.name || 'Patient'}</h3>
                <span style={styles.recentCountBadge}>{patientVisits.length} Visits</span>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                style={styles.closeModalBtn}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {loadingVisits ? (
                <div style={styles.emptyState}>Loading visits...</div>
              ) : patientVisits.length === 0 ? (
                <div style={styles.emptyState}>No previous visits recorded for this patient.</div>
              ) : (
                patientVisits.map((visit) => (
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
                        {visit.sugar && <span style={styles.vitalsBadgeSugar}>Sugar: {visit.sugar}</span>}
                        {visit.other && <span style={styles.vitalsBadgeOther}>{visit.other}</span>}
                      </div>

                      <div style={styles.visitCardActions}>
                        <span
                          style={{
                            ...styles.visitDueBadge,
                            backgroundColor: visit.due > 0 ? '#FEF2F2' : '#F0FDF4',
                            borderColor: visit.due > 0 ? '#FECACA' : '#BBF7D0',
                            color: visit.due > 0 ? '#DC2626' : '#16A34A',
                          }}
                        >
                          {visit.due > 0 ? `Due: ₹${visit.due}` : '✓ Settled'}
                        </span>

                        {visit.labReport && (
                          <button
                            type="button"
                            onClick={() => setViewingPastReport(visit.labReport)}
                            style={styles.viewPastReportBtn}
                            title="Click to View Diagnostic Lab Report"
                          >
                            <FileText size={12} color="#0F766E" />
                            <span>🔬 Lab Report</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleStartEditVisit(visit)}
                          style={styles.editVisitBtn}
                          title="Edit this recorded case"
                        >
                          <Edit3 size={12} />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setPrintVisit({ ...visit, patient: currentPatient });
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

                    {/* Findings & Prescriptions */}
                    {(visit.complaint || visit.investigation) && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 4 }}>
                        {visit.complaint && (
                          <div style={styles.complaintBlock}>
                            <span style={styles.complaintHeaderLabel}>Complaints:</span>
                            <span style={{ fontSize: 11, color: '#334155' }}>{visit.complaint}</span>
                          </div>
                        )}
                        {visit.investigation && (
                          <div style={styles.investigationBlock}>
                            <span style={styles.investigationHeaderLabel}>Investigations:</span>
                            <span style={{ fontSize: 11, color: '#334155' }}>{visit.investigation}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {Array.isArray(visit.ipdDetails) && visit.ipdDetails.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#9A3412' }}>IPD Injections/Fluids:</span>
                        {visit.ipdDetails.map((ipd, idx) => (
                          <span key={idx} style={{ backgroundColor: '#FFEDD5', border: '1px solid #FED7AA', borderRadius: 4, padding: '1px 6px', fontSize: 11, color: '#9A3412', fontWeight: 600 }}>
                            {typeof ipd === 'string' ? ipd : ipd?.item}
                          </span>
                        ))}
                      </div>
                    )}

                    {Array.isArray(visit.prescriptions) && visit.prescriptions.length > 0 && (
                      <div style={{ marginTop: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#1E40AF' }}>Prescribed Medicines:</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                          {visit.prescriptions.map((p, idx) => (
                            <span key={idx} style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 4, padding: '2px 6px', fontSize: 11, color: '#1E3A8A' }}>
                              {p.medicine} ({p.qty ? `Qty: ${p.qty}` : ''} {p.morning}-{p.noon}-{p.evening}-{p.night} {p.timing})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div style={styles.dueModalFooter}>
              <span style={{ fontSize: 11, color: '#64748B' }}>Past records are preserved in MongoDB and fully editable.</span>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                style={{ ...styles.cancelDraftBtn, padding: '5px 14px' }}
              >
                Close History
              </button>
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
                  <label style={styles.formLabel}>Gender</label>
                  <select
                    value={editFormData.gender || 'Male'}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        gender: e.target.value,
                      })
                    }
                    style={styles.modalInput}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

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
        const visitTime = printVisit.createdAt
          ? new Date(printVisit.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
          : '';
        const dateTimeDisplay = visitTime ? `${formattedDate}  ${visitTime}` : formattedDate;
        const validTreatments = Array.isArray(printVisit.treatments)
          ? printVisit.treatments.filter((tr) => tr && tr.item && String(tr.item).trim())
          : [];
        const hasTreatments = validTreatments.length > 0;
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
                      {/* <span style={styles.quickChipsLabel}>Click Master Data items to add/remove:</span>
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
                      </div> */}
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

                {/* <div style={styles.printHelpNotice}>
                  {printMode === 'full' ? (
                    <span>ℹ️ <strong>Full Letterhead Mode</strong>: Prints complete <strong>Dr. Chirag Paghdal</strong> letterpad with watermark, patient details, converted Rx dosage, dietary advice & Harsh Medical footer.</span>
                  ) : (
                    <span>🖨️ <strong>Pre-Printed Pad Mode</strong>: Letterhead graphics are hidden during print so you can insert your <strong>physical printed paper pad</strong> directly into printer!</span>
                  )}
                </div> */}
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

                {/* 1. DOCTOR'S LETTERPAD HEADER (MATCHING AUTHENTIC CLINIC PRESCRIPTION) */}
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
                        <span style={styles.letterpadDocDegree}> ({doctor?.degree || 'B.H.M.S.'})</span>
                      </div>
                      <div style={styles.letterpadDocSpecialty}>
                        {doctor?.specialization?.includes('B.H.M.S') ? 'FAMILY PHYSICIAN' : (doctor?.specialization || 'FAMILY PHYSICIAN')}
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

                  {/* Subheader: FOR, _________________ DATE : ______________ */}
                  <div style={styles.letterpadForDateRow}>
                    <span style={{ fontWeight: 800, fontSize: '13px', color: '#000000' }}>FOR,</span>
                    <span style={{ fontWeight: 800, fontSize: '13px', color: '#000000' }}>DATE :</span>
                  </div>
                </div>

                {/* 2. PATIENT INFO BLOCK (EXACT MATCH TO USER PHOTO) */}
                <div style={styles.photoPatientInfoBlock}>
                  <div style={styles.photoPatientInfoRow}>
                    <div style={styles.photoPatientColLeft}>
                      <span style={styles.photoPatientLabel}>Patient:</span>{' '}
                      <span style={styles.photoPatientValueBold}>
                        {printVisit.patientName || currentPatient?.name || '—'}
                      </span>
                    </div>
                    <div style={styles.photoPatientColRight}>
                      <span style={styles.photoPatientLabel}>Date:</span>{' '}
                      <span style={styles.photoPatientValue}>
                        {(() => {
                          let dPart = '';
                          const rawDate = printVisit.visitDate;
                          if (rawDate && rawDate.includes('-')) {
                            const p = rawDate.split('-');
                            if (p.length === 3 && p[0].length === 4) {
                              dPart = `${p[2]}-${p[1]}-${p[0]}`;
                            } else {
                              dPart = rawDate;
                            }
                          } else {
                            const now = new Date();
                            const pad = (n) => String(n).padStart(2, '0');
                            dPart = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;
                          }
                          let tPart = '';
                          if (printVisit.createdAt) {
                            try {
                              tPart = new Date(printVisit.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                            } catch (e) {}
                          }
                          if (!tPart) {
                            tPart = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                          }
                          return `${dPart}, ${tPart}`;
                        })()}
                      </span>
                    </div>
                  </div>

                  <div style={styles.photoPatientInfoRow}>
                    <div style={styles.photoPatientColLeft}>
                      <span style={styles.photoPatientLabel}>Age:</span>{' '}
                      <span style={styles.photoPatientValue}>
                        {currentPatient?.age ? `${currentPatient.age} Y` : (printVisit.age ? `${printVisit.age} Y` : '—')}
                      </span>
                    </div>
                    <div style={styles.photoPatientColRight}>
                      <span style={styles.photoPatientLabel}>B.P.:</span>{' '}
                      <span style={styles.photoPatientValue}>
                        {printVisit.bp ? printVisit.bp : '-'}
                      </span>
                    </div>
                  </div>

                  <div style={styles.photoPatientInfoRow}>
                    <div style={styles.photoPatientColLeft}>
                      <span style={styles.photoPatientLabel}>Mobile:</span>{' '}
                      <span style={styles.photoPatientValue}>
                        {currentPatient?.phone || printVisit.phone || '-'}
                      </span>
                    </div>
                    <div style={styles.photoPatientColRight}>
                      <span style={styles.photoPatientLabel}>Sugar:</span>{' '}
                      <span style={styles.photoPatientValue}>
                        {printVisit.sugar ? printVisit.sugar : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Solid horizontal line across page */}
                <div style={styles.photoBlackDivider} />

                {/* 3. ℞ SYMBOL & PRESCRIPTION TABLE */}
                <div style={styles.photoRxRow}>
                  <span style={styles.photoRxSymbol}>&#8478;</span>
                </div>

                <table style={styles.photoRxTable}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.photoRxTh, width: '42%', textAlign: 'left' }}>Medicine Name</th>
                      <th style={{ ...styles.photoRxTh, width: '12%', textAlign: 'center' }}>Qty</th>
                      <th style={{ ...styles.photoRxTh, width: '26%', textAlign: 'center' }}>Dose</th>
                      <th style={{ ...styles.photoRxTh, width: '20%', textAlign: 'left' }}>Instruction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printVisit.prescriptions && printVisit.prescriptions.length > 0 ? (
                      printVisit.prescriptions.map((rx, idx) => {
                        const isSos = rx.timing === 'SOS';
                        const hasDosageNumbers =
                          (rx.morning && rx.morning !== '0') ||
                          (rx.noon && rx.noon !== '0') ||
                          (rx.evening && rx.evening !== '0') ||
                          (rx.night && rx.night !== '0');

                        // Gujarati instruction text
                        let instructionText = '';
                        if (isSos) {
                          instructionText = rx.sosInstruction?.trim() || 'તાવ આવે ત્યારે';
                        } else if (rx.timing === 'BF') {
                          instructionText = 'જમ્યા પહેલા';
                        } else {
                          instructionText = 'જમ્યા પછી';
                        }

                        return (
                          <tr key={idx} style={styles.photoRxTr}>
                            {/* 1. Medicine Name */}
                            <td style={styles.photoRxTdMedName}>
                              {rx.medicine}
                            </td>

                            {/* 2. Qty */}
                            <td style={styles.photoRxTdQty}>
                              {rx.qty || '-'}
                            </td>

                            {/* 3. Dose (4-column mini-grid or dash) */}
                            <td style={styles.photoRxTdDose}>
                              {isSos || !hasDosageNumbers ? (
                                <span style={styles.photoDashText}>-</span>
                              ) : (
                                <table style={styles.photoDoseMiniTable}>
                                  <thead>
                                    <tr>
                                      <th style={styles.photoDoseMiniTh}>સવાર</th>
                                      <th style={styles.photoDoseMiniTh}>બપોર</th>
                                      <th style={styles.photoDoseMiniTh}>સાંજ</th>
                                      <th style={{ ...styles.photoDoseMiniTh, borderRight: 'none' }}>રાત</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr>
                                      <td style={styles.photoDoseMiniTd}>
                                        {rx.morning && rx.morning !== '0' ? rx.morning : ''}
                                      </td>
                                      <td style={styles.photoDoseMiniTd}>
                                        {rx.noon && rx.noon !== '0' ? rx.noon : ''}
                                      </td>
                                      <td style={styles.photoDoseMiniTd}>
                                        {rx.evening && rx.evening !== '0' ? rx.evening : ''}
                                      </td>
                                      <td style={{ ...styles.photoDoseMiniTd, borderRight: 'none' }}>
                                        {rx.night && rx.night !== '0' ? rx.night : ''}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              )}
                            </td>

                            {/* 4. Instruction */}
                            <td style={styles.photoRxTdInstruction}>
                              {instructionText}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '16px', color: '#64748B', fontStyle: 'italic' }}>
                          No prescription medicines recorded
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* 4. ADVICE BOX (સૂચન / પરહેજ (ADVICE)) */}
                <div style={styles.photoAdviceBox}>
                  <span style={styles.photoAdviceTitle}>
                    સૂચન / પરહેજ (ADVICE):{' '}
                  </span>
                  <span style={styles.photoAdviceText}>
                    {printDietary && printDietary.trim()
                      ? printDietary
                      : '---અનાજ [ રોટલી , ભાખરી , રોટલો ] , બટાકા , દૂધ ના લેવુ----- --- દાળ ભાત, ખીચડી , છાશ, દહીં, લીંબુ પાણી, મોસંબી નુ જ્યુસ, પાઈનેપલ નુ જ્યુસ, લસ્સી વધારે લેવી'}
                  </span>
                </div>

                {/* Separator line above footer */}
                <div style={styles.photoFooterDivider} />

                {/* 5. PHARMACY FOOTER: + Harsh Medical & General Stores + */}
                <div
                  className="letterpad-preprinted-footer"
                  style={{
                    ...styles.photoPharmacyBar,
                    visibility: printMode === 'padOnly' ? 'hidden' : 'visible',
                  }}
                >
                  <span style={styles.photoPharmacyPlus}>+</span>
                  <span style={styles.photoPharmacyText}>
                    {doctor?.medicalStore || 'Harsh Medical & General Stores'}
                  </span>
                  <span style={styles.photoPharmacyPlus}>+</span>
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
    width: '100%',
    height: '100%',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    boxSizing: 'border-box',
    gap: 0,
  },

  // Photo Layout Styles (Matching user screenshot - Full Space Responsive)
  photoLayoutMain: {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    flex: 1,
    minHeight: 0,
    gap: '6px',
    padding: '3px 5px',
    boxSizing: 'border-box',
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  photoLeftCol: {
    flex: '1 1 50%',
    width: '50%',
    minWidth: '360px',
    height: '100%',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    overflowY: 'auto',
    paddingRight: '2px',
    boxSizing: 'border-box',
  },
  photoRightCol: {
    flex: '1 1 50%',
    width: '50%',
    minWidth: '380px',
    height: '100%',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    overflowY: 'auto',
    paddingRight: '2px',
    boxSizing: 'border-box',
  },
  photoCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #CBD5E1',
    borderRadius: '4px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'visible',
    position: 'relative',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  photoHeaderBlue: {
    backgroundColor: '#E0EDF8',
    borderBottom: '1px solid #BFDBFE',
    padding: '3px 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: '25px',
  },
  photoHeaderRed: {
    backgroundColor: '#FEE2E2',
    borderBottom: '1px solid #FECACA',
    padding: '3px 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: '25px',
  },
  photoHeaderGreen: {
    backgroundColor: '#D1FAE5',
    borderBottom: '1px solid #A7F3D0',
    padding: '3px 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: '25px',
  },
  photoHeaderPurple: {
    backgroundColor: '#EDE9FE',
    borderBottom: '1px solid #DDD6FE',
    padding: '3px 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: '25px',
  },
  photoHeaderAmber: {
    backgroundColor: '#FFEDD5',
    borderBottom: '1px solid #FED7AA',
    padding: '3px 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: '25px',
  },
  photoHeaderTitle: {
    fontSize: '11px',
    fontWeight: 800,
    color: '#1E40AF',
    letterSpacing: '0.3px',
    textTransform: 'uppercase',
  },
  photoMiniActionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #93C5FD',
    color: '#1D4ED8',
    fontSize: '10px',
    fontWeight: 600,
    padding: '1px 6px',
    borderRadius: '3px',
    cursor: 'pointer',
  },
  photoCardBody: {
    padding: '5px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    overflow: 'visible',
  },
  photoRow1Col: {
    display: 'flex',
    flexWrap: 'wrap',
    width: '100%',
    gap: '6px',
  },
  photoRow2Col: {
    display: 'flex',
    flexWrap: 'wrap',
    width: '100%',
    gap: '6px',
  },
  photoRow3Col: {
    display: 'flex',
    flexWrap: 'wrap',
    width: '100%',
    gap: '6px',
  },
  photoFieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    flex: '1 1 110px',
    minWidth: '95px',
    boxSizing: 'border-box',
  },
  photoLabel: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#334155',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  photoInput: {
    width: '100%',
    height: '26px',
    padding: '2px 5px',
    fontSize: '11px',
    border: '1px solid #94A3B8',
    borderRadius: '3px',
    outline: 'none',
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    boxSizing: 'border-box',
    minWidth: 0,
  },
  photoSelect: {
    width: '100%',
    height: '26px',
    padding: '1px 4px',
    fontSize: '10px',
    border: '1px solid #94A3B8',
    borderRadius: '3px',
    outline: 'none',
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    boxSizing: 'border-box',
    minWidth: 0,
  },
  photoHistoryContainer: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #93C5FD',
    borderRadius: '4px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 2px 4px rgba(30, 64, 175, 0.08)',
    marginTop: '2px',
    marginBottom: '2px',
  },
  photoHistoryHeader: {
    backgroundColor: '#EFF6FF',
    borderBottom: '1px solid #BFDBFE',
    padding: '4px 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: '26px',
  },
  photoHistoryTitle: {
    fontSize: '11px',
    fontWeight: 800,
    color: '#1E40AF',
    letterSpacing: '0.2px',
  },
  photoHistoryCloseBtn: {
    background: 'none',
    border: '1px solid #BFDBFE',
    backgroundColor: '#FFFFFF',
    borderRadius: '3px',
    color: '#1D4ED8',
    fontSize: '10px',
    fontWeight: 700,
    padding: '1px 6px',
    cursor: 'pointer',
  },
  photoHistoryScrollArea: {
    maxHeight: '230px',
    overflowY: 'auto',
    overflowX: 'auto',
    backgroundColor: '#FFFFFF',
  },
  photoHistoryLoading: {
    padding: '12px',
    textAlign: 'center',
    fontSize: '11px',
    color: '#64748B',
    fontStyle: 'italic',
  },
  photoHistoryEmpty: {
    padding: '12px',
    textAlign: 'center',
    fontSize: '11px',
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  photoHistoryTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '10.5px',
    minWidth: '780px',
  },
  photoHistoryTh: {
    backgroundColor: '#F8FAFC',
    borderBottom: '1px solid #CBD5E1',
    borderRight: '1px solid #E2E8F0',
    padding: '3px 6px',
    fontSize: '10px',
    fontWeight: 700,
    color: '#334155',
    textAlign: 'left',
    position: 'sticky',
    top: 0,
    zIndex: 2,
  },
  photoHistoryTr: {
    borderBottom: '1px solid #E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  photoHistoryTd: {
    padding: '3px 6px',
    color: '#1E293B',
    verticalAlign: 'top',
    borderRight: '1px solid #F1F5F9',
    fontSize: '10px',
  },
  photoHistoryTdBold: {
    padding: '3px 6px',
    fontWeight: 700,
    color: '#0F172A',
    verticalAlign: 'top',
    borderRight: '1px solid #F1F5F9',
    fontSize: '10px',
  },
  historyAlertBp: {
    fontSize: '9px',
    fontWeight: 700,
    backgroundColor: '#FEE2E2',
    color: '#B91C1C',
    border: '1px solid #FECACA',
    borderRadius: '3px',
    padding: '0 4px',
    whiteSpace: 'nowrap',
  },
  historyAlertSugar: {
    fontSize: '9px',
    fontWeight: 700,
    backgroundColor: '#FFEDD5',
    color: '#C2410C',
    border: '1px solid #FED7AA',
    borderRadius: '3px',
    padding: '0 4px',
    whiteSpace: 'nowrap',
  },
  historyAlertOther: {
    fontSize: '9px',
    fontWeight: 700,
    backgroundColor: '#FEF3C7',
    color: '#B45309',
    border: '1px solid #FDE68A',
    borderRadius: '3px',
    padding: '0 4px',
    whiteSpace: 'nowrap',
  },
  historyAlertLab: {
    fontSize: '9px',
    fontWeight: 700,
    backgroundColor: '#E0F2FE',
    color: '#0369A1',
    border: '1px solid #BAE6FD',
    borderRadius: '3px',
    padding: '0 4px',
    whiteSpace: 'nowrap',
  },
  historyActBtn: {
    width: '20px',
    height: '20px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #CBD5E1',
    backgroundColor: '#FFFFFF',
    borderRadius: '3px',
    cursor: 'pointer',
    padding: 0,
  },
  photoHistoryLinkBtn: {
    background: 'none',
    border: 'none',
    color: '#2563EB',
    fontSize: '10px',
    fontWeight: 700,
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'underline',
  },
  photoDueLink: {
    background: 'none',
    border: 'none',
    color: '#DC2626',
    fontSize: '10px',
    fontWeight: 700,
    cursor: 'pointer',
    padding: 0,
  },
  photoPatientDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    border: '1px solid #3B82F6',
    borderRadius: '4px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    maxHeight: '220px',
    overflowY: 'auto',
    zIndex: 100,
    marginTop: '2px',
  },
  photoDropdownItem: {
    padding: '5px 8px',
    borderBottom: '1px solid #F1F5F9',
    cursor: 'pointer',
  },
  photoMiniBadge: {
    fontSize: '9px',
    fontWeight: 700,
    backgroundColor: '#EFF6FF',
    color: '#2563EB',
    padding: '1px 4px',
    borderRadius: '3px',
  },
  photoHeadBadge: {
    fontSize: '9px',
    fontWeight: 700,
    backgroundColor: '#DCFCE7',
    color: '#166534',
    padding: '1px 4px',
    borderRadius: '3px',
  },
  photoInputAddRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '4px',
    rowGap: '4px',
    width: '100%',
    boxSizing: 'border-box',
  },
  photoAddBtnRed: {
    height: '24px',
    padding: '0 8px',
    backgroundColor: '#DC2626',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '3px',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
  },
  photoAddBtnGreen: {
    height: '24px',
    padding: '0 8px',
    backgroundColor: '#059669',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '3px',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
  },
  photoAddBtnPurple: {
    height: '24px',
    padding: '0 8px',
    backgroundColor: '#7C3AED',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '3px',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
  },
  photoAddBtnAmber: {
    height: '24px',
    padding: '0 8px',
    backgroundColor: '#EA580C',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '3px',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
  },
  photoAddBtnBlue: {
    height: '24px',
    padding: '0 10px',
    backgroundColor: '#1E40AF',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '3px',
    fontSize: '13px',
    fontWeight: 800,
    cursor: 'pointer',
    flexShrink: 0,
  },
  photoApplyBtnGreen: {
    height: '24px',
    padding: '0 10px',
    backgroundColor: '#166534',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '3px',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
  },
  photoLabEntryBtn: {
    height: '24px',
    padding: '0 8px',
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    backgroundColor: '#F3E8FF',
    color: '#6B21A8',
    border: '1px solid #D8B4FE',
    borderRadius: '3px',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
  },
  photoPillsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    minHeight: '20px',
    alignItems: 'center',
  },
  photoPillRed: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#FEE2E2',
    border: '1px solid #FCA5A5',
    color: '#991B1B',
    borderRadius: '3px',
    padding: '1px 6px',
    fontSize: '11px',
    fontWeight: 700,
  },
  photoPillGreen: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#D1FAE5',
    border: '1px solid #6EE7B7',
    color: '#065F46',
    borderRadius: '3px',
    padding: '1px 6px',
    fontSize: '11px',
    fontWeight: 700,
  },
  photoPillAmber: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#FFEDD5',
    border: '1px solid #FDBA74',
    color: '#9A3412',
    borderRadius: '3px',
    padding: '1px 6px',
    fontSize: '11px',
    fontWeight: 700,
  },
  photoPillCloseBtn: {
    background: 'none',
    border: 'none',
    color: 'inherit',
    padding: 0,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    opacity: 0.75,
  },
  photoNoItemsText: {
    fontSize: '10px',
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  photoTableWrap: {
    border: '1px solid #CBD5E1',
    borderRadius: '3px',
    overflow: 'hidden',
    maxHeight: '100px',
    overflowY: 'auto',
  },
  photoTableWrapFlex: {
    border: '1px solid #CBD5E1',
    borderRadius: '3px',
    overflowY: 'auto',
    flex: 1,
    minHeight: '75px',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
  },
  photoTableEmptyTdFlex: {
    padding: '22px 10px',
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: '11px',
    fontStyle: 'italic',
    verticalAlign: 'middle',
    backgroundColor: '#FAFBFD',
  },
  photoCardClinicMed: {
    flex: '1 1 140px',
    minHeight: '130px',
    display: 'flex',
    flexDirection: 'column',
  },
  photoCardPrescription: {
    flex: '1.3 1 160px',
    minHeight: '150px',
    display: 'flex',
    flexDirection: 'column',
  },
  photoCardIpd: {
    flex: '1 1 100px',
    minHeight: '90px',
    display: 'flex',
    flexDirection: 'column',
  },
  photoIpdPillsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    minHeight: '38px',
    alignItems: 'flex-start',
    flex: 1,
    overflowY: 'auto',
    backgroundColor: '#FAFBFD',
    border: '1px solid #E2E8F0',
    borderRadius: '3px',
    padding: '4px 6px',
  },
  photoTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '11px',
  },
  photoTableThTr: {
    backgroundColor: '#F8FAFC',
    borderBottom: '1px solid #CBD5E1',
  },
  photoTh: {
    padding: '3px 5px',
    fontSize: '10px',
    fontWeight: 700,
    color: '#475569',
    textAlign: 'left',
  },
  photoTableTr: {
    borderBottom: '1px solid #F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  photoTd: {
    padding: '2px 5px',
    color: '#334155',
    verticalAlign: 'middle',
  },
  photoTdBold: {
    padding: '2px 5px',
    fontWeight: 700,
    color: '#0F172A',
    verticalAlign: 'middle',
  },
  photoTableEmptyTd: {
    padding: '6px 5px',
    textAlign: 'center',
    color: '#94A3B8',
    fontStyle: 'italic',
    fontSize: '10px',
  },
  photoRowDeleteBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '1px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoDueDisplay: {
    width: '100%',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    padding: '0 6px',
    fontSize: '11px',
    fontWeight: 800,
    backgroundColor: '#FEF3C7',
    border: '1px solid #FCD34D',
    borderRadius: '3px',
    color: '#B45309',
    boxSizing: 'border-box',
  },
  photoBillingDueBar: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '6px',
    padding: '3px 6px',
    backgroundColor: '#FFFBEB',
    border: '1px dashed #FCD34D',
    borderRadius: '3px',
    marginBottom: '4px',
  },
  photoBillingTagRed: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    backgroundColor: '#FEE2E2',
    border: '1px solid #FCA5A5',
    color: '#B91C1C',
    borderRadius: '3px',
    padding: '1px 6px',
    fontSize: '10px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  photoBillingTagAmber: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    backgroundColor: '#FEF3C7',
    border: '1px solid #FCD34D',
    color: '#92400E',
    borderRadius: '3px',
    padding: '1px 6px',
    fontSize: '10px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  photoBillingTagGreen: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    backgroundColor: '#DCFCE7',
    border: '1px solid #86EFAC',
    color: '#15803D',
    borderRadius: '3px',
    padding: '1px 6px',
    fontSize: '10px',
    fontWeight: 700,
  },
  photoEditingBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    backgroundColor: '#FEF3C7',
    border: '1px solid #FCD34D',
    color: '#92400E',
    borderRadius: '3px',
    padding: '1px 6px',
    fontSize: '10px',
    fontWeight: 700,
  },
  photoCancelEditBtn: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #FCD34D',
    borderRadius: '3px',
    color: '#92400E',
    fontSize: '10px',
    fontWeight: 700,
    padding: '1px 6px',
    cursor: 'pointer',
  },
  photoDietaryDropdown: {
    position: 'absolute',
    top: 'calc(100% + 2px)',
    left: 0,
    width: '320px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #16A34A',
    borderRadius: '4px',
    boxShadow: '0 8px 20px rgba(0,0,0,0.18)',
    maxHeight: '200px',
    overflowY: 'auto',
    zIndex: 999999,
    padding: '3px 0',
    listStyle: 'none',
    margin: 0,
  },
  photoDietaryDropdownItem: {
    padding: '5px 8px',
    fontSize: '11px',
    cursor: 'pointer',
    borderBottom: '1px solid #F1F5F9',
  },
  photoDietaryChipsRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '4px',
    padding: '2px 0',
  },
  photoDietaryChipBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    border: '1px solid #86EFAC',
    borderRadius: '3px',
    padding: '1px 5px',
    fontSize: '10px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  photoBottomActionsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '2px',
  },
  photoSaveActionBtn: {
    flex: 1,
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    backgroundColor: '#E0F2FE',
    color: '#0369A1',
    border: '1px solid #0284C7',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  photoSavePrintActionBtn: {
    flex: 1.4,
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    backgroundColor: '#EDE9FE',
    color: '#4338CA',
    border: '1px solid #6366F1',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
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

  searchAnotherPatientBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: 'var(--surface-alt)',
    border: '1px solid var(--border)',
    color: 'var(--primary)',
    fontSize: '11px',
    fontWeight: 700,
    padding: '4px 8px',
    borderRadius: '5px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },

  searchLandingHero: {
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: '10px',
    textAlign: 'center',
    boxShadow: 'var(--shadow-sm)',
    flex: 1,
    overflowY: 'auto',
  },
  searchLandingIconCircle: {
    width: '58px',
    height: '58px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary-soft)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '2px',
  },
  searchLandingTitle: {
    fontSize: '17px',
    fontWeight: 800,
    color: 'var(--text)',
    letterSpacing: '-0.02em',
    margin: 0,
  },
  searchLandingSubtitle: {
    fontSize: '12.5px',
    color: 'var(--text-muted)',
    maxWidth: '520px',
    margin: 0,
    lineHeight: 1.4,
  },
  quickSearchHintBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: 'var(--surface-alt)',
    border: '1.5px dashed var(--primary)',
    borderRadius: '8px',
    padding: '9px 16px',
    cursor: 'pointer',
    marginTop: '4px',
    maxWidth: '560px',
    width: '100%',
    transition: 'all 0.15s ease',
  },
  quickSearchHintText: {
    fontSize: '12px',
    color: 'var(--primary-dark)',
    fontWeight: 600,
    flex: 1,
    textAlign: 'left',
  },
  searchKeyPill: {
    fontSize: '10.5px',
    fontWeight: 700,
    backgroundColor: 'var(--primary)',
    color: '#FFFFFF',
    padding: '2px 8px',
    borderRadius: '4px',
    letterSpacing: '0.4px',
  },
  recentPatientsSection: {
    width: '100%',
    maxWidth: '820px',
    marginTop: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  recentSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 2px',
    flexWrap: 'wrap',
    gap: '4px',
  },
  recentSectionTitle: {
    fontSize: '11.5px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: 'var(--text)',
  },
  recentCountBadge: {
    fontSize: '10px',
    fontWeight: 700,
    color: 'var(--primary)',
    backgroundColor: 'var(--primary-soft)',
    padding: '2px 7px',
    borderRadius: '10px',
    border: '1px solid rgba(20, 107, 92, 0.2)',
  },
  searchedPill: {
    fontSize: '9px',
    fontWeight: 700,
    color: '#059669',
    backgroundColor: '#ECFDF5',
    padding: '1px 5px',
    borderRadius: '4px',
    border: '1px solid #A7F3D0',
    flexShrink: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  recentSectionSub: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  recentPatientsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '8px',
  },
  recentPatientCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border)',
    borderRadius: '7px',
    padding: '9px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
  },
  recentPatientCardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentPatientName: {
    fontSize: '12.5px',
    fontWeight: 700,
    color: 'var(--text)',
  },
  recentPatientPid: {
    fontSize: '10px',
    fontWeight: 700,
    backgroundColor: 'var(--surface-alt)',
    padding: '1px 5px',
    borderRadius: '4px',
    color: 'var(--primary)',
  },
  recentPatientCardMeta: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  recentPatientStartBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '10.5px',
    fontWeight: 700,
    color: 'var(--primary)',
    marginTop: '2px',
  },
  newPatientRegisterFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '12px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  newPatientPromptText: {
    fontSize: '11.5px',
    color: 'var(--text-muted)',
  },
  registerNewMemberHeroBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'var(--primary)',
    color: '#FFFFFF',
    padding: '5px 12px',
    borderRadius: '6px',
    fontSize: '11.5px',
    fontWeight: 700,
    cursor: 'pointer',
    border: 'none',
    boxShadow: '0 2px 6px rgba(20, 107, 92, 0.25)',
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
    minWidth: '360px',
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
    gap: '8px',
    paddingTop: '2px',
    borderTop: '1px dashed #E5CDAF',
    position: 'relative',
    zIndex: 5,
    overflow: 'visible',
  },
  halfSectionBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    padding: '4px 6px',
    borderRadius: '4px',
    border: '1px solid #F1DAC2',
    minWidth: 0,
    position: 'relative',
    overflow: 'visible',
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
    gap: '6px',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    position: 'relative',
    zIndex: 15,
    overflow: 'visible',
  },
  fieldCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    minWidth: 0,
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
    gap: '4px',
    alignItems: 'center',
    flexWrap: 'nowrap',
    minWidth: 0,
    width: '100%',
    position: 'relative',
    overflow: 'visible',
  },
  prescriptionRow: {
    display: 'flex',
    gap: '3px',
    alignItems: 'center',
    flexWrap: 'nowrap',
    minWidth: 0,
    width: '100%',
    position: 'relative',
    overflow: 'visible',
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
    padding: '0 1px',
    fontSize: '11px',
    textAlign: 'center',
    fontWeight: 600,
    color: 'var(--text)',
  },
  timingRadioGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    backgroundColor: '#FFFFFF',
    height: '24px',
    border: '1px solid #D6C2AC',
    borderRadius: '4px',
    padding: '0 4px',
    flexShrink: 0,
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
    flexShrink: 0,
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
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
    paddingTop: '4px',
    borderTop: '1px solid #EAD2B8',
    position: 'relative',
    zIndex: 1,
  },
  billingInputsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'nowrap',
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
  shortcutPill: {
    fontSize: '10px',
    fontWeight: 700,
    backgroundColor: '#EEF2F6',
    color: '#475569',
    padding: '1px 5px',
    borderRadius: '4px',
    marginLeft: '4px',
    border: '1px solid #CBD5E1',
  },
  shortcutPillLight: {
    fontSize: '10px',
    fontWeight: 700,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    color: '#FFFFFF',
    padding: '1px 5px',
    borderRadius: '4px',
    marginLeft: '4px',
    border: '1px solid rgba(255, 255, 255, 0.35)',
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
    minHeight: 0,
    flex: 1,
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
    backgroundColor: '#D4D8DC',
    border: '1px solid #CBD5E1',
    borderRadius: '3px',
    padding: '3px 8px',
    margin: '4px 0 6px 0',
    textAlign: 'center',
    fontSize: '10.5px',
    fontStyle: 'italic',
    fontWeight: '600',
    color: '#1E293B',
    letterSpacing: '0.2px',
  },
  letterpadForDateRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    padding: '3px 0 5px 0',
    position: 'relative',
    zIndex: 1,
  },
  photoPatientInfoBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    margin: '3px 0 5px 0',
    position: 'relative',
    zIndex: 1,
  },
  photoPatientInfoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    fontSize: '12px',
    color: '#000000',
  },
  photoPatientColLeft: {
    width: '58%',
    display: 'flex',
    alignItems: 'baseline',
    gap: '4px',
  },
  photoPatientColRight: {
    width: '42%',
    display: 'flex',
    alignItems: 'baseline',
    gap: '4px',
  },
  photoPatientLabel: {
    fontWeight: 700,
    fontSize: '12px',
    color: '#000000',
  },
  photoPatientValue: {
    fontWeight: 600,
    fontSize: '12px',
    color: '#000000',
  },
  photoPatientValueBold: {
    fontWeight: 800,
    fontSize: '12.5px',
    color: '#000000',
    textTransform: 'uppercase',
  },
  photoBlackDivider: {
    height: '1px',
    backgroundColor: '#000000',
    width: '100%',
    margin: '3px 0 5px 0',
    position: 'relative',
    zIndex: 1,
  },
  photoRxRow: {
    display: 'flex',
    alignItems: 'center',
    margin: '1px 0 3px 0',
    position: 'relative',
    zIndex: 1,
  },
  photoRxSymbol: {
    fontSize: '22px',
    fontWeight: 900,
    fontFamily: 'serif',
    color: '#000000',
    lineHeight: 1,
  },
  photoRxTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '11px',
    color: '#000000',
    position: 'relative',
    zIndex: 1,
  },
  photoRxTh: {
    padding: '4px 6px',
    color: '#000000',
    fontWeight: 700,
    fontSize: '11px',
    borderBottom: '1.5px solid #000000',
  },
  photoRxTr: {
    borderBottom: '1px solid #E2E8F0',
  },
  photoRxTdMedName: {
    padding: '7px 6px',
    fontSize: '12px',
    fontWeight: 800,
    color: '#000000',
    textTransform: 'uppercase',
    verticalAlign: 'middle',
  },
  photoRxTdQty: {
    padding: '7px 6px',
    fontSize: '12px',
    fontWeight: 800,
    color: '#000000',
    textAlign: 'center',
    verticalAlign: 'middle',
  },
  photoRxTdDose: {
    padding: '5px 4px',
    textAlign: 'center',
    verticalAlign: 'middle',
  },
  photoDoseMiniTable: {
    borderCollapse: 'collapse',
    border: '1px solid #000000',
    margin: '0 auto',
    fontSize: '9px',
    backgroundColor: '#FFFFFF',
  },
  photoDoseMiniTh: {
    padding: '1px 5px',
    borderRight: '1px solid #000000',
    borderBottom: '1px solid #000000',
    fontWeight: 600,
    fontSize: '9px',
    color: '#000000',
    textAlign: 'center',
    whiteSpace: 'nowrap',
  },
  photoDoseMiniTd: {
    padding: '2px 5px',
    borderRight: '1px solid #000000',
    textAlign: 'center',
    fontWeight: 800,
    fontSize: '10px',
    color: '#000000',
    minWidth: '22px',
    height: '14px',
  },
  photoDashText: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#000000',
  },
  photoRxTdInstruction: {
    padding: '7px 6px',
    fontSize: '11px',
    fontWeight: 700,
    color: '#000000',
    verticalAlign: 'middle',
  },
  photoAdviceBox: {
    border: '1px solid #000000',
    borderRadius: '4px',
    padding: '6px 10px',
    marginTop: '10px',
    marginBottom: '8px',
    fontSize: '11px',
    lineHeight: 1.45,
    backgroundColor: '#FFFFFF',
    position: 'relative',
    zIndex: 1,
  },
  photoAdviceTitle: {
    fontWeight: 800,
    textDecoration: 'underline',
    color: '#000000',
  },
  photoAdviceText: {
    fontWeight: 700,
    color: '#000000',
  },
  photoFooterDivider: {
    height: '1px',
    backgroundColor: '#CBD5E1',
    width: '100%',
    margin: '12px 0 6px 0',
    position: 'relative',
    zIndex: 1,
  },
  photoPharmacyBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '4px 0',
    position: 'relative',
    zIndex: 1,
  },
  photoPharmacyPlus: {
    fontSize: '18px',
    fontWeight: 900,
    color: '#0F172A',
    lineHeight: 1,
  },
  photoPharmacyText: {
    fontSize: '15px',
    fontWeight: 800,
    fontStyle: 'italic',
    color: '#0B63AC',
    letterSpacing: '0.4px',
    fontFamily: "'Segoe UI', -apple-system, sans-serif",
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
  letterpadClinicalBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    padding: '4px 0 6px 0',
    borderBottom: '1px solid #94A3B8',
    marginBottom: '8px',
    position: 'relative',
    zIndex: 1,
  },
  letterpadClinicalRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '20px',
    flexWrap: 'wrap',
  },
  letterpadVitalsItem: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px',
    minWidth: '100px',
  },
  clinicalHeaderLabel: {
    fontSize: '11px',
    fontWeight: 900,
    color: '#000000',
    letterSpacing: '0.4px',
    textTransform: 'uppercase',
  },
  clinicalValueUnderline: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#0F172A',
    borderBottom: '1px dashed #64748B',
    paddingBottom: '1px',
    minWidth: '40px',
  },
  letterpadTreatmentsComplaintsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
    marginTop: '2px',
  },
  letterpadTreatmentGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  letterpadTBox: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1.5px solid #000000',
    borderRadius: '3px',
    fontWeight: 900,
    fontSize: '11px',
    padding: '0 4px',
    height: '18px',
    backgroundColor: '#F8FAFC',
    color: '#000000',
    lineHeight: 1,
    letterSpacing: '0.5px',
  },
  letterpadTreatmentText: {
    fontSize: '11.5px',
    fontWeight: 700,
    color: '#0F172A',
  },
  letterpadComplaintGroup: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '4px',
  },
  complaintBulletPoint: {
    fontSize: '14px',
    fontWeight: 900,
    color: '#000000',
    lineHeight: 1,
  },
  complaintTitleLabel: {
    fontSize: '11px',
    fontWeight: 900,
    color: '#000000',
    letterSpacing: '0.3px',
    textTransform: 'uppercase',
  },
  complaintTextValue: {
    fontSize: '11.5px',
    fontWeight: 700,
    color: '#0F172A',
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
