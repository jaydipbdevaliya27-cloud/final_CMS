import React, { useState, useEffect, useRef } from 'react';
import { expenseAPI, masterDataAPI } from '../services/api';
import { useDebounce } from '../hooks/useDebounce';
import {
  Wallet,
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
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const ExpenseMaster = () => {
  const [expenses, setExpenses] = useState([]);
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

  // Category Datalist state
  const [categories, setCategories] = useState([
    'TEA & REFRESHMENTS',
    'ELECTRICITY BILL',
    'CLINIC RENT',
    'STAFF SALARY',
    'MEDICINE PURCHASE',
    'STATIONERY & PRINTING',
    'CLEANING & MAINTENANCE',
    'TELEPHONE & INTERNET',
    'DISPOSABLES / SYRINGES',
    'WATER / UTILITIES',
    'MISCELLANEOUS',
  ]);

  // Form State
  const initialForm = {
    date: new Date().toISOString().split('T')[0],
    category: '',
    amount: '',
    paymentMode: 'Cash',
    paidTo: '',
    description: '',
  };
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, text: '', type: 'success' });

  const categoryInputRef = useRef(null);

  const showToast = (text, type = 'success') => {
    setToast({ show: true, text, type });
    setTimeout(() => setToast({ show: false, text: '', type: 'success' }), 3500);
  };

  // Load existing expense categories from Master Data
  const loadCategories = async () => {
    try {
      const res = await masterDataAPI.getItems('expense_category', '', 1, 100);
      if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
        const catList = res.data.map((c) => c.value?.toUpperCase()).filter(Boolean);
        setCategories((prev) => [...new Set([...prev, ...catList])]);
      }
    } catch (e) {
      console.warn('Could not load expense categories:', e);
    }
  };

  const fetchExpenses = async () => {
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
        expenseAPI.getAll(params),
        expenseAPI.getSummary(),
      ]);
      if (listRes?.success) {
        setExpenses(listRes.expenses || []);
      }
      if (sumRes?.success) {
        setSummary(sumRes.summary || { todayTotal: 0, monthTotal: 0, overallTotal: 0 });
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
      showToast('Failed to load expenses: ' + (err.message || 'Server error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [debouncedSearch, selectedPeriod, selectedDate]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!form.category.trim()) {
      showToast('Please enter or select an expense category.', 'error');
      if (categoryInputRef.current) categoryInputRef.current.focus();
      return;
    }
    const num = Number(form.amount);
    if (!num || num <= 0) {
      showToast('Please enter a valid expense amount greater than 0.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        ...form,
        category: form.category.trim().toUpperCase(),
        paidTo: form.paidTo.trim().toUpperCase(),
        amount: num,
      };

      if (editingId) {
        const res = await expenseAPI.update(editingId, payload);
        if (res?.success) {
          showToast('Expense updated successfully!');
          setEditingId(null);
          setForm(initialForm);
          fetchExpenses();
        } else {
          showToast(res?.message || 'Failed to update expense', 'error');
        }
      } else {
        const res = await expenseAPI.create(payload);
        if (res?.success) {
          showToast(`Expense of ₹${num.toLocaleString('en-IN')} recorded successfully!`);
          if (!categories.includes(payload.category)) {
            setCategories((prev) => [...prev, payload.category]);
          }
          setForm(initialForm);
          fetchExpenses();
        } else {
          showToast(res?.message || 'Failed to record expense', 'error');
        }
      }
    } catch (err) {
      showToast(err.message || 'Error saving expense', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (exp) => {
    setEditingId(exp._id);
    setForm({
      date: exp.date || new Date().toISOString().split('T')[0],
      category: exp.category || '',
      amount: exp.amount || '',
      paymentMode: exp.paymentMode || 'Cash',
      paidTo: exp.paidTo || '',
      description: exp.description || '',
    });
    setShowAddForm(true);
    setTimeout(() => {
      if (categoryInputRef.current) categoryInputRef.current.focus();
    }, 50);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(initialForm);
  };

  const handleDelete = async (id, cat, amt) => {
    if (!window.confirm(`Delete expense "${cat}" (₹${amt})?`)) return;
    try {
      const res = await expenseAPI.delete(id);
      if (res?.success) {
        showToast('Expense record deleted successfully');
        if (editingId === id) handleCancelEdit();
        fetchExpenses();
      } else {
        showToast(res?.message || 'Failed to delete expense', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Error deleting expense', 'error');
    }
  };

  // Format Date and Time
  const formatDateTime = (exp) => {
    let dateStr = exp.date || '';
    if (dateStr && dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    let timeStr = '';
    if (exp.createdAt) {
      try {
        const d = new Date(exp.createdAt);
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

  const currentViewTotal = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);

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

      {/* 1. TOP WINDOW TITLE BAR (EXACT SAME BLUE BAR FROM USER'S PHOTO) */}
      <div style={styles.windowTitleBar}>
        <div style={styles.windowTitleLeft}>
          <Wallet size={15} color="#FFFFFF" />
          <span style={styles.windowTitleText}>
            Expense Master (Press F6 or Esc to close)
          </span>
        </div>
        <div style={styles.windowTitleRight}>
          <span style={styles.windowShortcutBadge}>F6</span>
        </div>
      </div>

      {/* 2. SEARCH & FILTER ACTION BAR (MATCHING USER'S PHOTO INPUT ROW) */}
      <div style={styles.searchActionBar}>
        {/* Full-width Search Input */}
        <div style={styles.searchWrapper}>
          <Search size={15} color="#64748B" style={styles.searchIcon} />
          <input
            type="text"
            placeholder="SEARCH BY CATEGORY, PAID TO, DESCRIPTION, REF..."
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
                  backgroundColor: isSelected ? '#0B5ED7' : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : '#334155',
                  borderColor: isSelected ? '#0B5ED7' : '#CBD5E1',
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

        {/* Refresh & Toggle Form Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={fetchExpenses}
            title="Refresh records"
            style={styles.refreshIconBtn}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* + ADD EXPENSE (ENTER) BUTTON - EXACT SAME GREEN BUTTON AS PHOTO */}
          <button
            type="button"
            onClick={() => {
              setShowAddForm((prev) => !prev);
              if (!showAddForm) {
                setTimeout(() => {
                  if (categoryInputRef.current) categoryInputRef.current.focus();
                }, 50);
              }
            }}
            style={styles.addExpenseBtn}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>{editingId ? 'EDITING EXPENSE' : '+ ADD EXPENSE (Enter)'}</span>
          </button>
        </div>
      </div>

      {/* 3. ENTRY / EDIT EXPENSE FORM (CLEAN DESKTOP INLINE PANEL) */}
      {showAddForm && (
        <form onSubmit={handleSubmit} style={styles.entryFormPanel}>
          <div style={styles.formHeaderRow}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={styles.formHeaderDot}></span>
              <span style={styles.formHeaderText}>
                {editingId ? 'EDIT CLINICAL EXPENSE ENTRY' : 'NEW EXPENSE ENTRY (AUTO-SAVES TO MASTER)'}
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

            {/* Field 2: Category (Datalist) */}
            <div style={{ ...styles.formFieldCol, flex: 2, minWidth: '180px' }}>
              <label style={styles.formLabel}>
                Expense Category: <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                ref={categoryInputRef}
                list="expense-categories-list"
                type="text"
                required
                placeholder="TYPE OR SELECT CATEGORY..."
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                style={{ ...styles.formInput, textTransform: 'uppercase' }}
              />
              <datalist id="expense-categories-list">
                {categories.map((c, i) => (
                  <option key={i} value={c} />
                ))}
              </datalist>
            </div>

            {/* Field 3: Paid To / Beneficiary */}
            <div style={{ ...styles.formFieldCol, flex: 2, minWidth: '160px' }}>
              <label style={styles.formLabel}>Paid To / Person / Firm:</label>
              <input
                type="text"
                placeholder="BENEFICIARY OR FIRM..."
                value={form.paidTo}
                onChange={(e) => setForm({ ...form, paidTo: e.target.value })}
                style={{ ...styles.formInput, textTransform: 'uppercase' }}
              />
            </div>

            {/* Field 4: Amount (₹) */}
            <div style={{ ...styles.formFieldCol, width: '120px', flexShrink: 0 }}>
              <label style={styles.formLabel}>
                Amount (₹): <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="₹ 0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                style={{ ...styles.formInput, fontWeight: 700, color: '#B91C1C' }}
              />
            </div>

            {/* Field 5: Payment Mode */}
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

            {/* Field 6: Description */}
            <div style={{ ...styles.formFieldCol, flex: 3, minWidth: '200px' }}>
              <label style={styles.formLabel}>Description / Remarks:</label>
              <input
                type="text"
                placeholder="REMARKS OR INVOICE #..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
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

      {/* 4. EXPENSES DATA TABLE (EXACT SAME COMPACT DESKTOP GRID FROM PHOTO) */}
      <div style={styles.tableScrollWrapper}>
        <table style={styles.dataTable}>
          <thead>
            <tr style={styles.theadRow}>
              <th style={{ ...styles.th, width: '45px', textAlign: 'center' }}>#</th>
              <th style={{ ...styles.th, width: '130px' }}>Date & Time</th>
              <th style={{ ...styles.th, width: '220px' }}>Expense Category</th>
              <th style={{ ...styles.th, width: '180px' }}>Paid To / Vendor</th>
              <th style={styles.th}>Description / Remarks</th>
              <th style={{ ...styles.th, width: '110px' }}>Mode</th>
              <th style={{ ...styles.th, width: '110px', textAlign: 'right' }}>Amount (₹)</th>
              <th style={{ ...styles.th, width: '90px', textAlign: 'center' }}>Act</th>
            </tr>
          </thead>
          <tbody>
            {loading && expenses.length === 0 ? (
              <tr>
                <td colSpan={8} style={styles.emptyTd}>
                  <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 6px' }} />
                  <span>Loading expenses...</span>
                </td>
              </tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={8} style={styles.emptyTd}>
                  <Wallet size={24} color="#94A3B8" style={{ margin: '0 auto 6px' }} />
                  <span>No expense entries found for the selected period.</span>
                </td>
              </tr>
            ) : (
              expenses.map((exp, idx) => {
                const { dateStr, timeStr } = formatDateTime(exp);
                const isEven = idx % 2 === 0;
                return (
                  <tr
                    key={exp._id || idx}
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

                    {/* Expense Category */}
                    <td style={styles.td}>
                      <span style={styles.categoryBadge}>
                        {exp.category}
                      </span>
                    </td>

                    {/* Paid To */}
                    <td style={styles.td}>
                      <span style={{ fontWeight: 600, color: '#1E293B' }}>
                        {exp.paidTo || '-'}
                      </span>
                    </td>

                    {/* Description */}
                    <td style={{ ...styles.td, color: '#475569' }}>
                      {exp.description || '-'}
                    </td>

                    {/* Payment Mode */}
                    <td style={styles.td}>
                      <span style={styles.modeBadge}>
                        {exp.paymentMode || 'Cash'}
                      </span>
                    </td>

                    {/* Amount (₹) */}
                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: 800, color: '#B91C1C', fontSize: '13px' }}>
                      ₹{(exp.amount || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Act (Buttons matching the photo) */}
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <div style={styles.actButtonGroup}>
                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleEdit(exp)}
                          title="Edit Expense"
                          style={styles.btnEdit}
                        >
                          <Edit size={13} color="#D97706" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDelete(exp._id, exp.category, exp.amount)}
                          title="Delete Expense"
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
            Total Records: <strong>{expenses.length}</strong>
          </span>
          <span style={styles.footerDivider}>|</span>
          <span style={styles.footerPeriodText}>
            Period: <strong>{selectedPeriod.toUpperCase()}</strong>
          </span>
        </div>

        <div style={styles.footerRight}>
          <div style={styles.footerMetricItem}>
            <span style={styles.footerMetricLabel}>TODAY'S EXPENSE:</span>
            <span style={{ ...styles.footerMetricVal, color: '#DC2626' }}>
              ₹{(summary.todayTotal || 0).toLocaleString('en-IN')}
            </span>
          </div>

          <div style={styles.footerMetricItem}>
            <span style={styles.footerMetricLabel}>THIS MONTH:</span>
            <span style={{ ...styles.footerMetricVal, color: '#B45309' }}>
              ₹{(summary.monthTotal || 0).toLocaleString('en-IN')}
            </span>
          </div>

          <div style={styles.footerMetricItemHighlight}>
            <span style={styles.footerMetricLabel}>TOTAL VIEW AMOUNT:</span>
            <span style={{ ...styles.footerMetricVal, color: '#B91C1C', fontWeight: 900 }}>
              ₹{currentViewTotal.toLocaleString('en-IN')}
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
    backgroundColor: '#0B5ED7', // Clinic Royal Blue matching screenshot
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
    gap: '6px',
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
  addExpenseBtn: {
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
    borderBottom: '2px solid #0B5ED7',
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
    backgroundColor: '#0B5ED7',
  },
  formHeaderText: {
    fontSize: '11.5px',
    fontWeight: 800,
    color: '#0B5ED7',
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
    backgroundColor: '#0B5ED7',
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
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    border: '1px solid #FDE68A',
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
    backgroundColor: '#FEE2E2',
    padding: '3px 10px',
    borderRadius: '4px',
    border: '1px solid #FCA5A5',
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

export default ExpenseMaster;
