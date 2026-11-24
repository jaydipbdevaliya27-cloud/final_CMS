import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { visitAPI, patientAPI } from '../services/api';
import { useDebounce } from '../hooks/useDebounce';
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
} from 'lucide-react';

export const RecentHistory = ({
  onNavigateToNewCase,
  onNavigateToEditCase,
  onNavigateToAddPatient,
}) => {
  const { doctor } = useAuth();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
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

  // Print Prescription Modal State
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [visitToPrint, setVisitToPrint] = useState(null);

  // Fetch recent visits
  const fetchRecentVisits = async () => {
    try {
      setLoading(true);
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
        setVisits(res.visits || []);
      }
    } catch (err) {
      console.error('Error fetching recent visits:', err);
      showToast('Error fetching recent records: ' + (err.message || 'Server error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentVisits();
  }, [debouncedSearch, selectedPeriod, selectedDate]);

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

  // Handle Action 1: New Case Entry
  const handleActionNewCase = async (visit) => {
    try {
      let patient = null;
      if (visit.patientId) {
        const res = await patientAPI.getById(visit.patientId);
        if (res?.success && res.patient) {
          patient = res.patient;
        }
      }
      if (!patient) {
        patient = {
          patientId: visit.patientId,
          familyId: visit.familyId,
          name: visit.patientName,
          phone: visit.phone || '',
          area: visit.area || '',
        };
      }
      if (onNavigateToNewCase) {
        onNavigateToNewCase(patient);
      }
    } catch (e) {
      console.error('Error opening new case:', e);
      if (onNavigateToNewCase) {
        onNavigateToNewCase({
          patientId: visit.patientId,
          familyId: visit.familyId,
          name: visit.patientName,
        });
      }
    }
  };

  // Handle Action 2: Edit Case
  const handleActionEditCase = (visit) => {
    if (onNavigateToEditCase) {
      onNavigateToEditCase(visit);
    }
  };

  // Handle Action 3: Print
  const handleActionPrint = (visit) => {
    setVisitToPrint(visit);
    setPrintModalOpen(true);
  };

  // Helper: Format Date & Time matching screenshot e.g. 24-11-2026\n01:23 PM
  const formatDateTime = (visit) => {
    let dateStr = visit.visitDate || '';
    if (dateStr && dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    let timeStr = '';
    if (visit.createdAt) {
      try {
        const d = new Date(visit.createdAt);
        timeStr = d.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
      } catch (e) {}
    } else {
      timeStr = '12:00 PM';
    }

    return { dateStr, timeStr };
  };

  // Helper: Generate Alert Badges
  const getLabAlerts = (visit) => {
    const alerts = [];

    // Due collection check
    if (visit.reference && visit.reference.toUpperCase().includes('DUE COLLECTION')) {
      alerts.push({
        type: 'collection',
        text: `DUE COLLECTION (₹${visit.received || 0})`,
        variant: 'green',
      });
      return alerts;
    }

    // BP Alert: Check range or contains '*'
    if (visit.bp && visit.bp.trim()) {
      const bpStr = visit.bp.trim();
      const hasStar = bpStr.includes('*');
      const match = bpStr.match(/(\d+)\s*\/\s*(\d+)/);
      let isOut = hasStar;
      if (match) {
        const sys = parseInt(match[1], 10);
        const dia = parseInt(match[2], 10);
        if (sys >= 135 || sys < 90 || dia >= 88 || dia < 60) {
          isOut = true;
        }
      }
      if (isOut) {
        alerts.push({
          type: 'bp',
          text: `${hasStar ? '🚩 ' : ''}BP: ${bpStr}`,
          variant: 'red',
        });
      }
    }

    // Sugar Alert: Normal random < 140
    if (visit.sugar && visit.sugar.trim()) {
      const sStr = visit.sugar.trim();
      const hasStar = sStr.includes('*');
      const num = parseFloat(sStr.replace(/[^0-9.]/g, ''));
      if (hasStar || (!isNaN(num) && (num >= 140 || num < 70))) {
        alerts.push({
          type: 'sugar',
          text: `🚩 SUGAR: ${sStr}`,
          variant: 'red',
        });
      }
    }

    // Other notes (e.g. 'OTHERS: 6TH MONTH', Spo2, etc.)
    if (visit.other && visit.other.trim()) {
      const oStr = visit.other.trim();
      const hasStar = oStr.includes('*');
      if (hasStar || oStr.toLowerCase().includes('month') || oStr.toLowerCase().includes('spo2')) {
        alerts.push({
          type: 'other',
          text: `${hasStar ? '🚩 ' : ''}${oStr.toUpperCase()}`,
          variant: hasStar ? 'red' : 'orange',
        });
      }
    }

    // Investigations / Radiology (e.g. 'XRAY KNEE', 'CBC', 'USG')
    if (visit.investigation && visit.investigation.trim()) {
      const items = visit.investigation.split(',').map((i) => i.trim()).filter(Boolean);
      items.forEach((item) => {
        const hasStar = item.includes('*');
        if (hasStar) {
          alerts.push({
            type: 'lab',
            text: `🚩 ${item.toUpperCase()}`,
            variant: 'red',
          });
        } else if (
          item.toUpperCase().includes('XRAY') ||
          item.toUpperCase().includes('X-RAY') ||
          item.toUpperCase().includes('USG') ||
          item.toUpperCase().includes('CT') ||
          item.toUpperCase().includes('MRI')
        ) {
          alerts.push({
            type: 'radiology',
            text: item.toUpperCase(),
            variant: 'blue',
          });
        }
      });
    }

    // Attached Lab Report parameter checks
    const rep = visit.labReport;
    if (rep && typeof rep === 'object') {
      const h = rep.hematology || {};
      if (h.hb) {
        const num = parseFloat(h.hb);
        if (h.hb.includes('*') || (!isNaN(num) && (num < 11.5 || num > 16.5))) {
          alerts.push({ type: 'lab', text: `🚩 Hb: ${h.hb}`, variant: 'red' });
        }
      }
      if (h.wbc) {
        const num = parseFloat(h.wbc);
        if (h.wbc.includes('*') || (!isNaN(num) && (num < 4000 || num > 11000))) {
          alerts.push({ type: 'lab', text: `🚩 WBC: ${h.wbc}`, variant: 'red' });
        }
      }
      if (h.platelet) {
        const num = parseFloat(h.platelet);
        if (h.platelet.includes('*') || (!isNaN(num) && (num < 150000 || num > 450000))) {
          alerts.push({ type: 'lab', text: `🚩 Plat: ${h.platelet}`, variant: 'red' });
        }
      }
      const g = rep.bloodGlucoseRenal || {};
      if (g.screatinin) {
        const num = parseFloat(g.screatinin);
        if (g.screatinin.includes('*') || (!isNaN(num) && (num > 1.2 || num < 0.6))) {
          alerts.push({ type: 'lab', text: `🚩 S.CREAT: ${g.screatinin}`, variant: 'red' });
        }
      }
      if (g.rbs) {
        const num = parseFloat(g.rbs);
        if (g.rbs.includes('*') || (!isNaN(num) && num > 140)) {
          alerts.push({ type: 'lab', text: `🚩 RBS: ${g.rbs}`, variant: 'red' });
        }
      }
      const t = rep.thyroid || {};
      if (t.tsh) {
        const num = parseFloat(t.tsh);
        if (t.tsh.includes('*') || (!isNaN(num) && (num < 0.35 || num > 4.94))) {
          alerts.push({ type: 'lab', text: `🚩 TSH: ${t.tsh}`, variant: 'red' });
        }
      }
      if (Array.isArray(rep.specialFindings)) {
        rep.specialFindings.forEach((sf) => {
          if (sf.notes && sf.notes.includes('*')) {
            alerts.push({ type: 'lab', text: `🚩 ${sf.title}: ${sf.notes}`, variant: 'red' });
          }
        });
      }
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
      <div style={styles.topBar}>
        <div style={styles.titleSection}>
          <div style={styles.titleIconBadge}>
            <Clock size={18} color="#0D5C4E" />
          </div>
          <div>
            <h1 style={styles.heading}>Recent History / Case Ledger</h1>
            <span style={styles.subHeading}>
              Live chronological patient OPD records, lab alerts & financial status
            </span>
          </div>
        </div>

        {/* Filter Pills: Today, Yesterday, All, Custom */}
        <div style={styles.filterPillTrack}>
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
      <div style={styles.searchStrip}>
        <div style={styles.searchInputWrap}>
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
        <div style={styles.searchStripRight}>
          <div style={styles.recordCountBadge}>
            {loading ? 'Loading...' : `${visits.length} Cases Found`}
          </div>

          <button
            type="button"
            onClick={fetchRecentVisits}
            style={styles.refreshBtn}
            title="Refresh recent visits"
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          {onNavigateToAddPatient && (
            <button
              type="button"
              onClick={onNavigateToAddPatient}
              style={styles.addPatientBtn}
              title="Register new patient (Enter)"
            >
              <Plus size={15} />
              <span>ADD PATIENT (Enter)</span>
            </button>
          )}
        </div>
      </div>

      {/* MAIN TABLE CONTAINER MATCHING PHOTO */}
      <div style={styles.tableCard}>
        <div style={styles.tableScroll}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={{ ...styles.th, width: '110px' }}>Date & Time</th>
                <th style={{ ...styles.th, width: '200px' }}>Patient Name</th>
                <th style={{ ...styles.th, width: '150px' }}>Complaints</th>
                <th style={{ ...styles.th, width: '110px' }}>IPD Detail</th>
                <th style={{ ...styles.th, width: '160px' }}>Clinic Med</th>
                <th style={{ ...styles.th, width: '200px' }}>Prescription</th>
                <th style={{ ...styles.th, width: '140px' }}>Lab Alerts</th>
                <th style={{ ...styles.th, width: '90px', textAlign: 'right' }}>Charged (₹)</th>
                <th style={{ ...styles.th, width: '80px', textAlign: 'right' }}>Due (₹)</th>
                <th style={{ ...styles.th, width: '140px', textAlign: 'center' }}>Act</th>
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
              ) : visits.length === 0 ? (
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
                visits.map((visit, idx) => {
                  const { dateStr, timeStr } = formatDateTime(visit);
                  const isDueCollection =
                    visit.reference &&
                    visit.reference.toUpperCase().includes('DUE COLLECTION');

                  // Format complaints
                  const complaints = isDueCollection
                    ? '-'
                    : visit.complaint
                    ? visit.complaint.toUpperCase()
                    : '-';

                  // Format IPD details
                  let ipdText = '-';
                  if (!isDueCollection && visit.ipdDetails) {
                    if (Array.isArray(visit.ipdDetails) && visit.ipdDetails.length > 0) {
                      ipdText = visit.ipdDetails
                        .map((i) => (typeof i === 'string' ? i : i?.item || ''))
                        .filter(Boolean)
                        .join(', ')
                        .toUpperCase();
                    } else if (typeof visit.ipdDetails === 'string' && visit.ipdDetails.trim()) {
                      ipdText = visit.ipdDetails.trim().toUpperCase();
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

                  // Current due and deposit
                  const displayDue =
                    visit.currentPatientDue !== undefined
                      ? visit.currentPatientDue
                      : Math.max(0, (visit.charge || 0) - (visit.received || 0));
                  const displayDeposit =
                    visit.currentPatientDeposit !== undefined
                      ? visit.currentPatientDeposit
                      : ((visit.received || 0) > (visit.charge || 0) ? (visit.received || 0) - (visit.charge || 0) : 0);

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
                        <div style={styles.timeBadge}>{timeStr}</div>
                      </td>

                      {/* 2. Patient Name */}
                      <td style={styles.tdPatient}>
                        <div style={styles.patientName}>{visit.patientName || 'PATIENT'}</div>
                        <div style={styles.patientSubMeta}>
                          {visit.patientId && (
                            <span style={styles.pidBadge}>{visit.patientId}</span>
                          )}
                          {visit.familyId && (
                            <span style={styles.famBadge}>FAM {visit.familyId}</span>
                          )}
                          {visit.phone && <span>📞 {visit.phone}</span>}
                        </div>
                      </td>

                      {/* 3. Complaints */}
                      <td style={styles.tdComplaints}>
                        {complaints === '-' ? (
                          <span style={styles.nilText}>-</span>
                        ) : (
                          <span style={styles.complaintText}>{complaints}</span>
                        )}
                      </td>

                      {/* 4. IPD Detail */}
                      <td style={styles.tdIpd}>
                        {ipdText === '-' ? (
                          <span style={styles.nilText}>-</span>
                        ) : (
                          <span style={styles.ipdText}>{ipdText}</span>
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
                        {rxMeds.length === 0 ? (
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

                      {/* 7. Lab Alerts */}
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

                      {/* 9. Due (₹) / Deposit */}
                      <td style={styles.tdDue}>
                        {displayDeposit > 0 ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              backgroundColor: '#DCFCE7',
                              color: '#15803D',
                              border: '1px solid #86EFAC',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '800',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            🟢 DEPOSIT: ₹{displayDeposit}
                          </span>
                        ) : (
                          <span
                            style={{
                              ...styles.dueText,
                              color: displayDue > 0 ? '#DC2626' : '#475569',
                              fontWeight: displayDue > 0 ? '700' : '500',
                            }}
                          >
                            ₹{displayDue}
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
              <button
                type="button"
                onClick={() => setPrintModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <X size={16} />
              </button>
            </div>

            <div style={styles.printMemoSheet}>
              {/* Clinic Header */}
              <div style={styles.printHeaderBlock}>
                <h2 style={styles.printClinicName}>
                  {doctor?.clinicName || 'PAGHDAL CLINIC & NURSING HOME'}
                </h2>
                <div style={styles.printDoctorName}>
                  {doctor?.name || 'Dr. Chirag Paghdal'}
                  <span style={styles.printDoctorDegree}> ({doctor?.degree || 'B.H.M.S.'})</span>
                </div>
                <div style={styles.printClinicAddress}>
                  {doctor?.address || 'Shop No. 1, Mahavir Heights, New Kosad Road, Amroli, Surat.'} | Tel: {doctor?.phone || '98793 80508'}
                </div>
              </div>

              <div style={styles.printDivider} />

              {/* Patient Meta Strip */}
              <div style={styles.printMetaStrip}>
                <div><strong>Patient:</strong> {visitToPrint.patientName}</div>
                <div><strong>PID:</strong> {visitToPrint.patientId}</div>
                <div><strong>Date:</strong> {visitToPrint.visitDate}</div>
                <div><strong>BP:</strong> {visitToPrint.bp || '120/80'}</div>
                {visitToPrint.sugar && <div><strong>Sugar:</strong> {visitToPrint.sugar}</div>}
              </div>

              {/* Clinical Details */}
              {visitToPrint.complaint && (
                <div style={styles.printSection}>
                  <span style={styles.printSectionLabel}>Complaints:</span>
                  <span style={styles.printSectionVal}>{visitToPrint.complaint}</span>
                </div>
              )}

              {/* Medicines / Treatments */}
              {visitToPrint.treatments && visitToPrint.treatments.length > 0 && (
                <div style={styles.printSection}>
                  <span style={styles.printSectionLabel}>Clinic Medicines:</span>
                  <div style={styles.printMedRows}>
                    {visitToPrint.treatments.map((t, idx) => (
                      <div key={idx} style={styles.printMedRow}>
                        <span>{idx + 1}. {t.item}</span>
                        <span>Qty: {t.qty || 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rx Prescriptions */}
              {visitToPrint.prescriptions && visitToPrint.prescriptions.length > 0 && (
                <div style={styles.printSection}>
                  <span style={styles.printSectionLabel}>Rx (Pharmacy Prescriptions):</span>
                  <table style={styles.printRxTable}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Medicine</th>
                        <th style={{ textAlign: 'center' }}>Dosage (M-N-E-Nt)</th>
                        <th style={{ textAlign: 'center' }}>Timing</th>
                        <th style={{ textAlign: 'center' }}>Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visitToPrint.prescriptions.map((p, idx) => (
                        <tr key={idx}>
                          <td>{p.medicine}</td>
                          <td style={{ textAlign: 'center' }}>
                            {p.morning || 0}-{p.noon || 0}-{p.evening || 0}-{p.night || 0}
                          </td>
                          <td style={{ textAlign: 'center' }}>{p.timing || 'AF'}</td>
                          <td style={{ textAlign: 'center' }}>{p.qty || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Financials */}
              <div style={styles.printBillingStrip}>
                <div>Charged: <strong>₹{visitToPrint.charge || 0}</strong></div>
                <div>Received: <strong>₹{visitToPrint.received || 0}</strong></div>
                <div>
                  {(visitToPrint.received || 0) > (visitToPrint.charge || 0) ? (
                    <span style={{ color: '#15803D', fontWeight: 'bold' }}>
                      🟢 Deposit: ₹{(visitToPrint.received || 0) - (visitToPrint.charge || 0)}
                    </span>
                  ) : (
                    <span>Due: <strong>₹{Math.max(0, visitToPrint.due || 0)}</strong></span>
                  )}
                </div>
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
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px',
  },
  theadRow: {
    backgroundColor: '#0D5C4E',
    color: '#FFFFFF',
    position: 'sticky',
    top: 0,
    zIndex: 2,
  },
  th: {
    padding: '9px 10px',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.3px',
    textAlign: 'left',
    borderRight: '1px solid rgba(255, 255, 255, 0.15)',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid #E2E8F0',
    transition: 'background-color 0.1s ease',
  },
  tdDateTime: {
    padding: '8px 10px',
    verticalAlign: 'top',
    whiteSpace: 'nowrap',
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
  tdPatient: {
    padding: '8px 10px',
    verticalAlign: 'top',
  },
  patientName: {
    fontWeight: '700',
    color: '#0F172A',
    fontSize: '13px',
    textTransform: 'uppercase',
    letterSpacing: '-0.1px',
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
    padding: '8px 10px',
    verticalAlign: 'top',
  },
  complaintText: {
    fontSize: '11.5px',
    color: '#1E293B',
    fontWeight: '600',
    lineHeight: '1.4',
  },
  tdIpd: {
    padding: '8px 10px',
    verticalAlign: 'top',
  },
  ipdText: {
    fontSize: '11.5px',
    color: '#0D5C4E',
    fontWeight: '700',
  },
  tdMeds: {
    padding: '8px 10px',
    verticalAlign: 'top',
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
    fontSize: '11.5px',
    color: '#1E293B',
    lineHeight: '1.35',
  },
  bullet: {
    color: '#64748B',
    fontSize: '12px',
  },
  medName: {
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  tdAlerts: {
    padding: '8px 10px',
    verticalAlign: 'top',
  },
  alertsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    alignItems: 'flex-start',
  },
  badgeRed: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    border: '1px solid #F87171',
    borderRadius: '4px',
    padding: '2px 6px',
    fontSize: '11px',
    fontWeight: '700',
    whiteSpace: 'nowrap',
  },
  badgeBlue: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    backgroundColor: '#E0F2FE',
    color: '#0284C7',
    border: '1px solid #7DD3FC',
    borderRadius: '4px',
    padding: '2px 6px',
    fontSize: '11px',
    fontWeight: '700',
    whiteSpace: 'nowrap',
  },
  badgeGreen: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    backgroundColor: '#DCFCE7',
    color: '#166534',
    border: '1px solid #86EFAC',
    borderRadius: '4px',
    padding: '2px 6px',
    fontSize: '11px',
    fontWeight: '700',
    whiteSpace: 'nowrap',
  },
  badgeOrange: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    backgroundColor: '#FFEDD5',
    color: '#C2410C',
    border: '1px solid #FDBA74',
    borderRadius: '4px',
    padding: '2px 6px',
    fontSize: '11px',
    fontWeight: '700',
    whiteSpace: 'nowrap',
  },
  tdCharged: {
    padding: '8px 10px',
    verticalAlign: 'top',
    textAlign: 'right',
  },
  chargedText: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#D97706',
  },
  tdDue: {
    padding: '8px 10px',
    verticalAlign: 'top',
    textAlign: 'right',
  },
  dueText: {
    fontSize: '13px',
  },
  tdAct: {
    padding: '8px 8px',
    verticalAlign: 'top',
    textAlign: 'center',
  },
  actButtonGroup: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
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
    zIndex: 9999,
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
    padding: '24px',
    backgroundColor: '#FFFFFF',
    fontFamily: 'serif',
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

