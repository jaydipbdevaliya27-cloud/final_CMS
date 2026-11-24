import React, { useState, useEffect, useRef } from 'react';
import { expenseAPI, masterDataAPI } from '../services/api';
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
} from 'lucide-react';

export const ExpenseMaster = ({ onNavigateToDashboard }) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Form State - STRICTLY NO EXTRA FIELDS: ONLY Date, Category (Datalist), and Amount (₹)
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '',
    amount: '',
  });

  // Autocomplete Category Datalist (auto-saves new entries to master data)
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, text: '', type: 'success' });
  const categoryInputRef = useRef(null);

  const showToast = (text, type = 'success') => {
    setToast({ show: true, text, type });
    setTimeout(() => setToast({ show: false, text: '', type: 'success' }), 3500);
  };

  // Load Categories from Master Data
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
        search: debouncedSearch.trim(),
        period: 'all',
        limit: 200,
      };
      const res = await expenseAPI.getAll(params);
      if (res?.success) {
        setExpenses(res.expenses || []);
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
      showToast('Error loading expenses: ' + (err.message || 'Server error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [debouncedSearch]);

  // Handle open add modal
  const handleOpenAdd = () => {
    setEditingExpense(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      category: '',
      amount: '',
    });
    setShowAddModal(true);
    setTimeout(() => {
      if (categoryInputRef.current) categoryInputRef.current.focus();
    }, 50);
  };

  // Handle edit expense
  const handleOpenEdit = (exp) => {
    setEditingExpense(exp);
    setFormData({
      date: exp.date || new Date().toISOString().split('T')[0],
      category: exp.category || '',
      amount: exp.amount || '',
    });
    setShowAddModal(true);
    setTimeout(() => {
      if (categoryInputRef.current) categoryInputRef.current.focus();
    }, 50);
  };

  // Save / Submit Expense
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!formData.category.trim()) {
      showToast('Please enter or select expense category.', 'error');
      if (categoryInputRef.current) categoryInputRef.current.focus();
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
        category: formData.category.trim().toUpperCase(),
        amount: num,
      };

      if (editingExpense) {
        const res = await expenseAPI.update(editingExpense._id, payload);
        if (res?.success) {
          showToast('Expense updated successfully!');
          setShowAddModal(false);
          setEditingExpense(null);
          fetchExpenses();
        } else {
          showToast(res?.message || 'Failed to update expense', 'error');
        }
      } else {
        const res = await expenseAPI.create(payload);
        if (res?.success) {
          showToast(`Expense of ₹${num.toLocaleString('en-IN')} saved!`);
          if (!categories.includes(payload.category)) {
            setCategories((prev) => [...prev, payload.category]);
          }
          setShowAddModal(false);
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

  // Delete Expense
  const handleDelete = async (id, cat, amt) => {
    if (!window.confirm(`Delete expense "${cat}" (₹${amt})?`)) return;
    try {
      const res = await expenseAPI.delete(id);
      if (res?.success) {
        showToast('Expense deleted successfully');
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

  // Keyboard shortcut listener: Enter on search bar opens Add Expense, Esc closes
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

  const totalAmount = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);

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
          Expense Tracker (Press F6 or Esc to close)
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

      {/* 2. SEARCH & ACTION STRIP (EXACT SAME SEARCH BAR + GREEN BUTTON FROM GIVEN PHOTO) */}
      <div style={styles.searchStrip}>
        <input
          type="text"
          placeholder="SEARCH BY EXPENSE NAME, CATEGORY, DATE..."
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

        {/* GREEN "+ ADD EXPENSE (Enter)" BUTTON - EXACT SAME DESIGN AS "+ ADD PATIENT (Enter)" */}
        <button
          type="button"
          onClick={handleOpenAdd}
          style={styles.addGreenBtn}
        >
          + ADD EXPENSE (Enter)
        </button>
      </div>

      {/* 3. EXPENSES DATA TABLE (EXACT SAME COMPACT DESKTOP GRID FROM PHOTO) */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.theadRow}>
              <th style={{ ...styles.th, width: '140px' }}>Date & Time</th>
              <th style={styles.th}>Expense Category / Name</th>
              <th style={{ ...styles.th, width: '130px', textAlign: 'right' }}>Amount (₹)</th>
              <th style={{ ...styles.th, width: '140px', textAlign: 'center' }}>Act</th>
            </tr>
          </thead>
          <tbody>
            {loading && expenses.length === 0 ? (
              <tr>
                <td colSpan={4} style={styles.emptyTd}>
                  <RefreshCw size={18} className="animate-spin" style={{ margin: '0 auto 6px' }} />
                  <span>Loading expenses...</span>
                </td>
              </tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={4} style={styles.emptyTd}>
                  <span>No expense records found. Press Enter or click "+ ADD EXPENSE" to add one.</span>
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
                    {/* 1. Date & Time */}
                    <td style={styles.tdDateTime}>
                      <div style={styles.dateText}>{dateStr}</div>
                      <div style={styles.timeBadge}>{timeStr}</div>
                    </td>

                    {/* 2. Expense Category / Name (No extra fields) */}
                    <td style={styles.tdCategory}>
                      <span style={styles.categoryNameText}>
                        {exp.category}
                      </span>
                    </td>

                    {/* 3. Amount (₹) */}
                    <td style={styles.tdAmount}>
                      <span style={styles.amountText}>
                        ₹{(exp.amount || 0).toLocaleString('en-IN')}
                      </span>
                    </td>

                    {/* 4. Act (The exact 4 Icon Buttons from the photo) */}
                    <td style={styles.tdAct}>
                      <div style={styles.actBox}>
                        {/* Button 1: Case / View (Light Blue) */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(exp)}
                          title="View / Duplicate Expense"
                          style={styles.actBtnBlue}
                        >
                          <FileText size={14} color="#0284C7" />
                        </button>

                        {/* Button 2: Edit (Orange Pencil) */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(exp)}
                          title="Edit Expense"
                          style={styles.actBtnOrange}
                        >
                          <Edit size={14} color="#D97706" />
                        </button>

                        {/* Button 3: Print (Gray/Black Printer) */}
                        <button
                          type="button"
                          onClick={() => window.print()}
                          title="Print Receipt"
                          style={styles.actBtnGray}
                        >
                          <Printer size={14} color="#475569" />
                        </button>

                        {/* Button 4: Delete (Red Trash) */}
                        <button
                          type="button"
                          onClick={() => handleDelete(exp._id, exp.category, exp.amount)}
                          title="Delete Expense"
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
          Total Records: <strong>{expenses.length}</strong>
        </div>
        <div style={styles.footerTotalWrap}>
          <span>TOTAL EXPENSE:</span>
          <span style={styles.footerTotalVal}>
            ₹{totalAmount.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* 5. ADD / EDIT EXPENSE MODAL (STRICTLY NO EXTRA FIELDS: ONLY DATE, CATEGORY DATALIST, AMOUNT) */}
      {showAddModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>
                {editingExpense ? 'EDIT EXPENSE' : 'ADD NEW EXPENSE'}
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

              {/* Field 2: Category (Datalist) */}
              <div style={styles.modalFieldGroup}>
                <label style={styles.modalLabel}>
                  Expense Category / Name: <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  ref={categoryInputRef}
                  list="expense-categories-modal-list"
                  type="text"
                  required
                  placeholder="TYPE OR SELECT EXPENSE..."
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={{ ...styles.modalInput, textTransform: 'uppercase' }}
                  autoFocus
                />
                <datalist id="expense-categories-modal-list">
                  {categories.map((c, i) => (
                    <option key={i} value={c} />
                  ))}
                </datalist>
                <span style={styles.modalHint}>
                  (New categories are automatically remembered)
                </span>
              </div>

              {/* Field 3: Amount (₹) */}
              <div style={styles.modalFieldGroup}>
                <label style={styles.modalLabel}>
                  Amount (₹): <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  style={{ ...styles.modalInput, fontWeight: 700, fontSize: '14px', color: '#B91C1C' }}
                />
              </div>

              {/* Action Buttons */}
              <div style={styles.modalBtnRow}>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={styles.modalSaveBtn}
                >
                  {isSubmitting ? 'SAVING...' : editingExpense ? 'UPDATE' : 'SAVE (Enter)'}
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
    fontWeight: 800,
    color: '#B91C1C',
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
    fontWeight: 800,
    color: '#B91C1C',
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
    width: '420px',
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

export default ExpenseMaster;
