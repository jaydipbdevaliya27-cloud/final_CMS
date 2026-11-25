import React, { useState, useEffect, useRef } from 'react';
import { cutAPI, masterDataAPI } from '../services/api';
import {
  X,
  Save,
  Search,
  Trash2,
  Calendar,
  Building2,
  User,
  Tag,
  AlertTriangle,
  CheckCircle2,
  FileText,
  DollarSign,
  TrendingUp,
} from 'lucide-react';

export const CutMaster = ({ onNavigateToDashboard }) => {
  // Cuts data & summary
  const [cuts, setCuts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    totalEntries: 0,
    paidAmount: 0,
    unpaidAmount: 0,
    totalIncome: 0,
  });

  // Entry Form State - EXACT FIELDS: Date, Center Name, Patient Name, Category, Cut Amount, Status
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [centerName, setCenterName] = useState('');
  const [patientName, setPatientName] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('Unpaid'); // 'Unpaid' or 'Paid'
  const [isSaving, setIsSaving] = useState(false);

  // Filter State - EXACT FIELDS: Center, Category, From, To
  const [filterCenter, setFilterCenter] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  // Autocomplete Datalists
  const [centerList, setCenterList] = useState([
    'CARE DIAGNOSTICS',
    'SURAT X-RAY & USG CENTER',
    'SHIVAM PATHOLOGY LAB',
    'SUNSHINE CT-SCAN & MRI',
    'AMROLI DIAGNOSTIC CLINIC',
    'KRISHNA LABORATORY',
  ]);

  const [categoryList, setCategoryList] = useState([
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

  // Toast notifications
  const [toast, setToast] = useState({ show: false, text: '', type: 'success' });

  // Confirmation Mechanism & Double-Click Lock State
  const [confirmStatusModal, setConfirmStatusModal] = useState({ open: false, item: null, nextStatus: '' });
  const [togglingId, setTogglingId] = useState(null);

  const centerInputRef = useRef(null);
  const amountInputRef = useRef(null);

  const showToast = (text, type = 'success') => {
    setToast({ show: true, text, type });
    setTimeout(() => setToast({ show: false, text: '', type: 'success' }), 3500);
  };

  // Load Centers & Categories from Master Data
  const loadMasterData = async () => {
    try {
      const [centerRes, catRes] = await Promise.allSettled([
        masterDataAPI.getItems('center', '', 1, 100),
        masterDataAPI.getItems('cut_category', '', 1, 100),
      ]);

      if (centerRes.status === 'fulfilled' && centerRes.value?.success && Array.isArray(centerRes.value.data)) {
        const centers = centerRes.value.data.map((c) => c.value?.toUpperCase()).filter(Boolean);
        if (centers.length > 0) {
          setCenterList((prev) => [...new Set([...prev, ...centers])]);
        }
      }

      if (catRes.status === 'fulfilled' && catRes.value?.success && Array.isArray(catRes.value.data)) {
        const cats = catRes.value.data.map((c) => c.value?.toUpperCase()).filter(Boolean);
        if (cats.length > 0) {
          setCategoryList((prev) => [...new Set([...prev, ...cats])]);
        }
      }
    } catch (e) {
      console.warn('Could not load cut master data:', e);
    }
  };

  // Fetch Cuts with active filters
  const fetchCuts = async (overrideFilters = null) => {
    try {
      setLoading(true);
      const activeCenter = overrideFilters ? overrideFilters.center : filterCenter;
      const activeCat = overrideFilters ? overrideFilters.category : filterCategory;
      const activeFrom = overrideFilters ? overrideFilters.from : filterFrom;
      const activeTo = overrideFilters ? overrideFilters.to : filterTo;

      const params = {
        limit: 500,
      };

      if (activeCenter && activeCenter.trim()) {
        params.centerName = activeCenter.trim();
      }

      if (activeCat && activeCat.trim() && !activeCat.toUpperCase().includes('ALL')) {
        params.category = activeCat.trim();
      }

      if (activeFrom) params.from = activeFrom;
      if (activeTo) params.to = activeTo;

      const res = await cutAPI.getAll(params);
      if (res?.success) {
        const list = res.cuts || [];
        setCuts(list);

        // Update KPI summary cards
        const totalEntries = res.totalEntries ?? list.length;
        const paidAmount = res.paidAmount ?? list.filter((c) => c.status === 'Paid').reduce((a, b) => a + (b.amount || 0), 0);
        const unpaidAmount = res.unpaidAmount ?? list.filter((c) => c.status !== 'Paid').reduce((a, b) => a + (b.amount || 0), 0);
        const totalIncome = res.totalIncome ?? res.totalAmount ?? list.reduce((a, b) => a + (b.amount || 0), 0);

        setSummary({
          totalEntries,
          paidAmount,
          unpaidAmount,
          totalIncome,
        });
      }
    } catch (err) {
      console.error('Error fetching cuts:', err);
      showToast('Error loading cut records: ' + (err.message || 'Server error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasterData();
    fetchCuts();
  }, []);

  // Keyboard shortcut listener: F5 or Esc closes Cut Master
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'F5') {
        e.preventDefault();
        if (onNavigateToDashboard) {
          onNavigateToDashboard();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNavigateToDashboard]);

  // Handle Save New Cut Entry
  const handleSaveCut = async (e) => {
    if (e) e.preventDefault();

    if (!centerName.trim()) {
      showToast('Please enter Diagnostic / Center Name.', 'error');
      if (centerInputRef.current) centerInputRef.current.focus();
      return;
    }

    if (!category.trim()) {
      showToast('Please enter or select Cut Category.', 'error');
      return;
    }

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      showToast('Please enter a valid cut amount greater than 0.', 'error');
      if (amountInputRef.current) amountInputRef.current.focus();
      return;
    }

    try {
      setIsSaving(true);
      const cleanCenter = centerName.trim().toUpperCase();
      const cleanCategory = category.trim().toUpperCase();

      const payload = {
        date: entryDate || new Date().toISOString().split('T')[0],
        centerName: cleanCenter,
        patientName: patientName.trim().toUpperCase(),
        category: cleanCategory,
        amount: numAmount,
        status: status === 'Paid' ? 'Paid' : 'Unpaid',
      };

      const res = await cutAPI.create(payload);
      if (res?.success) {
        showToast(`Cut income of ₹${numAmount.toLocaleString('en-IN')} saved successfully!`);

        // Auto-update suggestions lists locally
        if (!centerList.includes(cleanCenter)) {
          setCenterList((prev) => [...prev, cleanCenter]);
        }
        if (!categoryList.includes(cleanCategory)) {
          setCategoryList((prev) => [...prev, cleanCategory]);
        }

        // Reset amount and patient name, keep date and center
        setAmount('');
        setPatientName('');
        // Re-fetch cuts
        fetchCuts();

        if (amountInputRef.current) {
          amountInputRef.current.focus();
        }
      } else {
        showToast(res?.message || 'Failed to record cut income', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Error recording cut income', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Request Toggle Status (opens confirmation modal & guards against double-click)
  const handleRequestToggleStatus = (cut) => {
    if (togglingId === cut._id) return;
    const nextStatus = cut.status === 'Paid' ? 'Unpaid' : 'Paid';
    setConfirmStatusModal({ open: true, item: cut, nextStatus });
  };

  // Confirm Status Change
  const handleConfirmToggleStatus = async () => {
    const { item: cut, nextStatus } = confirmStatusModal;
    if (!cut || !nextStatus || togglingId === cut._id) return;

    try {
      setTogglingId(cut._id);
      const res = await cutAPI.update(cut._id, { status: nextStatus });
      if (res?.success) {
        // Safe immutable update and strictly recalculate summary from array (immune to double click count)
        setCuts((prev) => {
          const updated = prev.map((item) =>
            item._id === cut._id ? { ...item, status: nextStatus } : item
          );

          const paidAmount = updated
            .filter((i) => i.status === 'Paid')
            .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
          const unpaidAmount = updated
            .filter((i) => i.status !== 'Paid')
            .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
          const totalIncome = updated.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

          setSummary({
            totalEntries: updated.length,
            paidAmount,
            unpaidAmount,
            totalIncome,
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

  // Delete Cut Entry
  const handleDeleteCut = async (cut) => {
    const label = cut.centerName || cut.category || 'Entry';
    if (!window.confirm(`Delete cut income entry "${label}" (₹${cut.amount})?`)) return;

    try {
      const res = await cutAPI.delete(cut._id);
      if (res?.success) {
        showToast('Cut income record deleted successfully');
        fetchCuts();
      } else {
        showToast(res?.message || 'Failed to delete cut record', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Error deleting cut record', 'error');
    }
  };

  // Filter actions
  const handleApplyFilter = () => {
    fetchCuts();
  };

  const handleClearFilter = () => {
    setFilterCenter('');
    setFilterCategory('');
    setFilterFrom('');
    setFilterTo('');
    fetchCuts({ center: '', category: '', from: '', to: '' });
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

      {/* Datalists for Center Name & Category */}
      <datalist id="cut-center-list">
        {centerList.map((c, i) => (
          <option key={i} value={c} />
        ))}
      </datalist>

      <datalist id="cut-category-list">
        {categoryList.map((c, i) => (
          <option key={i} value={c} />
        ))}
      </datalist>

      {/* ============================================================== */}
      {/* 1. TOP HEADER BAR: Cut Master (Press F5 or Esc to close)        */}
      {/* ============================================================== */}
      <div style={styles.headerBar}>
        <div style={styles.headerTitleWrap}>
          <div style={styles.headerAmberBadge}>
            <TrendingUp size={15} color="#F59E0B" />
          </div>
          <span style={styles.headerTitleText}>
            Cut Master (Press F5 or Esc to close)
          </span>
        </div>
        <button
          type="button"
          onClick={onNavigateToDashboard || (() => {})}
          style={styles.headerCloseBtn}
          title="Close (Esc / F5)"
        >
          <X size={18} color="#FFFFFF" />
        </button>
      </div>

      {/* ============================================================== */}
      {/* 2. ADD ENTRY STRIP: ✚ Add New Cut Entry                        */}
      {/* ============================================================== */}
      <div style={styles.entrySection}>
        <div style={styles.entrySectionTitle}>
          <span style={{ fontWeight: 800, color: '#0F172A', marginRight: '6px' }}>✚</span>
          <span>Add New Cut Entry (Type Amount & Press Enter to Save)</span>
        </div>

        <form onSubmit={handleSaveCut} style={styles.entryFormRow}>
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

          {/* Field 2: Center Name (Datalist) */}
          <div style={styles.entryColCenter}>
            <label style={styles.fieldLabel}>Center Name:</label>
            <input
              ref={centerInputRef}
              type="text"
              list="cut-center-list"
              required
              placeholder="ENTER CENTER NAME..."
              value={centerName}
              onChange={(e) => setCenterName(e.target.value)}
              style={{ ...styles.fieldInput, textTransform: 'uppercase' }}
            />
          </div>

          {/* Field 3: Patient Name (Optional) */}
          <div style={styles.entryColPatient}>
            <label style={styles.fieldLabel}>Patient Name:</label>
            <input
              type="text"
              placeholder="PATIENT NAME..."
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              style={{ ...styles.fieldInput, textTransform: 'uppercase' }}
            />
          </div>

          {/* Field 4: Category (Datalist) */}
          <div style={styles.entryColCategory}>
            <label style={styles.fieldLabel}>Category:</label>
            <input
              type="text"
              list="cut-category-list"
              required
              placeholder="ENTER CATEGORY..."
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ ...styles.fieldInput, textTransform: 'uppercase' }}
            />
          </div>

          {/* Field 5: Cut Amount (₹) */}
          <div style={styles.entryColAmount}>
            <label style={styles.fieldLabel}>Cut Amount (₹):</label>
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

          {/* Field 6: Status Toggle Button (Unpaid / Paid) */}
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

          {/* Field 7: Save Button */}
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
      {/* 3. FILTER STRIP: Center, Category, From, To, Filter, Clear     */}
      {/* ============================================================== */}
      <div style={styles.filterSection}>
        <div style={styles.filterBar}>
          {/* Filter 1: Center */}
          <div style={styles.filterItem}>
            <Building2 size={15} color="#64748B" style={{ flexShrink: 0 }} />
            <span style={styles.filterLabel}>Center:</span>
            <input
              type="text"
              list="cut-center-list"
              placeholder="CARE DIAGNOSTICS"
              value={filterCenter}
              onChange={(e) => setFilterCenter(e.target.value)}
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
              list="cut-category-list"
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
      {/* 4. KPI SUMMARY CARDS: Total Entries, Paid, Unpaid, Total Cut   */}
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

        {/* KPI Card 4: TOTAL CUT INCOME */}
        <div style={{ ...styles.kpiCard, borderLeft: '4px solid #64748B' }}>
          <div style={styles.kpiHeader}>
            <DollarSign size={15} color="#64748B" style={{ marginRight: '6px' }} />
            <span style={styles.kpiTitle}>TOTAL CUT INCOME</span>
          </div>
          <div style={styles.kpiValueDark}>
            ₹{summary.totalIncome.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. DATA TABLE: Date, Center, Patient, Category, Amount, Status */}
      {/* ============================================================== */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.theadRow}>
              <th style={{ ...styles.th, width: '120px' }}>Date</th>
              <th style={{ ...styles.th, width: '220px' }}>Center Name</th>
              <th style={{ ...styles.th, width: '180px' }}>Patient Name</th>
              <th style={{ ...styles.th, width: '180px' }}>Category</th>
              <th style={{ ...styles.th, width: '140px', textAlign: 'right' }}>Amount (₹)</th>
              <th style={{ ...styles.th, width: '130px', textAlign: 'center' }}>Status</th>
              <th style={{ ...styles.th, width: '80px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && cuts.length === 0 ? (
              <tr>
                <td colSpan={7} style={styles.emptyTd}>
                  <span>Loading cut commission records...</span>
                </td>
              </tr>
            ) : cuts.length === 0 ? (
              <tr>
                <td colSpan={7} style={styles.emptyTd}>
                  <span>No cut records found. Add an entry above.</span>
                </td>
              </tr>
            ) : (
              cuts.map((cut, idx) => {
                const isEven = idx % 2 === 0;
                const isPaid = cut.status === 'Paid';
                const isToggling = togglingId === cut._id;

                return (
                  <tr
                    key={cut._id || idx}
                    style={{
                      ...styles.tr,
                      backgroundColor: isEven ? '#FFFFFF' : '#F8FAFC',
                    }}
                  >
                    {/* 1. Date */}
                    <td style={styles.tdDate}>
                      {formatDateDisplay(cut.date)}
                    </td>

                    {/* 2. Center Name */}
                    <td style={styles.tdCenter}>
                      {cut.centerName || '—'}
                    </td>

                    {/* 3. Patient Name */}
                    <td style={styles.tdPatient}>
                      {cut.patientName || '—'}
                    </td>

                    {/* 4. Category */}
                    <td style={styles.tdCategory}>
                      {cut.category}
                    </td>

                    {/* 5. Amount (₹) */}
                    <td style={styles.tdAmount}>
                      ₹{(cut.amount || 0).toLocaleString('en-IN')}
                    </td>

                    {/* 6. Status Pill Button (Protected against double-clicks with Confirmation) */}
                    <td style={styles.tdStatus}>
                      <button
                        type="button"
                        disabled={isToggling}
                        onClick={() => handleRequestToggleStatus(cut)}
                        style={{
                          ...styles.tableStatusBtn,
                          backgroundColor: isPaid ? '#15803D' : '#991B1B',
                          opacity: isToggling ? 0.7 : 1,
                        }}
                        title="Click to change status (Confirmation required)"
                      >
                        {isToggling ? '...' : isPaid ? '✓ Paid' : 'Unpaid'}
                      </button>
                    </td>

                    {/* 7. Action: Delete Button */}
                    <td style={styles.tdAction}>
                      <button
                        type="button"
                        onClick={() => handleDeleteCut(cut)}
                        style={styles.deleteBtn}
                        title="Delete cut entry"
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

      {/* ============================================================== */}
      {/* 6. STATUS CHANGE CONFIRMATION MODAL                            */}
      {/* ============================================================== */}
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
                Are you sure you want to mark cut income for{' '}
                <strong>{confirmStatusModal.item.centerName || confirmStatusModal.item.category}</strong>{' '}
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

  // 1. Top Header Bar (Exact match to Expense Master header bar)
  headerBar: {
    backgroundColor: '#0F172A',
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

  // 2. Add New Cut Entry Strip
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
    width: '135px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flexShrink: 0,
  },
  entryColCenter: {
    flex: 2,
    minWidth: '200px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  entryColPatient: {
    flex: 1.5,
    minWidth: '160px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  entryColCategory: {
    flex: 1.8,
    minWidth: '180px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  entryColAmount: {
    flex: 1.2,
    minWidth: '130px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  entryColStatus: {
    width: '95px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flexShrink: 0,
  },
  entryColSave: {
    width: '90px',
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
    backgroundColor: '#E2E8F0',
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
  tdCenter: {
    padding: '7px 12px',
    fontSize: '12px',
    fontWeight: 800,
    color: '#0F172A',
    borderRight: '1px solid #F1F5F9',
  },
  tdPatient: {
    padding: '7px 12px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#334155',
    borderRight: '1px solid #F1F5F9',
  },
  tdCategory: {
    padding: '7px 12px',
    fontSize: '12px',
    fontWeight: 700,
    color: '#0284C7',
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
    transition: 'all 0.15s ease',
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

export default CutMaster;
