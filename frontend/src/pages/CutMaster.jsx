import React, { useState, useEffect, useRef } from 'react';
import { cutAPI, masterDataAPI } from '../services/api';
import { useDebounce } from '../hooks/useDebounce';
import {
  Percent,
  Calendar,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  Edit,
  X,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  Layers,
  ArrowRight,
  Printer,
  Building2,
  TrendingUp,
} from 'lucide-react';

export const CutMaster = () => {
  const [cuts, setCuts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({ todayTotal: 0, monthTotal: 0, overallTotal: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [selectedPeriod, setSelectedPeriod] = useState('today'); // 'today' | 'yesterday' | 'thismonth' | 'all' | 'custom'
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  });

  // Center & Category Datalist state
  const [categories, setCategories] = useState([
    'LAB INVESTIGATION CUT',
    'X-RAY / RADIOLOGY COMMISSION',
    'SONOGRAPHY / USG CUT',
    'CT-SCAN / MRI REFERRAL',
    'PATHOLOGY COMMISSION',
    'HOSPITAL ADMISSION REFERRAL',
    'SPECIALIST CONSULTATION CUT',
    'SURGICAL REFERRAL',
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

  // Form State
  const initialForm = {
    date: new Date().toISOString().split('T')[0],
    centerName: '',
    patientName: '',
    category: '',
    amount: '',
    paymentMode: 'Cash',
    reference: '',
    notes: '',
  };
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, text: '', type: 'success' });

  const centerInputRef = useRef(null);

  const showToast = (text, type = 'success') => {
    setToast({ show: true, text, type });
    setTimeout(() => setToast({ show: false, text: '', type: 'success' }), 3500);
  };

  // Load existing cut categories and centers from Master Data
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
        period: selectedPeriod,
        search: debouncedSearch.trim(),
      };
      if (selectedPeriod === 'custom' && selectedDate) {
        params.date = selectedDate;
      }
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
      showToast('Failed to load cut records: ' + (err.message || 'Server error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasterDatalists();
  }, []);

  useEffect(() => {
    fetchCuts();
  }, [debouncedSearch, selectedPeriod, selectedDate]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!form.centerName.trim()) {
      showToast('Please specify a diagnostic center / lab / source name.', 'error');
      if (centerInputRef.current) centerInputRef.current.focus();
      return;
    }
    if (!form.category.trim()) {
      showToast('Please select or type a cut commission category.', 'error');
      return;
    }
    const num = Number(form.amount);
    if (!num || num <= 0) {
      showToast('Please enter a valid positive cut amount.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        ...form,
        centerName: form.centerName.trim().toUpperCase(),
        patientName: form.patientName.trim().toUpperCase(),
        category: form.category.trim().toUpperCase(),
        amount: num,
      };

      if (editingId) {
        const res = await cutAPI.update(editingId, payload);
        if (res?.success) {
          showToast('Cut commission record updated successfully!');
          setEditingId(null);
          setForm(initialForm);
          fetchCuts();
        } else {
          showToast(res?.message || 'Failed to update cut record', 'error');
        }
      } else {
        const res = await cutAPI.create(payload);
        if (res?.success) {
          showToast('Cut commission recorded! Added directly to Today\'s Income.');
          if (!categories.includes(payload.category)) {
            setCategories((prev) => [...prev, payload.category]);
          }
          if (!centers.includes(payload.centerName)) {
            setCenters((prev) => [...prev, payload.centerName]);
          }
          setForm(initialForm);
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

  const handleEdit = (c) => {
    setEditingId(c._id);
    setForm({
      date: c.date || new Date().toISOString().split('T')[0],
      centerName: c.centerName || '',
      patientName: c.patientName || '',
      category: c.category || '',
      amount: c.amount || '',
      paymentMode: c.paymentMode || 'Cash',
      reference: c.reference || '',
      notes: c.notes || '',
    });
    setShowAddForm(true);
    setTimeout(() => {
      if (centerInputRef.current) centerInputRef.current.focus();
    }, 50);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(initialForm);
  };

  const handleDelete = async (id, center, amt) => {
    if (!window.confirm(`Delete commission from "${center}" (₹${amt})?`)) return;
    try {
      const res = await cutAPI.delete(id);
      if (res?.success) {
        showToast('Cut record deleted successfully');
        if (editingId === id) handleCancelEdit();
        fetchCuts();
      } else {
        showToast(res?.message || 'Failed to delete record', 'error');
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

  const currentViewTotal = cuts.reduce((acc, c) => acc + (c.amount || 0), 0);

  return (
    <div style={styles.windowContainer}>
      {/* Toast Notification */}
      {toast.show && (
        <div
          style={{
            ...styles.toastNotification,
            backgroundColor: toast.type === 'error' ? '#DC2626' : '#15803D',
          }}
        >
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.text}</span>
          <button
            type="button"
            onClick={() => setToast({ show: false, text: '', type: 'success' })}
            style={styles.toastCloseBtn}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 1. TOP WINDOW TITLE BAR (EXACT DESKTOP BLUE/CRIMSON BAR) */}
      <div style={styles.windowTitleBar}>
        <div style={styles.windowTitleLeft}>
          <Percent size={15} color="#FFFFFF" />
          <span style={styles.windowTitleText}>
            Cut Master (Referral Commission Tracker - Press F5 or Esc to close)
          </span>
        </div>
        <div style={styles.windowTitleRight}>
          <span style={styles.incomeNoticePill}>
            <TrendingUp size={12} color="#86EFAC" />
            <span>Today's Cut Added to Income: +₹{(summary.todayTotal || 0).toLocaleString('en-IN')}</span>
          </span>
          <span style={styles.windowShortcutBadge}>F5</span>
        </div>
      </div>

      {/* 2. SEARCH & FILTER ACTION BAR (MATCHING USER'S PHOTO INPUT ROW) */}
      <div style={styles.searchActionBar}>
        {/* Full-width Search Input */}
        <div style={styles.searchWrapper}>
          <Search size={15} color="#64748B" style={styles.searchIcon} />
          <input
            type="text"
            placeholder="SEARCH BY DIAGNOSTIC CENTER, PATIENT, CATEGORY, REF NO..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={styles.clearSearchBtn}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Quick Period Filters */}
        <div style={styles.periodPillGroup}>
          {[
            { id: 'today', label: 'TODAY' },
            { id: 'yesterday', label: 'YESTERDAY' },
            { id: 'thismonth', label: 'THIS MONTH' },
            { id: 'all', label: 'ALL RECORDS' },
            { id: 'custom', label: 'CUSTOM' },
          ].map((p) => {
            const isSelected = selectedPeriod === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPeriod(p.id)}
                style={{
                  ...styles.periodPillBtn,
                  backgroundColor: isSelected ? '#BE123C' : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : '#334155',
                  borderColor: isSelected ? '#BE123C' : '#CBD5E1',
                  fontWeight: isSelected ? 700 : 500,
                }}
              >
                {p.label}
              </button>
            );
          })}
          {selectedPeriod === 'custom' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={styles.datePickerInput}
            />
          )}
        </div>

        {/* Refresh & + ADD CUT (ENTER) Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={fetchCuts}
            title="Refresh records"
            style={styles.refreshIconBtn}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* + ADD CUT (ENTER) BUTTON - EXACT SAME GREEN BUTTON AS PHOTO */}
          <button
            type="button"
            onClick={() => {
              setShowAddForm((prev) => !prev);
              if (!showAddForm) {
                setTimeout(() => {
                  if (centerInputRef.current) centerInputRef.current.focus();
                }, 50);
              }
            }}
            style={styles.addCutBtn}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>{editingId ? 'EDITING CUT' : '+ ADD CUT (Enter)'}</span>
          </button>
        </div>
      </div>

      {/* 3. ENTRY / EDIT CUT COMMISSION FORM (CLEAN DESKTOP INLINE PANEL) */}
      {showAddForm && (
        <form onSubmit={handleSubmit} style={styles.entryFormPanel}>
          <div style={styles.formHeaderRow}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={styles.formHeaderDot}></span>
              <span style={styles.formHeaderText}>
                {editingId ? 'EDIT REFERRAL COMMISSION ENTRY' : 'NEW REFERRAL CUT COMMISSION (AUTO-ADDS TO TODAY\'S INCOME)'}
              </span>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                style={styles.cancelEditBtn}
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div style={styles.formFieldsRow}>
            {/* Field 1: Date */}
            <div style={{ ...styles.formFieldCol, width: '130px', flexShrink: 0 }}>
              <label style={styles.formLabel}>Date: *</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                style={styles.formInput}
              />
            </div>

            {/* Field 2: Diagnostic Center (Datalist) */}
            <div style={{ ...styles.formFieldCol, flex: 2, minWidth: '180px' }}>
              <label style={styles.formLabel}>
                Diagnostic Center / Source: <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                ref={centerInputRef}
                list="cut-centers-list"
                type="text"
                required
                placeholder="E.G. CARE DIAGNOSTICS, SURAT IMAGING..."
                value={form.centerName}
                onChange={(e) => setForm({ ...form, centerName: e.target.value })}
                style={{ ...styles.formInput, textTransform: 'uppercase' }}
              />
              <datalist id="cut-centers-list">
                {centers.map((c, i) => (
                  <option key={i} value={c} />
                ))}
              </datalist>
            </div>

            {/* Field 3: Patient Name (Optional) */}
            <div style={{ ...styles.formFieldCol, flex: 2, minWidth: '160px' }}>
              <label style={styles.formLabel}>Referred Patient Name:</label>
              <input
                type="text"
                placeholder="PATIENT NAME (OPTIONAL)..."
                value={form.patientName}
                onChange={(e) => setForm({ ...form, patientName: e.target.value })}
                style={{ ...styles.formInput, textTransform: 'uppercase' }}
              />
            </div>

            {/* Field 4: Category (Datalist) */}
            <div style={{ ...styles.formFieldCol, flex: 2, minWidth: '170px' }}>
              <label style={styles.formLabel}>
                Cut Category: <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                list="cut-categories-list"
                type="text"
                required
                placeholder="E.G. LAB CUT, X-RAY, MRI..."
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                style={{ ...styles.formInput, textTransform: 'uppercase' }}
              />
              <datalist id="cut-categories-list">
                {categories.map((cat, i) => (
                  <option key={i} value={cat} />
                ))}
              </datalist>
            </div>

            {/* Field 5: Amount (₹) */}
            <div style={{ ...styles.formFieldCol, width: '120px', flexShrink: 0 }}>
              <label style={styles.formLabel}>
                Cut Amount (₹): <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="₹ 0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                style={{ ...styles.formInput, fontWeight: 800, color: '#15803D' }}
              />
            </div>

            {/* Field 6: Payment Mode */}
            <div style={{ ...styles.formFieldCol, width: '120px', flexShrink: 0 }}>
              <label style={styles.formLabel}>Payment Mode:</label>
              <select
                value={form.paymentMode}
                onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
                style={styles.formSelect}
              >
                <option value="Cash">Cash</option>
                <option value="Online/UPI">Online/UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Field 7: Ref / Bill No. */}
            <div style={{ ...styles.formFieldCol, width: '130px', flexShrink: 0 }}>
              <label style={styles.formLabel}>Ref / Bill No.:</label>
              <input
                type="text"
                placeholder="RECEIPT / BILL #"
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                style={styles.formInput}
              />
            </div>

            {/* Field 8: Notes */}
            <div style={{ ...styles.formFieldCol, flex: 2, minWidth: '160px' }}>
              <label style={styles.formLabel}>Notes / Remarks:</label>
              <input
                type="text"
                placeholder="TEST DETAILS, REMARKS..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                style={styles.formInput}
              />
            </div>

            {/* Submit Button */}
            <div style={{ ...styles.formFieldCol, alignSelf: 'flex-end', flexShrink: 0 }}>
              <button
                type="submit"
                disabled={isSubmitting}
                style={styles.saveSubmitBtn}
              >
                {isSubmitting ? 'SAVING...' : editingId ? 'UPDATE' : 'SAVE (F2)'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 4. CUTS DATA TABLE (EXACT SAME COMPACT DESKTOP GRID FROM PHOTO) */}
      <div style={styles.tableScrollWrapper}>
        <table style={styles.dataTable}>
          <thead>
            <tr style={styles.theadRow}>
              <th style={{ ...styles.th, width: '45px', textAlign: 'center' }}>#</th>
              <th style={{ ...styles.th, width: '130px' }}>Date & Time</th>
              <th style={{ ...styles.th, width: '220px' }}>Diagnostic Center / Lab Source</th>
              <th style={{ ...styles.th, width: '180px' }}>Patient Name</th>
              <th style={{ ...styles.th, width: '180px' }}>Commission Category</th>
              <th style={{ ...styles.th, width: '120px' }}>Ref / Bill No.</th>
              <th style={styles.th}>Notes / Description</th>
              <th style={{ ...styles.th, width: '90px' }}>Mode</th>
              <th style={{ ...styles.th, width: '120px', textAlign: 'right' }}>Cut Amount (₹)</th>
              <th style={{ ...styles.th, width: '90px', textAlign: 'center' }}>Act</th>
            </tr>
          </thead>
          <tbody>
            {loading && cuts.length === 0 ? (
              <tr>
                <td colSpan={10} style={styles.emptyTd}>
                  <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 6px' }} />
                  <span>Loading cut commission records...</span>
                </td>
              </tr>
            ) : cuts.length === 0 ? (
              <tr>
                <td colSpan={10} style={styles.emptyTd}>
                  <Percent size={24} color="#94A3B8" style={{ margin: '0 auto 6px' }} />
                  <span>No cut records found for the selected period.</span>
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
                    {/* Index */}
                    <td style={{ ...styles.td, textAlign: 'center', color: '#64748B', fontWeight: 600 }}>
                      {idx + 1}
                    </td>

                    {/* Date & Time */}
                    <td style={styles.td}>
                      <div style={styles.dateText}>{dateStr}</div>
                      <div style={styles.timeBadge}>{timeStr}</div>
                    </td>

                    {/* Diagnostic Center */}
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Building2 size={13} color="#64748B" />
                        <span style={{ fontWeight: 700, color: '#0F172A' }}>
                          {c.centerName}
                        </span>
                      </div>
                    </td>

                    {/* Patient Name */}
                    <td style={styles.td}>
                      <span style={{ fontWeight: 600, color: '#1E40AF' }}>
                        {c.patientName || '-'}
                      </span>
                    </td>

                    {/* Category */}
                    <td style={styles.td}>
                      <span style={styles.categoryBadge}>
                        {c.category}
                      </span>
                    </td>

                    {/* Reference */}
                    <td style={styles.td}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#475569' }}>
                        {c.reference || '-'}
                      </span>
                    </td>

                    {/* Notes */}
                    <td style={{ ...styles.td, color: '#475569' }}>
                      {c.notes || '-'}
                    </td>

                    {/* Payment Mode */}
                    <td style={styles.td}>
                      <span style={styles.modeBadge}>
                        {c.paymentMode || 'Cash'}
                      </span>
                    </td>

                    {/* Cut Amount (₹) */}
                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: 900, color: '#15803D', fontSize: '13px' }}>
                      + ₹{(c.amount || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Act (Buttons matching the photo) */}
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <div style={styles.actButtonGroup}>
                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleEdit(c)}
                          title="Edit Cut Record"
                          style={styles.btnEdit}
                        >
                          <Edit size={13} color="#D97706" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDelete(c._id, c.centerName, c.amount)}
                          title="Delete Record"
                          style={styles.btnDelete}
                        >
                          <Trash2 size={13} color="#DC2626" />
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

      {/* 5. BOTTOM SUMMARY BAR (MATCHING CLINIC FOOTER DESIGN) */}
      <div style={styles.windowFooterBar}>
        <div style={styles.footerLeft}>
          <span style={styles.footerCountText}>
            Total Records: <strong>{cuts.length}</strong>
          </span>
          <span style={styles.footerDivider}>|</span>
          <span style={styles.footerPeriodText}>
            Period: <strong>{selectedPeriod.toUpperCase()}</strong>
          </span>
        </div>

        <div style={styles.footerRight}>
          <div style={styles.footerMetricItemHighlight}>
            <span style={styles.footerMetricLabel}>TODAY'S CUT ADDED TO INCOME:</span>
            <span style={{ ...styles.footerMetricVal, color: '#15803D', fontWeight: 900 }}>
              + ₹{(summary.todayTotal || 0).toLocaleString('en-IN')}
            </span>
          </div>

          <div style={styles.footerMetricItem}>
            <span style={styles.footerMetricLabel}>THIS MONTH:</span>
            <span style={{ ...styles.footerMetricVal, color: '#1E40AF' }}>
              ₹{(summary.monthTotal || 0).toLocaleString('en-IN')}
            </span>
          </div>

          <div style={styles.footerMetricItem}>
            <span style={styles.footerMetricLabel}>TOTAL VIEW COMMISSION:</span>
            <span style={{ ...styles.footerMetricVal, color: '#0F172A', fontWeight: 800 }}>
              + ₹{currentViewTotal.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  windowContainer: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    border: '1px solid #CBD5E1',
    userSelect: 'none',
  },

  // 1. Title Bar
  windowTitleBar: {
    backgroundColor: '#BE123C', // Clinic Maroon / Deep Rose matching Cut Master tab in photo
    color: '#FFFFFF',
    padding: '7px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '13.5px',
    fontWeight: 700,
    letterSpacing: '0.02em',
    flexShrink: 0,
  },
  windowTitleLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  windowTitleText: {
    textTransform: 'uppercase',
  },
  windowTitleRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  incomeNoticePill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    color: '#86EFAC',
    fontSize: '11px',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: '3px',
  },
  windowShortcutBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    padding: '2px 7px',
    borderRadius: '3px',
    fontSize: '11px',
    fontWeight: 800,
  },

  // 2. Search & Action Strip
  searchActionBar: {
    backgroundColor: '#F1F5F9',
    padding: '7px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    borderBottom: '1px solid #CBD5E1',
    flexShrink: 0,
    flexWrap: 'wrap',
  },
  searchWrapper: {
    position: 'relative',
    flex: 1,
    minWidth: '260px',
  },
  searchIcon: {
    position: 'absolute',
    left: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '6px 28px 6px 32px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    border: '1px solid #94A3B8',
    borderRadius: '4px',
    outline: 'none',
    textTransform: 'uppercase',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#94A3B8',
  },
  periodPillGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  periodPillBtn: {
    fontSize: '11px',
    padding: '4px 9px',
    borderRadius: '3px',
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  datePickerInput: {
    fontSize: '11px',
    padding: '3px 6px',
    borderRadius: '3px',
    border: '1px solid #CBD5E1',
    outline: 'none',
  },
  refreshIconBtn: {
    padding: '6px 8px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #CBD5E1',
    borderRadius: '4px',
    cursor: 'pointer',
    color: '#475569',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCutBtn: {
    backgroundColor: '#15803D', // Deep Forest Green matching "+ ADD PATIENT (Enter)" in photo
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: '12px',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
  },

  // 3. Entry Form Panel
  entryFormPanel: {
    backgroundColor: '#F8FAFC',
    borderBottom: '2px solid #BE123C',
    padding: '10px 14px',
    flexShrink: 0,
  },
  formHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  formHeaderDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: '#BE123C',
  },
  formHeaderText: {
    fontSize: '11.5px',
    fontWeight: 800,
    color: '#BE123C',
    letterSpacing: '0.03em',
  },
  cancelEditBtn: {
    fontSize: '11px',
    padding: '2px 8px',
    backgroundColor: '#F1F5F9',
    border: '1px solid #CBD5E1',
    borderRadius: '3px',
    cursor: 'pointer',
    color: '#475569',
  },
  formFieldsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  formFieldCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  formLabel: {
    fontSize: '10.5px',
    fontWeight: 700,
    color: '#475569',
    whiteSpace: 'nowrap',
  },
  formInput: {
    height: '29px',
    padding: '4px 8px',
    fontSize: '12px',
    border: '1px solid #94A3B8',
    borderRadius: '3px',
    backgroundColor: '#FFFFFF',
    outline: 'none',
  },
  formSelect: {
    height: '29px',
    padding: '4px 6px',
    fontSize: '12px',
    border: '1px solid #94A3B8',
    borderRadius: '3px',
    backgroundColor: '#FFFFFF',
    outline: 'none',
  },
  saveSubmitBtn: {
    height: '29px',
    padding: '0 16px',
    backgroundColor: '#15803D',
    color: '#FFFFFF',
    fontWeight: 800,
    fontSize: '11.5px',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
  },

  // 4. Data Table
  tableScrollWrapper: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'auto',
    backgroundColor: '#FFFFFF',
  },
  dataTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px',
  },
  theadRow: {
    backgroundColor: '#E2E8F0', // Soft silver-blue header matching clinic screenshot
    borderBottom: '1px solid #94A3B8',
    position: 'sticky',
    top: 0,
    zIndex: 2,
  },
  th: {
    padding: '7px 8px',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: 800,
    color: '#0F172A',
    letterSpacing: '0.02em',
    borderRight: '1px solid #CBD5E1',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid #E2E8F0',
    transition: 'background-color 0.1s ease',
  },
  td: {
    padding: '6px 8px',
    verticalAlign: 'middle',
    borderRight: '1px solid #F1F5F9',
  },
  dateText: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#0F172A',
  },
  timeBadge: {
    fontSize: '10px',
    fontWeight: 600,
    color: '#0284C7',
  },
  categoryBadge: {
    display: 'inline-block',
    padding: '2px 7px',
    borderRadius: '3px',
    fontSize: '11px',
    fontWeight: 700,
    backgroundColor: '#FFE4E6',
    color: '#9F1239',
    border: '1px solid #FECDD3',
  },
  modeBadge: {
    display: 'inline-block',
    padding: '2px 6px',
    borderRadius: '3px',
    fontSize: '10.5px',
    fontWeight: 600,
    backgroundColor: '#F1F5F9',
    color: '#475569',
    border: '1px solid #E2E8F0',
  },
  actButtonGroup: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#F1F5F9',
    padding: '2px 4px',
    borderRadius: '4px',
    border: '1px solid #CBD5E1',
  },
  btnEdit: {
    padding: '3px 5px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #FCD34D',
    borderRadius: '3px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDelete: {
    padding: '3px 5px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #FCA5A5',
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
    fontSize: '12px',
  },

  // 5. Window Footer Bar
  windowFooterBar: {
    backgroundColor: '#F8FAFC',
    borderTop: '1px solid #CBD5E1',
    padding: '7px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '11.5px',
    flexShrink: 0,
    flexWrap: 'wrap',
    gap: '8px',
  },
  footerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#475569',
  },
  footerCountText: {
    fontSize: '12px',
  },
  footerDivider: {
    color: '#CBD5E1',
  },
  footerPeriodText: {
    fontSize: '11px',
  },
  footerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  footerMetricItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  footerMetricItemHighlight: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#DCFCE7',
    padding: '3px 10px',
    borderRadius: '4px',
    border: '1px solid #86EFAC',
  },
  footerMetricLabel: {
    fontSize: '10.5px',
    fontWeight: 700,
    color: '#64748B',
  },
  footerMetricVal: {
    fontSize: '12.5px',
    fontWeight: 800,
  },

  // Toast
  toastNotification: {
    position: 'fixed',
    top: '16px',
    right: '16px',
    zIndex: 9999,
    color: '#FFFFFF',
    padding: '8px 14px',
    borderRadius: '5px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    fontWeight: 600,
  },
  toastCloseBtn: {
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
