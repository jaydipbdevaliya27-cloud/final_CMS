import React, { useState, useEffect, useRef } from 'react';
import { cutAPI, masterDataAPI } from '../services/api';
import {
  Scissors,
  X,
  Save,
  Search,
  Trash2,
  FileText,
  Banknote,
  Lock,
  Plus,
} from 'lucide-react';

export const CutMaster = ({ onNavigateToDashboard, onLock }) => {
  const [cuts, setCuts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    totalEntries: 0,
    totalAmount: 0,
  });

  // Simple 3-field Entry Form: Date, Company Name, Amount (₹)
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [companyName, setCompanyName] = useState('');
  const [amount, setAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Filter State: Search Company, From, To
  const [filterCompany, setFilterCompany] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  // Company autocomplete suggestions
  const [companySuggestions, setCompanySuggestions] = useState([]);

  // Toast feedback
  const [toast, setToast] = useState({ show: false, text: '', type: 'success' });
  const companyInputRef = useRef(null);
  const amountInputRef = useRef(null);

  const showToast = (text, type = 'success') => {
    setToast({ show: true, text, type });
    setTimeout(() => setToast({ show: false, text: '', type: 'success' }), 3500);
  };

  const loadSuggestions = async () => {
    try {
      const res = await masterDataAPI.getItems('center', '', 1, 150);
      if (res?.success && Array.isArray(res.data)) {
        const list = res.data.map((c) => c.value?.toUpperCase()).filter(Boolean);
        setCompanySuggestions([...new Set(list)]);
      }
    } catch (e) {}
  };

  const fetchCuts = async (override = null) => {
    try {
      setLoading(true);
      const qComp = override !== null ? override.company : filterCompany;
      const qFrom = override !== null ? override.from : filterFrom;
      const qTo = override !== null ? override.to : filterTo;

      const params = { limit: 500 };
      if (qComp && qComp.trim()) params.centerName = qComp.trim();
      if (qFrom) params.from = qFrom;
      if (qTo) params.to = qTo;

      const res = await cutAPI.getAll(params);
      if (res?.success) {
        const list = res.cuts || [];
        setCuts(list);
        const totalAmt = list.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        setSummary({
          totalEntries: res.totalEntries ?? list.length,
          totalAmount: res.totalAmount ?? totalAmt,
        });

        // Merge any company names from cuts into autocomplete suggestions
        const namesFromCuts = list.map((c) => c.centerName?.toUpperCase()).filter(Boolean);
        if (namesFromCuts.length > 0) {
          setCompanySuggestions((prev) => [...new Set([...prev, ...namesFromCuts])]);
        }
      }
    } catch (err) {
      console.error('Error fetching cuts:', err);
      showToast('Failed to load CUT entries', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuggestions();
    fetchCuts();
  }, []);

  // Esc key closes Cut Master cleanly
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && onNavigateToDashboard) {
        onNavigateToDashboard();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onNavigateToDashboard]);

  const handleSaveEntry = async (e) => {
    if (e) e.preventDefault();
    const cleanCompany = companyName.trim().toUpperCase();
    const numAmount = Number(amount);

    if (!cleanCompany) {
      showToast('Please enter Company Name', 'error');
      companyInputRef.current?.focus();
      return;
    }
    if (!numAmount || numAmount <= 0) {
      showToast('Please enter a valid Amount greater than 0', 'error');
      amountInputRef.current?.focus();
      return;
    }

    try {
      setIsSaving(true);
      const res = await cutAPI.create({
        date: entryDate || new Date().toISOString().split('T')[0],
        centerName: cleanCompany,
        amount: numAmount,
        category: 'EXTRA INCOME',
        status: 'Paid',
      });
      if (res?.success) {
        setCompanyName('');
        setAmount('');
        showToast(`Saved ₹${numAmount} for ${cleanCompany}`);
        await fetchCuts();
        companyInputRef.current?.focus();
      } else {
        showToast(res?.message || 'Failed to save entry', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save entry', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEntry = async (item) => {
    const ok = window.confirm(`Delete CUT entry "${item.centerName}" (₹${item.amount})?`);
    if (!ok) return;
    try {
      const res = await cutAPI.delete(item._id);
      if (res?.success) {
        showToast('Entry deleted');
        await fetchCuts();
      }
    } catch (err) {
      showToast('Failed to delete entry', 'error');
    }
  };

  const handleClearFilters = () => {
    setFilterCompany('');
    setFilterFrom('');
    setFilterTo('');
    fetchCuts({ company: '', from: '', to: '' });
  };

  const formatDateDisplay = (raw) => {
    if (!raw) return '-';
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [y, m, d] = raw.split('-');
      return `${d}-${m}-${y}`;
    }
    return raw;
  };

  return (
    <div style={styles.container}>
      {toast.show && (
        <div
          style={{
            ...styles.toast,
            backgroundColor: toast.type === 'error' ? '#DC2626' : '#15803D',
          }}
        >
          <span>{toast.text}</span>
        </div>
      )}

      {/* 1. CRIMSON HEADER BAR (MATCHING REFERENCE IMAGE) */}
      <div style={styles.topHeaderBar}>
        <div style={styles.headerLeft}>
          <Scissors size={16} color="#FFFFFF" />
          <span style={styles.headerTitle}>CUT Master (Press F5 or Esc to close)</span>
        </div>
        <div style={styles.headerRight}>
          {onLock && (
            <button
              type="button"
              onClick={onLock}
              style={styles.lockBtn}
              title="Lock CUT Master (Doctor password required to re-open)"
            >
              <Lock size={12} color="#FEF08A" />
              <span>Lock Tab</span>
            </button>
          )}
          {onNavigateToDashboard && (
            <button
              type="button"
              onClick={onNavigateToDashboard}
              style={styles.closeBtn}
              title="Close CUT Master"
            >
              <X size={18} color="#FFFFFF" />
            </button>
          )}
        </div>
      </div>

      {/* 2. ADD NEW CUT ENTRY CARD */}
      <form onSubmit={handleSaveEntry} style={styles.entryCard}>
        <div style={styles.entryCardTitle}>
          <Plus size={14} color="#9F1239" strokeWidth={3} />
          <span>Add New CUT Entry (Press Enter on Amount to Save)</span>
        </div>

        <div style={styles.entryRow}>
          <div style={{ width: '220px', flexShrink: 0 }}>
            <label style={styles.fieldLabel}>Date:</label>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={{ flex: 1, minWidth: '220px' }}>
            <label style={styles.fieldLabel}>Company Name:</label>
            <input
              ref={companyInputRef}
              type="text"
              list="cutCompanyList"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value.toUpperCase())}
              placeholder="ENTER COMPANY NAME..."
              style={{ ...styles.input, textTransform: 'uppercase' }}
            />
            <datalist id="cutCompanyList">
              {companySuggestions.map((c, idx) => (
                <option key={idx} value={c} />
              ))}
            </datalist>
          </div>

          <div style={{ width: '260px', flexShrink: 0 }}>
            <label style={styles.fieldLabel}>Amount (₹):</label>
            <input
              ref={amountInputRef}
              type="number"
              min="1"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveEntry();
                }
              }}
              placeholder="ENTER AMOUNT..."
              style={styles.input}
            />
          </div>

          <div style={{ alignSelf: 'flex-end' }}>
            <button
              type="submit"
              disabled={isSaving}
              style={styles.saveBtn}
            >
              <Save size={14} />
              <span>{isSaving ? 'Saving...' : 'Save Entry'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* 3. SEARCH & DATE FILTER BAR */}
      <div style={styles.filterBar}>
        <div style={styles.searchGroup}>
          <Search size={14} color="#64748B" />
          <span style={styles.filterLabel}>Search Company:</span>
          <input
            type="text"
            value={filterCompany}
            onChange={(e) => setFilterCompany(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') fetchCuts();
            }}
            placeholder="ALL COMPANIES..."
            style={{ ...styles.filterInput, flex: 1, textTransform: 'uppercase' }}
          />
        </div>

        <div style={styles.dateGroup}>
          <span style={styles.filterLabel}>From:</span>
          <input
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            style={styles.filterInput}
          />
          <span style={styles.filterLabel}>To:</span>
          <input
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            style={styles.filterInput}
          />
          <button
            type="button"
            onClick={() => fetchCuts()}
            style={styles.filterBtn}
          >
            <Search size={13} />
            <span>Filter</span>
          </button>
          <button
            type="button"
            onClick={handleClearFilters}
            style={styles.clearBtn}
          >
            Clear
          </button>
        </div>
      </div>

      {/* 4. TWO KPI SUMMARY CARDS */}
      <div style={styles.kpiRow}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>
            <FileText size={13} color="#64748B" />
            <span>TOTAL CUT ENTRIES</span>
          </div>
          <div style={styles.kpiValueDark}>{summary.totalEntries}</div>
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>
            <Banknote size={13} color="#16A34A" />
            <span>TOTAL CUT AMOUNT</span>
          </div>
          <div style={styles.kpiValueCrimson}>₹{summary.totalAmount}</div>
        </div>
      </div>

      {/* 5. CLEAN 4-COLUMN TABLE */}
      <div style={styles.tableCard}>
        <div style={styles.tableScroll}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={{ ...styles.th, width: '16%' }}>Date</th>
                <th style={{ ...styles.th, width: '64%' }}>Company Name</th>
                <th style={{ ...styles.th, width: '12%', textAlign: 'right' }}>Amount (₹)</th>
                <th style={{ ...styles.th, width: '8%', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={styles.emptyCell}>
                    Loading CUT entries...
                  </td>
                </tr>
              ) : cuts.length === 0 ? (
                <tr>
                  <td colSpan={4} style={styles.emptyCell}>
                    No CUT entries found.
                  </td>
                </tr>
              ) : (
                cuts.map((item, idx) => (
                  <tr
                    key={item._id || idx}
                    style={{
                      ...styles.tr,
                      backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                    }}
                  >
                    <td style={styles.tdDate}>{formatDateDisplay(item.date)}</td>
                    <td style={styles.tdCompany}>{item.centerName}</td>
                    <td style={styles.tdAmount}>₹{item.amount}</td>
                    <td style={styles.tdAction}>
                      <button
                        type="button"
                        onClick={() => handleDeleteEntry(item)}
                        style={styles.deleteBtn}
                        title="Delete entry"
                      >
                        <Trash2 size={14} color="#475569" />
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
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    boxSizing: 'border-box',
    gap: '8px',
    padding: '0 4px 4px',
  },
  toast: {
    position: 'fixed',
    top: '18px',
    right: '20px',
    zIndex: 9999,
    padding: '8px 16px',
    borderRadius: '6px',
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: '12.5px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
  },
  topHeaderBar: {
    backgroundColor: '#B91C50',
    color: '#FFFFFF',
    padding: '8px 14px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  headerTitle: {
    fontSize: '14px',
    fontWeight: 700,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  lockBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    color: '#FFFFFF',
    padding: '3px 9px',
    borderRadius: '4px',
    fontSize: '11.5px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: '2px',
  },
  entryCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #FBCFE8',
    borderRadius: '6px',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flexShrink: 0,
  },
  entryCardTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontWeight: 800,
    color: '#9F1239',
  },
  entryRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '10px',
    flexWrap: 'wrap',
  },
  fieldLabel: {
    display: 'block',
    fontSize: '11px',
    fontWeight: 600,
    color: '#475569',
    marginBottom: '3px',
  },
  input: {
    width: '100%',
    height: '32px',
    padding: '0 10px',
    borderRadius: '5px',
    border: '1px solid #94A3B8',
    fontSize: '12.5px',
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    outline: 'none',
    boxSizing: 'border-box',
  },
  saveBtn: {
    height: '32px',
    padding: '0 14px',
    borderRadius: '5px',
    border: 'none',
    backgroundColor: '#B91C50',
    color: '#FFFFFF',
    fontSize: '12.5px',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    whiteSpace: 'nowrap',
  },
  filterBar: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #CBD5E1',
    borderRadius: '6px',
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
    flexShrink: 0,
  },
  searchGroup: {
    flex: 1,
    minWidth: '240px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  dateGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },
  filterLabel: {
    fontSize: '11.5px',
    fontWeight: 700,
    color: '#334155',
    whiteSpace: 'nowrap',
  },
  filterInput: {
    height: '30px',
    padding: '0 8px',
    borderRadius: '5px',
    border: '1px solid #94A3B8',
    fontSize: '12px',
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    outline: 'none',
  },
  filterBtn: {
    height: '30px',
    padding: '0 12px',
    borderRadius: '5px',
    border: 'none',
    backgroundColor: '#B91C50',
    color: '#FFFFFF',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
  },
  clearBtn: {
    height: '30px',
    padding: '0 12px',
    borderRadius: '5px',
    border: '1px solid #475569',
    backgroundColor: '#64748B',
    color: '#FFFFFF',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  kpiRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '10px',
    flexShrink: 0,
  },
  kpiCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #CBD5E1',
    borderRadius: '6px',
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  kpiLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    fontWeight: 700,
    color: '#475569',
    letterSpacing: '0.3px',
  },
  kpiValueDark: {
    fontSize: '20px',
    fontWeight: 800,
    color: '#0F172A',
  },
  kpiValueCrimson: {
    fontSize: '20px',
    fontWeight: 800,
    color: '#B91C50',
  },
  tableCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    border: '1px solid #CBD5E1',
    borderRadius: '6px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
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
  },
  theadRow: {
    backgroundColor: '#F1F5F9',
    borderBottom: '1px solid #CBD5E1',
    position: 'sticky',
    top: 0,
    zIndex: 1,
  },
  th: {
    padding: '8px 12px',
    fontSize: '11.5px',
    fontWeight: 700,
    color: '#334155',
    textAlign: 'left',
  },
  tr: {
    borderBottom: '1px solid #E2E8F0',
  },
  tdDate: {
    padding: '7px 12px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#334155',
  },
  tdCompany: {
    padding: '7px 12px',
    fontSize: '12.5px',
    fontWeight: 800,
    color: '#9F1239',
    textTransform: 'uppercase',
    wordBreak: 'break-word',
  },
  tdAmount: {
    padding: '7px 12px',
    fontSize: '12.5px',
    fontWeight: 800,
    color: '#0F172A',
    textAlign: 'right',
  },
  tdAction: {
    padding: '5px 8px',
    textAlign: 'center',
  },
  deleteBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '4px',
    border: '1px solid #CBD5E1',
    backgroundColor: '#F8FAFC',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  emptyCell: {
    padding: '28px',
    textAlign: 'center',
    fontSize: '13px',
    color: '#64748B',
  },
};
