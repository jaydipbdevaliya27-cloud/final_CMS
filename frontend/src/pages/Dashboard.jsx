import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import { familyAPI, universalSearchAPI, reportAPI } from '../services/api';
import { SidebarTabs } from '../components/common/SidebarTabs';
import { FamilyHeadRegistration } from './FamilyHeadRegistration';
import { MasterDataManagement } from './MasterDataManagement';
import { AddMember } from './AddMember';
import { PatientRecord } from './PatientRecord';
import { Reports } from './Reports';
import { MedicalCertificate } from './MedicalCertificate';
import {
  Stethoscope,
  LogOut,
  ShieldCheck,
  Database,
  Building2,
  Mail,
  Award,
  Search,
  Users,
  UserPlus,
  Contact,
  Layers,
  TrendingUp,
  Clock,
  MapPin,
  Phone,
  ArrowRight,
  X,
  Sparkles,
  Calendar,
  IndianRupee,
  Activity,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  ArrowUpRight,
  Zap,
  HeartPulse,
  UserCheck,
  FolderPlus,
  Plus,
} from 'lucide-react';

export const Dashboard = () => {
  const { doctor, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedFamilyId, setSelectedFamilyId] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchInputRef = useRef(null);
  const searchWrapRef = useRef(null);

  // Live Dashboard Analytics State
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoadingDashboard(true);
      const res = await reportAPI.getDashboardSummary();
      if (res?.success) {
        setDashboardData(res);
      }
    } catch (err) {
      console.error('Error fetching dashboard summary:', err);
    } finally {
      setLoadingDashboard(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardData();
    }
  }, [activeTab]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // Draggable Sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(210);
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingSidebar) return;
      // Clamp between 64px (icon only) and 340px
      const newWidth = Math.max(64, Math.min(340, e.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isDraggingSidebar) {
        setIsDraggingSidebar(false);
      }
    };

    if (isDraggingSidebar) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDraggingSidebar]);

  // Perform debounced universal search (Name, Family ID, Patient ID, Area, Phone)
  useEffect(() => {
    let active = true;
    const executeSearch = async () => {
      if (!debouncedSearchQuery.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      try {
        setIsSearching(true);
        const res = await universalSearchAPI.search(debouncedSearchQuery);
        if (active && res.success) {
          setSearchResults(res.data || []);
          setShowSearchDropdown(true);
        }
      } catch (err) {
        console.error('Universal search error:', err);
      } finally {
        if (active) setIsSearching(false);
      }
    };

    executeSearch();
    return () => {
      active = false;
    };
  }, [debouncedSearchQuery]);

  // Click outside listener for search dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  const handleSearchFocus = () => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Render view corresponding to selected tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard': {
        const stats = dashboardData?.stats || {
          totalPatients: 0,
          totalFamilies: 0,
          totalVisits: 0,
          totalCertificates: 0,
          todayVisitsCount: 0,
          todayCharge: 0,
          todayReceived: 0,
          todayDue: 0,
          overallCharge: 0,
          overallReceived: 0,
          overallDue: 0,
        };
        const recentVisits = dashboardData?.recentVisits || [];
        const recentPatients = dashboardData?.recentPatients || [];
        const last7Days = dashboardData?.last7Days || [];

        const maxDayCount = Math.max(1, ...last7Days.map((d) => d.count || 0));
        const recoveryRate = stats.overallCharge > 0
          ? Math.min(100, Math.round((stats.overallReceived / stats.overallCharge) * 100))
          : 100;

        return (
          <div style={{ ...styles.tabContentContainer, overflowY: 'auto', gap: '12px', paddingRight: '2px' }}>
            {/* 1. HERO GREETING & LIVE STATUS BANNER */}
            <section style={styles.dashHeroBanner}>
              <div style={styles.dashHeroLeft}>
                <div style={styles.dashHeroIcon}>
                  <HeartPulse size={26} color="#FFFFFF" />
                </div>
                <div>
                  <div style={styles.dashHeroGreetingRow}>
                    <h1 style={styles.dashHeroHeading}>
                      {getGreeting()}, {doctor?.name || 'Dr. Dhyey'}
                    </h1>
                    <span style={styles.dashHeroLiveBadge}>
                      <span style={styles.livePulseDot}></span>
                      OPD Live
                    </span>
                  </div>
                  <p style={styles.dashHeroSub}>
                    {doctor?.clinicName || 'Clinic Management System'} &bull; Database: <strong>clinic_management_db</strong> &bull; {todayFormatted}
                  </p>
                </div>
              </div>

              <div style={styles.dashHeroRight}>
                <button
                  type="button"
                  onClick={fetchDashboardData}
                  disabled={loadingDashboard}
                  style={styles.dashRefreshBtn}
                  title="Refresh Dashboard Summary"
                >
                  <RefreshCw
                    size={14}
                    style={{
                      animation: loadingDashboard ? 'spin 1s linear infinite' : 'none',
                    }}
                  />
                  <span>{loadingDashboard ? 'Updating...' : 'Refresh'}</span>
                </button>
              </div>
            </section>

            {/* 2. 5 TOP KPI METRICS STRIP */}
            <div style={styles.dashKpiGrid}>
              {/* Metric 1: Today's Consultations */}
              <div style={styles.dashKpiCard}>
                <div style={styles.dashKpiTop}>
                  <span style={styles.dashKpiLabel}>TODAY'S VISITS</span>
                  <div style={{ ...styles.dashKpiIconWrap, backgroundColor: '#DCEFEA', color: '#0E4F44' }}>
                    <Stethoscope size={18} />
                  </div>
                </div>
                <div style={styles.dashKpiValueRow}>
                  <h2 style={styles.dashKpiValue}>{stats.todayVisitsCount}</h2>
                  <span style={styles.dashKpiUnit}>OPD Cases</span>
                </div>
                <div style={styles.dashKpiFooter}>
                  <Clock size={12} color="var(--text-muted)" />
                  <span>Queue today &bull; Total visits: {stats.totalVisits}</span>
                </div>
              </div>

              {/* Metric 2: Total Registered Patients */}
              <div
                style={{ ...styles.dashKpiCard, cursor: 'pointer' }}
                onClick={() => setActiveTab('patient-record')}
                title="View Patient Records"
              >
                <div style={styles.dashKpiTop}>
                  <span style={styles.dashKpiLabel}>REGISTERED PATIENTS</span>
                  <div style={{ ...styles.dashKpiIconWrap, backgroundColor: '#EFF6FF', color: '#1E40AF' }}>
                    <Users size={18} />
                  </div>
                </div>
                <div style={styles.dashKpiValueRow}>
                  <h2 style={styles.dashKpiValue}>{stats.totalPatients}</h2>
                  <span style={styles.dashKpiUnit}>Profiles</span>
                </div>
                <div style={styles.dashKpiFooter}>
                  <ArrowRight size={12} color="#1E40AF" />
                  <span style={{ color: '#1E40AF', fontWeight: 600 }}>Open Case Entry (F3)</span>
                </div>
              </div>

              {/* Metric 3: Families Enrolled */}
              <div
                style={{ ...styles.dashKpiCard, cursor: 'pointer' }}
                onClick={() => setActiveTab('family-head')}
                title="Manage Families"
              >
                <div style={styles.dashKpiTop}>
                  <span style={styles.dashKpiLabel}>FAMILIES ENROLLED</span>
                  <div style={{ ...styles.dashKpiIconWrap, backgroundColor: '#F0FDF4', color: '#15803D' }}>
                    <Layers size={18} />
                  </div>
                </div>
                <div style={styles.dashKpiValueRow}>
                  <h2 style={styles.dashKpiValue}>{stats.totalFamilies}</h2>
                  <span style={styles.dashKpiUnit}>Family Trees</span>
                </div>
                <div style={styles.dashKpiFooter}>
                  <ArrowRight size={12} color="#15803D" />
                  <span style={{ color: '#15803D', fontWeight: 600 }}>Family Registry (F1)</span>
                </div>
              </div>

              {/* Metric 4: Today's Collections */}
              <div
                style={{ ...styles.dashKpiCard, cursor: 'pointer' }}
                onClick={() => setActiveTab('reports')}
                title="Open Revenue Reports"
              >
                <div style={styles.dashKpiTop}>
                  <span style={styles.dashKpiLabel}>TODAY'S COLLECTIONS</span>
                  <div style={{ ...styles.dashKpiIconWrap, backgroundColor: '#FEF3C7', color: '#B45309' }}>
                    <IndianRupee size={18} />
                  </div>
                </div>
                <div style={styles.dashKpiValueRow}>
                  <h2 style={styles.dashKpiValue}>₹{stats.todayReceived.toLocaleString('en-IN')}</h2>
                </div>
                <div style={styles.dashKpiFooter}>
                  <span>Billed: ₹{stats.todayCharge} &bull; Due: ₹{stats.todayDue}</span>
                </div>
              </div>

              {/* Metric 5: Total Clinic Dues */}
              <div
                style={{
                  ...styles.dashKpiCard,
                  borderColor: stats.overallDue > 0 ? '#FCA5A5' : 'var(--border)',
                  backgroundColor: stats.overallDue > 0 ? '#FFF7F7' : 'var(--surface)',
                  cursor: 'pointer',
                }}
                onClick={() => setActiveTab('reports')}
                title="Review Outstanding Dues in Reports"
              >
                <div style={styles.dashKpiTop}>
                  <span style={styles.dashKpiLabel}>TOTAL CLINIC DUES</span>
                  <div
                    style={{
                      ...styles.dashKpiIconWrap,
                      backgroundColor: stats.overallDue > 0 ? '#FEE2E2' : '#F0FDF4',
                      color: stats.overallDue > 0 ? '#DC2626' : '#15803D',
                    }}
                  >
                    {stats.overallDue > 0 ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                  </div>
                </div>
                <div style={styles.dashKpiValueRow}>
                  <h2
                    style={{
                      ...styles.dashKpiValue,
                      color: stats.overallDue > 0 ? '#B91C1C' : '#15803D',
                    }}
                  >
                    ₹{stats.overallDue.toLocaleString('en-IN')}
                  </h2>
                </div>
                <div style={styles.dashKpiFooter}>
                  <span>{stats.overallDue > 0 ? 'Pending patient recovery' : 'All accounts settled'}</span>
                </div>
              </div>
            </div>

            {/* 3. QUICK ACTION SHORTCUT BAR */}
            <div style={styles.dashShortcutBar}>
              <span style={styles.dashShortcutTitle}>
                <Zap size={14} color="var(--primary)" />
                <span>Quick Actions:</span>
              </span>

              <div style={styles.dashShortcutPills}>
                <button
                  type="button"
                  style={styles.dashShortcutPill}
                  onClick={() => setActiveTab('family-head')}
                >
                  <span style={styles.dashKeyBadge}>F1</span>
                  <span>Register Family Head</span>
                </button>

                <button
                  type="button"
                  style={styles.dashShortcutPill}
                  onClick={() => setActiveTab('add-member')}
                >
                  <span style={styles.dashKeyBadge}>F2</span>
                  <span>Add Member</span>
                </button>

                <button
                  type="button"
                  style={{ ...styles.dashShortcutPill, backgroundColor: 'var(--primary-soft)', borderColor: 'var(--primary)', color: 'var(--primary-dark)', fontWeight: 700 }}
                  onClick={() => setActiveTab('patient-record')}
                >
                  <span style={{ ...styles.dashKeyBadge, backgroundColor: 'var(--primary)', color: '#FFFFFF' }}>F3</span>
                  <span>New Consultation / Case</span>
                </button>

                <button
                  type="button"
                  style={styles.dashShortcutPill}
                  onClick={() => setActiveTab('medical-certificate')}
                >
                  <span style={styles.dashKeyBadge}>F6</span>
                  <span>Medical Certificate</span>
                </button>

                <button
                  type="button"
                  style={styles.dashShortcutPill}
                  onClick={() => setActiveTab('reports')}
                >
                  <span style={styles.dashKeyBadge}>F7</span>
                  <span>Clinic Reports</span>
                </button>

                <button
                  type="button"
                  style={styles.dashShortcutPill}
                  onClick={handleSearchFocus}
                >
                  <span style={styles.dashKeyBadge}>/</span>
                  <span>Universal Search</span>
                </button>
              </div>
            </div>

            {/* 4. DYNAMIC 2-COLUMN PRACTICE WORKSPACE */}
            <div style={styles.dashWorkspaceGrid}>
              {/* LEFT COLUMN: 7-DAY TREND & RECENT OPD VISITS */}
              <div style={styles.dashLeftCol}>
                {/* Card A: 7-Day Patient Volume & Collections Trend */}
                <div style={styles.dashCard}>
                  <div style={styles.dashCardHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <TrendingUp size={16} color="var(--primary)" />
                      <h3 style={styles.dashCardTitle}>7-Day OPD Consultations & Collections</h3>
                    </div>
                    <span style={styles.dashCardBadge}>Last 7 Days</span>
                  </div>

                  <div style={styles.trendChartWrap}>
                    {last7Days.map((day, idx) => {
                      const heightPercent = Math.max(12, Math.round((day.count / maxDayCount) * 100));
                      const isToday = idx === last7Days.length - 1;
                      return (
                        <div key={day.date} style={styles.trendCol}>
                          <div style={styles.trendBarContainer}>
                            <div
                              style={{
                                ...styles.trendBar,
                                height: `${heightPercent}%`,
                                backgroundColor: isToday ? 'var(--primary)' : '#99D5C9',
                              }}
                              title={`${day.date}: ${day.count} visits, ₹${day.received} collected`}
                            >
                              <span style={styles.trendBarVal}>{day.count}</span>
                            </div>
                          </div>
                          <span
                            style={{
                              ...styles.trendDayLabel,
                              fontWeight: isToday ? 800 : 600,
                              color: isToday ? 'var(--primary-dark)' : 'var(--text-muted)',
                            }}
                          >
                            {day.dayName}
                          </span>
                          <span style={styles.trendFeeLabel}>₹{day.received}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Card B: Recent OPD Consultations Queue */}
                <div style={{ ...styles.dashCard, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                  <div style={styles.dashCardHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Stethoscope size={16} color="var(--primary)" />
                      <h3 style={styles.dashCardTitle}>Recent OPD Consultations</h3>
                      <span style={styles.dashCountBadge}>{recentVisits.length} Visits</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('reports')}
                      style={styles.dashHeaderLink}
                    >
                      <span>All Reports</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>

                  {recentVisits.length === 0 ? (
                    <div style={styles.dashEmptyState}>
                      <div style={styles.dashEmptyIcon}>
                        <Stethoscope size={28} color="var(--border)" strokeWidth={1.5} />
                      </div>
                      <p style={styles.dashEmptyTitle}>No OPD Consultations Recorded Yet</p>
                      <p style={styles.dashEmptyDesc}>
                        Start today's OPD session by selecting a registered patient or registering a new patient.
                      </p>
                      <button
                        type="button"
                        style={styles.dashEmptyBtn}
                        onClick={() => setActiveTab('patient-record')}
                      >
                        <UserPlus size={14} />
                        <span>Start New Consultation (F3)</span>
                      </button>
                    </div>
                  ) : (
                    <div style={styles.dashTableWrap}>
                      <table style={styles.dashTable}>
                        <thead>
                          <tr>
                            <th style={styles.dashTh}>Patient</th>
                            <th style={styles.dashTh}>Diagnosis / Complaint</th>
                            <th style={styles.dashTh}>Fee Status</th>
                            <th style={styles.dashTh}>Date / Time</th>
                            <th style={{ ...styles.dashTh, textAlign: 'right' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentVisits.map((v) => {
                            const pName = v.patient?.name || v.patientName || 'Walk-in Patient';
                            const pId = v.patient?.patientId || v.patientId || '-';
                            const feePaid = v.fees?.amountReceived || 0;
                            const feeDue = v.fees?.balanceDue || 0;
                            const complaint = v.clinicalNotes?.chiefComplaints || v.diagnosis || 'General OPD Consultation';
                            const dateStr = v.visitDate
                              ? new Date(v.visitDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                              : '-';

                            return (
                              <tr key={v._id} style={styles.dashTr}>
                                <td style={styles.dashTd}>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <strong style={{ fontSize: '13px', color: 'var(--text)' }}>{pName}</strong>
                                    <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600 }}>
                                      PID: {pId}
                                    </span>
                                  </div>
                                </td>
                                <td style={styles.dashTd}>
                                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    {complaint.length > 38 ? complaint.substring(0, 38) + '...' : complaint}
                                  </span>
                                </td>
                                <td style={styles.dashTd}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#15803D' }}>
                                      ₹{feePaid}
                                    </span>
                                    {feeDue > 0 && (
                                      <span style={styles.dashDuePill}>Due: ₹{feeDue}</span>
                                    )}
                                  </div>
                                </td>
                                <td style={styles.dashTd}>
                                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{dateStr}</span>
                                </td>
                                <td style={{ ...styles.dashTd, textAlign: 'right' }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (v.patient?._id || v.patient?.patientId) {
                                        setSelectedPatientId(v.patient.patientId || v.patient._id);
                                      }
                                      setActiveTab('patient-record');
                                    }}
                                    style={styles.dashOpenCaseBtn}
                                    title="Open Patient Record"
                                  >
                                    <span>Open Case</span>
                                    <ArrowRight size={12} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: FINANCIAL HEALTH & NEW PATIENTS */}
              <div style={styles.dashRightCol}>
                {/* Card C: Practice Financial Health Snapshot */}
                <div style={styles.dashCard}>
                  <div style={styles.dashCardHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <IndianRupee size={16} color="var(--primary)" />
                      <h3 style={styles.dashCardTitle}>Financial Health</h3>
                    </div>
                    <span style={styles.dashCardBadge}>All-Time</span>
                  </div>

                  {/* Recovery Rate Progress Bar */}
                  <div style={styles.finHealthWrap}>
                    <div style={styles.recoveryRateHeader}>
                      <span style={styles.recoveryLabel}>Collection Recovery Rate</span>
                      <strong style={styles.recoveryVal}>{recoveryRate}%</strong>
                    </div>
                    <div style={styles.progressBarTrack}>
                      <div
                        style={{
                          ...styles.progressBarFill,
                          width: `${recoveryRate}%`,
                          backgroundColor: recoveryRate >= 90 ? 'var(--primary)' : '#D97706',
                        }}
                      />
                    </div>

                    {/* Breakdown Numbers */}
                    <div style={styles.finBreakdownList}>
                      <div style={styles.finRow}>
                        <span style={styles.finLabel}>Total Billed:</span>
                        <strong style={styles.finVal}>₹{stats.overallCharge.toLocaleString('en-IN')}</strong>
                      </div>
                      <div style={styles.finRow}>
                        <span style={styles.finLabel}>Total Received:</span>
                        <strong style={{ ...styles.finVal, color: '#15803D' }}>
                          ₹{stats.overallReceived.toLocaleString('en-IN')}
                        </strong>
                      </div>
                      <div style={styles.finRow}>
                        <span style={styles.finLabel}>Outstanding Dues:</span>
                        <strong
                          style={{
                            ...styles.finVal,
                            color: stats.overallDue > 0 ? '#DC2626' : '#15803D',
                          }}
                        >
                          ₹{stats.overallDue.toLocaleString('en-IN')}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card D: Recently Registered Patients */}
                <div style={{ ...styles.dashCard, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                  <div style={styles.dashCardHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <UserCheck size={16} color="var(--primary)" />
                      <h3 style={styles.dashCardTitle}>Recently Registered</h3>
                      <span style={styles.dashCountBadge}>{recentPatients.length}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('add-member')}
                      style={styles.dashHeaderLink}
                    >
                      <Plus size={13} />
                      <span>Add</span>
                    </button>
                  </div>

                  {recentPatients.length === 0 ? (
                    <div style={styles.dashEmptyMini}>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                        No patients enrolled yet.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('family-head')}
                        style={styles.dashLinkButton}
                      >
                        Register First Family Head &rarr;
                      </button>
                    </div>
                  ) : (
                    <div style={styles.recentPatientsList}>
                      {recentPatients.map((p) => (
                        <div
                          key={p._id}
                          style={styles.recentPatientItem}
                          onClick={() => {
                            setSelectedPatientId(p.patientId || p._id);
                            setActiveTab('patient-record');
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <strong style={{ fontSize: '13px', color: 'var(--text)' }}>
                                {p.name || p.fullName}
                              </strong>
                              {p.isFamilyHead && (
                                <span style={styles.headTagMini}>Head</span>
                              )}
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              PID: {p.patientId} &bull; Age: {p.age || '-'} &bull; {p.gender || '-'} &bull; {p.area || p.society || 'Surat'}
                            </span>
                          </div>

                          <button
                            type="button"
                            style={styles.launchCaseBtn}
                            title="Start Consultation"
                          >
                            <Stethoscope size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card E: Practice Details & DB Connection */}
                <div style={styles.clinicCredsCard}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Database size={15} color="var(--primary)" />
                    <strong style={{ fontSize: '12px', color: 'var(--text)' }}>Database Persistence</strong>
                  </div>
                  <div style={styles.credsGrid}>
                    <div style={styles.credsItem}>
                      <span style={styles.credsLabel}>Active Database:</span>
                      <span style={styles.credsVal}>clinic_management_db</span>
                    </div>
                    <div style={styles.credsItem}>
                      <span style={styles.credsLabel}>Doctor:</span>
                      <span style={styles.credsVal}>{doctor?.name || 'Dr. Dhyey'}</span>
                    </div>
                    <div style={styles.credsItem}>
                      <span style={styles.credsLabel}>Consultant:</span>
                      <span style={styles.credsVal}>{doctor?.specialization || 'Consulting Physician'}</span>
                    </div>
                    <div style={styles.credsItem}>
                      <span style={styles.credsLabel}>Mode:</span>
                      <span style={styles.credsVal}>Single Doctor OPD</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 'family-head':
        return (
          <div style={styles.tabContentContainer}>
            <FamilyHeadRegistration
              onNavigateToAddMember={(famId) => {
                if (famId) setSelectedFamilyId(famId);
                setActiveTab('add-member');
              }}
              onNavigateToPatient={(patientId) => {
                if (patientId) setSelectedPatientId(patientId);
                setActiveTab('patient-record');
              }}
            />
          </div>
        );

      case 'add-member':
        return (
          <div style={styles.tabContentContainer}>
            <AddMember
              initialFamilyId={selectedFamilyId}
              onProceedToCaseEntry={(patient) => {
                if (patient) {
                  setSelectedPatientId(patient.patientId || patient._id);
                }
                setActiveTab('patient-record');
              }}
              onNavigateToFamilyHead={() => setActiveTab('family-head')}
            />
          </div>
        );

      case 'patient-record':
        return (
          <div style={styles.tabContentContainer}>
            <PatientRecord
              selectedPatientId={selectedPatientId}
              onNavigateToAddMember={() => setActiveTab('add-member')}
            />
          </div>
        );

      case 'master-data':
        return (
          <div style={styles.tabContentContainer}>
            <MasterDataManagement />
          </div>
        );

      case 'medical-certificate':
        return (
          <div style={styles.tabContentContainer}>
            <MedicalCertificate />
          </div>
        );

      case 'reports':
        return (
          <div style={styles.tabContentContainer}>
            <Reports
              onNavigateToPatient={(patientId) => {
                if (patientId) {
                  setSelectedPatientId(patientId);
                }
                setActiveTab('patient-record');
              }}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={styles.layout}>
      {/* Top Header / Bar */}
      <header style={styles.navbar}>
        <div style={styles.navBrand}>
          <div style={styles.brandIcon}>
            <Stethoscope size={24} color="#FFFFFF" />
          </div>
          <div>
            <h2 style={styles.brandTitle}>{doctor?.clinicName || 'Clinic Management'}</h2>
            <span style={styles.brandSub}>Single Doctor Medical Suite</span>
          </div>
        </div>

        {/* Universal Search with '/' Shortcut & Rich Live Results */}
        <div ref={searchWrapRef} style={styles.searchContainer}>
          <Search size={16} color="var(--text-muted)" style={styles.searchIcon} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Universal Search: Patient, FAM ID, Patient ID, Area... (/)"
            value={searchQuery}
            onFocus={() => {
              if (searchResults.length > 0) setShowSearchDropdown(true);
            }}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const list = Array.isArray(searchResults) ? searchResults : [];
                if (list.length > 0) {
                  e.preventDefault();
                  const first = list[0];
                  setShowSearchDropdown(false);
                  setSearchQuery('');
                  setSelectedPatientId(first.patientId || first._id);
                  setActiveTab('patient-record');
                }
              } else if (e.key === 'Escape') {
                setShowSearchDropdown(false);
              }
            }}
            style={styles.searchInput}
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
                setShowSearchDropdown(false);
              }}
              style={styles.clearSearchBtn}
              title="Clear search"
            >
              <X size={14} color="var(--text-muted)" />
            </button>
          ) : (
            <span style={styles.searchShortcutBadge}>/</span>
          )}

          {/* Debounced Universal Search Dropdown: Clean list of matched patients */}
          {showSearchDropdown && debouncedSearchQuery.trim() && (() => {
            const list = Array.isArray(searchResults) ? searchResults : [];

            return (
              <div style={styles.globalSearchDropdown}>
                {isSearching ? (
                  <div style={styles.searchDropdownMessage}>
                    <div style={styles.searchLoadingSpinner} />
                    <span>Searching database...</span>
                  </div>
                ) : list.length === 0 ? (
                  <div style={styles.searchEmptyContainer}>
                    <p style={styles.searchEmptyTitle}>
                      No matching patients found for "{debouncedSearchQuery}"
                    </p>
                  </div>
                ) : (
                  <div style={styles.searchResultsList}>
                    {list.map((m, idx) => {
                      const relationLabel = m.isHead
                        ? 'Head'
                        : m.relation || 'Member';
                      const displayPid =
                        m.patientId || (m._id ? String(m._id).slice(-4) : 'PID');
                      const allergyStr = Array.isArray(m.allergies)
                        ? m.allergies.filter(Boolean).join(', ')
                        : m.allergies || '';
                      const isFirst = idx === 0;

                      return (
                        <div
                          key={m._id || m.patientId}
                          onClick={() => {
                            setShowSearchDropdown(false);
                            setSearchQuery('');
                            setSelectedPatientId(m.patientId || m._id);
                            setActiveTab('patient-record');
                          }}
                          style={{
                            ...styles.uniMemberCard,
                            ...(isFirst ? styles.uniFirstMatchCard : {}),
                          }}
                          title={`Click or press Enter to open Patient Record for ${m.name}`}
                        >
                          <div style={styles.uniMemberLeft}>
                            <div style={styles.uniMemberNameRow}>
                              <span style={styles.uniMemberName}>{m.name}</span>
                              <span style={styles.uniMemberRelation}>
                                ({relationLabel})
                              </span>
                            </div>
                            <div style={styles.uniMemberDetails}>
                              {m.age && <span>Age {m.age}</span>}
                              <span>&bull;</span>
                              <span>{m.gender || 'Not Specified'}</span>
                              <span>&bull;</span>
                              <span>{m.bloodGroup || 'Blood: --'}</span>
                              {allergyStr && (
                                <>
                                  <span>&bull;</span>
                                  <span style={styles.uniMemberAllergy}>
                                    ⚠️ {allergyStr}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div style={styles.uniMemberRight}>
                            <button
                              type="button"
                              style={styles.uniPatientIdBtn}
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowSearchDropdown(false);
                                setSearchQuery('');
                                setSelectedPatientId(m.patientId || m._id);
                                setActiveTab('patient-record');
                              }}
                            >
                              <span>{displayPid}</span>
                              <ArrowRight size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Doctor Badge & Sign Out */}
        <div style={styles.navActions}>
          <div style={styles.doctorBadge}>
            <div style={styles.avatarCircle}>
              {doctor?.name?.charAt(0) || 'D'}
            </div>
            <div style={styles.doctorInfo}>
              <span style={styles.doctorName}>{doctor?.name || 'Dr. Dhyey'}</span>
              <span style={styles.doctorSpecialty}>{doctor?.specialization || 'Physician'}</span>
            </div>
          </div>

          <button onClick={handleLogout} style={styles.logoutBtn} title="Sign Out">
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Body (Sidebar + Content Area) */}
      <div style={styles.body}>
        {/* Exact Tab Navigation Sidebar */}
        <SidebarTabs
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onSearchFocus={handleSearchFocus}
          width={sidebarWidth}
        />

        {/* DRAGGER AT BORDER: Resize Sidebar */}
        <div
          onMouseDown={() => setIsDraggingSidebar(true)}
          title="Drag left/right to resize sidebar"
          style={{
            ...styles.sidebarDragger,
            backgroundColor: isDraggingSidebar ? 'var(--primary)' : 'transparent',
          }}
        >
          <div style={styles.draggerGripLine} />
        </div>

        {/* Content Pane */}
        <main style={styles.mainContent}>
          {renderTabContent()}
        </main>
      </div>
    </div>
  );
};

const styles = {
  layout: {
    height: '100vh',
    maxHeight: '100vh',
    backgroundColor: 'var(--bg)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  navbar: {
    height: '46px',
    backgroundColor: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    boxShadow: 'var(--shadow-sm)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  navBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  brandIcon: {
    width: '30px',
    height: '30px',
    borderRadius: '7px',
    backgroundColor: 'var(--primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: '0.96rem',
    fontWeight: 700,
    color: 'var(--text)',
    letterSpacing: '-0.01em',
  },
  brandSub: {
    fontSize: '0.68rem',
    color: 'var(--text-muted)',
  },
  searchContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '420px',
    maxWidth: '100%',
  },
  searchIcon: {
    position: 'absolute',
    left: '10px',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    height: '34px',
    padding: '0 32px 0 32px',
    backgroundColor: 'var(--surface-alt)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    fontSize: '0.80rem',
    color: 'var(--text)',
    outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: '8px',
    background: 'none',
    border: 'none',
    padding: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
  },
  searchShortcutBadge: {
    position: 'absolute',
    right: '10px',
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    padding: '1px 5px',
    fontSize: '0.68rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    pointerEvents: 'none',
  },
  globalSearchDropdown: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    left: 0,
    width: '560px',
    maxHeight: '480px',
    overflowY: 'auto',
    backgroundColor: '#FFFFFF',
    border: '1px solid #CBD5E1',
    borderRadius: '10px',
    boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.16), 0 6px 12px -3px rgba(0, 0, 0, 0.08)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
  },
  searchDropdownHeader: {
    padding: '10px 14px',
    backgroundColor: '#F8FAFC',
    borderBottom: '1px solid #E2E8F0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 5,
  },
  searchDropdownHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  searchDropdownHeaderTitle: {
    fontSize: '0.80rem',
    fontWeight: 700,
    color: '#0F172A',
  },
  searchDropdownHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  searchCountsBadge: {
    fontSize: '0.70rem',
    fontWeight: 600,
    backgroundColor: '#E6F4EA',
    color: '#146B5C',
    padding: '2px 8px',
    borderRadius: '12px',
  },
  closeDropdownBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#64748B',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
  },
  searchDropdownMessage: {
    padding: '24px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    fontSize: '0.80rem',
    color: '#64748B',
  },
  searchLoadingSpinner: {
    width: '16px',
    height: '16px',
    border: '2px solid #E2E8F0',
    borderTopColor: '#146B5C',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  searchEmptyContainer: {
    padding: '24px 16px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
  },
  searchEmptyTitle: {
    fontSize: '0.84rem',
    fontWeight: 600,
    color: '#334155',
    margin: 0,
  },
  searchEmptyHint: {
    fontSize: '0.74rem',
    color: '#64748B',
    margin: '4px 0 6px 0',
  },
  searchSuggestionsPills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    justifyContent: 'center',
    maxWidth: '440px',
  },
  suggestionPill: {
    fontSize: '0.68rem',
    fontWeight: 600,
    backgroundColor: '#F1F5F9',
    color: '#475569',
    padding: '3px 8px',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
  },
  searchResultsList: {
    padding: '4px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  uniMemberCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    backgroundColor: '#F0FDF4',
    border: '1px solid #6EE7B7',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
  },
  uniFirstMatchCard: {
    border: '1.5px solid #146B5C',
    boxShadow: '0 2px 6px rgba(20, 107, 92, 0.12)',
  },
  uniMemberLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  uniMemberNameRow: {
    display: 'flex',
    alignItems: 'center',
  },
  uniMemberName: {
    fontSize: '0.88rem',
    fontWeight: 800,
    color: '#0F172A',
    letterSpacing: '0.2px',
  },
  uniMemberRelation: {
    fontSize: '0.80rem',
    color: '#64748B',
    fontWeight: 500,
    marginLeft: '6px',
  },
  uniDirectMatchBadge: {
    fontSize: '0.64rem',
    fontWeight: 700,
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    padding: '2px 7px',
    borderRadius: '4px',
    letterSpacing: '0.4px',
    marginLeft: '10px',
  },
  uniMemberDetails: {
    fontSize: '0.76rem',
    color: '#64748B',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  uniMemberAllergy: {
    color: '#DC2626',
    fontWeight: 600,
  },
  uniMemberRight: {
    display: 'flex',
    alignItems: 'center',
  },
  uniPatientIdBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#146B5C',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '0.80rem',
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.3px',
  },
  navActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  doctorBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '3px 8px',
    backgroundColor: 'var(--surface-alt)',
    borderRadius: '6px',
    border: '1px solid var(--border)',
  },
  avatarCircle: {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary-soft)',
    color: 'var(--primary-dark)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '0.8rem',
  },
  doctorInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  doctorName: {
    fontSize: '0.78rem',
    fontWeight: 600,
    color: 'var(--text)',
  },
  doctorSpecialty: {
    fontSize: '0.66rem',
    color: 'var(--text-muted)',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '5px 10px',
    backgroundColor: 'var(--surface-alt)',
    color: 'var(--danger)',
    borderRadius: '6px',
    border: '1px solid var(--danger-soft)',
    fontSize: '0.76rem',
    fontWeight: 600,
  },
  body: {
    display: 'flex',
    flex: 1,
    height: 'calc(100vh - 46px)',
    minHeight: 0,
    overflow: 'hidden',
  },
  sidebarDragger: {
    width: '6px',
    cursor: 'col-resize',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    transition: 'background-color 0.15s ease',
    flexShrink: 0,
    zIndex: 5,
  },
  draggerGripLine: {
    width: '2px',
    height: '28px',
    borderRadius: '1px',
    backgroundColor: 'var(--border)',
  },
  mainContent: {
    flex: 1,
    height: '100%',
    minHeight: 0,
    padding: '8px 12px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  tabContentContainer: {
    width: '100%',
    height: '100%',
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    overflow: 'hidden',
  },
  // --- DYNAMIC LIVE CLINICAL DASHBOARD STYLES ---
  dashHeroBanner: {
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: 'var(--shadow-sm)',
    flexWrap: 'wrap',
    gap: '12px',
  },
  dashHeroLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  dashHeroIcon: {
    width: '42px',
    height: '42px',
    borderRadius: '10px',
    backgroundColor: 'var(--primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(20, 107, 92, 0.25)',
    flexShrink: 0,
  },
  dashHeroGreetingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  dashHeroHeading: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: 'var(--text)',
    letterSpacing: '-0.01em',
    margin: 0,
    lineHeight: 1.2,
  },
  dashHeroLiveBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '3px 8px',
    borderRadius: '12px',
    backgroundColor: '#F0FDF4',
    border: '1px solid #86EFAC',
    color: '#15803D',
    fontSize: '0.68rem',
    fontWeight: 700,
    letterSpacing: '0.4px',
    textTransform: 'uppercase',
  },
  livePulseDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#16A34A',
  },
  dashHeroSub: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    marginTop: '3px',
    marginBottom: 0,
  },
  dashHeroRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  dashRefreshBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: 'var(--surface-alt)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    fontSize: '0.74rem',
    fontWeight: 600,
    color: 'var(--text)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },

  // 5 Top KPI Cards Grid
  dashKpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '10px',
  },
  dashKpiCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    boxShadow: 'var(--shadow-sm)',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
  },
  dashKpiTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dashKpiLabel: {
    fontSize: '0.66rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  dashKpiIconWrap: {
    width: '28px',
    height: '28px',
    borderRadius: '7px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashKpiValueRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px',
    marginTop: '2px',
  },
  dashKpiValue: {
    fontSize: '1.35rem',
    fontWeight: 800,
    color: 'var(--text)',
    letterSpacing: '-0.02em',
    lineHeight: 1,
    margin: 0,
  },
  dashKpiUnit: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    fontWeight: 600,
  },
  dashKpiFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.70rem',
    color: 'var(--text-muted)',
    marginTop: '4px',
  },

  // Quick Action Shortcut Bar
  dashShortcutBar: {
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    flexWrap: 'wrap',
  },
  dashShortcutTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.74rem',
    fontWeight: 700,
    color: 'var(--text)',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  dashShortcutPills: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },
  dashShortcutPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    backgroundColor: 'var(--surface-alt)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    fontSize: '0.72rem',
    fontWeight: 600,
    color: 'var(--text)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  dashKeyBadge: {
    padding: '1px 5px',
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border)',
    borderRadius: '3px',
    fontSize: '0.64rem',
    fontWeight: 700,
    color: 'var(--primary-dark)',
  },

  // 2-Column Responsive Practice Workspace
  dashWorkspaceGrid: {
    display: 'grid',
    gridTemplateColumns: '1.6fr 1fr',
    gap: '12px',
    flex: 1,
    minHeight: 0,
  },
  dashLeftCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minHeight: 0,
  },
  dashRightCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minHeight: 0,
  },

  // Shared Cards
  dashCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '12px 14px',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
  },
  dashCardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '10px',
    paddingBottom: '8px',
    borderBottom: '1px solid var(--border)',
  },
  dashCardTitle: {
    fontSize: '0.86rem',
    fontWeight: 700,
    color: 'var(--text)',
    margin: 0,
  },
  dashCardBadge: {
    fontSize: '0.66rem',
    fontWeight: 600,
    padding: '2px 6px',
    backgroundColor: 'var(--surface-alt)',
    borderRadius: '4px',
    color: 'var(--text-muted)',
    border: '1px solid var(--border)',
  },
  dashCountBadge: {
    fontSize: '0.66rem',
    fontWeight: 700,
    padding: '2px 7px',
    backgroundColor: 'var(--primary-soft)',
    color: 'var(--primary-dark)',
    borderRadius: '10px',
  },
  dashHeaderLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    background: 'none',
    border: 'none',
    color: 'var(--primary)',
    fontSize: '0.72rem',
    fontWeight: 700,
    cursor: 'pointer',
    padding: 0,
  },

  // 7-Day Trend Chart
  trendChartWrap: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '110px',
    padding: '8px 4px 4px 4px',
    gap: '8px',
  },
  trendCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    gap: '4px',
  },
  trendBarContainer: {
    width: '100%',
    height: '70px',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    backgroundColor: 'var(--surface-alt)',
    borderRadius: '5px',
    padding: '2px',
  },
  trendBar: {
    width: '100%',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: '3px',
    transition: 'height 0.3s ease',
    minHeight: '14px',
  },
  trendBarVal: {
    fontSize: '0.64rem',
    fontWeight: 800,
    color: '#FFFFFF',
    lineHeight: 1,
  },
  trendDayLabel: {
    fontSize: '0.68rem',
    color: 'var(--text)',
    textTransform: 'uppercase',
  },
  trendFeeLabel: {
    fontSize: '0.62rem',
    color: 'var(--text-muted)',
    fontWeight: 600,
  },

  // Recent Visits Table
  dashTableWrap: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
  },
  dashTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.76rem',
  },
  dashTh: {
    textAlign: 'left',
    padding: '6px 8px',
    fontSize: '0.66rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    borderBottom: '1px solid var(--border)',
    backgroundColor: 'var(--surface-alt)',
  },
  dashTr: {
    borderBottom: '1px solid #F1F5F9',
    transition: 'background-color 0.15s ease',
  },
  dashTd: {
    padding: '8px 8px',
    verticalAlign: 'middle',
  },
  dashDuePill: {
    fontSize: '0.64rem',
    fontWeight: 700,
    backgroundColor: '#FEE2E2',
    color: '#B91C1C',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  dashOpenCaseBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    backgroundColor: '#F0FDF4',
    border: '1px solid #86EFAC',
    borderRadius: '5px',
    color: '#15803D',
    fontSize: '0.70rem',
    fontWeight: 700,
    cursor: 'pointer',
  },

  // Empty State in Dashboard
  dashEmptyState: {
    padding: '30px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    gap: '6px',
    flex: 1,
  },
  dashEmptyIcon: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    backgroundColor: 'var(--surface-alt)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '4px',
  },
  dashEmptyTitle: {
    fontSize: '0.88rem',
    fontWeight: 700,
    color: 'var(--text)',
    margin: 0,
  },
  dashEmptyDesc: {
    fontSize: '0.74rem',
    color: 'var(--text-muted)',
    maxWidth: '340px',
    margin: 0,
  },
  dashEmptyBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '8px',
    padding: '6px 14px',
    backgroundColor: 'var(--primary)',
    color: '#FFFFFF',
    borderRadius: '6px',
    fontSize: '0.74rem',
    fontWeight: 700,
    cursor: 'pointer',
  },

  // Financial Health Breakdown
  finHealthWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  recoveryRateHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recoveryLabel: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    fontWeight: 600,
  },
  recoveryVal: {
    fontSize: '0.88rem',
    fontWeight: 800,
    color: 'var(--primary-dark)',
  },
  progressBarTrack: {
    width: '100%',
    height: '7px',
    backgroundColor: 'var(--surface-alt)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.4s ease',
  },
  finBreakdownList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    marginTop: '4px',
    paddingTop: '6px',
    borderTop: '1px solid var(--border)',
  },
  finRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  finLabel: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
  },
  finVal: {
    fontSize: '0.78rem',
    fontWeight: 700,
    color: 'var(--text)',
  },

  // Recently Registered Patients List
  recentPatientsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    overflowY: 'auto',
    flex: 1,
    minHeight: 0,
  },
  recentPatientItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '7px 10px',
    backgroundColor: 'var(--surface-alt)',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    cursor: 'pointer',
    transition: 'border-color 0.15s ease',
  },
  headTagMini: {
    fontSize: '0.60rem',
    fontWeight: 800,
    backgroundColor: 'var(--primary-soft)',
    color: 'var(--primary-dark)',
    padding: '1px 5px',
    borderRadius: '3px',
    letterSpacing: '0.2px',
  },
  launchCaseBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '26px',
    height: '26px',
    borderRadius: '5px',
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border)',
    color: 'var(--primary)',
    cursor: 'pointer',
  },
  dashEmptyMini: {
    padding: '14px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    alignItems: 'center',
  },
  dashLinkButton: {
    background: 'none',
    border: 'none',
    color: 'var(--primary)',
    fontSize: '0.72rem',
    fontWeight: 700,
    cursor: 'pointer',
    padding: 0,
  },

  // Clinic Credentials & DB Connection
  clinicCredsCard: {
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    padding: '10px 12px',
  },
  credsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '6px',
  },
  credsItem: {
    display: 'flex',
    flexDirection: 'column',
  },
  credsLabel: {
    fontSize: '0.62rem',
    color: '#64748B',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  credsVal: {
    fontSize: '0.74rem',
    fontWeight: 700,
    color: '#0F172A',
  },
};
