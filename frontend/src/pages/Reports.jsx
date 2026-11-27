import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { reportAPI, visitAPI } from '../services/api';
import { InvestigationReportModal } from '../components/reports/InvestigationReportModal';
import {
  Printer,
  Download,
  RefreshCw,
  MapPin,
  UserCheck,
  History,
  IndianRupee,
  Calendar,
  AlertCircle,
  Search,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  TrendingUp,
  Users,
  ChevronDown,
  ChevronUp,
  Lock,
} from 'lucide-react';

const KpiCard = ({ title, value, subtitle, icon: Icon, colorTheme = 'blue', isAlert = false }) => {
  const themes = {
    blue: { border: '#3B82F6', iconBg: '#EFF6FF', iconColor: '#1D4ED8', valColor: '#1E3A8A' },
    emerald: { border: '#10B981', iconBg: '#ECFDF5', iconColor: '#059669', valColor: '#065F46' },
    rose: { border: '#F43F5E', iconBg: '#FFF1F2', iconColor: '#E11D48', valColor: '#9F1239' },
    amber: { border: '#F59E0B', iconBg: '#FFFBEB', iconColor: '#D97706', valColor: '#92400E' },
    purple: { border: '#A855F7', iconBg: '#FAF5FF', iconColor: '#7E22CE', valColor: '#6B21A8' },
    teal: { border: '#14B8A6', iconBg: '#F0FDFA', iconColor: '#0D9488', valColor: '#115E59' },
  };
  const theme = themes[colorTheme] || themes.blue;

  return (
    <div
      style={{
        ...styles.kpiCard,
        borderTop: `3px solid ${theme.border}`,
        backgroundColor: isAlert ? '#FEF2F2' : '#FFFFFF',
      }}
    >
      <div style={styles.kpiTopRow}>
        <div style={{ ...styles.kpiIconWrap, backgroundColor: theme.iconBg, color: theme.iconColor }}>
          {Icon && <Icon size={16} />}
        </div>
        <span style={styles.kpiLabel}>{title}</span>
      </div>
      <div style={{ ...styles.kpiVal, color: theme.valColor }}>{value}</div>
      {subtitle && <div style={styles.kpiSub}>{subtitle}</div>}
    </div>
  );
};

export const Reports = ({ onNavigateToPatient, onLock }) => {
  const { doctor } = useAuth();

  // Active sub-tab matching media_1793643310685_5609bc87.png
  // Tabs: 'area-wise', 'ref-doctor', 'patient-history', 'daily-collections', 'monthly-income', 'dues'
  const [activeTab, setActiveTab] = useState('area-wise');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showLabModal, setShowLabModal] = useState(false);

  // Due Collection Modal State
  const [collectModalOpen, setCollectModalOpen] = useState(false);
  const [patientToCollect, setPatientToCollect] = useState(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectPaymentMode, setCollectPaymentMode] = useState('Cash');
  const [collectNotes, setCollectNotes] = useState('');
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectError, setCollectError] = useState('');
  const [collectSuccessToast, setCollectSuccessToast] = useState('');

  const handleOpenCollect = (row) => {
    setPatientToCollect(row);
    setCollectAmount(String(row.totalDue || 0));
    setCollectPaymentMode('Cash');
    setCollectNotes('');
    setCollectError('');
    setCollectModalOpen(true);
  };

  const handleConfirmCollect = async (e) => {
    if (e) e.preventDefault();
    const num = Number(collectAmount);
    if (!num || num <= 0) {
      setCollectError('Please enter a valid collection amount greater than 0.');
      return;
    }
    try {
      setIsCollecting(true);
      setCollectError('');
      const res = await visitAPI.collectDue({
        patientId: patientToCollect.patientId,
        amount: num,
        paymentMode: collectPaymentMode,
        notes: collectNotes,
      });
      if (res?.success) {
        // Update local reportData immediately
        setReportData((prev) =>
          prev.map((r) => {
            if (r.patientId === patientToCollect.patientId) {
              return {
                ...r,
                totalDue: res.totalDue !== undefined ? res.totalDue : Math.max(0, (r.totalDue || 0) - num),
                deposit: res.deposit !== undefined ? res.deposit : (num > (r.totalDue || 0) ? num - (r.totalDue || 0) : 0),
                familyDue: res.familyDue !== undefined ? res.familyDue : Math.max(0, (r.familyDue || 0) - num),
                familyDeposit: res.familyDeposit !== undefined ? res.familyDeposit : 0,
              };
            }
            if (r.familyId === patientToCollect.familyId) {
              return {
                ...r,
                familyDue: res.familyDue !== undefined ? res.familyDue : Math.max(0, (r.familyDue || 0) - num),
                familyDeposit: res.familyDeposit !== undefined ? res.familyDeposit : 0,
              };
            }
            return r;
          })
        );
        // Update summary
        setSummary((prev) => ({
          ...prev,
          totalOutstandingDue: Math.max(0, (prev.totalOutstandingDue || 0) - num),
        }));

        // Trigger live refresh in Recent History
        try {
          window.dispatchEvent(new CustomEvent('cms_visit_saved', { detail: res?.visit }));
        } catch (e) {}

        setCollectModalOpen(false);
        const collectedPatName = patientToCollect.name;
        setPatientToCollect(null);
        setCollectSuccessToast(`₹${num.toLocaleString('en-IN')} collected successfully for ${collectedPatName}!`);
        setTimeout(() => setCollectSuccessToast(''), 4500);
      } else {
        setCollectError(res?.message || 'Failed to record due collection');
      }
    } catch (err) {
      setCollectError(err.response?.data?.message || err.message || 'Server error recording collection');
    } finally {
      setIsCollecting(false);
    }
  };

  // Date filters
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [quickRange, setQuickRange] = useState('all'); // today, yesterday, week, month, year, all

  // Specific filters
  const [areaFilter, setAreaFilter] = useState('');
  const [refDocFilter, setRefDocFilter] = useState('');
  const [minCharge, setMinCharge] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [historyComplaint, setHistoryComplaint] = useState('');
  const [onlyDues, setOnlyDues] = useState(false);
  const [collectionStatus, setCollectionStatus] = useState('all'); // all, paid, due
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState('');
  const [dueSearch, setDueSearch] = useState('');
  const [minDue, setMinDue] = useState('');

  // Report Data States
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState({});
  const [expandedArea, setExpandedArea] = useState(null);

  // Quick range helper
  const handleQuickRange = (type) => {
    setQuickRange(type);
    const now = new Date();
    if (type === 'today') {
      const d = now.toISOString().split('T')[0];
      setStartDate(d);
      setEndDate(d);
    } else if (type === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const d = y.toISOString().split('T')[0];
      setStartDate(d);
      setEndDate(d);
    } else if (type === 'week') {
      const w = new Date(now);
      w.setDate(w.getDate() - 7);
      setStartDate(w.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (type === 'month') {
      const m = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(m.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (type === 'year') {
      const yr = `${now.getFullYear()}-01-01`;
      setStartDate(yr);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (type === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Fetch report data based on active tab and filters
  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      let res;
      if (activeTab === 'area-wise') {
        res = await reportAPI.getAreaWise({
          area: areaFilter,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
      } else if (activeTab === 'ref-doctor') {
        res = await reportAPI.getRefDoctor({
          reference: refDocFilter,
          minCharge: minCharge || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
      } else if (activeTab === 'patient-history') {
        res = await reportAPI.getPatientHistory({
          search: historySearch,
          complaint: historyComplaint,
          hasDue: onlyDues || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
      } else if (activeTab === 'daily-collections') {
        res = await reportAPI.getDailyCollections({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          status: collectionStatus !== 'all' ? collectionStatus : undefined,
        });
      } else if (activeTab === 'monthly-income') {
        res = await reportAPI.getMonthlyIncome({
          year: selectedYear,
          month: selectedMonth || undefined,
        });
      } else if (activeTab === 'dues') {
        res = await reportAPI.getDues({
          search: dueSearch,
          area: areaFilter,
          minDue: minDue || undefined,
        });
      }

      if (res && res.success) {
        setReportData(res.data || []);
        setSummary(res.summary || {});
      } else {
        setError(res?.message || 'Failed to fetch report');
      }
    } catch (err) {
      console.error('Fetch report error:', err);
      setError(err?.response?.data?.message || err.message || 'Error loading report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    startDate,
    endDate,
    areaFilter,
    refDocFilter,
    minCharge,
    historySearch,
    historyComplaint,
    onlyDues,
    collectionStatus,
    selectedYear,
    selectedMonth,
    dueSearch,
    minDue,
  ]);

  // Handle Print
  const handlePrint = () => {
    window.print();
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!reportData || reportData.length === 0) return;

    let headers = [];
    let rows = [];

    if (activeTab === 'area-wise') {
      headers = ['Area', 'Patients Count', 'Visits Count', 'Total Billed (INR)', 'Received (INR)', 'Outstanding Due (INR)'];
      rows = reportData.map((r) => [r.area, r.patientsCount, r.visitCount, r.totalCharge, r.totalReceived, r.totalDue]);
    } else if (activeTab === 'ref-doctor') {
      headers = ['Referring Doctor', 'Patients Count', 'Visits Count', 'Total Billed (INR)', 'Received (INR)', 'Outstanding Due (INR)'];
      rows = reportData.map((r) => [r.refDoctor, r.patientsCount, r.visitCount, r.totalCharge, r.totalReceived, r.totalDue]);
    } else if (activeTab === 'patient-history') {
      headers = ['Date', 'Patient ID', 'Patient Name', 'Age', 'Area', 'Ref Doctor', 'Complaint', 'Charge (INR)', 'Received (INR)', 'Due (INR)'];
      rows = reportData.map((r) => [r.visitDate, r.patientId, r.patientName, r.patientAge, r.area, r.reference, r.complaint, r.charge, r.received, r.due]);
    } else if (activeTab === 'daily-collections') {
      headers = ['Date', 'Patient ID', 'Patient Name', 'Reference', 'Charge (INR)', 'Received (INR)', 'Due (INR)'];
      rows = reportData.map((r) => [r.visitDate, r.patientId, r.patientName, r.reference, r.charge, r.received, r.due]);
    } else if (activeTab === 'monthly-income') {
      headers = ['Month', 'Year', 'Visits', 'Total Billed (INR)', 'Received (INR)', 'Due (INR)'];
      rows = reportData.map((r) => [r.monthName, r.year, r.visitsCount, r.totalCharge, r.totalReceived, r.totalDue]);
    } else if (activeTab === 'dues') {
      headers = ['Patient ID', 'Patient Name', 'Family ID', 'Head Name', 'Phone', 'Area', 'Patient Due (INR)', 'Family Due (INR)', 'Last Visit'];
      rows = reportData.map((r) => [r.patientId, r.name, r.familyId, r.familyHeadName, r.phone, r.area, r.totalDue, r.familyDue, r.lastVisitDate]);
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val ?? ''}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeTab}_report_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reportTabs = [
    { id: 'area-wise', label: 'Area-wise', icon: MapPin },
    { id: 'ref-doctor', label: 'Ref. Doctor', icon: UserCheck },
    { id: 'patient-history', label: 'Patient History', icon: History },
    { id: 'daily-collections', label: 'Daily Collections', icon: IndianRupee },
    { id: 'monthly-income', label: 'Monthly Income', icon: Calendar },
    { id: 'dues', label: 'Due Report', icon: AlertCircle },
  ];

  const getReportTitle = () => {
    switch (activeTab) {
      case 'area-wise': return 'Area-Wise Patient & Collection Report';
      case 'ref-doctor': return 'Referring Doctor Performance & OPD Report';
      case 'patient-history': return 'Comprehensive Patient Clinical History Report';
      case 'daily-collections': return 'Daily OPD Collections & Billing Ledger';
      case 'monthly-income': return `Monthly Revenue & Financial Summary (${selectedYear})`;
      case 'dues': return 'Patient & Family Outstanding Dues Report';
      default: return 'Clinic Report';
    }
  };

  return (
    <div style={styles.container}>
      {/* 1. TOP SUB-TABS (MATCHING USER'S IMAGE media_1793643310685_5609bc87.png) */}
      <div style={styles.subTabsBar} className="no-print">
        <div style={styles.tabsList}>
          {reportTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  ...styles.tabPill,
                  ...(isActive ? styles.tabPillActive : styles.tabPillInactive),
                }}
              >
                <Icon
                  size={15}
                  color={isActive ? '#FFFFFF' : '#0D5C4E'}
                  style={{ marginRight: 6 }}
                />
                <span>{tab.label}</span>
                {tab.id === 'dues' && (summary.patientsWithDueCount > 0 || (summary.totalOutstandingDue || 0) > 0) && (
                  <span style={isActive ? styles.dueBadgeActive : styles.dueBadgeInactive}>
                    {summary.patientsWithDueCount || '!'}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Action Buttons: Print & CSV Export */}
        <div style={styles.tabActions}>
          <button
            onClick={fetchReport}
            title="Refresh Data"
            style={styles.refreshBtn}
            disabled={loading}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            <span style={{ marginLeft: 5 }}>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            title="Download CSV Spreadsheet"
            style={styles.exportBtn}
          >
            <Download size={13} />
            <span style={{ marginLeft: 5 }}>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            title="Print Report (Clean Printable Format)"
            style={styles.printBtn}
          >
            <Printer size={14} />
            <span style={{ marginLeft: 6, fontWeight: '700' }}>Print Report</span>
          </button>

          {onLock && (
            <button
              type="button"
              onClick={onLock}
              title="Lock Reports & Due (Doctor password required to re-open)"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #FDE68A',
                backgroundColor: '#FFFBEB',
                color: '#B45309',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Lock size={13} color="#D97706" />
              <span>Lock Tab</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. FILTER TOOLBAR STRIP */}
      <div style={styles.filterStrip} className="no-print">
        {/* Quick Date Pills (for date-applicable reports) */}
        {activeTab !== 'monthly-income' && (
          <div style={styles.filterGroup}>
            <span style={styles.filterLabel}>Quick Range:</span>
            <div style={styles.quickRangePills}>
              {['today', 'yesterday', 'week', 'month', 'year', 'all'].map((r) => (
                <button
                  key={r}
                  onClick={() => handleQuickRange(r)}
                  style={{
                    ...styles.quickPill,
                    ...(quickRange === r ? styles.quickPillActive : {}),
                  }}
                >
                  {r === 'today'
                    ? 'Today'
                    : r === 'yesterday'
                      ? 'Yesterday'
                      : r === 'week'
                        ? 'This Week'
                        : r === 'month'
                          ? 'This Month'
                          : r === 'year'
                            ? 'This Year'
                            : 'All Time'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Date Inputs */}
        {activeTab !== 'monthly-income' && activeTab !== 'dues' && (
          <div style={styles.dateInputsWrap}>
            <div style={styles.inputItem}>
              <span style={styles.inputLabel}>From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setQuickRange('custom');
                }}
                style={styles.dateInput}
              />
            </div>
            <div style={styles.inputItem}>
              <span style={styles.inputLabel}>To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setQuickRange('custom');
                }}
                style={styles.dateInput}
              />
            </div>
          </div>
        )}

        {/* Tab-Specific Filters */}
        {activeTab === 'area-wise' && (
          <div style={styles.filterItem}>
            <span style={styles.inputLabel}>Area:</span>
            <input
              type="text"
              placeholder="Filter area (e.g. Bopal, Satellite)..."
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              style={styles.textFilterInput}
            />
          </div>
        )}

        {activeTab === 'ref-doctor' && (
          <>
            <div style={styles.filterItem}>
              <span style={styles.inputLabel}>Doctor:</span>
              <input
                type="text"
                placeholder="Doctor name or 'Direct'..."
                value={refDocFilter}
                onChange={(e) => setRefDocFilter(e.target.value)}
                style={styles.textFilterInput}
              />
            </div>
            <div style={styles.filterItem}>
              <span style={styles.inputLabel}>Min Charge:</span>
              <input
                type="number"
                placeholder="₹ Min Billed"
                value={minCharge}
                onChange={(e) => setMinCharge(e.target.value)}
                style={{ ...styles.textFilterInput, width: '100px' }}
              />
            </div>
          </>
        )}

        {activeTab === 'patient-history' && (
          <>
            <div style={styles.filterItem}>
              <span style={styles.inputLabel}>Search:</span>
              <input
                type="text"
                placeholder="Patient Name, PID, or Family..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                style={{ ...styles.textFilterInput, width: '180px' }}
              />
            </div>
            <div style={styles.filterItem}>
              <span style={styles.inputLabel}>Complaint:</span>
              <input
                type="text"
                placeholder="e.g. Fever, Cough..."
                value={historyComplaint}
                onChange={(e) => setHistoryComplaint(e.target.value)}
                style={{ ...styles.textFilterInput, width: '130px' }}
              />
            </div>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={onlyDues}
                onChange={(e) => setOnlyDues(e.target.checked)}
                style={{ marginRight: 6 }}
              />
              <span>With Due Only</span>
            </label>
          </>
        )}

        {activeTab === 'daily-collections' && (
          <div style={styles.filterItem}>
            <span style={styles.inputLabel}>Payment Status:</span>
            <div style={styles.quickRangePills}>
              {[
                { id: 'all', label: 'All Status' },
                { id: 'paid', label: 'Fully Paid' },
                { id: 'due', label: 'With Due' },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setCollectionStatus(st.id)}
                  style={{
                    ...styles.quickPill,
                    ...(collectionStatus === st.id ? styles.quickPillActive : {}),
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'monthly-income' && (
          <>
            <div style={styles.filterItem}>
              <span style={styles.inputLabel}>Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                style={styles.selectFilter}
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.filterItem}>
              <span style={styles.inputLabel}>Month:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={styles.selectFilter}
              >
                <option value="">All 12 Months</option>
                {[
                  { m: 1, name: 'January' },
                  { m: 2, name: 'February' },
                  { m: 3, name: 'March' },
                  { m: 4, name: 'April' },
                  { m: 5, name: 'May' },
                  { m: 6, name: 'June' },
                  { m: 7, name: 'July' },
                  { m: 8, name: 'August' },
                  { m: 9, name: 'September' },
                  { m: 10, name: 'October' },
                  { m: 11, name: 'November' },
                  { m: 12, name: 'December' },
                ].map((mon) => (
                  <option key={mon.m} value={mon.m}>
                    {mon.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {activeTab === 'dues' && (
          <>
            <div style={styles.filterItem}>
              <span style={styles.inputLabel}>Search:</span>
              <input
                type="text"
                placeholder="Name, Phone, or PID..."
                value={dueSearch}
                onChange={(e) => setDueSearch(e.target.value)}
                style={{ ...styles.textFilterInput, width: '180px' }}
              />
            </div>
            <div style={styles.filterItem}>
              <span style={styles.inputLabel}>Area:</span>
              <input
                type="text"
                placeholder="Filter by area..."
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                style={{ ...styles.textFilterInput, width: '130px' }}
              />
            </div>
            <div style={styles.filterItem}>
              <span style={styles.inputLabel}>Min Due:</span>
              <input
                type="number"
                placeholder="₹ Min Due"
                value={minDue}
                onChange={(e) => setMinDue(e.target.value)}
                style={{ ...styles.textFilterInput, width: '90px' }}
              />
            </div>
          </>
        )}
      </div>

      {/* 3. METRIC SUMMARY CARDS BANNER */}
      <div style={styles.summaryGrid} className="no-print">
        {activeTab === 'area-wise' && (
          <>
            <KpiCard
              title="Total Areas"
              value={summary.totalAreas || 0}
              subtitle="Registered localities"
              icon={MapPin}
              colorTheme="blue"
            />
            <KpiCard
              title="Patients Count"
              value={summary.totalPatients || 0}
              subtitle="Registered patient base"
              icon={Users}
              colorTheme="purple"
            />
            <KpiCard
              title="OPD Visits"
              value={summary.totalVisits || 0}
              subtitle="Total consultations"
              icon={TrendingUp}
              colorTheme="teal"
            />
            <KpiCard
              title="Total Billed"
              value={`₹${(summary.totalCharge || 0).toLocaleString('en-IN')}`}
              subtitle="Gross OPD charges"
              icon={IndianRupee}
              colorTheme="amber"
            />
            <KpiCard
              title="Total Received"
              value={`₹${(summary.totalReceived || 0).toLocaleString('en-IN')}`}
              subtitle="Net amount collected"
              icon={CheckCircle2}
              colorTheme="emerald"
            />
            <KpiCard
              title="Outstanding Dues"
              value={`₹${(summary.totalDue || 0).toLocaleString('en-IN')}`}
              subtitle="Pending recovery"
              icon={AlertCircle}
              colorTheme="rose"
              isAlert={(summary.totalDue || 0) > 0}
            />
          </>
        )}

        {activeTab === 'ref-doctor' && (
          <>
            <KpiCard
              title="Referring Sources"
              value={summary.totalDoctors || 0}
              subtitle="Doctors & referral partners"
              icon={UserCheck}
              colorTheme="purple"
            />
            <KpiCard
              title="Referred Visits"
              value={summary.totalVisits || 0}
              subtitle="Total referred patient cases"
              icon={TrendingUp}
              colorTheme="blue"
            />
            <KpiCard
              title="Total Billed"
              value={`₹${(summary.totalCharge || 0).toLocaleString('en-IN')}`}
              subtitle="Gross revenue from referrals"
              icon={IndianRupee}
              colorTheme="amber"
            />
            <KpiCard
              title="Amount Collected"
              value={`₹${(summary.totalReceived || 0).toLocaleString('en-IN')}`}
              subtitle="Collected payments"
              icon={CheckCircle2}
              colorTheme="emerald"
            />
            <KpiCard
              title="Pending Receivables"
              value={`₹${(summary.totalDue || 0).toLocaleString('en-IN')}`}
              subtitle="Outstanding dues"
              icon={AlertCircle}
              colorTheme="rose"
              isAlert={(summary.totalDue || 0) > 0}
            />
          </>
        )}

        {activeTab === 'patient-history' && (
          <>
            <KpiCard
              title="Clinical Visits"
              value={summary.totalVisits || 0}
              subtitle="Filtered patient visits"
              icon={History}
              colorTheme="blue"
            />
            <KpiCard
              title="Unique Patients"
              value={summary.uniquePatients || 0}
              subtitle="Distinct patients seen"
              icon={Users}
              colorTheme="purple"
            />
            <KpiCard
              title="Total Charges"
              value={`₹${(summary.totalCharge || 0).toLocaleString('en-IN')}`}
              subtitle="Gross billed amount"
              icon={IndianRupee}
              colorTheme="amber"
            />
            <KpiCard
              title="Total Collections"
              value={`₹${(summary.totalReceived || 0).toLocaleString('en-IN')}`}
              subtitle="Total received cash/UPI"
              icon={CheckCircle2}
              colorTheme="emerald"
            />
            <KpiCard
              title="Pending Dues"
              value={`₹${(summary.totalDue || 0).toLocaleString('en-IN')}`}
              subtitle="Uncollected visit balance"
              icon={AlertCircle}
              colorTheme="rose"
              isAlert={(summary.totalDue || 0) > 0}
            />
          </>
        )}

        {activeTab === 'daily-collections' && (
          <>
            <KpiCard
              title="Transactions"
              value={summary.totalTransactions || 0}
              subtitle="OPD receipts recorded"
              icon={History}
              colorTheme="blue"
            />
            <KpiCard
              title="Total Billed"
              value={`₹${(summary.totalCharge || 0).toLocaleString('en-IN')}`}
              subtitle="Daily consultation charges"
              icon={IndianRupee}
              colorTheme="amber"
            />
            <KpiCard
              title="Cash & Online Received"
              value={`₹${(summary.totalReceived || 0).toLocaleString('en-IN')}`}
              subtitle="Collected across counters"
              icon={CheckCircle2}
              colorTheme="emerald"
            />
            <KpiCard
              title="Unpaid Dues"
              value={`₹${(summary.totalDue || 0).toLocaleString('en-IN')}`}
              subtitle="Credit / pending balance"
              icon={AlertCircle}
              colorTheme="rose"
              isAlert={(summary.totalDue || 0) > 0}
            />
            <KpiCard
              title="Collection Rate"
              value={`${summary.collectionRate || 100}%`}
              subtitle="Settlement efficiency"
              icon={TrendingUp}
              colorTheme="teal"
            />
          </>
        )}

        {activeTab === 'monthly-income' && (
          <>
            <KpiCard
              title={`Annual Visits (${selectedYear})`}
              value={summary.totalVisits || 0}
              subtitle="Yearly OPD patient footfall"
              icon={Calendar}
              colorTheme="blue"
            />
            <KpiCard
              title="Annual Billed"
              value={`₹${(summary.totalCharge || 0).toLocaleString('en-IN')}`}
              subtitle="Gross annual invoices"
              icon={IndianRupee}
              colorTheme="amber"
            />
            <KpiCard
              title="Annual Collections"
              value={`₹${(summary.totalReceived || 0).toLocaleString('en-IN')}`}
              subtitle="Net annual cash flow"
              icon={CheckCircle2}
              colorTheme="emerald"
            />
            <KpiCard
              title="Annual Dues"
              value={`₹${(summary.totalDue || 0).toLocaleString('en-IN')}`}
              subtitle="Yearly uncollected dues"
              icon={AlertCircle}
              colorTheme="rose"
              isAlert={(summary.totalDue || 0) > 0}
            />
            <KpiCard
              title="Monthly Average"
              value={`₹${(summary.averagePerMonth || 0).toLocaleString('en-IN')}`}
              subtitle="Average monthly revenue"
              icon={TrendingUp}
              colorTheme="teal"
            />
          </>
        )}

        {activeTab === 'dues' && (
          <>
            <KpiCard
              title="Total Outstanding Dues"
              value={`₹${(summary.totalOutstandingDue || 0).toLocaleString('en-IN')}`}
              subtitle="Cumulative clinic receivable"
              icon={AlertCircle}
              colorTheme="rose"
              isAlert={(summary.totalOutstandingDue || 0) > 0}
            />
            <KpiCard
              title="Patients with Dues"
              value={summary.patientsWithDueCount || 0}
              subtitle="Individual pending accounts"
              icon={Users}
              colorTheme="amber"
            />
            <KpiCard
              title="Affected Families"
              value={summary.familiesWithDueCount || 0}
              subtitle="Family cards with dues"
              icon={Users}
              colorTheme="purple"
            />
          </>
        )}
      </div>

      {/* 4. ON-SCREEN DATA TABLE CONTAINER */}
      <div style={styles.tableCard} className="no-print">
        {loading ? (
          <div style={styles.emptyState}>
            <RefreshCw size={28} className="spin" color="var(--primary)" />
            <p style={{ marginTop: 10, color: 'var(--text-muted)' }}>Generating report...</p>
          </div>
        ) : error ? (
          <div style={styles.emptyState}>
            <AlertCircle size={28} color="var(--danger)" />
            <p style={{ marginTop: 10, color: 'var(--danger)' }}>{error}</p>
          </div>
        ) : reportData.length === 0 ? (
          <div style={styles.emptyState}>
            <Filter size={32} color="var(--text-muted)" style={{ opacity: 0.5 }} />
            <p style={{ marginTop: 8, fontWeight: 500 }}>No records found</p>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Try adjusting the date range or filter criteria above.
            </span>
          </div>
        ) : (
          <div style={styles.tableResponsive}>
            {/* AREA-WISE TABLE */}
            {activeTab === 'area-wise' && (
              <table style={styles.table}>
                <thead>
                  <tr style={styles.theadRow}>
                    <th style={styles.th}>#</th>
                    <th style={styles.th}>Area / Location</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Patients Count</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Visits Count</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Total Billed (₹)</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Received (₹)</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Outstanding Due (₹)</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, idx) => {
                    const isExpanded = expandedArea === row.area;
                    return (
                      <React.Fragment key={row.area || idx}>
                        <tr style={idx % 2 === 0 ? styles.trEven : styles.trOdd}>
                          <td style={styles.tdNum}>{idx + 1}</td>
                          <td style={{ ...styles.td, fontWeight: '600', color: 'var(--primary-dark)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <MapPin size={13} color="var(--primary)" />
                              <span>{row.area || 'Unknown Area'}</span>
                            </div>
                          </td>
                          <td style={{ ...styles.td, textAlign: 'center' }}>
                            <span style={styles.badgeCountBlue}>{row.patientsCount}</span>
                          </td>
                          <td style={{ ...styles.td, textAlign: 'center' }}>
                            <span style={styles.badgeCountTeal}>{row.visitCount}</span>
                          </td>
                          <td style={{ ...styles.td, textAlign: 'right' }}>
                            <span style={styles.numBilled}>₹{(row.totalCharge || 0).toLocaleString('en-IN')}</span>
                          </td>
                          <td style={{ ...styles.td, textAlign: 'right' }}>
                            <span style={styles.numReceived}>₹{(row.totalReceived || 0).toLocaleString('en-IN')}</span>
                          </td>
                          <td style={{ ...styles.td, textAlign: 'right' }}>
                            {row.totalDue > 0 ? (
                              <span style={{ ...styles.dueValBadge, backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                                ₹{(row.totalDue || 0).toLocaleString('en-IN')}
                              </span>
                            ) : (
                              <span style={{ color: '#94A3B8', fontWeight: '500' }}>₹0</span>
                            )}
                          </td>
                          <td style={{ ...styles.td, textAlign: 'center' }}>
                            {row.visits && row.visits.length > 0 ? (
                              <button
                                onClick={() => setExpandedArea(isExpanded ? null : row.area)}
                                style={styles.expandBtn}
                                title="Toggle area visits"
                              >
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                <span style={{ marginLeft: 4 }}>{row.visits.length} Visits</span>
                              </button>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>-</span>
                            )}
                          </td>
                        </tr>

                        {/* Expanded details row */}
                        {isExpanded && row.visits && (
                          <tr>
                            <td colSpan={8} style={styles.nestedTd}>
                              <div style={styles.nestedContainer}>
                                <div style={styles.nestedHeader}>
                                  Visits breakdown for area: <strong>{row.area}</strong>
                                </div>
                                <table style={styles.nestedTable}>
                                  <thead>
                                    <tr style={styles.nestedTheadRow}>
                                      <th>Date</th>
                                      <th>Patient ID</th>
                                      <th>Patient Name</th>
                                      <th>Society / Landmark</th>
                                      <th>Complaint</th>
                                      <th style={{ textAlign: 'right' }}>Charge</th>
                                      <th style={{ textAlign: 'right' }}>Received</th>
                                      <th style={{ textAlign: 'right' }}>Due</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {row.visits.map((v, vIdx) => (
                                      <tr key={v._id || vIdx} style={styles.nestedTr}>
                                        <td>{v.visitDate}</td>
                                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{v.patientId}</td>
                                        <td style={{ fontWeight: 600 }}>{v.patientName}</td>
                                        <td style={{ color: 'var(--text-muted)' }}>{v.society || '-'}</td>
                                        <td>{v.complaint || '-'}</td>
                                        <td style={{ textAlign: 'right' }}>₹{v.charge || 0}</td>
                                        <td style={{ textAlign: 'right', color: '#0d9488' }}>₹{v.received || 0}</td>
                                        <td style={{ textAlign: 'right', color: v.due > 0 ? 'var(--danger)' : '#000' }}>
                                          ₹{v.due || 0}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={styles.tfootRow}>
                    <td style={styles.tfCell} colSpan={2}>
                      TOTALS ({reportData.length} Areas)
                    </td>
                    <td style={{ ...styles.tfCell, textAlign: 'center' }}>{summary.totalPatients || 0}</td>
                    <td style={{ ...styles.tfCell, textAlign: 'center' }}>{summary.totalVisits || 0}</td>
                    <td style={{ ...styles.tfCell, textAlign: 'right' }}>
                      ₹{(summary.totalCharge || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ ...styles.tfCell, textAlign: 'right', color: '#0d9488' }}>
                      ₹{(summary.totalReceived || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ ...styles.tfCell, textAlign: 'right', color: 'var(--danger)' }}>
                      ₹{(summary.totalDue || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={styles.tfCell}></td>
                  </tr>
                </tfoot>
              </table>
            )}

            {/* REF. DOCTOR TABLE */}
            {activeTab === 'ref-doctor' && (
              <table style={styles.table}>
                <thead>
                  <tr style={styles.theadRow}>
                    <th style={styles.th}>#</th>
                    <th style={styles.th}>Referring Doctor / Source</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Patients Referred</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Visits Count</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Total Billed (₹)</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Received (₹)</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Outstanding Due (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, idx) => (
                    <tr key={row.refDoctor || idx} style={idx % 2 === 0 ? styles.trEven : styles.trOdd}>
                      <td style={styles.tdNum}>{idx + 1}</td>
                      <td style={{ ...styles.td, fontWeight: '600', color: 'var(--primary-dark)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <UserCheck size={14} color="var(--primary)" />
                          <span>{row.refDoctor || 'Direct / Self'}</span>
                        </div>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <span style={styles.badgeCountBlue}>{row.patientsCount}</span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <span style={styles.badgeCountTeal}>{row.visitCount}</span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        <span style={styles.numBilled}>₹{(row.totalCharge || 0).toLocaleString('en-IN')}</span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        <span style={styles.numReceived}>₹{(row.totalReceived || 0).toLocaleString('en-IN')}</span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        {row.totalDue > 0 ? (
                          <span style={{ ...styles.dueValBadge, backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                            ₹{(row.totalDue || 0).toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span style={{ color: '#94A3B8', fontWeight: '500' }}>₹0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={styles.tfootRow}>
                    <td style={styles.tfCell} colSpan={2}>
                      TOTALS ({reportData.length} Sources)
                    </td>
                    <td style={{ ...styles.tfCell, textAlign: 'center' }}>-</td>
                    <td style={{ ...styles.tfCell, textAlign: 'center' }}>{summary.totalVisits || 0}</td>
                    <td style={{ ...styles.tfCell, textAlign: 'right' }}>
                      ₹{(summary.totalCharge || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ ...styles.tfCell, textAlign: 'right', color: '#0d9488' }}>
                      ₹{(summary.totalReceived || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ ...styles.tfCell, textAlign: 'right', color: 'var(--danger)' }}>
                      ₹{(summary.totalDue || 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}

            {/* PATIENT HISTORY TABLE */}
            {activeTab === 'patient-history' && (
              <table style={styles.table}>
                <thead>
                  <tr style={styles.theadRow}>
                    <th style={styles.th}>#</th>
                    <th style={styles.th}>Date & Time</th>
                    <th style={styles.th}>Patient ID</th>
                    <th style={styles.th}>Patient Name</th>
                    <th style={styles.th}>Age/Gender</th>
                    <th style={styles.th}>Area</th>
                    <th style={styles.th}>Complaint</th>
                    <th style={styles.th}>Reference</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Charge</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Received</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Due</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, idx) => (
                    <tr key={row._id || idx} style={idx % 2 === 0 ? styles.trEven : styles.trOdd}>
                      <td style={styles.tdNum}>{idx + 1}</td>
                      <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>
                        {row.visitDate} {row.visitTime && <small style={{ color: 'var(--text-muted)' }}>{row.visitTime}</small>}
                      </td>
                      <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: '600' }}>
                        <span style={styles.idBadge}>{row.patientId}</span>
                      </td>
                      <td style={{ ...styles.td, fontWeight: '600' }}>{row.patientName}</td>
                      <td style={styles.td}>
                        {row.patientAge ? `${row.patientAge}y` : '-'} {row.patientGender ? `(${row.patientGender})` : ''}
                      </td>
                      <td style={{ ...styles.td, color: 'var(--text-muted)' }}>{row.area || '-'}</td>
                      <td style={{ ...styles.td, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {row.complaint || '-'}
                      </td>
                      <td style={{ ...styles.td, color: 'var(--text-muted)' }}>{row.reference || 'Self'}</td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        <span style={styles.numBilled}>₹{(row.charge || 0).toLocaleString('en-IN')}</span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        <span style={styles.numReceived}>₹{(row.received || 0).toLocaleString('en-IN')}</span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        {row.due > 0 ? (
                          <span style={{ ...styles.dueValBadge, backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                            ₹{(row.due || 0).toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span style={{ color: '#94A3B8', fontWeight: '500' }}>₹0</span>
                        )}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        {onNavigateToPatient && (
                          <button
                            onClick={() => onNavigateToPatient(row.patientId)}
                            style={styles.openCaseBtn}
                            title="Open patient case record"
                          >
                            <ArrowUpRight size={13} />
                            <span>Case</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={styles.tfootRow}>
                    <td style={styles.tfCell} colSpan={8}>
                      TOTALS ({reportData.length} Visits)
                    </td>
                    <td style={{ ...styles.tfCell, textAlign: 'right' }}>
                      ₹{(summary.totalCharge || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ ...styles.tfCell, textAlign: 'right', color: '#0d9488' }}>
                      ₹{(summary.totalReceived || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ ...styles.tfCell, textAlign: 'right', color: 'var(--danger)' }}>
                      ₹{(summary.totalDue || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={styles.tfCell}></td>
                  </tr>
                </tfoot>
              </table>
            )}

            {/* DAILY COLLECTIONS TABLE */}
            {activeTab === 'daily-collections' && (
              <table style={styles.table}>
                <thead>
                  <tr style={styles.theadRow}>
                    <th style={styles.th}>#</th>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Patient ID</th>
                    <th style={styles.th}>Patient Name</th>
                    <th style={styles.th}>Reference</th>
                    <th style={styles.th}>Complaint</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Charge (₹)</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Received (₹)</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Due (₹)</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Payment Status</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, idx) => (
                    <tr key={row._id || idx} style={idx % 2 === 0 ? styles.trEven : styles.trOdd}>
                      <td style={styles.tdNum}>{idx + 1}</td>
                      <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>{row.visitDate}</td>
                      <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: '600' }}>
                        <span style={styles.idBadge}>{row.patientId}</span>
                      </td>
                      <td style={{ ...styles.td, fontWeight: '600' }}>{row.patientName}</td>
                      <td style={{ ...styles.td, color: 'var(--text-muted)' }}>{row.reference || 'Direct'}</td>
                      <td style={{ ...styles.td, color: 'var(--text-muted)' }}>{row.complaint || '-'}</td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        <span style={styles.numBilled}>₹{(row.charge || 0).toLocaleString('en-IN')}</span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        <span style={styles.numReceived}>₹{(row.received || 0).toLocaleString('en-IN')}</span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        {row.due > 0 ? (
                          <span style={{ ...styles.dueValBadge, backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                            ₹{(row.due || 0).toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span style={{ color: '#94A3B8', fontWeight: '500' }}>₹0</span>
                        )}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        {row.due === 0 ? (
                          <span style={styles.statusPaidBadge}>✓ PAID</span>
                        ) : (
                          <span style={styles.statusDueBadge}>⚠️ DUE ₹{(row.due || 0).toLocaleString('en-IN')}</span>
                        )}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        {onNavigateToPatient && (
                          <button
                            onClick={() => onNavigateToPatient(row.patientId)}
                            style={styles.openCaseBtn}
                            title="Open patient case record"
                          >
                            <ArrowUpRight size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={styles.tfootRow}>
                    <td style={styles.tfCell} colSpan={6}>
                      TOTALS ({reportData.length} Transactions)
                    </td>
                    <td style={{ ...styles.tfCell, textAlign: 'right' }}>
                      ₹{(summary.totalCharge || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ ...styles.tfCell, textAlign: 'right', color: '#0d9488' }}>
                      ₹{(summary.totalReceived || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ ...styles.tfCell, textAlign: 'right', color: 'var(--danger)' }}>
                      ₹{(summary.totalDue || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={styles.tfCell} colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            )}

            {/* MONTHLY INCOME TABLE */}
            {activeTab === 'monthly-income' && (
              <table style={styles.table}>
                <thead>
                  <tr style={styles.theadRow}>
                    <th style={styles.th}>#</th>
                    <th style={styles.th}>Month</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Year</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Total OPD Visits</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Total Billed (₹)</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Total Received (₹)</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Outstanding Dues (₹)</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Collection Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, idx) => {
                    const colRate =
                      row.totalCharge > 0 ? Math.round((row.totalReceived / row.totalCharge) * 100) : 100;
                    return (
                      <tr key={row.monthKey || idx} style={idx % 2 === 0 ? styles.trEven : styles.trOdd}>
                        <td style={styles.tdNum}>{idx + 1}</td>
                        <td style={{ ...styles.td, fontWeight: '600' }}>{row.monthName}</td>
                        <td style={{ ...styles.td, textAlign: 'center', color: 'var(--text-muted)' }}>{row.year}</td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          <span style={styles.badgeCountBlue}>{row.visitsCount}</span>
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right' }}>
                          <span style={styles.numBilled}>₹{(row.totalCharge || 0).toLocaleString('en-IN')}</span>
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right' }}>
                          <span style={styles.numReceived}>₹{(row.totalReceived || 0).toLocaleString('en-IN')}</span>
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right' }}>
                          {row.totalDue > 0 ? (
                            <span style={{ ...styles.dueValBadge, backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                              ₹{(row.totalDue || 0).toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span style={{ color: '#94A3B8', fontWeight: '500' }}>₹0</span>
                          )}
                        </td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          <span
                            style={{
                              ...styles.rateBadge,
                              backgroundColor: colRate >= 90 ? '#DCFCE7' : colRate >= 70 ? '#FEF3C7' : '#FEE2E2',
                              color: colRate >= 90 ? '#15803D' : colRate >= 70 ? '#B45309' : '#DC2626',
                              fontWeight: '700',
                            }}
                          >
                            {colRate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={styles.tfootRow}>
                    <td style={styles.tfCell} colSpan={3}>
                      ANNUAL TOTALS ({selectedYear})
                    </td>
                    <td style={{ ...styles.tfCell, textAlign: 'center' }}>{summary.totalVisits || 0}</td>
                    <td style={{ ...styles.tfCell, textAlign: 'right' }}>
                      ₹{(summary.totalCharge || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ ...styles.tfCell, textAlign: 'right', color: '#0d9488' }}>
                      ₹{(summary.totalReceived || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ ...styles.tfCell, textAlign: 'right', color: 'var(--danger)' }}>
                      ₹{(summary.totalDue || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={styles.tfCell}></td>
                  </tr>
                </tfoot>
              </table>
            )}

            {/* DUE REPORT TABLE */}
            {activeTab === 'dues' && (
              <table style={styles.table}>
                <thead>
                  <tr style={styles.theadRow}>
                    <th style={styles.th}>#</th>
                    <th style={styles.th}>Patient ID</th>
                    <th style={styles.th}>Patient Name</th>
                    <th style={styles.th}>Family ID</th>
                    <th style={styles.th}>Family Head Name</th>
                    <th style={styles.th}>Contact Phone</th>
                    <th style={styles.th}>Area / Location</th>
                    <th style={styles.th}>Last Visit Date</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Patient Due (₹)</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Family Total Due (₹)</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, idx) => (
                    <tr key={row._id || idx} style={idx % 2 === 0 ? styles.trEven : styles.trOdd}>
                      <td style={styles.tdNum}>{idx + 1}</td>
                      <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: '600' }}>
                        <span style={styles.idBadge}>{row.patientId}</span>
                      </td>
                      <td style={{ ...styles.td, fontWeight: '600' }}>{row.name}</td>
                      <td style={{ ...styles.td, fontFamily: 'monospace' }}>FAM {row.familyId}</td>
                      <td style={{ ...styles.td, color: 'var(--text-muted)' }}>{row.familyHeadName}</td>
                      <td style={{ ...styles.td, color: 'var(--text-muted)' }}>{row.phone || '-'}</td>
                      <td style={{ ...styles.td, color: 'var(--text-muted)' }}>{row.area || '-'}</td>
                      <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>{row.lastVisitDate}</td>
                      <td style={{ ...styles.td, textAlign: 'right', fontWeight: '700' }}>
                        {(row.deposit || 0) > 0 ? (
                          <span style={{ color: '#16A34A', fontWeight: '800', backgroundColor: '#DCFCE7', padding: '2px 8px', borderRadius: '6px' }}>
                            🟢 Deposit: ₹{(row.deposit || 0).toLocaleString('en-IN')}
                          </span>
                        ) : (row.totalDue || 0) > 0 ? (
                          <span style={{ ...styles.dueValBadge, backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                            ₹{(row.totalDue || 0).toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span style={{ color: '#94A3B8', fontWeight: '500' }}>₹0</span>
                        )}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right', fontWeight: '600' }}>
                        {(row.familyDeposit || 0) > 0 ? (
                          <span style={{ color: '#16A34A', fontWeight: '800', backgroundColor: '#DCFCE7', padding: '2px 8px', borderRadius: '6px' }}>
                            🟢 Deposit: ₹{(row.familyDeposit || 0).toLocaleString('en-IN')}
                          </span>
                        ) : (row.familyDue || 0) > 0 ? (
                          <span style={{ ...styles.dueValBadge, backgroundColor: '#FEE2E2', color: '#991B1B' }}>
                            ₹{(row.familyDue || 0).toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span style={{ color: '#94A3B8', fontWeight: '500' }}>₹0</span>
                        )}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <button
                          onClick={() => handleOpenCollect(row)}
                          style={{
                            ...styles.openCaseBtn,
                            backgroundColor: '#0D5C4E',
                            borderColor: '#0A4B3F',
                            color: '#FFFFFF',
                            padding: '4px 10px',
                            fontWeight: '600',
                          }}
                          title={`Collect outstanding due of ₹${row.totalDue || 0} from ${row.name}`}
                        >
                          <IndianRupee size={12} />
                          <span>Collect</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={styles.tfootRow}>
                    <td style={styles.tfCell} colSpan={8}>
                      TOTAL OUTSTANDING PATIENT DUES ({reportData.length} Patients)
                    </td>
                    <td style={{ ...styles.tfCell, textAlign: 'right', color: 'var(--danger)' }}>
                      ₹{(summary.totalOutstandingDue || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={styles.tfCell} colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}
      </div>

      {/* 5. DEDICATED PRINTABLE LAYOUT (#printable-report) */}
      <div id="printable-report" style={styles.printContainer}>
        {/* Print Header */}
        <div style={styles.printHeader}>
          <div style={styles.printClinicBrand}>
            <h1 style={styles.printClinicName}>{doctor?.clinicName || 'DHYEY CLINIC & NURSING HOME'}</h1>
            <p style={styles.printDoctorName}>
              {doctor?.name || 'Dr. Chirag Paghdal'}, {doctor?.specialization || 'FAMILY PHYSICIAN (B.H.M.S.)'}
            </p>
            <p style={styles.printClinicInfo}>
              Reg. No: {doctor?.regNo || 'G-9035'} &bull; Phone: {doctor?.phone || '+91 98793 80508'} &bull; Surat, Gujarat
            </p>
          </div>
          <div style={styles.printMeta}>
            <div style={styles.printBadge}>OFFICIAL REPORT</div>
            <div style={styles.printDateText}>
              Printed On: {new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>

        <div style={styles.printDivider} />

        {/* Report Title & Filters */}
        <div style={styles.printReportTitleRow}>
          <div>
            <h2 style={styles.printReportTitle}>{getReportTitle()}</h2>
            <p style={styles.printCriteria}>
              Criteria: {startDate ? `From ${startDate}` : 'All time'}{' '}
              {endDate ? `to ${endDate}` : ''}{' '}
              {areaFilter ? `| Area: ${areaFilter}` : ''}{' '}
              {refDocFilter ? `| Ref Doctor: ${refDocFilter}` : ''}
            </p>
          </div>
        </div>

        {/* Print Summary Highlights */}
        <div style={styles.printSummaryGrid}>
          {activeTab === 'area-wise' && (
            <>
              <div style={styles.printSummaryBox}>
                <span>Total Areas:</span> <strong>{summary.totalAreas || 0}</strong>
              </div>
              <div style={styles.printSummaryBox}>
                <span>Total Visits:</span> <strong>{summary.totalVisits || 0}</strong>
              </div>
              <div style={styles.printSummaryBox}>
                <span>Total Billed:</span> <strong>₹{(summary.totalCharge || 0).toLocaleString('en-IN')}</strong>
              </div>
              <div style={styles.printSummaryBox}>
                <span>Total Received:</span> <strong>₹{(summary.totalReceived || 0).toLocaleString('en-IN')}</strong>
              </div>
              <div style={styles.printSummaryBox}>
                <span>Outstanding Due:</span> <strong>₹{(summary.totalDue || 0).toLocaleString('en-IN')}</strong>
              </div>
            </>
          )}

          {activeTab === 'ref-doctor' && (
            <>
              <div style={styles.printSummaryBox}>
                <span>Total Sources:</span> <strong>{summary.totalDoctors || 0}</strong>
              </div>
              <div style={styles.printSummaryBox}>
                <span>Total Visits:</span> <strong>{summary.totalVisits || 0}</strong>
              </div>
              <div style={styles.printSummaryBox}>
                <span>Total Billed:</span> <strong>₹{(summary.totalCharge || 0).toLocaleString('en-IN')}</strong>
              </div>
              <div style={styles.printSummaryBox}>
                <span>Total Received:</span> <strong>₹{(summary.totalReceived || 0).toLocaleString('en-IN')}</strong>
              </div>
              <div style={styles.printSummaryBox}>
                <span>Total Due:</span> <strong>₹{(summary.totalDue || 0).toLocaleString('en-IN')}</strong>
              </div>
            </>
          )}

          {activeTab === 'patient-history' && (
            <>
              <div style={styles.printSummaryBox}>
                <span>Total Visits:</span> <strong>{summary.totalVisits || 0}</strong>
              </div>
              <div style={styles.printSummaryBox}>
                <span>Unique Patients:</span> <strong>{summary.uniquePatients || 0}</strong>
              </div>
              <div style={styles.printSummaryBox}>
                <span>Total Billed:</span> <strong>₹{(summary.totalCharge || 0).toLocaleString('en-IN')}</strong>
              </div>
              <div style={styles.printSummaryBox}>
                <span>Total Collections:</span> <strong>₹{(summary.totalReceived || 0).toLocaleString('en-IN')}</strong>
              </div>
              <div style={styles.printSummaryBox}>
                <span>Total Due:</span> <strong>₹{(summary.totalDue || 0).toLocaleString('en-IN')}</strong>
              </div>
            </>
          )}

          {activeTab === 'daily-collections' && (
            <>
              <div style={styles.printSummaryBox}>
                <span>Transactions:</span> <strong>{summary.totalTransactions || 0}</strong>
              </div>
              <div style={styles.printSummaryBox}>
                <span>Total Billed:</span> <strong>₹{(summary.totalCharge || 0).toLocaleString('en-IN')}</strong>
              </div>
              <div style={styles.printSummaryBox}>
                <span>Total Received:</span> <strong>₹{(summary.totalReceived || 0).toLocaleString('en-IN')}</strong>
              </div>
              <div style={styles.printSummaryBox}>
                <span>Pending Due:</span> <strong>₹{(summary.totalDue || 0).toLocaleString('en-IN')}</strong>
              </div>
              <div style={styles.printSummaryBox}>
                <span>Collection %:</span> <strong>{summary.collectionRate || 100}%</strong>
              </div>
            </>
          )}

          {activeTab === 'monthly-income' && (
            <>
              <div style={styles.printSummaryBox}>
                <span>Year:</span> <strong>{selectedYear}</strong>
              </div>
              <div style={styles.printSummaryBox}>
                <span>Annual Visits:</span> <strong>{summary.totalVisits || 0}</strong>
              </div>
              <div style={styles.printSummaryBox}>
                <span>Annual Billed:</span> <strong>₹{(summary.totalCharge || 0).toLocaleString('en-IN')}</strong>
              </div>
              <div style={styles.printSummaryBox}>
                <span>Annual Received:</span> <strong>₹{(summary.totalReceived || 0).toLocaleString('en-IN')}</strong>
              </div>
              <div style={styles.printSummaryBox}>
                <span>Annual Due:</span> <strong>₹{(summary.totalDue || 0).toLocaleString('en-IN')}</strong>
              </div>
            </>
          )}

          {activeTab === 'dues' && (
            <>
              <div style={styles.printSummaryBox}>
                <span>Outstanding Dues:</span> <strong>₹{(summary.totalOutstandingDue || 0).toLocaleString('en-IN')}</strong>
              </div>
              <div style={styles.printSummaryBox}>
                <span>Patients with Due:</span> <strong>{summary.patientsWithDueCount || 0}</strong>
              </div>
              <div style={styles.printSummaryBox}>
                <span>Families with Due:</span> <strong>{summary.familiesWithDueCount || 0}</strong>
              </div>
            </>
          )}
        </div>

        {/* Print Data Table */}
        <table style={styles.printTable}>
          <thead>
            {activeTab === 'area-wise' && (
              <tr>
                <th style={styles.printTh}>#</th>
                <th style={styles.printTh}>Area</th>
                <th style={styles.printTh}>Patients</th>
                <th style={styles.printTh}>Visits</th>
                <th style={{ ...styles.printTh, textAlign: 'right' }}>Total Billed (₹)</th>
                <th style={{ ...styles.printTh, textAlign: 'right' }}>Received (₹)</th>
                <th style={{ ...styles.printTh, textAlign: 'right' }}>Due (₹)</th>
              </tr>
            )}
            {activeTab === 'ref-doctor' && (
              <tr>
                <th style={styles.printTh}>#</th>
                <th style={styles.printTh}>Ref. Doctor / Source</th>
                <th style={styles.printTh}>Patients</th>
                <th style={styles.printTh}>Visits</th>
                <th style={{ ...styles.printTh, textAlign: 'right' }}>Total Billed (₹)</th>
                <th style={{ ...styles.printTh, textAlign: 'right' }}>Received (₹)</th>
                <th style={{ ...styles.printTh, textAlign: 'right' }}>Due (₹)</th>
              </tr>
            )}
            {activeTab === 'patient-history' && (
              <tr>
                <th style={styles.printTh}>#</th>
                <th style={styles.printTh}>Date</th>
                <th style={styles.printTh}>PID</th>
                <th style={styles.printTh}>Patient Name</th>
                <th style={styles.printTh}>Area</th>
                <th style={styles.printTh}>Complaint</th>
                <th style={{ ...styles.printTh, textAlign: 'right' }}>Charge</th>
                <th style={{ ...styles.printTh, textAlign: 'right' }}>Received</th>
                <th style={{ ...styles.printTh, textAlign: 'right' }}>Due</th>
              </tr>
            )}
            {activeTab === 'daily-collections' && (
              <tr>
                <th style={styles.printTh}>#</th>
                <th style={styles.printTh}>Date</th>
                <th style={styles.printTh}>PID</th>
                <th style={styles.printTh}>Patient Name</th>
                <th style={styles.printTh}>Ref Doctor</th>
                <th style={{ ...styles.printTh, textAlign: 'right' }}>Charge (₹)</th>
                <th style={{ ...styles.printTh, textAlign: 'right' }}>Received (₹)</th>
                <th style={{ ...styles.printTh, textAlign: 'right' }}>Due (₹)</th>
              </tr>
            )}
            {activeTab === 'monthly-income' && (
              <tr>
                <th style={styles.printTh}>#</th>
                <th style={styles.printTh}>Month</th>
                <th style={styles.printTh}>Year</th>
                <th style={styles.printTh}>Visits</th>
                <th style={{ ...styles.printTh, textAlign: 'right' }}>Billed (₹)</th>
                <th style={{ ...styles.printTh, textAlign: 'right' }}>Received (₹)</th>
                <th style={{ ...styles.printTh, textAlign: 'right' }}>Due (₹)</th>
              </tr>
            )}
            {activeTab === 'dues' && (
              <tr>
                <th style={styles.printTh}>#</th>
                <th style={styles.printTh}>PID</th>
                <th style={styles.printTh}>Patient Name</th>
                <th style={styles.printTh}>Head Name</th>
                <th style={styles.printTh}>Phone</th>
                <th style={styles.printTh}>Area</th>
                <th style={styles.printTh}>Last Visit</th>
                <th style={{ ...styles.printTh, textAlign: 'right' }}>Patient Due (₹)</th>
              </tr>
            )}
          </thead>
          <tbody>
            {activeTab === 'area-wise' &&
              reportData.map((row, idx) => (
                <tr key={idx}>
                  <td style={styles.printTd}>{idx + 1}</td>
                  <td style={styles.printTd}>{row.area}</td>
                  <td style={styles.printTd}>{row.patientsCount}</td>
                  <td style={styles.printTd}>{row.visitCount}</td>
                  <td style={{ ...styles.printTd, textAlign: 'right' }}>₹{row.totalCharge}</td>
                  <td style={{ ...styles.printTd, textAlign: 'right' }}>₹{row.totalReceived}</td>
                  <td style={{ ...styles.printTd, textAlign: 'right' }}>₹{row.totalDue}</td>
                </tr>
              ))}
            {activeTab === 'ref-doctor' &&
              reportData.map((row, idx) => (
                <tr key={idx}>
                  <td style={styles.printTd}>{idx + 1}</td>
                  <td style={styles.printTd}>{row.refDoctor}</td>
                  <td style={styles.printTd}>{row.patientsCount}</td>
                  <td style={styles.printTd}>{row.visitCount}</td>
                  <td style={{ ...styles.printTd, textAlign: 'right' }}>₹{row.totalCharge}</td>
                  <td style={{ ...styles.printTd, textAlign: 'right' }}>₹{row.totalReceived}</td>
                  <td style={{ ...styles.printTd, textAlign: 'right' }}>₹{row.totalDue}</td>
                </tr>
              ))}
            {activeTab === 'patient-history' &&
              reportData.map((row, idx) => (
                <tr key={idx}>
                  <td style={styles.printTd}>{idx + 1}</td>
                  <td style={styles.printTd}>{row.visitDate}</td>
                  <td style={styles.printTd}>{row.patientId}</td>
                  <td style={styles.printTd}>{row.patientName}</td>
                  <td style={styles.printTd}>{row.area || '-'}</td>
                  <td style={styles.printTd}>{row.complaint || '-'}</td>
                  <td style={{ ...styles.printTd, textAlign: 'right' }}>₹{row.charge}</td>
                  <td style={{ ...styles.printTd, textAlign: 'right' }}>₹{row.received}</td>
                  <td style={{ ...styles.printTd, textAlign: 'right' }}>₹{row.due}</td>
                </tr>
              ))}
            {activeTab === 'daily-collections' &&
              reportData.map((row, idx) => (
                <tr key={idx}>
                  <td style={styles.printTd}>{idx + 1}</td>
                  <td style={styles.printTd}>{row.visitDate}</td>
                  <td style={styles.printTd}>{row.patientId}</td>
                  <td style={styles.printTd}>{row.patientName}</td>
                  <td style={styles.printTd}>{row.reference || 'Direct'}</td>
                  <td style={{ ...styles.printTd, textAlign: 'right' }}>₹{row.charge}</td>
                  <td style={{ ...styles.printTd, textAlign: 'right' }}>₹{row.received}</td>
                  <td style={{ ...styles.printTd, textAlign: 'right' }}>₹{row.due}</td>
                </tr>
              ))}
            {activeTab === 'monthly-income' &&
              reportData.map((row, idx) => (
                <tr key={idx}>
                  <td style={styles.printTd}>{idx + 1}</td>
                  <td style={styles.printTd}>{row.monthName}</td>
                  <td style={styles.printTd}>{row.year}</td>
                  <td style={styles.printTd}>{row.visitsCount}</td>
                  <td style={{ ...styles.printTd, textAlign: 'right' }}>₹{row.totalCharge}</td>
                  <td style={{ ...styles.printTd, textAlign: 'right' }}>₹{row.totalReceived}</td>
                  <td style={{ ...styles.printTd, textAlign: 'right' }}>₹{row.totalDue}</td>
                </tr>
              ))}
            {activeTab === 'dues' &&
              reportData.map((row, idx) => (
                <tr key={idx}>
                  <td style={styles.printTd}>{idx + 1}</td>
                  <td style={styles.printTd}>{row.patientId}</td>
                  <td style={styles.printTd}>{row.name}</td>
                  <td style={styles.printTd}>{row.familyHeadName}</td>
                  <td style={styles.printTd}>{row.phone || '-'}</td>
                  <td style={styles.printTd}>{row.area || '-'}</td>
                  <td style={styles.printTd}>{row.lastVisitDate}</td>
                  <td style={{ ...styles.printTd, textAlign: 'right', fontWeight: 'bold' }}>₹{row.totalDue}</td>
                </tr>
              ))}
          </tbody>
        </table>

        {/* Print Sign-off */}
        <div style={styles.printSignOff}>
          <div style={styles.printSignLine} />
          <div style={styles.printSignText}>Authorized Medical Practitioner Signature</div>
          <div style={styles.printSignSub}>{doctor?.name || 'Dr. Chirag Paghdal'} &bull; {doctor?.specialization || 'FAMILY PHYSICIAN (B.H.M.S.)'}</div>
        </div>
      </div>

      {/* Investigation & Lab Report Modal */}
      <InvestigationReportModal
        isOpen={showLabModal}
        onClose={() => setShowLabModal(false)}
        doctor={doctor}
        onReportSaved={() => fetchReport()}
      />

      {/* Due Collection Success Toast */}
      {collectSuccessToast && (
        <div style={styles.collectToast}>
          <CheckCircle2 size={16} />
          <span>{collectSuccessToast}</span>
        </div>
      )}

      {/* Due Collection Modal */}
      {collectModalOpen && patientToCollect && (
        <div style={styles.collectModalOverlay} onClick={() => setCollectModalOpen(false)}>
          <div style={styles.collectModalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.collectModalHeader}>
              <div style={styles.collectModalHeaderIcon}>
                <IndianRupee size={20} color="#0D5C4E" />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={styles.collectModalTitle}>Collect Patient Due</h3>
                <span style={styles.collectModalSub}>Settle outstanding OPD clinic balance</span>
              </div>
              <button
                type="button"
                onClick={() => setCollectModalOpen(false)}
                style={styles.collectModalCloseBtn}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleConfirmCollect} style={styles.collectModalBody}>
              <div style={styles.collectPatientInfoCard}>
                <div style={styles.collectPatientRow}>
                  <span style={styles.collectPatientName}>{patientToCollect.name}</span>
                  <span style={styles.collectPidBadge}>{patientToCollect.patientId}</span>
                </div>
                <div style={styles.collectDueSummaryRow}>
                  <div>
                    <span style={styles.collectDueLabel}>Patient Due: </span>
                    <span style={styles.collectPatientDueVal}>₹{(patientToCollect.totalDue || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span style={styles.collectDueLabel}>Family Due: </span>
                    <span style={styles.collectFamilyDueVal}>₹{(patientToCollect.familyDue || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {collectError && (
                <div style={styles.collectErrorBox}>
                  <AlertCircle size={14} color="#DC2626" />
                  <span>{collectError}</span>
                </div>
              )}

              <div style={styles.collectFieldGroup}>
                <label style={styles.collectFieldLabel}>Collection Amount (₹): *</label>
                <input
                  type="number"
                  min="1"
                  value={collectAmount}
                  onChange={(e) => {
                    setCollectAmount(e.target.value);
                    if (collectError) setCollectError('');
                  }}
                  style={styles.collectAmountInput}
                  autoFocus
                  required
                />
              </div>

              <div style={styles.collectFieldGroup}>
                <label style={styles.collectFieldLabel}>Payment Mode:</label>
                <select
                  value={collectPaymentMode}
                  onChange={(e) => setCollectPaymentMode(e.target.value)}
                  style={styles.collectSelect}
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / GPay / PhonePe / Paytm</option>
                  <option value="Card">Debit / Credit Card</option>
                  <option value="Net Banking">Net Banking / Transfer</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div style={styles.collectFieldGroup}>
                <label style={styles.collectFieldLabel}>Notes / Reference (Optional):</label>
                <input
                  type="text"
                  placeholder="e.g. Cleared past due, GPay Ref #1234"
                  value={collectNotes}
                  onChange={(e) => setCollectNotes(e.target.value)}
                  style={styles.collectNotesInput}
                />
              </div>

              <div style={styles.collectModalFooter}>
                <button
                  type="button"
                  onClick={() => setCollectModalOpen(false)}
                  style={styles.collectCancelBtn}
                  disabled={isCollecting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCollecting || !collectAmount || Number(collectAmount) <= 0}
                  style={styles.collectSubmitBtn}
                >
                  {isCollecting ? 'Recording...' : `Confirm Collection (₹${Number(collectAmount || 0).toLocaleString('en-IN')})`}
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
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    height: '100%',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  subTabsBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: '6px 12px',
    borderRadius: '10px',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
    flexWrap: 'wrap',
    gap: '8px',
  },
  tabsList: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },
  tabPill: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  tabPillActive: {
    backgroundColor: '#146B5C',
    color: '#FFFFFF',
    border: '1px solid #0E4F44',
    boxShadow: '0 2px 5px rgba(20, 107, 92, 0.25)',
  },
  tabPillInactive: {
    backgroundColor: '#FFFFFF',
    color: '#374151',
    border: '1px solid #D1D5DB',
  },
  tabActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  labReportBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '5px 12px',
    backgroundColor: '#146B5C',
    border: 'none',
    borderRadius: '6px',
    fontSize: '11.5px',
    fontWeight: '700',
    color: '#FFFFFF',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(20, 107, 92, 0.2)',
  },
  refreshBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '5px 10px',
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '500',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  exportBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '5px 10px',
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '500',
    color: 'var(--primary)',
    cursor: 'pointer',
  },
  printBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 14px',
    backgroundColor: '#146B5C',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#FFFFFF',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(20, 107, 92, 0.2)',
  },
  filterStrip: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px',
    backgroundColor: '#FFFFFF',
    padding: '6px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    fontSize: '12px',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  filterLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
  quickRangePills: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  quickPill: {
    padding: '3px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '500',
    backgroundColor: 'var(--bg)',
    color: 'var(--text-muted)',
    border: '1px solid var(--border)',
    cursor: 'pointer',
  },
  quickPillActive: {
    backgroundColor: 'var(--primary-soft)',
    color: 'var(--primary-dark)',
    borderColor: 'var(--primary)',
    fontWeight: '600',
  },
  dateInputsWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  inputItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  inputLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-muted)',
  },
  dateInput: {
    padding: '3px 6px',
    borderRadius: '5px',
    border: '1px solid var(--border)',
    fontSize: '11px',
    backgroundColor: '#FFFFFF',
  },
  filterItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  textFilterInput: {
    padding: '4px 8px',
    borderRadius: '5px',
    border: '1px solid var(--border)',
    fontSize: '11px',
    backgroundColor: '#FFFFFF',
  },
  selectFilter: {
    padding: '4px 8px',
    borderRadius: '5px',
    border: '1px solid var(--border)',
    fontSize: '11px',
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text)',
    cursor: 'pointer',
  },
  dueBadgeActive: {
    backgroundColor: '#DC2626',
    color: '#FFFFFF',
    fontSize: '10px',
    fontWeight: '800',
    padding: '1px 6px',
    borderRadius: '10px',
    marginLeft: '6px',
  },
  dueBadgeInactive: {
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    fontSize: '10px',
    fontWeight: '800',
    padding: '1px 6px',
    borderRadius: '10px',
    marginLeft: '6px',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '10px',
  },
  kpiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '10px',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    border: '1px solid #E2E8F0',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },
  kpiTopRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '6px',
  },
  kpiIconWrap: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  kpiLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  kpiVal: {
    fontSize: '20px',
    fontWeight: '800',
    letterSpacing: '-0.3px',
    lineHeight: '1.2',
  },
  kpiSub: {
    fontSize: '11px',
    color: '#94A3B8',
    marginTop: '3px',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '8px 12px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
  },
  summaryLabel: {
    fontSize: '10px',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
    marginBottom: '2px',
  },
  summaryVal: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--text)',
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
  },
  tableResponsive: {
    overflowX: 'auto',
    overflowY: 'auto',
    flex: 1,
    minHeight: 0,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px',
  },
  theadRow: {
    backgroundColor: '#F8FAF9',
    borderBottom: '2px solid var(--border)',
    position: 'sticky',
    top: 0,
    zIndex: 2,
  },
  th: {
    padding: '8px 10px',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--text)',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
    whiteSpace: 'nowrap',
  },
  trEven: {
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid var(--border)',
  },
  trOdd: {
    backgroundColor: '#FDFEFE',
    borderBottom: '1px solid var(--border)',
  },
  tdNum: {
    padding: '6px 10px',
    fontSize: '11px',
    color: 'var(--text-muted)',
    width: '32px',
    textAlign: 'center',
  },
  td: {
    padding: '6px 10px',
    color: 'var(--text)',
    fontSize: '12px',
  },
  idBadge: {
    backgroundColor: 'var(--primary-soft)',
    color: 'var(--primary-dark)',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
  },
  statusPaidBadge: {
    backgroundColor: '#DCFCE7',
    color: '#15803D',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: '700',
  },
  statusDueBadge: {
    backgroundColor: 'var(--danger-soft)',
    color: 'var(--danger)',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: '700',
  },
  rateBadge: {
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '600',
  },
  badgeCountBlue: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '24px',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '700',
    backgroundColor: '#EFF6FF',
    color: '#1D4ED8',
    border: '1px solid #BFDBFE',
  },
  badgeCountTeal: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '24px',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '700',
    backgroundColor: '#F0FDFA',
    color: '#0D9488',
    border: '1px solid #99F6E4',
  },
  numBilled: {
    fontWeight: '700',
    color: '#0284C7',
  },
  numReceived: {
    fontWeight: '700',
    color: '#15803D',
  },
  dueValBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '6px',
    fontWeight: '700',
    fontSize: '11.5px',
  },
  openCaseBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    padding: '3px 7px',
    backgroundColor: 'var(--surface-alt)',
    border: '1px solid var(--primary-soft)',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--primary)',
    cursor: 'pointer',
  },
  expandBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 8px',
    backgroundColor: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '500',
    color: 'var(--primary)',
    cursor: 'pointer',
  },
  nestedTd: {
    padding: '8px 16px',
    backgroundColor: '#F4FAF8',
    borderBottom: '1px solid var(--border)',
  },
  nestedContainer: {
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '8px',
  },
  nestedHeader: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--primary)',
    marginBottom: '6px',
  },
  nestedTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '11px',
  },
  nestedTheadRow: {
    backgroundColor: 'var(--bg)',
    borderBottom: '1px solid var(--border)',
    textAlign: 'left',
  },
  nestedTr: {
    borderBottom: '1px solid #F0F4F3',
  },
  tfootRow: {
    backgroundColor: '#F3F8F6',
    borderTop: '2px solid var(--primary-soft)',
    fontWeight: '700',
    position: 'sticky',
    bottom: 0,
    zIndex: 2,
  },
  tfCell: {
    padding: '8px 10px',
    fontSize: '11px',
    color: 'var(--text)',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    color: 'var(--text)',
  },

  // 6. PRINT LAYOUT STYLES
  printContainer: {
    display: 'none', // Visible only during print via @media print in index.css
  },
  printHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '10px',
  },
  printClinicBrand: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  printClinicName: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#0E4F44',
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  printDoctorName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#333333',
    margin: 0,
  },
  printClinicInfo: {
    fontSize: '10px',
    color: '#666666',
    margin: 0,
  },
  printMeta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px',
  },
  printBadge: {
    backgroundColor: '#146B5C',
    color: '#FFFFFF',
    padding: '3px 8px',
    borderRadius: '3px',
    fontSize: '10px',
    fontWeight: '700',
    letterSpacing: '0.5px',
  },
  printDateText: {
    fontSize: '10px',
    color: '#666666',
  },
  printDivider: {
    borderBottom: '2px solid #146B5C',
    marginBottom: '10px',
  },
  printReportTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  printReportTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#111827',
    margin: 0,
  },
  printCriteria: {
    fontSize: '10px',
    color: '#666666',
    margin: 0,
  },
  printSummaryGrid: {
    display: 'flex',
    gap: '12px',
    backgroundColor: '#F3F4F6',
    padding: '6px 10px',
    borderRadius: '4px',
    marginBottom: '10px',
    fontSize: '11px',
    flexWrap: 'wrap',
  },
  printSummaryBox: {
    display: 'flex',
    gap: '4px',
  },
  printTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '10px',
    marginBottom: '20px',
  },
  printTh: {
    border: '1px solid #999999',
    backgroundColor: '#E5E7EB',
    padding: '5px 6px',
    textAlign: 'left',
    fontWeight: '700',
    fontSize: '10px',
  },
  printTd: {
    border: '1px solid #DDDDDD',
    padding: '4px 6px',
    fontSize: '10px',
  },
  printSignOff: {
    marginTop: '30px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    paddingRight: '20px',
  },
  printSignLine: {
    width: '180px',
    borderBottom: '1px solid #333333',
    marginBottom: '5px',
  },
  printSignText: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#222222',
  },
  printSignSub: {
    fontSize: '9px',
    color: '#666666',
  },
  collectToast: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    padding: '10px 18px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.16)',
    zIndex: 99999,
  },
  collectModalOverlay: {
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
  collectModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '10px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
    overflow: 'hidden',
  },
  collectModalHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 16px',
    backgroundColor: '#E6F4F1',
    borderBottom: '1px solid #B2DFDB',
  },
  collectModalHeaderIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  collectModalTitle: {
    margin: 0,
    fontSize: '15px',
    fontWeight: '700',
    color: '#0D5C4E',
  },
  collectModalSub: {
    fontSize: '11px',
    color: '#64748B',
  },
  collectModalCloseBtn: {
    background: 'none',
    border: 'none',
    fontSize: '22px',
    color: '#64748B',
    cursor: 'pointer',
    lineHeight: 1,
    padding: 2,
  },
  collectModalBody: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  collectPatientInfoCard: {
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: '6px',
    padding: '10px 12px',
  },
  collectPatientRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '6px',
  },
  collectPatientName: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#0F172A',
    textTransform: 'uppercase',
  },
  collectPidBadge: {
    fontFamily: 'monospace',
    fontWeight: '700',
    fontSize: '11px',
    backgroundColor: '#E2E8F0',
    padding: '1px 6px',
    borderRadius: '4px',
    color: '#334155',
  },
  collectDueSummaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    borderTop: '1px dashed #CBD5E1',
    paddingTop: '6px',
  },
  collectDueLabel: {
    color: '#64748B',
  },
  collectPatientDueVal: {
    fontWeight: '700',
    color: '#DC2626',
    marginLeft: '4px',
  },
  collectFamilyDueVal: {
    fontWeight: '700',
    color: '#B91C1C',
    marginLeft: '4px',
  },
  collectErrorBox: {
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
  collectFieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  collectFieldLabel: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#334155',
  },
  collectAmountInput: {
    width: '100%',
    height: '38px',
    padding: '0 12px',
    border: '1.5px solid #0D5C4E',
    borderRadius: '6px',
    fontSize: '15px',
    fontWeight: '700',
    color: '#0D5C4E',
    outline: 'none',
    boxSizing: 'border-box',
  },
  collectSelect: {
    width: '100%',
    height: '36px',
    padding: '0 10px',
    border: '1px solid #CBD5E1',
    borderRadius: '6px',
    fontSize: '13px',
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    outline: 'none',
    boxSizing: 'border-box',
  },
  collectNotesInput: {
    width: '100%',
    height: '36px',
    padding: '0 10px',
    border: '1px solid #CBD5E1',
    borderRadius: '6px',
    fontSize: '12px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  collectModalFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '6px',
  },
  collectCancelBtn: {
    padding: '8px 14px',
    backgroundColor: '#F1F5F9',
    border: '1px solid #CBD5E1',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#475569',
    cursor: 'pointer',
  },
  collectSubmitBtn: {
    padding: '8px 16px',
    backgroundColor: '#0D5C4E',
    border: '1px solid #0A4B3F',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '700',
    color: '#FFFFFF',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(13, 92, 78, 0.3)',
  },
};

