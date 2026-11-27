import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { visitAPI, patientAPI } from '../services/api';
import { useDebounce } from '../hooks/useDebounce';
import { extractLabAlerts } from '../utils/labReportConfig';
import { PRINT_LANGUAGES, PRINT_TRANSLATIONS } from '../utils/printTranslations';
import {
  Search,
  Calendar,
  RefreshCw,
  Plus,
  FilePlus,
  Pencil,
  Printer,
  Trash2,
  Lock,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  ShieldAlert,
  ArrowRight,
  Filter,
  Languages,
} from 'lucide-react';

// In-memory cache for ultra-fast instant tab switching
let recentVisitsCache = null;
export const clearRecentVisitsCache = () => {
  recentVisitsCache = null;
};

export const RecentHistory = ({
  onNavigateToNewCase,
  onNavigateToEditCase,
  onNavigateToAddPatient,
}) => {
  const { doctor } = useAuth();
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 900 : false));
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const [visits, setVisits] = useState(() => recentVisitsCache || []);
  const [loading, setLoading] = useState(() => !recentVisitsCache);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 120);
  const [selectedPeriod, setSelectedPeriod] = useState('all'); // 'today' | 'yesterday' | 'all' | 'custom'
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  });

  // Toast feedback state
  const [toast, setToast] = useState({ show: false, text: '', type: 'success' });
  const showToast = (text, type = 'success') => {
    setToast({ show: true, text, type });
    setTimeout(() => setToast({ show: false, text: '', type: 'success' }), 3500);
  };

  // Password Deletion Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [visitToDelete, setVisitToDelete] = useState(null);
  const [doctorPassword, setDoctorPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const passwordInputRef = useRef(null);

  // Print Prescription Modal State & Stationery Mode
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [visitToPrint, setVisitToPrint] = useState(null);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [printLanguage, setPrintLanguage] = useState(() => {
    try {
      return localStorage.getItem('cms_print_language') || 'gu';
    } catch (e) {
      return 'gu';
    }
  });
  const [languageHighlightIndex, setLanguageHighlightIndex] = useState(0);
  const languageHighlightIndexRef = useRef(0);
  const [printMode, setPrintMode] = useState(() => {
    try {
      return localStorage.getItem('cms_print_mode') || 'padOnly';
    } catch (e) {
      return 'padOnly';
    }
  });

  const handlePrintModeChange = (mode) => {
    setPrintMode(mode);
    try {
      localStorage.setItem('cms_print_mode', mode);
    } catch (e) {}
  };

  // Fetch recent visits (instant cache + background sync)
  const fetchRecentVisits = async () => {
    try {
      if (!recentVisitsCache) {
        setLoading(true);
      }
      const params = {
        search: debouncedSearch.trim(),
        period: selectedPeriod,
        limit: 150,
      };
      if (selectedPeriod === 'custom' && selectedDate) {
        params.date = selectedDate;
      }
      const res = await visitAPI.getRecent(params);
      if (res?.success) {
        const fetched = res.visits || [];
        setVisits(fetched);
        if (selectedPeriod === 'all' && !debouncedSearch.trim()) {
          recentVisitsCache = fetched;
        }
      }
    } catch (err) {
      console.error('Error fetching recent visits:', err);
      showToast('Error fetching recent records: ' + (err.message || 'Server error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Dedicated manual refresh handler ensuring cache clearance, instant spin, and user feedback
  const handleManualRefresh = async () => {
    recentVisitsCache = null;
    setLoading(true);
    try {
      const params = {
        search: (searchQuery || '').trim(),
        period: selectedPeriod,
        limit: 150,
      };
      if (selectedPeriod === 'custom' && selectedDate) {
        params.date = selectedDate;
      }
      const res = await visitAPI.getRecent(params);
      if (res?.success) {
        const fetched = res.visits || [];
        setVisits(fetched);
        if (selectedPeriod === 'all' && !searchQuery.trim()) {
          recentVisitsCache = fetched;
        }
        showToast('Recent history refreshed successfully', 'success');
      } else {
        showToast(res?.message || 'Failed to refresh records', 'error');
      }
    } catch (err) {
      console.error('Error refreshing visits:', err);
      showToast('Error refreshing records: ' + (err.message || 'Server error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentVisits();
  }, [debouncedSearch, selectedPeriod, selectedDate]);

  // Synchronize live with any visit saved, updated, or paid from anywhere in the application
  useEffect(() => {
    const handleLiveVisitSync = () => {
      recentVisitsCache = null;
      fetchRecentVisits();
    };
    window.addEventListener('cms_visit_saved', handleLiveVisitSync);
    window.addEventListener('cms_patient_deleted', handleLiveVisitSync);
    return () => {
      window.removeEventListener('cms_visit_saved', handleLiveVisitSync);
      window.removeEventListener('cms_patient_deleted', handleLiveVisitSync);
    };
  }, [debouncedSearch, selectedPeriod, selectedDate]);

  // Instant synchronous in-memory filter across loaded visits with latest edited cases ranked at the top
  const displayedVisits = useMemo(() => {
    let list = visits;
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = visits.filter((v) => {
        const pName = (v.patientName || '').toLowerCase();
        const pId = (v.patientId || '').toLowerCase();
        const fId = (v.familyId || '').toLowerCase();
        const comp = (v.complaint || '').toLowerCase();
        const phone = String(v.phone || '').toLowerCase();
        const area = (v.area || '').toLowerCase();
        return (
          pName.includes(q) ||
          pId.includes(q) ||
          fId.includes(q) ||
          comp.includes(q) ||
          phone.includes(q) ||
          area.includes(q)
        );
      });
    }

    // Sort strictly by visitDate descending (latest date first -> oldest at the end), then createdAt descending
    const getDateKey = (v) => {
      const raw = String(v.visitDate || '').trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
      if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) {
        const [dd, mm, yyyy] = raw.split('-');
        return `${yyyy}-${mm}-${dd}`;
      }
      const d = new Date(v.visitDate || v.createdAt || 0);
      return isNaN(d.getTime()) ? '0000-00-00' : d.toISOString().split('T')[0];
    };

    const sorted = [...list].sort((a, b) => {
      const aDate = getDateKey(a);
      const bDate = getDateKey(b);
      if (bDate !== aDate) return bDate.localeCompare(aDate);
      const aTime = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const bTime = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return bTime - aTime;
    });

    // Return all case entries so all patient visits are shown in Recent History
    const uniqueVisits = [];
    const seenIds = new Set();
    for (const v of sorted) {
      const idKey = String(v._id || v.id);
      if (seenIds.has(idKey)) {
        continue;
      }
      seenIds.add(idKey);
      uniqueVisits.push(v);
    }

    return uniqueVisits;
  }, [visits, searchQuery]);

  // Keyboard accessibility for modals in Recent History (Enter to print, Esc to close)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showLanguageModal) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          e.stopPropagation();
          setLanguageHighlightIndex((prev) => {
            const next = (prev + 1) % PRINT_LANGUAGES.length;
            languageHighlightIndexRef.current = next;
            return next;
          });
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          e.stopPropagation();
          setLanguageHighlightIndex((prev) => {
            const next = (prev - 1 + PRINT_LANGUAGES.length) % PRINT_LANGUAGES.length;
            languageHighlightIndexRef.current = next;
            return next;
          });
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          const chosen = PRINT_LANGUAGES[languageHighlightIndexRef.current] || PRINT_LANGUAGES[0];
          if (chosen) triggerPrintInLanguage(chosen.key, true);
          return;
        }
        if (e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          e.stopPropagation();
          const chosen = PRINT_LANGUAGES[languageHighlightIndexRef.current] || PRINT_LANGUAGES[0];
          if (chosen) triggerPrintInLanguage(chosen.key, false);
          return;
        }
        if (e.key === '1' || e.key === '2' || e.key === '3') {
          e.preventDefault();
          e.stopPropagation();
          const idx = parseInt(e.key, 10) - 1;
          const chosen = PRINT_LANGUAGES[idx];
          if (chosen) triggerPrintInLanguage(chosen.key, true);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          setShowLanguageModal(false);
          return;
        }
        return;
      }

      if (printModalOpen) {
        if (e.key === 'Enter') {
          e.preventDefault();
          window.print();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setPrintModalOpen(false);
        }
      } else if (deleteModalOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setDeleteModalOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLanguageModal, printModalOpen, deleteModalOpen]);

  // Handle open delete modal
  const handleOpenDelete = (visit) => {
    setVisitToDelete(visit);
    setDoctorPassword('');
    setPasswordError('');
    setDeleteModalOpen(true);
    setTimeout(() => {
      if (passwordInputRef.current) {
        passwordInputRef.current.focus();
      }
    }, 100);
  };

  // Confirm delete with password
  const handleConfirmDelete = async (e) => {
    if (e) e.preventDefault();
    if (!doctorPassword.trim()) {
      setPasswordError('Please enter your doctor password.');
      return;
    }
    try {
      setIsDeleting(true);
      setPasswordError('');
      const res = await visitAPI.deleteWithPassword(visitToDelete._id, doctorPassword);
      if (res?.success) {
        showToast('Visit record deleted successfully', 'success');
        setDeleteModalOpen(false);
        setVisitToDelete(null);
        setDoctorPassword('');
        fetchRecentVisits();
      } else {
        setPasswordError(res?.message || 'Incorrect doctor password. Deletion denied.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Incorrect password. Deletion denied.';
      setPasswordError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Action 1: New Case Entry (Immediate zero-delay navigation)
  const handleActionNewCase = (visit) => {
    if (onNavigateToNewCase) {
      onNavigateToNewCase({
        patientId: visit.patientId,
        familyId: visit.familyId,
        name: visit.patientName,
        phone: visit.phone || '',
        area: visit.area || '',
      });
    }
  };

  // Handle Action 2: Edit Case (Immediate zero-delay navigation)
  const handleActionEditCase = (visit) => {
    if (onNavigateToEditCase) {
      onNavigateToEditCase(visit);
    }
  };

  // Handle Action 3: Print
  const handleActionPrint = (visit) => {
    setVisitToPrint(visit);
    const idx = PRINT_LANGUAGES.findIndex((l) => l.key === printLanguage);
    const startIdx = idx >= 0 ? idx : 0;
    setLanguageHighlightIndex(startIdx);
    languageHighlightIndexRef.current = startIdx;
    setShowLanguageModal(true);
  };

  const triggerPrintInLanguage = (langKey, autoTrigger = true) => {
    setPrintLanguage(langKey);
    try {
      localStorage.setItem('cms_print_language', langKey);
    } catch (e) {}
    setShowLanguageModal(false);
    setPrintModalOpen(true);
    if (autoTrigger) {
      setTimeout(() => {
        window.print();
      }, 180);
    }
  };

  // Helper: Format Date & Time consistently and extract edited date/time
  const formatDateTime = (visit) => {
    // 1. Visit Date: format clean DD-MM-YYYY
    let rawDate = (visit.visitDate || '').split('T')[0].trim();
    let dateStr = '';
    if (rawDate && rawDate.includes('-')) {
      const parts = rawDate.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD -> DD-MM-YYYY
        } else {
          dateStr = rawDate;
        }
      } else {
        dateStr = rawDate;
      }
    } else if (visit.createdAt) {
      try {
        const cd = new Date(visit.createdAt);
        const pad = (n) => String(n).padStart(2, '0');
        dateStr = `${pad(cd.getDate())}-${pad(cd.getMonth() + 1)}-${cd.getFullYear()}`;
      } catch (e) {
        dateStr = '-';
      }
    } else {
      dateStr = '-';
    }

    // 2. Original Consultation Visit Time: derived strictly from createdAt
    let timeStr = '';
    const visitTimeSource = visit.createdAt || visit.visitDate;
    if (visitTimeSource) {
      try {
        const d = new Date(visitTimeSource);
        if (!isNaN(d.getTime())) {
          timeStr = d.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });
        }
      } catch (e) {}
    }
    if (!timeStr) {
      timeStr = '-';
    }

    // 3. Edited Status and Edited Date/Time
    const isEdited = Boolean(
      visit.isEdited ||
      (visit.updatedAt && visit.createdAt && new Date(visit.updatedAt).getTime() - new Date(visit.createdAt).getTime() > 2000)
    );

    let editedDateStr = '';
    let editedTimeStr = '';
    if (isEdited) {
      const editSource = visit.editedAt || visit.updatedAt;
      if (editSource) {
        try {
          const ed = new Date(editSource);
          if (!isNaN(ed.getTime())) {
            const pad = (n) => String(n).padStart(2, '0');
            editedDateStr = `${pad(ed.getDate())}-${pad(ed.getMonth() + 1)}-${ed.getFullYear()}`;
            editedTimeStr = ed.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            });
          }
        } catch (e) {}
      }
    }

    return {
      dateStr,
      timeStr,
      isEdited,
      editedDateStr,
      editedTimeStr,
    };
  };

  // Helper: Generate Alert Badges (Strictly Lab Investigations & Attached Lab Reports - No Emojis)
  const getLabAlerts = (visit) => {
    const alerts = [];

    // Lab Investigations & Radiology (e.g. 'CBC', 'WIDAL', 'URINE RM', 'X-RAY', 'USG')
    if (visit.investigation && visit.investigation.trim()) {
      const items = visit.investigation.split(',').map((i) => i.trim()).filter(Boolean);
      items.forEach((item) => {
        const upper = item.toUpperCase();
        const hasStar = upper.includes('*');
        if (hasStar) {
          alerts.push({
            type: 'lab',
            text: upper,
            variant: 'red',
          });
        } else if (
          upper.includes('XRAY') ||
          upper.includes('X-RAY') ||
          upper.includes('USG') ||
          upper.includes('CT') ||
          upper.includes('MRI') ||
          upper.includes('SONO') ||
          upper.includes('ECG')
        ) {
          alerts.push({
            type: 'radiology',
            text: upper,
            variant: 'blue',
          });
        } else {
          alerts.push({
            type: 'lab',
            text: upper,
            variant: 'purple',
          });
        }
      });
    }

    // Attached Lab Report - Comprehensive out-of-range & '*' danger parameter highlighting
    const rep = visit.labReport;
    if (rep && typeof rep === 'object') {
      alerts.push(...extractLabAlerts(rep));

      // Special Findings (e.g. Urine, USG, X-RAY, CT/MRI, OTHERS)
      if (rep.findings && typeof rep.findings === 'object') {
        Object.entries(rep.findings).forEach(([k, notes]) => {
          const nStr = String(notes || '').trim();
          if (!nStr) return;
          const lower = nStr.toLowerCase();
          if (
            nStr.includes('*') ||
            lower.includes('pos') ||
            lower.includes('abnorm') ||
            lower.includes('stone') ||
            lower.includes('infect')
          ) {
            alerts.push({ type: 'lab', text: `${k.toUpperCase()}: ${nStr.slice(0, 28)}`, variant: 'red' });
          }
        });
      }

      // Legacy Special Findings (e.g. Widal, Dengue, Urine, USG, Radiology)
      if (Array.isArray(rep.specialFindings)) {
        rep.specialFindings.forEach((sf) => {
          if (sf && sf.notes && String(sf.notes).trim() !== '') {
            const nStr = String(sf.notes).trim();
            const lower = nStr.toLowerCase();
            const isNormal = ['normal', 'negative', 'non-reactive', 'nil', 'not seen', 'absent', 'clear', 'wnl', 'nad'].includes(lower);
            const isAbnormal =
              nStr.includes('*') ||
              lower.includes('pos') ||
              lower.includes('react') ||
              lower.includes('abnormal') ||
              lower.includes('high') ||
              lower.includes('low') ||
              lower.includes('present') ||
              lower.includes('+');

            if (isAbnormal || (!isNormal && nStr.length > 0)) {
              alerts.push({ type: 'lab', text: `${sf.title || 'Finding'}: ${nStr}`, variant: 'red' });
            }
          }
        });
      }
    }

    // Custom investigationList entries from Patient Record
    if (Array.isArray(visit.investigationList)) {
      visit.investigationList.forEach((inv) => {
        if (inv && (inv.testName || inv.name)) {
          const name = (inv.testName || inv.name || '').trim();
          const res = inv.result ? String(inv.result).trim() : '';
          const isAbnormal = inv.isAbnormal || res.includes('*');
          if (isAbnormal) {
            alerts.push({ type: 'lab', text: `${name}: ${res || 'Abnormal'}`, variant: 'red' });
          }
        }
      });
    }

    return alerts;
  };

  return (
    <div style={styles.container}>
      {/* Toast Notification */}
      {toast.show && (
        <div
          style={{
            ...styles.toast,
            backgroundColor: toast.type === 'error' ? '#EF4444' : '#10B981',
          }}
        >
          {toast.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* TOP HEADER: Universal Patient Search / Filter Bar */}
      <div style={{ ...styles.topBar, ...(isMobile ? { flexDirection: 'column', alignItems: 'stretch', gap: '8px' } : {}) }}>
        <div style={styles.titleSection}>
          <div style={styles.titleIconBadge}>
            <Clock size={18} color="#0D5C4E" />
          </div>
          <div>
            <h1 style={{ ...styles.heading, ...(isMobile ? { fontSize: '15px' } : {}) }}>Recent History / Case Ledger</h1>
            <span style={styles.subHeading}>
              Live chronological patient OPD records, lab alerts & financial status
            </span>
          </div>
        </div>

        {/* Filter Pills: Today, Yesterday, All, Custom */}
        <div style={{ ...styles.filterPillTrack, ...(isMobile ? { flexWrap: 'wrap', width: '100%' } : {}) }}>
          {[
            { key: 'today', label: 'Today' },
            { key: 'yesterday', label: 'Yesterday' },
            { key: 'all', label: 'All Records' },
            { key: 'custom', label: 'Custom Date' },
          ].map((item) => {
            const isSelected = selectedPeriod === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setSelectedPeriod(item.key)}
                style={{
                  ...styles.filterPill,
                  backgroundColor: isSelected ? '#0D5C4E' : 'transparent',
                  color: isSelected ? '#FFFFFF' : '#475569',
                  fontWeight: isSelected ? '600' : '500',
                  boxShadow: isSelected ? '0 1px 4px rgba(13, 92, 78, 0.25)' : 'none',
                }}
              >
                {item.label}
              </button>
            );
          })}

          {selectedPeriod === 'custom' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={styles.customDateInput}
            />
          )}
        </div>
      </div>

      {/* SEARCH STRIP MATCHING USER PHOTO */}
      <div style={{ ...styles.searchStrip, ...(isMobile ? { flexDirection: 'column', alignItems: 'stretch', gap: '8px' } : {}) }}>
        <div style={{ ...styles.searchInputWrap, ...(isMobile ? { width: '100%', maxWidth: '100%', minWidth: 0 } : {}) }}>
          <Search size={16} color="#64748B" style={styles.searchIcon} />
          <input
            type="text"
            placeholder="SEARCH BY NAME, MOBILE, FAMILY ID, ADDRESS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                const matched = visits.find(
                  (v) =>
                    v.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    v.patientId?.toLowerCase().includes(searchQuery.toLowerCase())
                );
                if (matched) {
                  handleActionNewCase(matched);
                } else {
                  // Patient not found in recent history: auto-open Patient Record with searched name
                  const newName = searchQuery.trim().toUpperCase();
                  if (onNavigateToNewCase) {
                    onNavigateToNewCase({
                      name: newName,
                      patientId: 'NEW',
                      familyId: 'NEW',
                      isNewPatient: true,
                      totalDue: 0,
                      deposit: 0,
                    });
                  }
                }
              }
            }}
            style={styles.searchInput}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={styles.clearSearchBtn}
              title="Clear search"
            >
              <X size={14} color="#64748B" />
            </button>
          )}
        </div>

        {/* Right Action: Record Count & Add Patient button */}
        <div style={{ ...styles.searchStripRight, ...(isMobile ? { flexWrap: 'wrap', justifyContent: 'space-between', width: '100%' } : {}) }}>
          <div style={styles.recordCountBadge}>
            {loading ? 'Loading...' : `${displayedVisits.length} Cases Found`}
          </div>

          <button
            type="button"
            onClick={handleManualRefresh}
            style={styles.refreshBtn}
            title="Refresh recent visits"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const q = searchQuery.trim().toUpperCase();
              if (q) {
                if (onNavigateToNewCase) {
                  onNavigateToNewCase({
                    name: q,
                    patientId: 'NEW',
                    familyId: 'NEW',
                    isNewPatient: true,
                    totalDue: 0,
                    deposit: 0,
                  });
                } else if (onNavigateToAddPatient) {
                  onNavigateToAddPatient(q);
                }
              } else if (onNavigateToAddPatient) {
                onNavigateToAddPatient();
              }
            }}
            style={styles.addPatientBtn}
            title="Register new patient / Open Case Entry (Enter)"
          >
            <Plus size={15} />
            <span>ADD PATIENT (Enter)</span>
          </button>
        </div>
      </div>

      {/* MAIN VIEW: Mobile Scrollable Cards OR Desktop Table */}
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '12px' }}>
          {loading && displayedVisits.length === 0 ? (
            <div style={{ background: '#FFFFFF', borderRadius: '10px', padding: '24px', textAlign: 'center', color: '#64748B', border: '1px solid #E2E8F0' }}>
              Loading recent visits...
            </div>
          ) : displayedVisits.length === 0 ? (
            <div style={{ background: '#FFFFFF', borderRadius: '10px', padding: '24px', textAlign: 'center', color: '#64748B', border: '1px solid #E2E8F0' }}>
              No matching records found.
            </div>
          ) : (
            displayedVisits.map((visit, idx) => {
              const { dateStr, timeStr } = formatDateTime(visit);
              const isDueCollection = Boolean(
                (visit.reference && visit.reference.toUpperCase().includes('DUE COLLECTION')) ||
                (Number(visit.charge || 0) === 0 &&
                  Number(visit.received || 0) > 0 &&
                  (!visit.prescriptions || visit.prescriptions.length === 0) &&
                  (!visit.treatments || visit.treatments.length === 0))
              );
              const complaints = !isDueCollection && visit.complaint ? visit.complaint.toUpperCase() : '';
              let ipdList = [];
              if (!isDueCollection && visit.ipdDetails) {
                if (Array.isArray(visit.ipdDetails)) {
                  ipdList = visit.ipdDetails.map((i) => (typeof i === 'string' ? i.trim() : (i?.item || '').trim())).filter(Boolean);
                } else if (typeof visit.ipdDetails === 'string' && visit.ipdDetails.trim()) {
                  ipdList = visit.ipdDetails.split(',').map((s) => s.trim()).filter(Boolean);
                }
              }
              const clinicMeds = !isDueCollection && Array.isArray(visit.treatments) ? visit.treatments : [];
              const rxMeds = !isDueCollection && Array.isArray(visit.prescriptions) ? visit.prescriptions : [];
              const alerts = getLabAlerts(visit);
              const caseCharge = Number(visit.charge) || 0;
              const caseReceived = Number(visit.received) || 0;
              const caseDue = Math.max(0, caseCharge - caseReceived);
              const rawAllergies = visit.allergies || [];
              const allergiesList = (Array.isArray(rawAllergies) ? rawAllergies : [rawAllergies])
                .flatMap((a) => (typeof a === 'string' ? a.split(',') : [String(a || '')]))
                .map((a) => a.trim())
                .filter(Boolean);

              return (
                <div
                  key={visit._id || idx}
                  style={{
                    backgroundColor: isDueCollection ? '#F0FDF4' : '#FFFFFF',
                    border: '1.5px solid #CBD5E1',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '7px',
                  }}
                >
                  {/* Card Top: Patient Name + Date/Time + Charge/Due */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', wordBreak: 'break-word' }}>
                        {visit.patientName || 'PATIENT'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#0D5C4E', backgroundColor: '#E6F4F1', padding: '1px 6px', borderRadius: '4px' }}>
                          {dateStr}
                        </span>
                        <span style={styles.timeBadge}>{timeStr}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', flexShrink: 0 }}>
                      {isDueCollection ? (
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#065F46', backgroundColor: '#DCFCE7', border: '1px solid #6EE7B7', padding: '2px 7px', borderRadius: '5px' }}>
                          PAID ₹{caseReceived.toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <>
                          <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#0F172A', backgroundColor: '#F1F5F9', padding: '2px 7px', borderRadius: '5px' }}>
                            ₹{caseCharge.toLocaleString('en-IN')}
                          </span>
                          {caseDue > 0 && (
                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#B91C1C', backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', padding: '1px 7px', borderRadius: '5px' }}>
                              DUE ₹{caseDue.toLocaleString('en-IN')}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Allergy Pill */}
                  {allergiesList.length > 0 && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#FEE2E2', color: '#B91C1C', border: '1px solid #FCA5A5', padding: '3px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: 800, alignSelf: 'flex-start' }}>
                      <ShieldAlert size={12} color="#DC2626" />
                      <span>ALLERGY: {allergiesList.join(', ')}</span>
                    </div>
                  )}

                  {/* Clinical Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#1E293B', borderTop: '1px solid #F1F5F9', paddingTop: '6px' }}>
                    {complaints && (
                      <div><strong style={{ color: '#0F766E' }}>Complaints:</strong> {complaints}</div>
                    )}
                    {ipdList.length > 0 && (
                      <div><strong style={{ color: '#C2410C' }}>IPD:</strong> {ipdList.join(', ')}</div>
                    )}
                    {clinicMeds.length > 0 && (
                      <div>
                        <strong style={{ color: '#1D4ED8' }}>Clinic Med:</strong>{' '}
                        {clinicMeds.map((m) => `${m.item}${m.qty ? ` (${m.qty})` : ''}`).join(', ')}
                      </div>
                    )}
                    {rxMeds.length > 0 && (
                      <div>
                        <strong style={{ color: '#0D5C4E' }}>Rx:</strong>{' '}
                        {rxMeds.map((r) => `${r.medicine}${r.qty ? ` (${r.qty})` : ''}`).join(', ')}
                      </div>
                    )}
                    {alerts.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                        {alerts.map((al, aIdx) => (
                          <span key={aIdx} style={{ fontSize: '10.5px', fontWeight: 700, color: '#991B1B', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', padding: '1px 6px', borderRadius: '4px' }}>
                            {al.label}: {al.value}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Footer Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', borderTop: '1px solid #F1F5F9', paddingTop: '7px', marginTop: '2px' }}>
                    <button
                      type="button"
                      onClick={() => handleActionNewCase(visit)}
                      style={{ ...styles.btnNewCase, flex: 1, width: 'auto', gap: '4px', padding: '6px 8px', fontSize: '11px', fontWeight: 700, color: '#0284C7' }}
                    >
                      <FilePlus size={13} color="#0284C7" />
                      <span>Case</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleActionEditCase(visit)}
                      disabled={isDueCollection}
                      style={{ ...styles.btnEditCase, flex: 1, width: 'auto', gap: '4px', padding: '6px 8px', fontSize: '11px', fontWeight: 700, color: '#D97706', opacity: isDueCollection ? 0.35 : 1 }}
                    >
                      <Pencil size={13} color="#D97706" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleActionPrint(visit)}
                      style={{ ...styles.btnPrint, flex: 1, width: 'auto', gap: '4px', padding: '6px 8px', fontSize: '11px', fontWeight: 700, color: '#0F766E' }}
                    >
                      <Printer size={13} color="#0F766E" />
                      <span>Print</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenDelete(visit)}
                      style={{ ...styles.btnDelete, flex: 1, width: 'auto', gap: '4px', padding: '6px 8px', fontSize: '11px', fontWeight: 700, color: '#DC2626' }}
                    >
                      <Trash2 size={13} color="#DC2626" />
                      <span>Del</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
      /* MAIN TABLE CONTAINER MATCHING PHOTO */
      <div style={styles.tableCard}>
        <div style={styles.tableScroll}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={{ ...styles.th, width: '8%' }}>Date & Time</th>
                <th style={{ ...styles.th, width: '14%' }}>Patient Name</th>
                <th style={{ ...styles.th, width: '11%' }}>Complaints</th>
                <th style={{ ...styles.th, width: '9%' }}>IPD Detail</th>
                <th style={{ ...styles.th, width: '12%' }}>Clinic Med</th>
                <th style={{ ...styles.th, width: '15%' }}>Prescription</th>
                <th style={{ ...styles.th, width: '11%' }}>Lab Alerts</th>
                <th style={{ ...styles.th, width: '6%', textAlign: 'right' }}>Charged</th>
                <th style={{ ...styles.th, width: '6%', textAlign: 'right' }}>Due</th>
                <th style={{ ...styles.th, width: '8%', textAlign: 'center' }}>Act</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={styles.loadingCell}>
                    <div style={styles.spinner} />
                    <span>Loading recent history...</span>
                  </td>
                </tr>
              ) : displayedVisits.length === 0 ? (
                <tr>
                  <td colSpan={10} style={styles.emptyCell}>
                    <Clock size={28} color="#94A3B8" style={{ marginBottom: 6 }} />
                    <p style={{ margin: 0, fontWeight: 600, color: '#334155' }}>
                      No recent patient visits found
                    </p>
                    <span style={{ fontSize: '12px', color: '#64748B' }}>
                      Try selecting another date filter or clearing your search.
                    </span>
                  </td>
                </tr>
              ) : (
                displayedVisits.map((visit, idx) => {
                  const {
                    dateStr,
                    timeStr,
                    isEdited,
                    editedDateStr,
                    editedTimeStr,
                  } = formatDateTime(visit);
                  const isDueCollection = Boolean(
                    (visit.reference &&
                      visit.reference.toUpperCase().includes('DUE COLLECTION')) ||
                    (Number(visit.charge || 0) === 0 &&
                      Number(visit.received || 0) > 0 &&
                      (!visit.prescriptions || visit.prescriptions.length === 0) &&
                      (!visit.treatments || visit.treatments.length === 0))
                  );

                  // Format complaints
                  const complaints = isDueCollection
                    ? '-'
                    : visit.complaint
                    ? visit.complaint.toUpperCase()
                    : '-';

                  // Format IPD details
                  let ipdList = [];
                  if (!isDueCollection && visit.ipdDetails) {
                    if (Array.isArray(visit.ipdDetails)) {
                      ipdList = visit.ipdDetails
                        .map((i) => (typeof i === 'string' ? i.trim() : (i?.item || '').trim()))
                        .filter(Boolean);
                    } else if (typeof visit.ipdDetails === 'string' && visit.ipdDetails.trim()) {
                      ipdList = visit.ipdDetails.split(',').map((s) => s.trim()).filter(Boolean);
                    }
                  }

                  // Format Clinic Meds (treatments)
                  const clinicMeds =
                    !isDueCollection && Array.isArray(visit.treatments) && visit.treatments.length > 0
                      ? visit.treatments
                      : [];

                  // Format Prescriptions
                  const rxMeds =
                    !isDueCollection && Array.isArray(visit.prescriptions) && visit.prescriptions.length > 0
                      ? visit.prescriptions
                      : [];

                  // Lab Alerts
                  const alerts = getLabAlerts(visit);

                  // Case-specific charge, received, due, deposit for this particular case/visit ONLY
                  const caseCharge = Number(visit.charge) || 0;
                  const caseReceived = Number(visit.received) || 0;
                  const caseDue = Math.max(0, caseCharge - caseReceived);
                  const caseDeposit = Math.max(0, caseReceived - caseCharge);

                  // Extract known allergies for prominent highlight
                  const rawAllergies = visit.allergies || [];
                  const allergiesList = (Array.isArray(rawAllergies) ? rawAllergies : [rawAllergies])
                    .flatMap((a) => (typeof a === 'string' ? a.split(',') : [String(a || '')]))
                    .map((a) => a.trim())
                    .filter(Boolean);

                  const isEven = idx % 2 === 0;

                  return (
                    <tr
                      key={visit._id || idx}
                      style={{
                        ...styles.tr,
                        backgroundColor: isDueCollection
                          ? '#F0FDF4'
                          : isEven
                          ? '#FFFFFF'
                          : '#F8FAFC',
                      }}
                    >
                      {/* 1. Date & Time */}
                      <td style={styles.tdDateTime}>
                        <div style={styles.dateText}>{dateStr}</div>
                        <div style={{ marginTop: '2px' }}>
                          <span style={styles.timeBadge}>{timeStr}</span>
                        </div>
                      </td>

                      {/* 2. Patient Name & Highlighted Allergies Only */}
                      <td style={styles.tdPatient}>
                        <div style={styles.patientName}>{visit.patientName || 'PATIENT'}</div>
                        {isDueCollection && (
                          <div style={{ marginTop: '3px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                backgroundColor: '#ECFDF5',
                                color: '#065F46',
                                border: '1px solid #6EE7B7',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 800,
                                lineHeight: 1.25,
                                whiteSpace: 'normal',
                                wordBreak: 'break-word',
                                maxWidth: '100%',
                                boxSizing: 'border-box',
                              }}
                              title={`Due payment of ₹${visit.received || 0} collected`}
                            >
                              <CheckCircle2 size={11} color="#059669" style={{ flexShrink: 0 }} />
                              <span>DUE COLLECTED: ₹{(visit.received || 0).toLocaleString('en-IN')}</span>
                            </span>
                          </div>
                        )}
                        {allergiesList.length > 0 && (
                          <div
                            style={{
                              marginTop: '4px',
                              display: 'inline-flex',
                              alignItems: 'flex-start',
                              gap: '4px',
                              backgroundColor: '#FEE2E2',
                              color: '#B91C1C',
                              border: '1px solid #FCA5A5',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '700',
                              lineHeight: 1.25,
                              whiteSpace: 'normal',
                              wordBreak: 'break-word',
                              maxWidth: '100%',
                              boxSizing: 'border-box',
                            }}
                            title={`Known Allergies: ${allergiesList.join(', ')}`}
                          >
                            <ShieldAlert size={12} color="#DC2626" style={{ flexShrink: 0 }} />
                            <span>ALLERGY: {allergiesList.join(', ')}</span>
                          </div>
                        )}
                      </td>

                      {/* 3. Complaints */}
                      <td style={styles.tdComplaints}>
                        {isDueCollection ? (
                          <div
                            style={{
                              display: 'inline-flex',
                              flexDirection: 'column',
                              gap: '2px',
                              backgroundColor: '#DCFCE7',
                              border: '1px solid #86EFAC',
                              borderRadius: '5px',
                              padding: '4px 8px',
                            }}
                          >
                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#166534', letterSpacing: '0.2px' }}>
                              DUE COLLECTED: ₹{(visit.received || 0).toLocaleString('en-IN')}
                            </span>
                            <span style={{ fontSize: '10px', fontWeight: 600, color: '#15803D' }}>
                              {visit.reference || 'Payment Settled'}
                            </span>
                          </div>
                        ) : complaints === '-' ? (
                          <span style={styles.nilText}>-</span>
                        ) : (
                          <span style={styles.complaintText}>{complaints}</span>
                        )}
                      </td>

                      {/* 4. IPD Detail */}
                      <td style={styles.tdIpd}>
                        {ipdList.length === 0 ? (
                          <span style={styles.nilText}>-</span>
                        ) : (
                          <div style={styles.ipdBadgesList}>
                            {ipdList.map((item, ipdIdx) => (
                              <span key={ipdIdx} style={styles.ipdBadge}>
                                {item.toUpperCase()}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* 5. Clinic Med */}
                      <td style={styles.tdMeds}>
                        {clinicMeds.length === 0 ? (
                          <span style={styles.nilText}>-</span>
                        ) : (
                          <div style={styles.medsList}>
                            {clinicMeds.map((t, tIdx) => (
                              <div key={t._id || tIdx} style={styles.medItem}>
                                <span style={styles.bullet}>•</span>
                                <span style={styles.medName}>
                                  {t.item} {t.qty ? `(${t.qty})` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* 6. Prescription */}
                      <td style={styles.tdMeds}>
                        {isDueCollection ? (
                          <span style={{ fontSize: '11px', color: '#047857', fontWeight: 600 }}>
                            Due Payment Receipt
                          </span>
                        ) : rxMeds.length === 0 ? (
                          <span style={styles.nilText}>-</span>
                        ) : (
                          <div style={styles.medsList}>
                            {rxMeds.map((p, pIdx) => (
                              <div key={p._id || pIdx} style={styles.medItem}>
                                <span style={styles.bullet}>•</span>
                                <span style={styles.medName}>
                                  {p.medicine} {p.qty ? `(${p.qty})` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* 7. Lab Alerts (Out-of-range & '*' danger values only, no modal button) */}
                      <td style={styles.tdAlerts}>
                        {alerts.length === 0 ? (
                          <span style={styles.nilText}>-</span>
                        ) : (
                          <div style={styles.alertsList}>
                            {alerts.map((alt, aIdx) => {
                              let badgeStyle = styles.badgeRed;
                              if (alt.variant === 'blue') badgeStyle = styles.badgeBlue;
                              if (alt.variant === 'green') badgeStyle = styles.badgeGreen;
                              if (alt.variant === 'orange') badgeStyle = styles.badgeOrange;
                              if (alt.variant === 'purple') badgeStyle = styles.badgePurple;

                              return (
                                <span key={aIdx} style={badgeStyle}>
                                  {alt.text}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* 8. Charged (₹) */}
                      <td style={styles.tdCharged}>
                        <span style={styles.chargedText}>₹{visit.charge || 0}</span>
                      </td>

                      {/* 9. Due (₹) - Strictly for this particular case record */}
                      <td style={styles.tdDue}>
                        {isDueCollection ? (
                          <span
                            style={{
                              backgroundColor: '#DCFCE7',
                              color: '#166534',
                              border: '1px solid #86EFAC',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 800,
                              display: 'inline-block',
                              whiteSpace: 'nowrap',
                            }}
                            title={`Due Collected: ₹${visit.received || 0}`}
                          >
                            ₹{(visit.received || 0).toLocaleString('en-IN')} Paid
                          </span>
                        ) : caseDue > 0 ? (
                          <span
                            style={{
                              ...styles.dueText,
                              color: '#DC2626',
                              fontWeight: '700',
                            }}
                          >
                            ₹{caseDue}
                          </span>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '12px', fontWeight: '500' }}>
                            ₹0
                          </span>
                        )}
                      </td>

                      {/* 10. Act (4 Action Buttons side by side) */}
                      <td style={styles.tdAct}>
                        <div style={styles.actButtonGroup}>
                          {/* Button 1: New Case Entry (Blue) */}
                          <button
                            type="button"
                            onClick={() => handleActionNewCase(visit)}
                            style={styles.btnNewCase}
                            title="New Case Entry for this patient (Opens Patient Record)"
                          >
                            <FilePlus size={14} color="#0284C7" />
                          </button>

                          {/* Button 2: Edit Case (Amber) */}
                          <button
                            type="button"
                            onClick={() => handleActionEditCase(visit)}
                            disabled={isDueCollection}
                            style={{
                              ...styles.btnEditCase,
                              opacity: isDueCollection ? 0.35 : 1,
                              cursor: isDueCollection ? 'not-allowed' : 'pointer',
                            }}
                            title={
                              isDueCollection
                                ? 'Due collection record cannot be edited'
                                : 'Edit this clinical case record'
                            }
                          >
                            <Pencil size={14} color="#D97706" />
                          </button>

                          {/* Button 3: Print (Cyan/Teal) */}
                          <button
                            type="button"
                            onClick={() => handleActionPrint(visit)}
                            style={styles.btnPrint}
                            title="Print Prescription / Case Memo"
                          >
                            <Printer size={14} color="#0F766E" />
                          </button>

                          {/* Button 4: Delete (Red - Password Protected) */}
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(visit)}
                            style={styles.btnDelete}
                            title="Delete this visit record (Doctor Password Required)"
                          >
                            <Trash2 size={14} color="#DC2626" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* MODAL 1: DOCTOR PASSWORD AUTHENTICATION FOR DELETION */}
      {deleteModalOpen && visitToDelete && (
        <div style={styles.modalOverlay} onClick={() => setDeleteModalOpen(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeaderDanger}>
              <div style={styles.modalHeaderIconWrap}>
                <ShieldAlert size={22} color="#DC2626" />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={styles.modalHeading}>Doctor Password Required</h3>
                <span style={styles.modalSubheading}>
                  Delete Clinical Visit Record
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmDelete} style={styles.modalBody}>
              <div style={styles.deleteNoticeBox}>
                <p style={styles.noticeText}>
                  You are about to permanently delete the clinical visit record for:
                </p>
                <div style={styles.noticePatientInfo}>
                  <strong>{visitToDelete.patientName}</strong> ({visitToDelete.patientId})
                  <br />
                  <span style={{ fontSize: '11px', color: '#64748B' }}>
                    Date: {visitToDelete.visitDate} | Charged: ₹{visitToDelete.charge || 0} | Received: ₹{visitToDelete.received || 0}
                  </span>
                </div>
              </div>

              {passwordError && (
                <div style={styles.errorAlert}>
                  <AlertTriangle size={15} color="#DC2626" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>
                  <Lock size={13} style={{ marginRight: 4 }} />
                  Enter Doctor Password:
                </label>
                <input
                  ref={passwordInputRef}
                  type="password"
                  placeholder="Enter your doctor login password..."
                  value={doctorPassword}
                  onChange={(e) => {
                    setDoctorPassword(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  style={styles.passwordInput}
                  autoComplete="current-password"
                />
              </div>

              <div style={styles.modalActionsRow}>
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  style={styles.modalCancelBtn}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeleting || !doctorPassword.trim()}
                  style={styles.modalDeleteBtn}
                >
                  {isDeleting ? 'Verifying...' : 'Verify & Delete Visit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PRINT PRESCRIPTION PREVIEW */}
      {printModalOpen && visitToPrint && (
        <div style={styles.modalOverlay} onClick={() => setPrintModalOpen(false)}>
          <div style={styles.printModalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.printModalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Printer size={18} color="#0D5C4E" />
                <h3 style={styles.modalHeading}>Prescription Memo Preview</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => handlePrintModeChange('padOnly')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    backgroundColor: printMode === 'padOnly' ? '#0D5C4E' : '#F1F5F9',
                    color: printMode === 'padOnly' ? '#FFFFFF' : '#475569',
                    border: printMode === 'padOnly' ? '1px solid #0D5C4E' : '1px solid #CBD5E1',
                  }}
                  title="Default: Hides printed letterhead graphics so you can feed your physical clinic letterpad into the printer"
                >
                  Pad Only (Stationery)
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintModeChange('full')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    backgroundColor: printMode === 'full' ? '#0D5C4E' : '#F1F5F9',
                    color: printMode === 'full' ? '#FFFFFF' : '#475569',
                    border: printMode === 'full' ? '1px solid #0D5C4E' : '1px solid #CBD5E1',
                  }}
                  title="Prints full Dr. Chirag Paghdal letterhead with address, Caduceus watermark & medical store footer"
                >
                  Full Letterhead
                </button>
                <select
                  value={printLanguage}
                  onChange={(e) => {
                    const lang = e.target.value;
                    setPrintLanguage(lang);
                    try {
                      localStorage.setItem('cms_print_language', lang);
                    } catch (err) {}
                  }}
                  style={{
                    padding: '3px 6px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                    cursor: 'pointer',
                  }}
                  title="Change Prescription Language"
                >
                  <option value="gu">ગુજરાતી (Gujarati)</option>
                  <option value="hi">हिंदी (Hindi)</option>
                  <option value="en">English</option>
                </select>
                <button
                  type="button"
                  onClick={() => setPrintModalOpen(false)}
                  style={styles.modalCloseBtn}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {printMode === 'padOnly' && (
              <div
                className="no-print"
                style={{
                  margin: '8px 16px 0',
                  border: '1.5px dashed #CBD5E1',
                  borderRadius: '6px',
                  padding: '7px 12px',
                  backgroundColor: '#F8FAFC',
                  textAlign: 'center',
                  color: '#475569',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                📄 <strong>Pre-Printed Letterpad Mode Active</strong>: Doctor letterhead header & pharmacy footer are hidden from printing. Only Patient Details, Prescriptions & Advice will print onto your clinic stationery.
              </div>
            )}

            <div
              style={styles.printMemoSheet}
              id="printable-rx"
              className={printMode === 'padOnly' ? 'pad-only-mode' : 'full-pad-mode'}
            >
              {/* WATERMARK: DR. CHIRAG PAGHDAL SEAL */}
              <div
                className="letterpad-watermark"
                style={{
                  position: 'absolute',
                  top: '52%',
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
                    <path id="watermarkTopArcRH" d="M 45,150 A 105,105 0 0,1 255,150" fill="none" />
                    <path id="watermarkBottomArcRH" d="M 255,150 A 105,105 0 0,1 45,150" fill="none" />
                  </defs>
                  <circle cx="150" cy="150" r="138" fill="none" stroke="#0B63AC" strokeWidth="2.5" />
                  <circle cx="150" cy="150" r="128" fill="none" stroke="#0B63AC" strokeWidth="1" strokeDasharray="4 3" />
                  <circle cx="150" cy="150" r="86" fill="none" stroke="#0B63AC" strokeWidth="1.5" />
                  <text fill="#0B63AC" fontSize="13" fontWeight="900" letterSpacing="3.5" textAnchor="middle">
                    <textPath href="#watermarkTopArcRH" startOffset="50%">
                      DR. CHIRAG PAGHDAL
                    </textPath>
                  </text>
                  <text fill="#0B63AC" fontSize="12" fontWeight="800" letterSpacing="4" textAnchor="middle">
                    <textPath href="#watermarkBottomArcRH" startOffset="50%">
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

              {/* 1. DOCTOR LETTERPAD HEADER */}
              <div
                className="letterpad-preprinted-header rhLetterpadHeader"
                style={{
                  ...styles.rhLetterpadHeader,
                  display: printMode === 'padOnly' ? 'none' : 'block',
                }}
              >
                <div style={styles.rhHeaderTopRow}>
                  <div>
                    <div className="letterpadDocName" style={styles.rhDocName}>
                      {doctor?.name || 'Dr. Chirag Paghdal'}
                      <span className="letterpadDocDegree" style={styles.rhDocDegree}> ({doctor?.degree || 'B.H.M.S.'})</span>
                    </div>
                    <div className="letterpadDocSpecialty" style={styles.rhDocSpecialty}>
                      {doctor?.specialization?.includes('B.H.M.S') ? 'FAMILY PHYSICIAN' : (doctor?.specialization || 'FAMILY PHYSICIAN')}
                    </div>
                  </div>

                  <div style={styles.rhRightContact}>
                    <div className="letterpadContactLine">Mo.: <strong>{doctor?.phone || '98793 80508'}</strong></div>
                    <div className="letterpadContactLine">Reg. No. <strong>{doctor?.regNo || 'G-9035'}</strong></div>
                  </div>
                </div>

                <div className="letterpadAddressBar" style={styles.rhAddressBar}>
                  {doctor?.clinicName || 'Dhyey Clinic & Nursing Home'} : {doctor?.address || 'Shop No. 1, Mahavir Heights, New Kosad Road, Amroli, Surat.'}
                </div>

                <div className="letterpadForDateRow" style={styles.rhForDateRow}>
                  <span style={{ fontWeight: 800, fontSize: '13px', color: '#000000' }}>FOR,</span>
                  <span style={{ fontWeight: 800, fontSize: '13px', color: '#000000' }}>DATE :</span>
                </div>
              </div>

              {/* 2. PATIENT INFO BLOCK */}
              {(() => {
                const t = PRINT_TRANSLATIONS[printLanguage] || PRINT_TRANSLATIONS.gu;
                return (
                  <>
              <div className="rhPatientInfoBlock" style={styles.rhPatientInfoBlock}>
                <div style={styles.rhPatientRow}>
                  <div style={{ width: '58%', display: 'flex', gap: '4px' }}>
                    <span style={{ fontWeight: 700 }}>Patient:</span>{' '}
                    <span style={{ fontWeight: 800, textTransform: 'uppercase' }}>
                      {visitToPrint.patientName}
                    </span>
                  </div>
                  <div style={{ width: '42%', display: 'flex', gap: '4px' }}>
                    <span style={{ fontWeight: 700 }}>Date:</span>{' '}
                    <span>
                      {(() => {
                        let d = visitToPrint.visitDate || '';
                        if (d.includes('-')) {
                          const p = d.split('-');
                          if (p.length === 3 && p[0].length === 4) d = `${p[2]}-${p[1]}-${p[0]}`;
                        }
                        let tm = '';
                        if (visitToPrint.createdAt) {
                          try {
                            tm = new Date(visitToPrint.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                          } catch (e) {}
                        }
                        return tm ? `${d}, ${tm}` : d;
                      })()}
                    </span>
                  </div>
                </div>

                <div style={styles.rhPatientRow}>
                  <div style={{ width: '58%', display: 'flex', gap: '4px' }}>
                    <span style={{ fontWeight: 700 }}>Age:</span>{' '}
                    <span>{visitToPrint.age ? `${visitToPrint.age} Y` : '—'}</span>
                  </div>
                  <div style={{ width: '42%', display: 'flex', gap: '4px' }}>
                    <span style={{ fontWeight: 700 }}>B.P.:</span>{' '}
                    <span>{visitToPrint.bp || '-'}</span>
                  </div>
                </div>

                <div style={styles.rhPatientRow}>
                  <div style={{ width: '58%', display: 'flex', gap: '4px' }}>
                    <span style={{ fontWeight: 700 }}>Mobile:</span>{' '}
                    <span>{visitToPrint.phone || '-'}</span>
                  </div>
                  <div style={{ width: '42%', display: 'flex', gap: '4px' }}>
                    <span style={{ fontWeight: 700 }}>Sugar:</span>{' '}
                    <span>{visitToPrint.sugar || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Horizontal Line Divider */}
              <div style={styles.rhBlackDivider} />

              {/* 3. ℞ SYMBOL & TABLE */}
              <div style={{ margin: '2px 0 4px', fontSize: '22px', fontWeight: 900, fontFamily: 'serif' }}>
                &#8478;
              </div>

              <table className="rhRxTable" style={styles.rhRxTable}>
                <thead>
                  <tr>
                    <th style={{ width: '42%', textAlign: 'left', padding: '4px 6px', borderBottom: '1.5px solid #000', fontWeight: 700, fontSize: '11px' }}>{t.colMedicine}</th>
                    <th style={{ width: '12%', textAlign: 'center', padding: '4px 6px', borderBottom: '1.5px solid #000', fontWeight: 700, fontSize: '11px' }}>{t.colQty}</th>
                    <th style={{ width: '26%', textAlign: 'center', padding: '4px 6px', borderBottom: '1.5px solid #000', fontWeight: 700, fontSize: '11px' }}>{t.colDose}</th>
                    <th style={{ width: '20%', textAlign: 'left', padding: '4px 6px', borderBottom: '1.5px solid #000', fontWeight: 700, fontSize: '11px' }}>{t.colInstruction}</th>
                  </tr>
                </thead>
                <tbody>
                  {visitToPrint.prescriptions && visitToPrint.prescriptions.length > 0 ? (
                    visitToPrint.prescriptions.map((p, idx) => {
                      const isSos = p.timing === 'SOS';
                      const hasDose = (p.morning && p.morning !== '0') || (p.noon && p.noon !== '0') || (p.evening && p.evening !== '0') || (p.night && p.night !== '0');
                      let instr = '';
                      if (isSos) {
                        instr = p.sosInstruction?.trim() || t.feverSos || 'SOS';
                      } else if (p.timing === 'BF') {
                        instr = t.beforeFood;
                      } else {
                        instr = t.afterFood;
                      }

                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0' }}>
                          <td style={{ padding: '7px 6px', fontWeight: 800, textTransform: 'uppercase', fontSize: '12px' }}>
                            {p.medicine}
                          </td>
                          <td style={{ padding: '7px 6px', textAlign: 'center', fontWeight: 800, fontSize: '12px' }}>
                            {p.qty || '-'}
                          </td>
                          <td style={{ padding: '5px 4px', textAlign: 'center' }}>
                            {isSos || !hasDose ? (
                              <span style={{ fontSize: '13px', fontWeight: 700 }}>-</span>
                            ) : (
                              <table style={styles.rhDoseMiniTable}>
                                <thead>
                                  <tr>
                                    <th style={styles.rhDoseMiniTh}>{t.morning}</th>
                                    <th style={styles.rhDoseMiniTh}>{t.noon}</th>
                                    <th style={styles.rhDoseMiniTh}>{t.evening}</th>
                                    <th style={{ ...styles.rhDoseMiniTh, borderRight: 'none' }}>{t.night}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td style={styles.rhDoseMiniTd}>{p.morning && p.morning !== '0' ? p.morning : ''}</td>
                                    <td style={styles.rhDoseMiniTd}>{p.noon && p.noon !== '0' ? p.noon : ''}</td>
                                    <td style={styles.rhDoseMiniTd}>{p.evening && p.evening !== '0' ? p.evening : ''}</td>
                                    <td style={{ ...styles.rhDoseMiniTd, borderRight: 'none' }}>{p.night && p.night !== '0' ? p.night : ''}</td>
                                  </tr>
                                </tbody>
                              </table>
                            )}
                          </td>
                          <td style={{ padding: '7px 6px', fontWeight: 700, fontSize: '11px' }}>
                            {instr}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: '#64748B', fontStyle: 'italic' }}>
                        {t.noPrescription}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* 4. ADVICE BOX - ONLY IF GIVEN */}
              {Boolean(visitToPrint.dietary && visitToPrint.dietary.trim()) && (
                <div className="rhAdviceBox" style={styles.rhAdviceBox}>
                  <span style={{ fontWeight: 800, textDecoration: 'underline' }}>
                    {t.adviceTitle}{' '}
                  </span>
                  <span style={{ fontWeight: 700 }}>
                    {visitToPrint.dietary.trim()}
                  </span>
                </div>
              )}
                  </>
                );
              })()}

              {/* Separator line */}
              <div
                className="photoFooterDivider"
                style={{
                  height: '1px',
                  backgroundColor: '#CBD5E1',
                  width: '100%',
                  margin: '12px 0 6px',
                  display: printMode === 'padOnly' ? 'none' : 'block',
                }}
              />

              {/* 5. FOOTER */}
              <div
                className="letterpad-preprinted-footer rhPharmacyFooter"
                style={{
                  ...styles.rhPharmacyFooter,
                  display: printMode === 'padOnly' ? 'none' : 'flex',
                }}
              >
                <span style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>✚</span>
                <span style={styles.rhPharmacyText}>
                  {doctor?.medicalStore || 'Harsh Medical & General Stores'}
                </span>
                <span style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>✚</span>
              </div>
            </div>

            <div style={styles.printModalFooter}>
              <button
                type="button"
                onClick={() => setPrintModalOpen(false)}
                style={styles.modalCancelBtn}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                style={styles.printConfirmBtn}
              >
                <Printer size={15} />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PRESCRIPTION PRINT LANGUAGE SELECTION */}
      {showLanguageModal && visitToPrint && (
        <div style={styles.modalOverlay} onClick={() => setShowLanguageModal(false)}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              width: '92%',
              maxWidth: '460px',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '14px 18px',
                backgroundColor: '#F0FDF4',
                borderBottom: '1.5px solid #BBF7D0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <Languages size={20} color="#15803D" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#166534' }}>
                    Select Prescription Language
                  </h3>
                  <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 600 }}>
                    Use ↑ / ↓ & Enter to select & print (or press Esc)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLanguageModal(false)}
                style={styles.modalCloseBtn}
                title="Cancel (Esc)"
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {PRINT_LANGUAGES.map((lang, idx) => {
                const isCurrent = printLanguage === lang.key;
                const isHighlighted = idx === languageHighlightIndex;
                return (
                  <button
                    key={lang.key}
                    type="button"
                    onClick={() => triggerPrintInLanguage(lang.key, true)}
                    onMouseEnter={() => {
                      setLanguageHighlightIndex(idx);
                      languageHighlightIndexRef.current = idx;
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      backgroundColor: isHighlighted ? '#FFFFFF' : lang.bg,
                      border: isHighlighted
                        ? `2.5px solid ${lang.color}`
                        : isCurrent
                        ? `2px solid ${lang.color}`
                        : `1.5px solid ${lang.border}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      boxShadow: isHighlighted ? '0 6px 18px rgba(0,0,0,0.12)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 900, color: '#0F172A', fontFamily: 'monospace' }}>
                        {lang.code}
                      </span>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '14px', color: lang.color }}>
                          {lang.title}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                          {lang.sub}
                        </div>
                      </div>
                    </div>
                    <Printer size={18} color={lang.color} />
                  </button>
                );
              })}
            </div>

            <div
              style={{
                padding: '10px 18px',
                backgroundColor: '#F8FAFC',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  const targetLang = PRINT_LANGUAGES[languageHighlightIndex]?.key || printLanguage || 'gu';
                  triggerPrintInLanguage(targetLang, false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563EB',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Preview First (P)
              </button>
              <span style={{ fontSize: '11px', color: '#64748B' }}>Keys: 1, 2, 3</span>
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
    height: '100%',
    width: '100%',
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
    boxSizing: 'border-box',
    padding: '10px 14px',
    gap: '10px',
  },
  toast: {
    position: 'fixed',
    top: 18,
    right: 20,
    zIndex: 9999,
    padding: '10px 18px',
    borderRadius: '8px',
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '8px',
    padding: '6px 12px',
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    border: '1px solid #E2E8F0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
  },
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  titleIconBadge: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor: '#E6F4F1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#0F172A',
    margin: 0,
    letterSpacing: '-0.2px',
  },
  subHeading: {
    fontSize: '11px',
    color: '#64748B',
    display: 'block',
  },
  filterPillTrack: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#F1F5F9',
    padding: '3px',
    borderRadius: '8px',
  },
  filterPill: {
    border: 'none',
    padding: '5px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  customDateInput: {
    border: '1px solid #CBD5E1',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '12px',
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    outline: 'none',
  },
  searchStrip: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  searchInputWrap: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    height: '38px',
    padding: '0 36px 0 38px',
    border: '1.5px solid #0D5C4E',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    outline: 'none',
    boxShadow: '0 1px 4px rgba(13, 92, 78, 0.08)',
    textTransform: 'uppercase',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: '10px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 2,
  },
  searchStripRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  recordCountBadge: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#0D5C4E',
    backgroundColor: '#E6F4F1',
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #B2DFDB',
    whiteSpace: 'nowrap',
  },
  refreshBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #CBD5E1',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#334155',
    cursor: 'pointer',
    height: '36px',
  },
  addPatientBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    backgroundColor: '#15803D',
    border: '1px solid #166534',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '700',
    color: '#FFFFFF',
    cursor: 'pointer',
    height: '36px',
    boxShadow: '0 1px 3px rgba(22, 101, 52, 0.3)',
    whiteSpace: 'nowrap',
  },
  tableCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    border: '1px solid #CBD5E1',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  tableScroll: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  table: {
    width: '100%',
    tableLayout: 'fixed',
    borderCollapse: 'collapse',
    fontSize: '11.5px',
  },
  theadRow: {
    backgroundColor: '#0D5C4E',
    color: '#FFFFFF',
    position: 'sticky',
    top: 0,
    zIndex: 2,
  },
  th: {
    padding: '7px 6px',
    fontSize: '10.5px',
    fontWeight: '700',
    letterSpacing: '0.2px',
    textAlign: 'left',
    borderRight: '1px solid rgba(255, 255, 255, 0.15)',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
  },
  tr: {
    borderBottom: '1px solid #E2E8F0',
    transition: 'background-color 0.1s ease',
  },
  tdDateTime: {
    padding: '6px 6px',
    verticalAlign: 'top',
    wordBreak: 'break-word',
  },
  dateText: {
    fontWeight: '700',
    color: '#0F172A',
    fontSize: '12px',
  },
  timeBadge: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#0284C7',
    marginTop: '2px',
  },
  editedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '1px 5px',
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    border: '1px solid #FDE68A',
    borderRadius: '4px',
    fontSize: '9.5px',
    fontWeight: '800',
    letterSpacing: '0.4px',
    lineHeight: 1.2,
    textTransform: 'uppercase',
  },
  editedInfoBox: {
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '2px',
    marginTop: '4px',
    padding: '3px 6px',
    backgroundColor: '#FFFBEB',
    border: '1px solid #FDE68A',
    borderRadius: '4px',
  },
  editedDateTimeText: {
    fontSize: '9.5px',
    fontWeight: '700',
    color: '#B45309',
    lineHeight: 1.25,
    display: 'flex',
    flexDirection: 'column',
  },
  tdPatient: {
    padding: '6px 6px',
    verticalAlign: 'top',
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
  },
  patientName: {
    fontWeight: '700',
    color: '#0F172A',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '-0.1px',
    wordBreak: 'break-word',
  },
  patientSubMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '3px',
    fontSize: '10.5px',
    color: '#64748B',
  },
  pidBadge: {
    backgroundColor: '#E2E8F0',
    padding: '1px 5px',
    borderRadius: '4px',
    fontWeight: '700',
    color: '#334155',
    fontFamily: 'monospace',
  },
  famBadge: {
    backgroundColor: '#FEF3C7',
    padding: '1px 5px',
    borderRadius: '4px',
    fontWeight: '700',
    color: '#92400E',
    fontFamily: 'monospace',
  },
  tdComplaints: {
    padding: '6px 6px',
    verticalAlign: 'top',
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
  },
  complaintText: {
    fontSize: '11px',
    color: '#1E293B',
    fontWeight: '600',
    lineHeight: '1.35',
  },
  tdIpd: {
    padding: '6px 6px',
    verticalAlign: 'top',
    wordBreak: 'break-word',
  },
  ipdBadgesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    alignItems: 'flex-start',
    maxWidth: '100%',
  },
  ipdBadge: {
    display: 'inline-block',
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    border: '1px solid #FCD34D',
    borderRadius: '4px',
    padding: '2px 5px',
    fontSize: '10.5px',
    fontWeight: '700',
    lineHeight: '1.25',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
    maxWidth: '100%',
  },
  ipdText: {
    fontSize: '11.5px',
    color: '#0D5C4E',
    fontWeight: '700',
  },
  tdMeds: {
    padding: '6px 6px',
    verticalAlign: 'top',
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
  },
  medsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  medItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '4px',
    fontSize: '11px',
    color: '#1E293B',
    lineHeight: '1.3',
  },
  bullet: {
    color: '#64748B',
    fontSize: '11px',
  },
  medName: {
    fontWeight: '600',
    textTransform: 'uppercase',
    wordBreak: 'break-word',
  },
  tdAlerts: {
    padding: '6px 6px',
    verticalAlign: 'top',
    wordBreak: 'break-word',
  },
  alertsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    alignItems: 'flex-start',
    maxWidth: '100%',
  },
  badgeRed: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    border: '1px solid #F87171',
    borderRadius: '4px',
    padding: '2px 5px',
    fontSize: '10.5px',
    fontWeight: '700',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
    maxWidth: '100%',
  },
  badgeBlue: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    backgroundColor: '#E0F2FE',
    color: '#0284C7',
    border: '1px solid #7DD3FC',
    borderRadius: '4px',
    padding: '2px 5px',
    fontSize: '10.5px',
    fontWeight: '700',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
    maxWidth: '100%',
  },
  badgeGreen: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    backgroundColor: '#DCFCE7',
    color: '#166534',
    border: '1px solid #86EFAC',
    borderRadius: '4px',
    padding: '2px 5px',
    fontSize: '10.5px',
    fontWeight: '700',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
    maxWidth: '100%',
  },
  badgeOrange: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    backgroundColor: '#FFEDD5',
    color: '#C2410C',
    border: '1px solid #FDBA74',
    borderRadius: '4px',
    padding: '2px 5px',
    fontSize: '10.5px',
    fontWeight: '700',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
    maxWidth: '100%',
  },
  badgePurple: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    backgroundColor: '#EDE9FE',
    color: '#6D28D9',
    border: '1px solid #C4B5FD',
    borderRadius: '4px',
    padding: '2px 5px',
    fontSize: '10.5px',
    fontWeight: '700',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
    maxWidth: '100%',
  },
  tdCharged: {
    padding: '6px 6px',
    verticalAlign: 'top',
    textAlign: 'right',
  },
  chargedText: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#D97706',
  },
  tdDue: {
    padding: '6px 6px',
    verticalAlign: 'top',
    textAlign: 'right',
  },
  dueText: {
    fontSize: '12px',
  },
  tdAct: {
    padding: '6px 4px',
    verticalAlign: 'top',
    textAlign: 'center',
  },
  actButtonGroup: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: '3px',
  },
  btnNewCase: {
    width: '28px',
    height: '28px',
    borderRadius: '5px',
    border: '1px solid #BAE6FD',
    backgroundColor: '#F0F9FF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  btnEditCase: {
    width: '28px',
    height: '28px',
    borderRadius: '5px',
    border: '1px solid #FDE68A',
    backgroundColor: '#FFFBEB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  btnPrint: {
    width: '28px',
    height: '28px',
    borderRadius: '5px',
    border: '1px solid #99F6E4',
    backgroundColor: '#F0FDFA',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  btnDelete: {
    width: '28px',
    height: '28px',
    borderRadius: '5px',
    border: '1px solid #FECACA',
    backgroundColor: '#FEF2F2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  nilText: {
    color: '#94A3B8',
    fontSize: '13px',
  },
  loadingCell: {
    padding: '36px',
    textAlign: 'center',
    color: '#64748B',
    fontSize: '13px',
  },
  emptyCell: {
    padding: '40px',
    textAlign: 'center',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid #CBD5E1',
    borderTopColor: '#0D5C4E',
    borderRadius: '50%',
    display: 'inline-block',
    marginRight: '8px',
    animation: 'spin 0.8s linear infinite',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000005,
    padding: '16px',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '10px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  modalHeaderDanger: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 16px',
    backgroundColor: '#FEF2F2',
    borderBottom: '1px solid #FECACA',
  },
  modalHeaderIconWrap: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#FEE2E2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeading: {
    margin: 0,
    fontSize: '15px',
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubheading: {
    fontSize: '11px',
    color: '#64748B',
  },
  modalCloseBtn: {
    background: 'none',
    border: 'none',
    color: '#64748B',
    cursor: 'pointer',
    padding: '4px',
  },
  modalBody: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  deleteNoticeBox: {
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: '6px',
    padding: '10px 12px',
  },
  noticeText: {
    margin: 0,
    fontSize: '12px',
    color: '#475569',
  },
  noticePatientInfo: {
    marginTop: '4px',
    fontSize: '13px',
    color: '#0F172A',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#FEF2F2',
    border: '1px solid #FCA5A5',
    color: '#B91C1C',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  inputLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '12px',
    fontWeight: '700',
    color: '#334155',
  },
  passwordInput: {
    width: '100%',
    height: '38px',
    padding: '0 12px',
    border: '1.5px solid #CBD5E1',
    borderRadius: '6px',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  modalActionsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '6px',
  },
  modalCancelBtn: {
    padding: '8px 14px',
    backgroundColor: '#F1F5F9',
    border: '1px solid #CBD5E1',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#475569',
    cursor: 'pointer',
  },
  modalDeleteBtn: {
    padding: '8px 16px',
    backgroundColor: '#DC2626',
    border: '1px solid #B91C1C',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '700',
    color: '#FFFFFF',
    cursor: 'pointer',
  },
  printModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '10px',
    width: '100%',
    maxWidth: '680px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
    overflow: 'hidden',
  },
  printModalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 18px',
    borderBottom: '1px solid #E2E8F0',
  },
  printMemoSheet: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 30px',
    backgroundColor: '#FFFFFF',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    position: 'relative',
    color: '#000000',
  },
  rhLetterpadHeader: {
    position: 'relative',
    zIndex: 1,
    marginBottom: '4px',
  },
  rhHeaderTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
  },
  rhDocName: {
    fontSize: '26px',
    fontWeight: '900',
    color: '#0B63AC',
    letterSpacing: '0.4px',
    lineHeight: 1.1,
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
  },
  rhDocDegree: {
    fontSize: '12.5px',
    fontWeight: '700',
    color: '#1E293B',
  },
  rhDocSpecialty: {
    fontSize: '13px',
    fontWeight: '800',
    color: '#0B63AC',
    letterSpacing: '0.6px',
    textTransform: 'uppercase',
    marginTop: '2px',
  },
  rhRightContact: {
    textAlign: 'right',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    fontSize: '12px',
    color: '#1E293B',
  },
  rhAddressBar: {
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
  rhForDateRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    padding: '3px 0 5px 0',
  },
  rhPatientInfoBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    margin: '3px 0 5px 0',
    position: 'relative',
    zIndex: 1,
  },
  rhPatientRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    fontSize: '12px',
    color: '#000000',
  },
  rhBlackDivider: {
    height: '1px',
    backgroundColor: '#000000',
    width: '100%',
    margin: '3px 0 5px 0',
    position: 'relative',
    zIndex: 1,
  },
  rhRxTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '11px',
    color: '#000000',
    position: 'relative',
    zIndex: 1,
  },
  rhDoseMiniTable: {
    borderCollapse: 'collapse',
    border: '1px solid #000000',
    margin: '0 auto',
    fontSize: '9px',
    backgroundColor: '#FFFFFF',
  },
  rhDoseMiniTh: {
    padding: '1px 5px',
    borderRight: '1px solid #000000',
    borderBottom: '1px solid #000000',
    fontWeight: 600,
    fontSize: '9px',
    color: '#000000',
    textAlign: 'center',
    whiteSpace: 'nowrap',
  },
  rhDoseMiniTd: {
    padding: '2px 5px',
    borderRight: '1px solid #000000',
    textAlign: 'center',
    fontWeight: 800,
    fontSize: '10px',
    color: '#000000',
    minWidth: '22px',
    height: '14px',
  },
  rhAdviceBox: {
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
  rhPharmacyFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '4px 0',
    position: 'relative',
    zIndex: 1,
  },
  rhPharmacyText: {
    fontSize: '15px',
    fontWeight: 800,
    fontStyle: 'italic',
    color: '#0B63AC',
    letterSpacing: '0.4px',
    fontFamily: "'Segoe UI', -apple-system, sans-serif",
  },
  printHeaderBlock: {
    textAlign: 'center',
  },
  printClinicName: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '800',
    color: '#0D5C4E',
  },
  printDoctorName: {
    fontSize: '14px',
    fontWeight: '700',
    marginTop: '3px',
    color: '#0F172A',
  },
  printDoctorDegree: {
    fontSize: '12px',
    color: '#475569',
  },
  printClinicAddress: {
    fontSize: '11px',
    color: '#64748B',
    marginTop: '3px',
  },
  printDivider: {
    height: '2px',
    backgroundColor: '#0D5C4E',
    margin: '12px 0',
  },
  printMetaStrip: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    padding: '6px 10px',
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: '4px',
    marginBottom: '14px',
    fontFamily: 'sans-serif',
  },
  printSection: {
    marginBottom: '12px',
    fontFamily: 'sans-serif',
  },
  printSectionLabel: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#0D5C4E',
    display: 'block',
    marginBottom: '4px',
  },
  printSectionVal: {
    fontSize: '12px',
    color: '#1E293B',
  },
  printMedRows: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    fontSize: '12px',
  },
  printMedRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '2px 0',
  },
  printRxTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px',
  },
  printBillingStrip: {
    display: 'flex',
    justifyContent: 'space-around',
    borderTop: '1px dashed #CBD5E1',
    paddingTop: '10px',
    marginTop: '16px',
    fontSize: '12px',
    fontFamily: 'sans-serif',
  },
  printModalFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '10px',
    padding: '12px 18px',
    borderTop: '1px solid #E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  printConfirmBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    backgroundColor: '#0D5C4E',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '700',
    color: '#FFFFFF',
    cursor: 'pointer',
  },
};

