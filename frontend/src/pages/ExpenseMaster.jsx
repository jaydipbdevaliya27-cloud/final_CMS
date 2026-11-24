import React, { useState, useEffect } from 'react';
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
  ArrowUpRight,
  TrendingDown,
} from 'lucide-react';

export const ExpenseMaster = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({ todayTotal: 0, monthTotal: 0, overallTotal: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [selectedPeriod, setSelectedPeriod] = useState('all'); // today, yesterday, thismonth, all, custom
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, text: '', type: 'success' });

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
    } catch (e) {}
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
    e.preventDefault();
    if (!form.category.trim()) {
      showToast('Please select or type an expense category.', 'error');
      return;
    }
    const num = Number(form.amount);
    if (!num || num <= 0) {
      showToast('Please enter an amount greater than 0.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const upperCategory = form.category.trim().toUpperCase();
      const payload = {
        ...form,
        category: upperCategory,
        amount: num,
      };

      if (editingId) {
        const res = await expenseAPI.update(editingId, payload);
        if (res?.success) {
          showToast('Expense updated successfully');
          setEditingId(null);
          setForm(initialForm);
          fetchExpenses();
        } else {
          showToast(res?.message || 'Failed to update expense', 'error');
        }
      } else {
        const res = await expenseAPI.create(payload);
        if (res?.success) {
          showToast(`₹${num} expense recorded under ${upperCategory}`);
          // Add to datalist if new
          setCategories((prev) => [...new Set([...prev, upperCategory])]);
          setForm(initialForm);
          fetchExpenses();
        } else {
          showToast(res?.message || 'Failed to save expense', 'error');
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to save expense', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (exp) => {
    setEditingId(exp._id);
    setForm({
      date: exp.date || new Date().toISOString().split('T')[0],
      category: exp.category || '',
      amount: String(exp.amount || ''),
      paymentMode: exp.paymentMode || 'Cash',
      paidTo: exp.paidTo || '',
      description: exp.description || '',
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense entry?')) return;
    try {
      const res = await expenseAPI.delete(id);
      if (res?.success) {
        showToast('Expense deleted successfully');
        fetchExpenses();
      }
    } catch (e) {
      showToast('Failed to delete expense', 'error');
    }
  };

  return (
    <div style={styles.container}>
      {/* Toast Feedback */}
      {toast.show && (
        <div
          style={{
            ...styles.toast,
            backgroundColor: toast.type === 'error' ? '#EF4444' : '#10B981',
          }}
        >
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Top Header Strip */}
      <div style={styles.topBar}>
        <div style={styles.titleSection}>
          <div style={styles.titleIconBadge}>
            <Wallet size={19} color="#B45309" />
          </div>
          <div>
            <h1 style={styles.heading}>Expense Master (F6)</h1>
            <span style={styles.subHeading}>
              Track clinic operational expenses, bills, staff salaries, and supply purchases
            </span>
          </div>
        </div>

        {/* Period Filter Buttons */}
        <div style={styles.filterPillTrack}>
          {[
            { key: 'today', label: 'Today' },
            { key: 'yesterday', label: 'Yesterday' },
            { key: 'thismonth', label: 'This Month' },
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
                  backgroundColor: isSelected ? '#B45309' : 'transparent',
                  color: isSelected ? '#FFFFFF' : '#475569',
                  fontWeight: isSelected ? '600' : '500',
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

      {/* KPI Summary Cards */}
      <div style={styles.kpiRow}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiIconWrapToday}>
            <TrendingDown size={18} color="#B45309" />
          </div>
          <div>
            <span style={styles.kpiLabel}>Today's Expenses</span>
            <div style={styles.kpiValue}>₹{(summary.todayTotal || 0).toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiIconWrapMonth}>
            <Calendar size={18} color="#0D5C4E" />
          </div>
          <div>
            <span style={styles.kpiLabel}>This Month's Total</span>
            <div style={{ ...styles.kpiValue, color: '#0D5C4E' }}>
              ₹{(summary.monthTotal || 0).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiIconWrapAll}>
            <Wallet size={18} color="#475569" />
          </div>
          <div>
            <span style={styles.kpiLabel}>Overall All-Time Expenses</span>
            <div style={{ ...styles.kpiValue, color: '#334155' }}>
              ₹{(summary.overallTotal || 0).toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>

      {/* Entry Form + Ledger Table Grid */}
      <div style={styles.mainGrid}>
        {/* Left Form: Add / Edit Expense */}
        <div style={styles.formCard}>
          <div style={styles.formHeader}>
            <h3 style={styles.formTitle}>
              {editingId ? 'Edit Expense Record' : 'Record New Expense'}
            </h3>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(initialForm);
                }}
                style={styles.cancelEditBtn}
              >
                Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} style={styles.formBody}>
            {/* Datalist for Auto-complete / Auto-save */}
            <datalist id="expense-categories">
              {categories.map((c, idx) => (
                <option key={idx} value={c} />
              ))}
            </datalist>

            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Date: *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Expense Category (Datalist): *</label>
              <input
                type="text"
                list="expense-categories"
                placeholder="Type or pick category (e.g. Refreshments, Bills)..."
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                style={styles.input}
                required
              />
              <span style={styles.helperText}>
                New categories are automatically remembered in Master Data.
              </span>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Amount (₹): *</label>
              <input
                type="number"
                min="1"
                placeholder="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                style={{ ...styles.input, fontWeight: '700', color: '#B45309' }}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Payment Mode:</label>
              <select
                value={form.paymentMode}
                onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
                style={styles.select}
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI / GPay / PhonePe</option>
                <option value="Card">Debit / Credit Card</option>
                <option value="Net Banking">Net Banking</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Paid To / Vendor Name:</label>
              <input
                type="text"
                placeholder="e.g. Medical Store, Electric Board, John..."
                value={form.paidTo}
                onChange={(e) => setForm({ ...form, paidTo: e.target.value })}
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Notes / Description:</label>
              <textarea
                placeholder="Details of the expense..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                style={styles.textarea}
                rows={2}
              />
            </div>

            <button type="submit" disabled={isSubmitting} style={styles.submitBtn}>
              <Plus size={15} />
              <span>{editingId ? 'Update Expense' : 'Save Expense Entry'}</span>
            </button>
          </form>
        </div>

        {/* Right Ledger Table */}
        <div style={styles.tableCard}>
          {/* Table Header Filter Strip */}
          <div style={styles.tableTopStrip}>
            <div style={styles.tableSearchWrap}>
              <Search size={15} color="#64748B" style={styles.tableSearchIcon} />
              <input
                type="text"
                placeholder="Search expenses by category, vendor, notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.tableSearchInput}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={styles.clearSearchBtn}
                >
                  <X size={13} color="#64748B" />
                </button>
              )}
            </div>

            <div style={styles.tableCountBadge}>
              {loading ? 'Loading...' : `${expenses.length} Records`}
            </div>

            <button
              type="button"
              onClick={fetchExpenses}
              style={styles.refreshBtn}
              title="Refresh ledger"
            >
              <RefreshCw size={13} className={loading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          <div style={styles.tableScroll}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.theadRow}>
                  <th style={{ ...styles.th, width: '100px' }}>Date</th>
                  <th style={{ ...styles.th, width: '160px' }}>Category</th>
                  <th style={{ ...styles.th, width: '100px', textAlign: 'right' }}>Amount (₹)</th>
                  <th style={{ ...styles.th, width: '100px' }}>Mode</th>
                  <th style={{ ...styles.th, width: '140px' }}>Paid To</th>
                  <th style={styles.th}>Notes / Description</th>
                  <th style={{ ...styles.th, width: '80px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={styles.loadingCell}>
                      Loading expense entries...
                    </td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={styles.emptyCell}>
                      No expenses recorded for this filter
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp, idx) => (
                    <tr
                      key={exp._id || idx}
                      style={{
                        ...styles.tr,
                        backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                      }}
                    >
                      <td style={styles.tdDate}>{exp.date}</td>
                      <td style={styles.tdCategory}>
                        <span style={styles.categoryBadge}>{exp.category}</span>
                      </td>
                      <td style={styles.tdAmount}>₹{(exp.amount || 0).toLocaleString('en-IN')}</td>
                      <td style={styles.tdMode}>
                        <span style={styles.modeBadge}>{exp.paymentMode || 'Cash'}</span>
                      </td>
                      <td style={styles.tdPaidTo}>{exp.paidTo || '-'}</td>
                      <td style={styles.tdDesc}>{exp.description || '-'}</td>
                      <td style={styles.tdActions}>
                        <div style={styles.actionBtns}>
                          <button
                            type="button"
                            onClick={() => handleEdit(exp)}
                            style={styles.editBtn}
                            title="Edit this expense"
                          >
                            <Edit size={13} color="#D97706" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(exp._id)}
                            style={styles.deleteBtn}
                            title="Delete this expense"
                          >
                            <Trash2 size={13} color="#DC2626" />
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
      </div>
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
    backgroundColor: '#FEF3C7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#0F172A',
    margin: 0,
  },
  subHeading: {
    fontSize: '11px',
    color: '#64748B',
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
  },
  customDateInput: {
    border: '1px solid #CBD5E1',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '12px',
    backgroundColor: '#FFFFFF',
    outline: 'none',
  },
  kpiRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  kpiCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  kpiIconWrapToday: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: '#FEF3C7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiIconWrapMonth: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: '#DCFCE7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiIconWrapAll: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: '#F1F5F9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiLabel: {
    fontSize: '11.5px',
    color: '#64748B',
    fontWeight: '600',
    display: 'block',
  },
  kpiValue: {
    fontSize: '17px',
    fontWeight: '800',
    color: '#B45309',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '320px 1fr',
    gap: '12px',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  formHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    borderBottom: '1px solid #E2E8F0',
    backgroundColor: '#FFFBEB',
  },
  formTitle: {
    margin: 0,
    fontSize: '13px',
    fontWeight: '700',
    color: '#92400E',
  },
  cancelEditBtn: {
    fontSize: '11px',
    color: '#DC2626',
    background: 'none',
    border: 'none',
    fontWeight: '600',
    cursor: 'pointer',
  },
  formBody: {
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  inputLabel: {
    fontSize: '11.5px',
    fontWeight: '700',
    color: '#334155',
  },
  input: {
    height: '34px',
    padding: '0 10px',
    border: '1px solid #CBD5E1',
    borderRadius: '6px',
    fontSize: '12px',
    outline: 'none',
  },
  select: {
    height: '34px',
    padding: '0 8px',
    border: '1px solid #CBD5E1',
    borderRadius: '6px',
    fontSize: '12px',
    backgroundColor: '#FFFFFF',
    outline: 'none',
  },
  textarea: {
    padding: '8px 10px',
    border: '1px solid #CBD5E1',
    borderRadius: '6px',
    fontSize: '12px',
    outline: 'none',
    resize: 'none',
  },
  helperText: {
    fontSize: '10px',
    color: '#64748B',
  },
  submitBtn: {
    marginTop: '6px',
    height: '36px',
    backgroundColor: '#B45309',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12.5px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    cursor: 'pointer',
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #CBD5E1',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  tableTopStrip: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderBottom: '1px solid #E2E8F0',
  },
  tableSearchWrap: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  tableSearchIcon: {
    position: 'absolute',
    left: '10px',
    pointerEvents: 'none',
  },
  tableSearchInput: {
    width: '100%',
    height: '32px',
    padding: '0 28px 0 32px',
    border: '1px solid #CBD5E1',
    borderRadius: '6px',
    fontSize: '12px',
    outline: 'none',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: '8px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 2,
  },
  tableCountBadge: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#475569',
    backgroundColor: '#F1F5F9',
    padding: '5px 10px',
    borderRadius: '4px',
    whiteSpace: 'nowrap',
  },
  refreshBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '5px 10px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #CBD5E1',
    borderRadius: '6px',
    fontSize: '11.5px',
    fontWeight: '600',
    color: '#334155',
    cursor: 'pointer',
    height: '32px',
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
    backgroundColor: '#B45309',
    color: '#FFFFFF',
    position: 'sticky',
    top: 0,
    zIndex: 2,
  },
  th: {
    padding: '8px 10px',
    fontSize: '11px',
    fontWeight: '700',
    textAlign: 'left',
    borderRight: '1px solid rgba(255, 255, 255, 0.15)',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid #E2E8F0',
  },
  tdDate: {
    padding: '8px 10px',
    fontWeight: '600',
    color: '#0F172A',
    whiteSpace: 'nowrap',
  },
  tdCategory: {
    padding: '8px 10px',
  },
  categoryBadge: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    fontWeight: '700',
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '4px',
    display: 'inline-block',
  },
  tdAmount: {
    padding: '8px 10px',
    fontWeight: '800',
    color: '#B45309',
    textAlign: 'right',
  },
  tdMode: {
    padding: '8px 10px',
  },
  modeBadge: {
    backgroundColor: '#F1F5F9',
    color: '#334155',
    fontWeight: '600',
    fontSize: '10.5px',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  tdPaidTo: {
    padding: '8px 10px',
    color: '#334155',
  },
  tdDesc: {
    padding: '8px 10px',
    color: '#64748B',
    fontSize: '11.5px',
  },
  tdActions: {
    padding: '8px 6px',
    textAlign: 'center',
  },
  actionBtns: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
  },
  editBtn: {
    width: '26px',
    height: '26px',
    borderRadius: '4px',
    border: '1px solid #FDE68A',
    backgroundColor: '#FFFBEB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  deleteBtn: {
    width: '26px',
    height: '26px',
    borderRadius: '4px',
    border: '1px solid #FECACA',
    backgroundColor: '#FEF2F2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  loadingCell: {
    padding: '28px',
    textAlign: 'center',
    color: '#64748B',
  },
  emptyCell: {
    padding: '32px',
    textAlign: 'center',
    color: '#64748B',
  },
};
