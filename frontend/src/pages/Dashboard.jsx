import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import { familyAPI, universalSearchAPI } from '../services/api';
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
      case 'dashboard':
        return (
          <div style={{ ...styles.tabContentContainer, overflowY: 'auto', gap: '14px' }}>
            {/* Welcome Banner */}
            <section style={styles.welcomeCard}>
              <div style={styles.welcomeText}>
                <span style={styles.badgeAuth}>
                  <ShieldCheck size={14} color="var(--primary)" />
                  Authenticated Session
                </span>
                <h1 style={styles.welcomeHeading}>Welcome, {doctor?.name || 'Dr. Dhyey'}</h1>
                <p style={styles.welcomeDesc}>
                  Single Doctor Clinic Management Suite. All clinic data, patient family registries, and case records are persisted directly in MongoDB.
                </p>
              </div>

              <div style={styles.systemStatusBox}>
                <div style={styles.statusItem}>
                  <Database size={16} color="var(--primary)" />
                  <span>Storage: <strong>MongoDB Direct</strong> (No LocalStorage)</span>
                </div>
                <div style={styles.statusItem}>
                  <Clock size={16} color="var(--primary)" />
                  <span>Mode: <strong>OPD Practice (Single Doctor)</strong></span>
                </div>
              </div>
            </section>

            {/* Quick Metrics / Status Cards */}
            <div style={styles.metricsGrid}>
              <div style={styles.metricCard}>
                <div style={styles.metricIconWrap}>
                  <Users size={22} color="var(--primary)" />
                </div>
                <div>
                  <span style={styles.metricLabel}>Family Head Records</span>
                  <h3 style={styles.metricValue}>Ready (F1)</h3>
                </div>
              </div>

              <div style={styles.metricCard}>
                <div style={styles.metricIconWrap}>
                  <UserPlus size={22} color="var(--primary)" />
                </div>
                <div>
                  <span style={styles.metricLabel}>Member Registration</span>
                  <h3 style={styles.metricValue}>Ready (F2)</h3>
                </div>
              </div>

              <div style={styles.metricCard}>
                <div style={styles.metricIconWrap}>
                  <Contact size={22} color="var(--primary)" />
                </div>
                <div>
                  <span style={styles.metricLabel}>Patient Cases</span>
                  <h3 style={styles.metricValue}>Ready (F3)</h3>
                </div>
              </div>
            </div>

            {/* Doctor Info & Next Feature Placeholder */}
            <div style={styles.gridSection}>
              <div style={styles.profileCard}>
                <h3 style={styles.cardHeader}>Doctor Profile</h3>

                <div style={styles.detailRow}>
                  <Building2 size={18} color="var(--text-muted)" />
                  <div>
                    <span style={styles.detailLabel}>Clinic Name</span>
                    <p style={styles.detailValue}>{doctor?.clinicName || 'Clinic Management System'}</p>
                  </div>
                </div>

                <div style={styles.detailRow}>
                  <Award size={18} color="var(--text-muted)" />
                  <div>
                    <span style={styles.detailLabel}>Role & Specialization</span>
                    <p style={styles.detailValue}>{doctor?.specialization || 'Consulting Physician'}</p>
                  </div>
                </div>

                <div style={styles.detailRow}>
                  <Mail size={18} color="var(--text-muted)" />
                  <div>
                    <span style={styles.detailLabel}>Doctor Username</span>
                    <p style={styles.detailValue}>{doctor?.username || 'dhyey'}</p>
                  </div>
                </div>
              </div>

              <div style={styles.actionCard}>
                <h3 style={styles.cardHeader}>Active Navigation & Shortcuts</h3>
                <p style={styles.actionDesc}>
                  The navigation sidebar is active with dedicated tabs and keyboard shortcuts (F1 to F7) as requested.
                </p>
                <div style={styles.readyTag}>
                  Press F1–F7 anytime to navigate instantly
                </div>
              </div>
            </div>
          </div>
        );

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
  welcomeCard: {
    backgroundColor: 'var(--surface)',
    borderRadius: 'var(--radius-lg)',
    padding: '26px 28px',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px',
  },
  welcomeText: {
    maxWidth: '560px',
  },
  badgeAuth: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'var(--primary-soft)',
    color: 'var(--primary-dark)',
    padding: '3px 10px',
    borderRadius: '20px',
    fontSize: '0.74rem',
    fontWeight: 600,
    marginBottom: '8px',
  },
  welcomeHeading: {
    fontSize: '1.6rem',
    fontWeight: 700,
    color: 'var(--text)',
    marginBottom: '6px',
  },
  welcomeDesc: {
    fontSize: '0.88rem',
    color: 'var(--text-muted)',
    lineHeight: 1.5,
  },
  systemStatusBox: {
    backgroundColor: 'var(--surface-alt)',
    padding: '14px 18px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minWidth: '260px',
  },
  statusItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.82rem',
    color: 'var(--text)',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '16px',
  },
  metricCard: {
    backgroundColor: 'var(--surface)',
    borderRadius: 'var(--radius-md)',
    padding: '18px 20px',
    border: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    boxShadow: 'var(--shadow-sm)',
  },
  metricIconWrap: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    backgroundColor: 'var(--primary-soft)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
  metricValue: {
    fontSize: '1.15rem',
    fontWeight: 700,
    color: 'var(--text)',
    marginTop: '2px',
  },
  gridSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '20px',
  },
  profileCard: {
    backgroundColor: 'var(--surface)',
    borderRadius: 'var(--radius-lg)',
    padding: '22px 24px',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  actionCard: {
    backgroundColor: 'var(--surface)',
    borderRadius: 'var(--radius-lg)',
    padding: '22px 24px',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: '12px',
  },
  cardHeader: {
    fontSize: '1.05rem',
    fontWeight: 700,
    color: 'var(--text)',
    borderBottom: '1px solid var(--border)',
    paddingBottom: '10px',
    width: '100%',
  },
  detailRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  detailLabel: {
    fontSize: '0.74rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    fontWeight: 600,
  },
  detailValue: {
    fontSize: '0.9rem',
    fontWeight: 500,
    color: 'var(--text)',
  },
  actionDesc: {
    fontSize: '0.88rem',
    color: 'var(--text-muted)',
    lineHeight: 1.5,
  },
  readyTag: {
    backgroundColor: 'var(--accent-soft)',
    color: 'var(--accent)',
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: '10px',
    borderBottom: '1px solid var(--border)',
  },
  sectionTitleWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  sectionTitle: {
    fontSize: '1.35rem',
    fontWeight: 700,
    color: 'var(--text)',
  },
  sectionSubtitle: {
    fontSize: '0.82rem',
    color: 'var(--text-muted)',
  },
  placeholderCard: {
    backgroundColor: 'var(--surface)',
    border: '2px dashed var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '60px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    gap: '12px',
    marginTop: '10px',
  },
  placeholderTitle: {
    fontSize: '1.15rem',
    fontWeight: 600,
    color: 'var(--text)',
  },
  placeholderText: {
    fontSize: '0.88rem',
    color: 'var(--text-muted)',
    maxWidth: '480px',
  },
};
