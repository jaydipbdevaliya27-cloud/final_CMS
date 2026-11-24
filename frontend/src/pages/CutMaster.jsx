import React, { useState, useEffect, useRef } from 'react';
import { cutAPI, masterDataAPI } from '../services/api';
import { useDebounce } from '../hooks/useDebounce';
import {
  Search,
  Plus,
  RefreshCw,
  Trash2,
  Edit,
  X,
  Printer,
  CheckCircle2,
  AlertCircle,
  FileText,
  TrendingUp,
} from 'lucide-react';

export const CutMaster = ({ onNavigateToDashboard }) => {
  const [cuts, setCuts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({ todayTotal: 0, monthTotal: 0, overallTotal: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Form State - STRICTLY NO EXTRA FIELDS: ONLY Date, Center Name (Datalist), Patient Name, Category (Datalist), Amount (₹)
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCut, setEditingCut] = useState(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    centerName: '',
    patientName: '',
    category: '',
    amount: '',
  });

  // Autocomplete Datalists
  const [categories, setCategories] = useState([
    'LAB INVESTIGATION CUT',
    'X-RAY / RADIOLOGY COMMISSION',
    'SONOGRAPHY / USG CUT',
    'CT-SCAN / MRI REFERRAL',
    'PATHOLOGY COMMISSION',
    'HOSPITAL ADMISSION REFERRAL',
    'SPECIALIST CONSULTATION CUT',
    'PHARMACY COMMISSION',
    'MISCELLANEOUS REFERRAL',
  ]);

  const [centers, setCenters] = useState([
    'CARE DIAGNOSTICS',
    'SURAT IMAGING & MRI CENTER',
    'SHIVAM PATHOLOGY LAB',
    'METROPOLIS HEALTHCARE',
    'DR. LAL PATHLABS',
    'KRISHNA X-RAY CLINIC',
    'STERLING DIAGNOSTICS',
    'CITY HOSPITAL',
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, text: '', type: 'success' });
  const centerInputRef = useRef(null);

  const showToast = (text, type = 'success') => {
    setToast({ show: true, text, type });
    setTimeout(() => setToast({ show: false, text: '', type: 'success' }), 3500);
  };

  // Load Categories & Centers from Master Data
  const loadMasterDatalists = async () => {
    try {
      const [catRes, centerRes] = await Promise.all([
        masterDataAPI.getItems('cut_category', '', 1, 100),
        masterDataAPI.getItems('center', '', 1, 100),
      ]);
      if (catRes?.success && Array.isArray(catRes.data) && catRes.data.length > 0) {
        const catList = catRes.data.map((c) => c.value?.toUpperCase()).filter(Boolean);
        setCategories((prev) => [...new Set([...prev, ...catList])]);
      }
      if (centerRes?.success && Array.isArray(centerRes.data) && centerRes.data.length > 0) {
        const centerList = centerRes.data.map((c) => c.value?.toUpperCase()).filter(Boolean);
        setCenters((prev) => [...new Set([...prev, ...centerList])]);
      }
    } catch (e) {
      console.warn('Could not load master datalists for cut master:', e);
    }
  };

  const fetchCuts = async () => {
    try {
      setLoading(true);
      const params = {
        search: debouncedSearch.trim(),
        period: 'all',
        limit: 200,
      };
      const [listRes, sumRes] = await Promise.all([
        cutAPI.getAll(params),
        cutAPI.getSummary(),
      ]);
      if (listRes?.success) {
        setCuts(listRes.cuts || []);
      }
      if (sumRes?.success) {
        setSummary(sumRes.summary || { todayTotal: 0, monthTotal: 0, overallTotal: 0 });
      }
    } catch (err) {
      console.error('Error fetching cuts:', err);
      showToast('Error loading cut records: ' + (err.message || 'Server error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasterDatalists();
  }, []);

  useEffect(() => {
    fetchCuts();
  }, [debouncedSearch]);

  const handleOpenAdd = () => {
    setEditingCut(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      centerName: '',
      patientName: '',
      category: '',
      amount: '',
    });
    setShowAddModal(true);
    setTimeout(() => {
      if (centerInputRef.current) centerInputRef.current.focus();
    }, 50);
  };

  const handleOpenEdit = (c) => {
    setEditingCut(c);
    setFormData({
      date: c.date || new Date().toISOString().split('T')[0],
      centerName: c.centerName || '',
      patientName: c.patientName || '',
      category: c.category || '',
      amount: c.amount || '',
    });
    setShowAddModal(true);
    setTimeout(() => {
      if (centerInputRef.current) centerInputRef.current.focus();
    }, 50);
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!formData.centerName.trim()) {
      showToast('Please enter diagnostic center name.', 'error');
      if (centerInputRef.current) centerInputRef.current.focus();
      return;
    }
    if (!formData.category.trim()) {
      showToast('Please enter commission category.', 'error');
      return;
    }
    const num = Number(formData.amount);
    if (!num || num <= 0) {
      showToast('Please enter a valid amount greater than 0.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        date: formData.date,
        centerName: formData.centerName.trim().toUpperCase(),
        patientName: formData.patientName.trim().toUpperCase(),
        category: formData.category.trim().toUpperCase(),
        amount: num,
      };

      if (editingCut) {
        const res = await cutAPI.update(editingCut._id, payload);
        if (res?.success) {
          showToast('Cut record updated successfully!');
          setShowAddModal(false);
          setEditingCut(null);
          fetchCuts();
        } else {
          showToast(res?.message || 'Failed to update cut record', 'error');
        }
      } else {
        const res = await cutAPI.create(payload);
        if (res?.success) {
          showToast(`Cut commission of ₹${num.toLocaleString('en-IN')} saved & added to Today's Income!`);
          if (!categories.includes(payload.category)) {
            setCategories((prev) => [...prev, payload.category]);
          }
          if (!centers.includes(payload.centerName)) {
            setCenters((prev) => [...prev, payload.centerName]);
          }
          setShowAddModal(false);
          fetchCuts();
        } else {
          showToast(res?.message || 'Failed to save cut record', 'error');
        }
      }
    } catch (err) {
      showToast(err.message || 'Error saving cut record', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, center, amt) => {
    if (!window.confirm(`Delete cut commission from "${center}" (₹${amt})?`)) return;
    try {
      const res = await cutAPI.delete(id);
      if (res?.success) {
        showToast('Cut record deleted successfully');
        fetchCuts();
      } else {
        showToast(res?.message || 'Failed to delete cut record', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Error deleting record', 'error');
    }
  };

  const formatDateTime = (c) => {
    let dateStr = c.date || '';
    if (dateStr && dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    let timeStr = '';
    if (c.createdAt) {
      try {
        const d = new Date(c.createdAt);
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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showAddModal) {
          setShowAddModal(false);
        } else if (onNavigateToDashboard) {
          onNavigateToDashboard();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal, onNavigateToDashboard]);

  const totalAmount = cuts.reduce((acc, c) => acc + (c.amount || 0), 0);

  return (
    <div style={styles.container}>
      {/* Toast Notification */}
      {toast.show && (
        <div
          style={{
            ...styles.toast,
            backgroundColor: toast.type === 'error' ? '#DC2626' : '#15803D',
          }}
        >
          {toast.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
          <span>{toast.text}</span>
          <button
            type="button"
            onClick={() => setToast({ show: false, text: '', type: 'success' })}
            style={styles.toastClose}
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* 1. TOP HEADER (EXACT SAME BLUE BAR FROM GIVEN PHOTO) */}
      <div style={styles.topBlueBar}>
        <div style={styles.topBarTitle}>
          Cut Master (Press F5 or Esc to close)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={styles.incomeNoticeBadge}>
            <TrendingUp size={12} color="#86EFAC" />
            <span>Today's Cut Added to Income: +₹{(summary.todayTotal || 0).toLocaleString('en-IN')}</span>
          </div>
          <button
            type="button"
            onClick={onNavigateToDashboard || (() => {})}
            style={styles.topBarCloseBtn}
            title="Close (Esc)"
          >
            <X size={17} color="#FFFFFF" />
          </button>
        </div>
      </div>

      {/* 2. SEARCH & ACTION STRIP (EXACT SAME SEARCH BAR + GREEN BUTTON FROM GIVEN PHOTO) */}
      <div style={styles.searchStrip}>
        <input
          type="text"
          placeholder="SEARCH BY DIAGNOSTIC CENTER, PATIENT, CATEGORY, DATE..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleOpenAdd();
            }
          }}
          style={styles.searchInput}
          autoFocus
        />

        {/* GREEN "+ ADD CUT (Enter)" BUTTON - EXACT SAME DESIGN AS "+ ADD PATIENT (Enter)" */}
        <button
          type="button"
          onClick={handleOpenAdd}
          style={styles.addGreenBtn}
        >
          + ADD CUT (Enter)
        </button>
      </div>

      {/* 3. CUTS DATA TABLE (EXACT SAME COMPACT DESKTOP GRID FROM PHOTO) */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.theadRow}>
              <th style={{ ...styles.th, width: '140px' }}>Date & Time</th>
              <th style={{ ...styles.th, width: '240px' }}>Diagnostic Center / Lab</th>
              <th style={{ ...styles.th, width: '220px' }}>Patient Name</th>
              <th style={styles.th}>Commission Category</th>
              <th style={{ ...styles.th, width: '140px', textAlign: 'right' }}>Cut Amount (₹)</th>
              <th style={{ ...styles.th, width: '140px', textAlign: 'center' }}>Act</th>
            </tr>
          </thead>
          <tbody>
            {loading && cuts.length === 0 ? (
              <tr>
                <td colSpan={6} style={styles.emptyTd}>
                  <RefreshCw size={18} className="animate-spin" style={{ margin: '0 auto 6px' }} />
                  <span>Loading cut commission records...</span>
                </td>
              </tr>
            ) : cuts.length === 0 ? (
              <tr>
                <td colSpan={6} style={styles.emptyTd}>
                  <span>No cut commission records found. Press Enter or click "+ ADD CUT" to add one.</span>
                </td>
              </tr>
            ) : (
              cuts.map((c, idx) => {
                const { dateStr, timeStr } = formatDateTime(c);
                const isEven = idx % 2 === 0;
                return (
                  <tr
                    key={c._id || idx}
                    style={{
                      ...styles.tr,
                      backgroundColor: isEven ? '#FFFFFF' : '#F8FAFC',
                    }}
                  >
                    {/* 1. Date & Time */}
                    <td style={styles.tdDateTime}>
                      <div style={styles.dateText}>{dateStr}</div>
                      <div style={styles.timeBadge}>{timeStr}</div>
                    </td>

                    {/* 2. Diagnostic Center */}
                    <td style={styles.tdCenter}>
                      <span style={styles.centerText}>
                        {c.centerName}
                      </span>
                    </td>

                    {/* 3. Patient Name */}
                    <td style={styles.tdPatient}>
                      <span style={styles.patientText}>
                        {c.patientName || '-'}
                      </span>
                    </td>

                    {/* 4. Category */}
                    <td style={styles.tdCategory}>
                      <span style={styles.categoryNameText}>
                        {c.category}
                      </span>
                    </td>

                    {/* 5. Amount (₹) */}
                    <td style={styles.tdAmount}>
                      <span style={styles.amountText}>
                        + ₹{(c.amount || 0).toLocaleString('en-IN')}
                      </span>
                    </td>

                    {/* 6. Act (The exact 4 Icon Buttons from the photo) */}
                    <td style={styles.tdAct}>
                      <div style={styles.actBox}>
                        {/* Button 1: View / Duplicate */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(c)}
                          title="View / Edit Cut Record"
                          style={styles.actBtnBlue}
                        >
                          <FileText size={14} color="#0284C7" />
                        </button>

                        {/* Button 2: Edit */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(c)}
                          title="Edit Cut Record"
                          style={styles.actBtnOrange}
                        >
                          <Edit size={14} color="#D97706" />
                        </button>

                        {/* Button 3: Print */}
                        <button
                          type="button"
                          onClick={() => window.print()}
                          title="Print Memo"
                          style={styles.actBtnGray}
                        >
                          <Printer size={14} color="#475569" />
                        </button>

                        {/* Button 4: Delete */}
                        <button
                          type="button"
                          onClick={() => handleDelete(c._id, c.centerName, c.amount)}
                          title="Delete Cut Record"
                          style={styles.actBtnRed}
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

      {/* 4. BOTTOM FOOTER BAR */}
      <div style={styles.footerBar}>
        <div>
          Total Records: <strong>{cuts.length}</strong>
        </div>
        <div style={styles.footerTotalWrap}>
          <span>TOTAL CUT COMMISSION:</span>
          <span style={styles.footerTotalVal}>
            + ₹{totalAmount.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* 5. ADD / EDIT CUT MODAL (STRICTLY NO EXTRA FIELDS: ONLY DATE, CENTER DATALIST, PATIENT NAME, CATEGORY DATALIST, AMOUNT) */}
      {showAddModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>
                {editingCut ? 'EDIT CUT COMMISSION' : 'ADD NEW CUT COMMISSION'}
              </span>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={styles.modalCloseBtn}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} style={styles.modalForm}>
              {/* Field 1: Date */}
              <div style={styles.modalFieldGroup}>
                <label style={styles.modalLabel}>Date: *</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  style={styles.modalInput}
                />
              </div>

              {/* Field 2: Diagnostic Center (Datalist) */}
              <div style={styles.modalFieldGroup}>
                <label style={styles.modalLabel}>
                  Diagnostic Center / Lab: <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  ref={centerInputRef}
                  list="cut-centers-modal-list"
                  type="text"
                  required
                  placeholder="E.G. CARE DIAGNOSTICS, SURAT IMAGING..."
                  value={formData.centerName}
                  onChange={(e) => setFormData({ ...formData, centerName: e.target.value })}
                  style={{ ...styles.modalInput, textTransform: 'uppercase' }}
                  autoFocus
                />
                <datalist id="cut-centers-modal-list">
                  {centers.map((c, i) => (
                    <option key={i} value={c} />
                  ))}
                </datalist>
                <span style={styles.modalHint}>
                  (New centers are automatically remembered in Master Data)
                </span>
              </div>

              {/* Field 3: Patient Name */}
              <div style={styles.modalFieldGroup}>
                <label style={styles.modalLabel}>
                  Patient Name:
                </label>
                <input
                  type="text"
                  placeholder="PATIENT NAME (OPTIONAL)..."
                  value={formData.patientName}
                  onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                  style={{ ...styles.modalInput, textTransform: 'uppercase' }}
                />
              </div>

              {/* Field 4: Category (Datalist) */}
              <div style={styles.modalFieldGroup}>
                <label style={styles.modalLabel}>
                  Commission Category: <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  list="cut-categories-modal-list"
                  type="text"
                  required
                  placeholder="E.G. LAB CUT, X-RAY, SONOGRAPHY..."
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={{ ...styles.modalInput, textTransform: 'uppercase' }}
                />
                <datalist id="cut-categories-modal-list">
                  {categories.map((cat, i) => (
                    <option key={i} value={cat} />
                  ))}
                </datalist>
              </div>

              {/* Field 5: Amount (₹) */}
              <div style={styles.modalFieldGroup}>
                <label style={styles.modalLabel}>
                  Cut Amount (₹): <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  style={{ ...styles.modalInput, fontWeight: 800, fontSize: '14px', color: '#15803D' }}
                />
                <span style={{ fontSize: '10px', color: '#15803D', fontWeight: 600 }}>
                  ✓ Automatically added to Today's Clinic Income
                </span>
              </div>

              {/* Action Buttons */}
              <div style={styles.modalBtnRow}>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={styles.modalSaveBtn}
                >
                  {isSubmitting ? 'SAVING...' : editingCut ? 'UPDATE' : 'SAVE (Enter)'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={styles.modalCancelBtn}
                >
                  CANCEL (Esc)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    border: '1px solid #0056B3',
    userSelect: 'none',
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },

  // 1. Top Blue Bar (Exact same blue bar from the given photo)
  topBlueBar: {
    backgroundColor: '#0B5ED7',
    color: '#FFFFFF',
    padding: '7px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '13.5px',
    fontWeight: 700,
    flexShrink: 0,
  },
  topBarTitle: {
    letterSpacing: '0.01em',
  },
  incomeNoticeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    backgroundColor: 'rgba(0,0,0,0.22)',
    padding: '2px 8px',
    borderRadius: '3px',
    fontSize: '11px',
    fontWeight: 700,
    color: '#86EFAC',
  },
  topBarCloseBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
  },

  // 2. Search & Action Strip (Exact same full-width input + Green Button from the given photo)
  searchStrip: {
    backgroundColor: '#F1F5F9',
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderBottom: '1px solid #CBD5E1',
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    height: '34px',
    padding: '6px 12px',
    fontSize: '12.5px',
    fontWeight: 600,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    border: '1px solid #94A3B8',
    borderRadius: '3px',
    outline: 'none',
    textTransform: 'uppercase',
  },
  addGreenBtn: {
    height: '34px',
    backgroundColor: '#15803D', // Forest Green matching "+ ADD PATIENT (Enter)" in photo
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: '12px',
    border: 'none',
    borderRadius: '3px',
    padding: '0 18px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 3. Table Container (Exact same look and column header style as the given photo)
  tableContainer: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'auto',
    backgroundColor: '#FFFFFF',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px',
  },
  theadRow: {
    backgroundColor: '#E2E8F0', // Soft silver-blue header matching photo
    borderBottom: '1px solid #94A3B8',
    position: 'sticky',
    top: 0,
    zIndex: 2,
  },
  th: {
    padding: '7px 10px',
    textAlign: 'left',
    fontSize: '11.5px',
    fontWeight: 800,
    color: '#0F172A',
    borderRight: '1px solid #CBD5E1',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid #E2E8F0',
    transition: 'background-color 0.1s ease',
  },
  tdDateTime: {
    padding: '7px 10px',
    verticalAlign: 'middle',
    borderRight: '1px solid #F1F5F9',
    whiteSpace: 'nowrap',
  },
  dateText: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#0F172A',
  },
  timeBadge: {
    fontSize: '10.5px',
    fontWeight: 600,
    color: '#0284C7',
  },
  tdCenter: {
    padding: '7px 10px',
    verticalAlign: 'middle',
    borderRight: '1px solid #F1F5F9',
  },
  centerText: {
    fontWeight: 800,
    color: '#0F172A',
    textTransform: 'uppercase',
  },
  tdPatient: {
    padding: '7px 10px',
    verticalAlign: 'middle',
    borderRight: '1px solid #F1F5F9',
  },
  patientText: {
    fontWeight: 600,
    color: '#1E40AF',
    textTransform: 'uppercase',
  },
  tdCategory: {
    padding: '7px 10px',
    verticalAlign: 'middle',
    borderRight: '1px solid #F1F5F9',
  },
  categoryNameText: {
    fontWeight: 700,
    color: '#0F172A',
    textTransform: 'uppercase',
  },
  tdAmount: {
    padding: '7px 10px',
    verticalAlign: 'middle',
    borderRight: '1px solid #F1F5F9',
    textAlign: 'right',
  },
  amountText: {
    fontSize: '13px',
    fontWeight: 900,
    color: '#15803D',
  },
  tdAct: {
    padding: '6px 8px',
    verticalAlign: 'middle',
    textAlign: 'center',
    width: '140px',
  },
  actBox: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    backgroundColor: '#F1F5F9',
    padding: '3px 5px',
    borderRadius: '4px',
    border: '1px solid #CBD5E1',
  },
  actBtnBlue: {
    padding: '4px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #BAE6FD',
    borderRadius: '3px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actBtnOrange: {
    padding: '4px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #FDE68A',
    borderRadius: '3px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actBtnGray: {
    padding: '4px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #CBD5E1',
    borderRadius: '3px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actBtnRed: {
    padding: '4px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #FECDD3',
    borderRadius: '3px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTd: {
    padding: '40px 16px',
    textAlign: 'center',
    color: '#64748B',
    fontSize: '12.5px',
  },

  // 4. Footer Bar
  footerBar: {
    backgroundColor: '#F8FAFC',
    borderTop: '1px solid #CBD5E1',
    padding: '7px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '12px',
    fontWeight: 600,
    color: '#334155',
    flexShrink: 0,
  },
  footerTotalWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  footerTotalVal: {
    fontSize: '13px',
    fontWeight: 900,
    color: '#15803D',
  },

  // 5. Modal
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBox: {
    width: '440px',
    backgroundColor: '#FFFFFF',
    borderRadius: '4px',
    border: '1px solid #0056B3',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
    overflow: 'hidden',
  },
  modalHeader: {
    backgroundColor: '#0B5ED7',
    color: '#FFFFFF',
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '0.02em',
  },
  modalCloseBtn: {
    background: 'none',
    border: 'none',
    color: '#FFFFFF',
    cursor: 'pointer',
    padding: 0,
  },
  modalForm: {
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  modalFieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  modalLabel: {
    fontSize: '11.5px',
    fontWeight: 700,
    color: '#334155',
  },
  modalInput: {
    height: '32px',
    padding: '4px 8px',
    fontSize: '12.5px',
    border: '1px solid #94A3B8',
    borderRadius: '3px',
    outline: 'none',
    backgroundColor: '#FFFFFF',
  },
  modalHint: {
    fontSize: '10px',
    color: '#64748B',
  },
  modalBtnRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '6px',
    borderTop: '1px solid #E2E8F0',
    paddingTop: '10px',
  },
  modalSaveBtn: {
    height: '32px',
    padding: '0 16px',
    backgroundColor: '#15803D',
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: '12px',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
  },
  modalCancelBtn: {
    height: '32px',
    padding: '0 12px',
    backgroundColor: '#F1F5F9',
    color: '#475569',
    fontWeight: 600,
    fontSize: '12px',
    border: '1px solid #CBD5E1',
    borderRadius: '3px',
    cursor: 'pointer',
  },

  // Toast
  toast: {
    position: 'fixed',
    top: '16px',
    right: '16px',
    zIndex: 10000,
    color: '#FFFFFF',
    padding: '8px 14px',
    borderRadius: '4px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    fontWeight: 600,
  },
  toastClose: {
    background: 'none',
    border: 'none',
    color: '#FFFFFF',
    cursor: 'pointer',
    padding: 0,
    marginLeft: '6px',
    display: 'flex',
  },
};

export default CutMaster;
