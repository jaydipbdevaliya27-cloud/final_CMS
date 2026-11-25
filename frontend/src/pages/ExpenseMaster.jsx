import React, { useState, useEffect, useRef } from 'react';
import { expenseAPI, masterDataAPI } from '../services/api';
import {
  X,
  Plus,
  Save,
  Search,
  RotateCcw,
  Trash2,
  Calendar,
  Building2,
  Tag,
  AlertTriangle,
  CheckCircle2,
  FileText,
  DollarSign,
  Layers,
} from 'lucide-react';

export const ExpenseMaster = ({ onNavigateToDashboard }) => {
  // Expenses data & summary
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    totalEntries: 0,
    paidAmount: 0,
    unpaidAmount: 0,
    totalExpense: 0,
  });

  // Entry Form State - EXACT FIELDS ONLY: Date, Company Name, Category, Expense Amount, Status
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [companyName, setCompanyName] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('Unpaid'); // 'Unpaid' or 'Paid'
  const [isSaving, setIsSaving] = useState(false);

  // Filter State - EXACT FIELDS ONLY: Company, Category, From, To
  const [filterCompany, setFilterCompany] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  // Autocomplete Datalists for Company and Category
  const [companyList, setCompanyList] = useState([
    'SHREE RAM PHARMA',
    'GUJARAT MEDICAL AGENCY',
    'SUN PHARMA DISTRIBUTORS',
    'CIPLA MEDICAL STORE',
    'APOLLO HEALTHCARE',
    'KALYAN PHARMA',
  ]);

  const [categoryList, setCategoryList] = useState([
    'BILL',
    'MEDICINE PURCHASE',
    'ELECTRICITY BILL',
    'CLINIC RENT',
    'STAFF SALARY',
    'TEA & REFRESHMENTS',
    'STATIONERY & PRINTING',
    'CLEANING & MAINTENANCE',
    'DISPOSABLES / SYRINGES',
    'TELEPHONE & INTERNET',
    'MISCELLANEOUS',
  ]);

  // Toast notifications
  const [toast, setToast] = useState({ show: false, text: '', type: 'success' });

  // Confirmation Mechanism & Double-Click Lock State
  const [confirmStatusModal, setConfirmStatusModal] = useState({ open: false, item: null, nextStatus: '' });
  const [togglingId, setTogglingId] = useState(null);

  const companyInputRef = useRef(null);
  const amountInputRef = useRef(null);

  const showToast = (text, type = 'success') => {
    setToast({ show: true, text, type });
    setTimeout(() => setToast({ show: false, text: '', type: 'success' }), 3500);
  };

  // Load Companies & Categories from Master Data
  const loadMasterData = async () => {
    try {
      const [compRes, catRes] = await Promise.allSettled([
        masterDataAPI.getItems('company', '', 1, 100),
        masterDataAPI.getItems('expense_category', '', 1, 100),
      ]);

      if (compRes.status === 'fulfilled' && compRes.value?.success && Array.isArray(compRes.value.data)) {
        const comps = compRes.value.data.map((c) => c.value?.toUpperCase()).filter(Boolean);
        if (comps.length > 0) {
          setCompanyList((prev) => [...new Set([...prev, ...comps])]);
        }
      }

      if (catRes.status === 'fulfilled' && catRes.value?.success && Array.isArray(catRes.value.data)) {
        const cats = catRes.value.data.map((c) => c.value?.toUpperCase()).filter(Boolean);
        if (cats.length > 0) {
          setCategoryList((prev) => [...new Set([...prev, ...cats])]);
        }
      }
    } catch (e) {
      console.warn('Could not load master data:', e);
    }
  };

  // Fetch Expenses with active filters
  const fetchExpenses = async (overrideFilters = null) => {
    try {
      setLoading(true);
      const activeComp = overrideFilters ? overrideFilters.company : filterCompany;
      const activeCat = overrideFilters ? overrideFilters.category : filterCategory;
      const activeFrom = overrideFilters ? overrideFilters.from : filterFrom;
      const activeTo = overrideFilters ? overrideFilters.to : filterTo;

      const params = {
        limit: 500,
      };

      if (activeComp && activeComp.trim()) {
        params.companyName = activeComp.trim();
      }

      if (activeCat && activeCat.trim() && !activeCat.toUpperCase().includes('ALL')) {
        params.category = activeCat.trim();
      }

      if (activeFrom) params.from = activeFrom;
      if (activeTo) params.to = activeTo;

      const res = await expenseAPI.getAll(params);
      if (res?.success) {
        const list = res.expenses || [];
        setExpenses(list);

        // Update KPI summary cards
        const totalEntries = res.totalEntries ?? list.length;
        const paidAmount = res.paidAmount ?? list.filter((e) => e.status === 'Paid').reduce((a, b) => a + (b.amount || 0), 0);
        const unpaidAmount = res.unpaidAmount ?? list.filter((e) => e.status !== 'Paid').reduce((a, b) => a + (b.amount || 0), 0);
        const totalExpense = res.totalExpense ?? list.reduce((a, b) => a + (b.amount || 0), 0);

        setSummary({
          totalEntries,
          paidAmount,
          unpaidAmount,
          totalExpense,
        });
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
      showToast('Error loading expenses: ' + (err.message || 'Server error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasterData();
    fetchExpenses();
  }, []);

  // Keyboard shortcut listener: F6 or Esc closes Expense Master
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'F6') {
        e.preventDefault();
        if (onNavigateToDashboard) {
          onNavigateToDashboard();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNavigateToDashboard]);

  // Handle Save New Expense
  const handleSaveExpense = async (e) => {
    if (e) e.preventDefault();

    if (!companyName.trim()) {
      showToast('Please enter Company Name.', 'error');
      if (companyInputRef.current) companyInputRef.current.focus();
      return;
    }

    if (!category.trim()) {
      showToast('Please enter or select Category.', 'error');
      return;
    }

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      showToast('Please enter a valid expense amount greater than 0.', 'error');
      if (amountInputRef.current) amountInputRef.current.focus();
      return;
    }

    try {
      setIsSaving(true);
      const cleanCompany = companyName.trim().toUpperCase();
      const cleanCategory = category.trim().toUpperCase();

      const payload = {
        date: entryDate || new Date().toISOString().split('T')[0],
        companyName: cleanCompany,
        category: cleanCategory,
        amount: numAmount,
        status: status === 'Paid' ? 'Paid' : 'Unpaid',
      };

      const res = await expenseAPI.create(payload);
      if (res?.success) {
        showToast(`Expense of ₹${numAmount.toLocaleString('en-IN')} saved successfully!`);

        // Auto-update suggestions lists locally
        if (!companyList.includes(cleanCompany)) {
          setCompanyList((prev) => [...prev, cleanCompany]);
        }
        if (!categoryList.includes(cleanCategory)) {
          setCategoryList((prev) => [...prev, cleanCategory]);
        }

        // Reset amount and keep company/category or focus on amount
        setAmount('');
        // Re-fetch expenses
        fetchExpenses();

        if (amountInputRef.current) {
          amountInputRef.current.focus();
        }
      } else {
        showToast(res?.message || 'Failed to save expense', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Error saving expense', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Request toggle status (opens confirmation mechanism & guards against double click)
  const handleRequestToggleStatus = (exp) => {
    if (togglingId === exp._id) return;
    const nextStatus = exp.status === 'Paid' ? 'Unpaid' : 'Paid';
    setConfirmStatusModal({ open: true, item: exp, nextStatus });
  };

  // Confirm and apply status change safely
  const handleConfirmToggleStatus = async () => {
    const { item: exp, nextStatus } = confirmStatusModal;
    if (!exp || !nextStatus || togglingId === exp._id) return;

    try {
      setTogglingId(exp._id);
      const res = await expenseAPI.update(exp._id, { status: nextStatus });
      if (res?.success) {
        // Safe immutable update and strictly recalculate summary from array (immune to double click count)
        setExpenses((prev) => {
          const updated = prev.map((item) =>
            item._id === exp._id ? { ...item, status: nextStatus } : item
          );

          const paidAmount = updated
            .filter((i) => i.status === 'Paid')
            .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
          const unpaidAmount = updated
            .filter((i) => i.status !== 'Paid')
            .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
          const totalExpense = updated.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

          setSummary({
            totalEntries: updated.length,
            paidAmount,
            unpaidAmount,
            totalExpense,
          });

          return updated;
        });

        showToast(`Status changed to ${nextStatus}`);
      } else {
        showToast(res?.message || 'Failed to update status', 'error');
      }
    } catch (err) {
      showToast('Error changing status: ' + err.message, 'error');
    } finally {
      setTogglingId(null);
      setConfirmStatusModal({ open: false, item: null, nextStatus: '' });
    }
  };

  // Delete Expense Entry
  const handleDeleteExpense = async (exp) => {
    const comp = exp.companyName || exp.category || 'Entry';
    if (!window.confirm(`Delete expense "${comp}" (₹${exp.amount})?`)) return;

    try {
      const res = await expenseAPI.delete(exp._id);
      if (res?.success) {
        showToast('Expense entry deleted successfully');
        fetchExpenses();
      } else {
        showToast(res?.message || 'Failed to delete expense', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Error deleting expense', 'error');
    }
  };

  // Filter actions
  const handleApplyFilter = () => {
    fetchExpenses();
  };

  const handleClearFilter = () => {
    setFilterCompany('');
    setFilterCategory('');
    setFilterFrom('');
    setFilterTo('');
    fetchExpenses({ company: '', category: '', from: '', to: '' });
  };

  // Format Date for Table Display: YYYY-MM-DD -> DD-MM-YYYY
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    return dateStr;
  };

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
          {toast.type === 'error' ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
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

      {/* Datalists for Company Name & Category */}
      <datalist id="expense-company-list">
        {companyList.map((c, i) => (
          <option key={i} value={c} />
        ))}
      </datalist>

      <datalist id="expense-category-list">
        {categoryList.map((c, i) => (
          <option key={i} value={c} />
        ))}
      </datalist>

      {/* ============================================================== */}
      {/* 1. TOP HEADER BAR: Expense Master (Press F6 or Esc to close)   */}
      {/* ============================================================== */}
      <div style={styles.headerBar}>
        <div style={styles.headerTitleWrap}>
          <div style={styles.headerAmberBadge}>
            <Layers size={15} color="#F59E0B" />
          </div>
          <span style={styles.headerTitleText}>
            Expense Master (Press F6 or Esc to close)
          </span>
        </div>
        <button
          type="button"
          onClick={onNavigateToDashboard || (() => {})}
          style={styles.headerCloseBtn}
          title="Close (Esc / F6)"
        >
          <X size={18} color="#FFFFFF" />
        </button>
      </div>

      {/* ============================================================== */}
      {/* 2. ADD ENTRY STRIP: ✚ Add New Expense Entry                    */}
      {/* ============================================================== */}
      <div style={styles.entrySection}>
        <div style={styles.entrySectionTitle}>
          <span style={{ fontWeight: 800, color: '#0F172A', marginRight: '6px' }}>✚</span>
          <span>Add New Expense Entry (Type Amount & Press Enter to Save)</span>
        </div>

        <form onSubmit={handleSaveExpense} style={styles.entryFormRow}>
          {/* Field 1: Date */}
          <div style={styles.entryColDate}>
            <label style={styles.fieldLabel}>Date:</label>
            <input
              type="date"
              required
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              style={styles.fieldInput}
            />
          </div>

          {/* Field 2: Company Name (Datalist) */}
          <div style={styles.entryColCompany}>
            <label style={styles.fieldLabel}>Company Name:</label>
            <input
              ref={companyInputRef}
              type="text"
              list="expense-company-list"
              required
              placeholder="ENTER COMPANY NAME..."
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              style={{ ...styles.fieldInput, textTransform: 'uppercase' }}
            />
          </div>

          {/* Field 3: Category (Datalist) */}
          <div style={styles.entryColCategory}>
            <label style={styles.fieldLabel}>Category:</label>
            <input
              type="text"
              list="expense-category-list"
              required
              placeholder="ENTER CATEGORY..."
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ ...styles.fieldInput, textTransform: 'uppercase' }}
            />
          </div>

          {/* Field 4: Expense Amount (₹) */}
          <div style={styles.entryColAmount}>
            <label style={styles.fieldLabel}>Expense Amount (₹):</label>
            <input
              ref={amountInputRef}
              type="number"
              step="any"
              min="0.01"
              required
              placeholder="AMOUNT_"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ ...styles.fieldInput, fontWeight: 700 }}
            />
          </div>

          {/* Field 5: Status Toggle Button (Unpaid / Paid) */}
          <div style={styles.entryColStatus}>
            <label style={styles.fieldLabelHidden}>Status</label>
            <button
              type="button"
              onClick={() => setStatus((prev) => (prev === 'Paid' ? 'Unpaid' : 'Paid'))}
              style={{
                ...styles.statusToggleBtn,
                backgroundColor: status === 'Paid' ? '#15803D' : '#B91C1C',
              }}
              title="Click to toggle Paid/Unpaid"
            >
              {status === 'Paid' ? '✓ Paid' : 'Unpaid'}
            </button>
          </div>

          {/* Field 6: Save Button */}
          <div style={styles.entryColSave}>
            <label style={styles.fieldLabelHidden}>Save</label>
            <button
              type="submit"
              disabled={isSaving}
              style={styles.saveBtn}
            >
              <Save size={14} style={{ marginRight: '5px' }} />
              <span>{isSaving ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ============================================================== */}
      {/* 3. FILTER STRIP: Company, Category, From, To, Filter, Clear    */}
      {/* ============================================================== */}
      <div style={styles.filterSection}>
        <div style={styles.filterBar}>
          {/* Filter 1: Company */}
          <div style={styles.filterItem}>
            <Building2 size={15} color="#64748B" style={{ flexShrink: 0 }} />
            <span style={styles.filterLabel}>Company:</span>
            <input
              type="text"
              list="expense-company-list"
              placeholder="SHREE RAM PHARMA"
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyFilter()}
              style={{ ...styles.filterInput, textTransform: 'uppercase' }}
            />
          </div>

          {/* Filter 2: Category */}
          <div style={styles.filterItem}>
            <Tag size={15} color="#64748B" style={{ flexShrink: 0 }} />
            <span style={styles.filterLabel}>Category:</span>
            <input
              type="text"
              list="expense-category-list"
              placeholder="ALL CATEGORIES..."
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyFilter()}
              style={{ ...styles.filterInput, textTransform: 'uppercase' }}
            />
          </div>

          {/* Filter 3: From Date */}
          <div style={styles.filterItem}>
            <span style={styles.filterLabel}>From:</span>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              style={styles.filterDateInput}
            />
          </div>

          {/* Filter 4: To Date */}
          <div style={styles.filterItem}>
            <span style={styles.filterLabel}>To:</span>
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              style={styles.filterDateInput}
            />
          </div>

          {/* Filter Button */}
          <button
            type="button"
            onClick={handleApplyFilter}
            style={styles.filterBtn}
          >
            <Search size={13} style={{ marginRight: '4px' }} />
            <span>Filter</span>
          </button>

          {/* Clear Button */}
          <button
            type="button"
            onClick={handleClearFilter}
            style={styles.clearBtn}
          >
            Clear
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. KPI SUMMARY CARDS: Total Entries, Paid, Unpaid, Total Exp   */}
      {/* ============================================================== */}
      <div style={styles.kpiContainer}>
        {/* KPI Card 1: TOTAL ENTRIES */}
        <div style={{ ...styles.kpiCard, borderLeft: '4px solid #3B82F6' }}>
          <div style={styles.kpiHeader}>
            <FileText size={15} color="#3B82F6" style={{ marginRight: '6px' }} />
            <span style={styles.kpiTitle}>TOTAL ENTRIES</span>
          </div>
          <div style={styles.kpiValueDark}>
            {summary.totalEntries}
          </div>
        </div>

        {/* KPI Card 2: PAID AMOUNT */}
        <div style={{ ...styles.kpiCard, borderLeft: '4px solid #16A34A' }}>
          <div style={styles.kpiHeader}>
            <CheckCircle2 size={15} color="#16A34A" style={{ marginRight: '6px' }} />
            <span style={styles.kpiTitle}>PAID AMOUNT</span>
          </div>
          <div style={styles.kpiValueGreen}>
            ₹{summary.paidAmount.toLocaleString('en-IN')}
          </div>
        </div>

        {/* KPI Card 3: UNPAID AMOUNT */}
        <div style={{ ...styles.kpiCard, borderLeft: '4px solid #DC2626' }}>
          <div style={styles.kpiHeader}>
            <AlertTriangle size={15} color="#DC2626" style={{ marginRight: '6px' }} />
            <span style={styles.kpiTitle}>UNPAID AMOUNT</span>
          </div>
          <div style={styles.kpiValueRed}>
            ₹{summary.unpaidAmount.toLocaleString('en-IN')}
          </div>
        </div>

        {/* KPI Card 4: TOTAL EXPENSE */}
        <div style={{ ...styles.kpiCard, borderLeft: '4px solid #64748B' }}>
          <div style={styles.kpiHeader}>
            <DollarSign size={15} color="#64748B" style={{ marginRight: '6px' }} />
            <span style={styles.kpiTitle}>TOTAL EXPENSE</span>
          </div>
          <div style={styles.kpiValueDark}>
            ₹{summary.totalExpense.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. DATA TABLE: Date, Company Name, Category, Amount, Status, Act*/}
      {/* ============================================================== */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.theadRow}>
              <th style={{ ...styles.th, width: '130px' }}>Date</th>
              <th style={{ ...styles.th, width: 'auto' }}>Company Name</th>
              <th style={{ ...styles.th, width: '160px' }}>Category</th>
              <th style={{ ...styles.th, width: '160px', textAlign: 'right' }}>Amount (₹)</th>
              <th style={{ ...styles.th, width: '130px', textAlign: 'center' }}>Status</th>
              <th style={{ ...styles.th, width: '80px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && expenses.length === 0 ? (
              <tr>
                <td colSpan={6} style={styles.emptyTd}>
                  <span>Loading expenses...</span>
                </td>
              </tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={6} style={styles.emptyTd}>
                  <span>No expense records found. Add an entry above.</span>
                </td>
              </tr>
            ) : (
              expenses.map((exp, idx) => {
                const isEven = idx % 2 === 0;
                const isPaid = exp.status === 'Paid';
                return (
                  <tr
                    key={exp._id || idx}
                    style={{
                      ...styles.tr,
                      backgroundColor: isEven ? '#FFFFFF' : '#F8FAFC',
                    }}
                  >
                    {/* 1. Date */}
                    <td style={styles.tdDate}>
                      {formatDateDisplay(exp.date)}
                    </td>

                    {/* 2. Company Name */}
                    <td style={styles.tdCompany}>
                      {exp.companyName || '—'}
                    </td>

                    {/* 3. Category */}
                    <td style={styles.tdCategory}>
                      {exp.category}
                    </td>

                    {/* 4. Amount (₹) */}
                    <td style={styles.tdAmount}>
                      ₹{(exp.amount || 0).toLocaleString('en-IN')}
                    </td>

                    {/* 5. Status Pill Button */}
                    <td style={styles.tdStatus}>
                      <button
                        type="button"
                        disabled={togglingId === exp._id}
                        onClick={() => handleRequestToggleStatus(exp)}
                        style={{
                          ...styles.tableStatusBtn,
                          backgroundColor: isPaid ? '#15803D' : '#991B1B',
                          opacity: togglingId === exp._id ? 0.7 : 1,
                        }}
                        title="Click to change status (Confirmation required)"
                      >
                        {togglingId === exp._id ? '...' : isPaid ? '✓ Paid' : 'Unpaid'}
                      </button>
                    </td>

                    {/* 6. Action: Delete Button */}
                    <td style={styles.tdAction}>
                      <button
                        type="button"
                        onClick={() => handleDeleteExpense(exp)}
                        style={styles.deleteBtn}
                        title="Delete expense"
                      >
                        <Trash2 size={14} color="#475569" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 6. STATUS CHANGE CONFIRMATION MODAL (PREVENTS DOUBLE-CLICK & CONFIRMS ACTION) */}
      {confirmStatusModal.open && confirmStatusModal.item && (
        <div
          style={styles.modalOverlay}
          onClick={() => !togglingId && setConfirmStatusModal({ open: false, item: null, nextStatus: '' })}
        >
          <div style={styles.confirmModalBox} onClick={(e) => e.stopPropagation()}>
            <div style={styles.confirmModalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} color="#F59E0B" />
                <span style={styles.confirmModalTitle}>Confirm Status Change</span>
              </div>
              <button
                type="button"
                disabled={!!togglingId}
                onClick={() => setConfirmStatusModal({ open: false, item: null, nextStatus: '' })}
                style={styles.modalCloseBtn}
              >
                <X size={16} />
              </button>
            </div>
            <div style={styles.confirmModalBody}>
              <p style={{ margin: 0, fontSize: '13px', color: '#1E293B', lineHeight: 1.5 }}>
                Are you sure you want to mark expense for{' '}
                <strong>{confirmStatusModal.item.companyName || confirmStatusModal.item.category}</strong>{' '}
                (₹{Number(confirmStatusModal.item.amount || 0).toLocaleString('en-IN')}) as{' '}
                <strong style={{ color: confirmStatusModal.nextStatus === 'Paid' ? '#15803D' : '#B91C1C' }}>
                  {confirmStatusModal.nextStatus}
                </strong>?
              </p>
            </div>
            <div style={styles.confirmModalFooter}>
              <button
                type="button"
                disabled={!!togglingId}
                onClick={() => setConfirmStatusModal({ open: false, item: null, nextStatus: '' })}
                style={styles.confirmCancelBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!!togglingId}
                onClick={handleConfirmToggleStatus}
                style={{
                  ...styles.confirmActionBtn,
                  backgroundColor: confirmStatusModal.nextStatus === 'Paid' ? '#15803D' : '#B91C1C',
                }}
              >
                {togglingId ? 'Updating...' : `Confirm (${confirmStatusModal.nextStatus})`}
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
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    userSelect: 'none',
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },

  // Toast
  toast: {
    position: 'fixed',
    top: '16px',
    right: '16px',
    zIndex: 99999,
    color: '#FFFFFF',
    padding: '8px 14px',
    borderRadius: '4px',
    fontSize: '12.5px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
  },
  toastClose: {
    background: 'none',
    border: 'none',
    color: '#FFFFFF',
    cursor: 'pointer',
    padding: 0,
    marginLeft: '6px',
    display: 'flex',
    alignItems: 'center',
  },

  // 1. Top Header Bar (Exact match to dark header bar in photo)
  headerBar: {
    backgroundColor: '#0F172A', // Dark charcoal/navy matching Paghdal Clinic Management Software
    color: '#FFFFFF',
    padding: '8px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '13.5px',
    fontWeight: 700,
    flexShrink: 0,
    borderBottom: '1px solid #1E293B',
  },
  headerTitleWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  headerAmberBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleText: {
    letterSpacing: '0.01em',
  },
  headerCloseBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 2. Add New Expense Entry Strip
  entrySection: {
    backgroundColor: '#FFFFFF',
    padding: '10px 14px 12px',
    borderBottom: '1px solid #E2E8F0',
    flexShrink: 0,
  },
  entrySectionTitle: {
    fontSize: '12.5px',
    fontWeight: 700,
    color: '#0F172A',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
  },
  entryFormRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '12px',
  },
  entryColDate: {
    width: '140px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flexShrink: 0,
  },
  entryColCompany: {
    flex: 2,
    minWidth: '220px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  entryColCategory: {
    flex: 1.5,
    minWidth: '180px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  entryColAmount: {
    flex: 1.2,
    minWidth: '140px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  entryColStatus: {
    width: '100px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flexShrink: 0,
  },
  entryColSave: {
    width: '95px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flexShrink: 0,
  },
  fieldLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#475569',
  },
  fieldLabelHidden: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'transparent',
    visibility: 'hidden',
  },
  fieldInput: {
    height: '32px',
    padding: '4px 8px',
    fontSize: '12.5px',
    fontWeight: 600,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    border: '1px solid #94A3B8',
    borderRadius: '3px',
    outline: 'none',
    boxSizing: 'border-box',
    width: '100%',
  },
  statusToggleBtn: {
    height: '32px',
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: '12px',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.15s ease',
  },
  saveBtn: {
    height: '32px',
    backgroundColor: '#0F172A',
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: '12px',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 3. Filter Section
  filterSection: {
    padding: '8px 14px',
    backgroundColor: '#FFFFFF',
    flexShrink: 0,
  },
  filterBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '6px 12px',
    backgroundColor: '#F8FAFC',
    border: '1px solid #CBD5E1',
    borderRadius: '4px',
    overflowX: 'auto',
  },
  filterItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
  },
  filterLabel: {
    fontSize: '11.5px',
    fontWeight: 700,
    color: '#334155',
    whiteSpace: 'nowrap',
  },
  filterInput: {
    height: '28px',
    width: '170px',
    padding: '3px 8px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    border: '1px solid #94A3B8',
    borderRadius: '3px',
    outline: 'none',
  },
  filterDateInput: {
    height: '28px',
    width: '125px',
    padding: '3px 6px',
    fontSize: '11.5px',
    fontWeight: 600,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    border: '1px solid #94A3B8',
    borderRadius: '3px',
    outline: 'none',
  },
  filterBtn: {
    height: '28px',
    padding: '0 14px',
    backgroundColor: '#0F172A',
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: '11.5px',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    whiteSpace: 'nowrap',
  },
  clearBtn: {
    height: '28px',
    padding: '0 14px',
    backgroundColor: '#0F172A',
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: '11.5px',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    whiteSpace: 'nowrap',
  },

  // 4. KPI Cards
  kpiContainer: {
    padding: '0 14px 10px',
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    flexShrink: 0,
  },
  kpiCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #CBD5E1',
    borderRadius: '4px',
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  kpiHeader: {
    display: 'flex',
    alignItems: 'center',
  },
  kpiTitle: {
    fontSize: '11px',
    fontWeight: 800,
    color: '#475569',
    letterSpacing: '0.04em',
  },
  kpiValueDark: {
    fontSize: '22px',
    fontWeight: 800,
    color: '#0F172A',
    letterSpacing: '-0.02em',
  },
  kpiValueGreen: {
    fontSize: '22px',
    fontWeight: 800,
    color: '#15803D',
    letterSpacing: '-0.02em',
  },
  kpiValueRed: {
    fontSize: '22px',
    fontWeight: 800,
    color: '#B91C1C',
    letterSpacing: '-0.02em',
  },

  // 5. Data Table
  tableWrapper: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'auto',
    borderTop: '1px solid #CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px',
  },
  theadRow: {
    backgroundColor: '#E2E8F0', // Soft silvery-gray matching photo
    borderBottom: '1px solid #94A3B8',
    position: 'sticky',
    top: 0,
    zIndex: 2,
  },
  th: {
    padding: '8px 12px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: 800,
    color: '#0F172A',
    borderRight: '1px solid #CBD5E1',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid #E2E8F0',
    transition: 'background-color 0.1s ease',
  },
  tdDate: {
    padding: '7px 12px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#0F172A',
    whiteSpace: 'nowrap',
    borderRight: '1px solid #F1F5F9',
  },
  tdCompany: {
    padding: '7px 12px',
    fontSize: '12px',
    fontWeight: 800,
    color: '#0F172A',
    borderRight: '1px solid #F1F5F9',
  },
  tdCategory: {
    padding: '7px 12px',
    fontSize: '12px',
    fontWeight: 700,
    color: '#0284C7', // Cyan/blue matching photo
    borderRight: '1px solid #F1F5F9',
  },
  tdAmount: {
    padding: '7px 12px',
    fontSize: '12.5px',
    fontWeight: 800,
    color: '#0F172A',
    textAlign: 'right',
    borderRight: '1px solid #F1F5F9',
  },
  tdStatus: {
    padding: '5px 10px',
    textAlign: 'center',
    borderRight: '1px solid #F1F5F9',
  },
  tableStatusBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: '11px',
    padding: '3px 12px',
    borderRadius: '3px',
    border: 'none',
    cursor: 'pointer',
    minWidth: '70px',
    transition: 'background-color 0.15s ease',
  },
  tdAction: {
    padding: '5px 8px',
    textAlign: 'center',
  },
  deleteBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    backgroundColor: '#F1F5F9',
    border: '1px solid #CBD5E1',
    borderRadius: '4px',
    cursor: 'pointer',
    padding: 0,
  },
  emptyTd: {
    padding: '40px 16px',
    textAlign: 'center',
    color: '#64748B',
    fontSize: '12.5px',
    fontWeight: 500,
  },

  // Confirmation Modal
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    zIndex: 99999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmModalBox: {
    width: '420px',
    maxWidth: '92vw',
    backgroundColor: '#FFFFFF',
    borderRadius: '6px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25)',
    overflow: 'hidden',
    border: '1px solid #CBD5E1',
  },
  confirmModalHeader: {
    backgroundColor: '#F8FAFC',
    padding: '10px 14px',
    borderBottom: '1px solid #E2E8F0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  confirmModalTitle: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#0F172A',
  },
  modalCloseBtn: {
    background: 'none',
    border: 'none',
    color: '#64748B',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
  },
  confirmModalBody: {
    padding: '16px',
    backgroundColor: '#FFFFFF',
  },
  confirmModalFooter: {
    padding: '10px 14px',
    backgroundColor: '#F8FAFC',
    borderTop: '1px solid #E2E8F0',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  },
  confirmCancelBtn: {
    padding: '6px 14px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #CBD5E1',
    borderRadius: '3px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#334155',
    cursor: 'pointer',
  },
  confirmActionBtn: {
    padding: '6px 16px',
    borderRadius: '3px',
    border: 'none',
    fontSize: '12px',
    fontWeight: 700,
    color: '#FFFFFF',
    cursor: 'pointer',
  },
};

export default ExpenseMaster;
