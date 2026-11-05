import React, { useState, useEffect } from 'react';
import { masterDataAPI } from '../../services/api';
import {
  Columns2,
  Users,
  UserPlus,
  Contact,
  Layers,
  Award,
  TrendingUp,
  UserCheck,
} from 'lucide-react';

export const SIDEBAR_TABS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Columns2,
    shortcut: 'F4',
  },
  {
    id: 'family-head',
    label: 'Family Head Reg.',
    icon: Users,
    shortcut: 'F1',
  },
  {
    id: 'add-member',
    label: 'Add Member',
    icon: UserPlus,
    shortcut: 'F2',
  },
  {
    id: 'patient-record',
    label: 'Patient Record',
    icon: Contact,
    shortcut: 'F3',
  },
  {
    id: 'master-data',
    label: 'Master Data',
    icon: Layers,
    shortcut: 'F7',
  },
  {
    id: 'medical-certificate',
    label: 'Medical Certificate',
    icon: Award,
    shortcut: 'F6',
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: TrendingUp,
    shortcut: 'F5',
  },
  {
    id: 'doctor-profile',
    label: 'Doctor Profile',
    icon: UserCheck,
    shortcut: 'F8',
  },
];

export const SidebarTabs = ({ activeTab, onSelectTab, onSearchFocus, width = 210 }) => {
  const isCompact = width < 140;

  const [navShortcuts, setNavShortcuts] = useState({
    'family-head': 'F1',
    'add-member': 'F2',
    'patient-record': 'F3',
    'dashboard': 'F4',
    'reports': 'F5',
    'medical-certificate': 'F6',
    'master-data': 'F7',
    'doctor-profile': 'F8',
    'universal-search': '/',
  });

  const loadNavShortcuts = async () => {
    try {
      const res = await masterDataAPI.getItems('navigation', '', 1, 100);
      if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
        const map = {
          'family-head': 'F1',
          'add-member': 'F2',
          'patient-record': 'F3',
          'dashboard': 'F4',
          'reports': 'F5',
          'medical-certificate': 'F6',
          'master-data': 'F7',
          'doctor-profile': 'F8',
          'universal-search': '/',
        };

        res.data.forEach((item) => {
          if (!item.shortcut || !item.value) return;
          const val = item.value.toLowerCase();
          const key = item.shortcut.trim().toUpperCase();

          if (val.includes('family head')) map['family-head'] = key;
          else if (val.includes('add member') || val.includes('family member')) map['add-member'] = key;
          else if (val.includes('patient record') || val.includes('opd consultation') || val.includes('case consultation')) map['patient-record'] = key;
          else if (val.includes('dashboard')) map['dashboard'] = key;
          else if (val.includes('report')) map['reports'] = key;
          else if (val.includes('medical certificate') || val.includes('certificate')) map['medical-certificate'] = key;
          else if (val.includes('master data')) map['master-data'] = key;
          else if (val.includes('doctor profile') || val.includes('profile')) map['doctor-profile'] = key;
          else if (val.includes('search')) map['universal-search'] = key;
        });

        setNavShortcuts(map);
      }
    } catch (e) {
      // Keep defaults
    }
  };

  useEffect(() => {
    loadNavShortcuts();
    const handleUpdate = () => loadNavShortcuts();
    window.addEventListener('cms-navigation-shortcuts-updated', handleUpdate);
    return () => window.removeEventListener('cms-navigation-shortcuts-updated', handleUpdate);
  }, []);

  // Global Keyboard Shortcuts handler (Dynamic shortcuts from Master Data)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName.toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';

      const pressedKey = (e.key || '').toUpperCase();
      let combo = '';
      if (e.altKey) combo += 'ALT+';
      if (e.ctrlKey || e.metaKey) combo += 'CTRL+';
      combo += pressedKey;

      const checkMatch = (targetKey) => {
        if (!targetKey) return false;
        const norm = targetKey.trim().toUpperCase();
        return norm === pressedKey || norm === combo;
      };

      if (checkMatch(navShortcuts['family-head'])) {
        e.preventDefault();
        onSelectTab('family-head');
      } else if (checkMatch(navShortcuts['add-member'])) {
        e.preventDefault();
        onSelectTab('add-member');
      } else if (checkMatch(navShortcuts['patient-record'])) {
        e.preventDefault();
        onSelectTab('patient-record');
      } else if (checkMatch(navShortcuts['dashboard'])) {
        e.preventDefault();
        onSelectTab('dashboard');
      } else if (checkMatch(navShortcuts['reports'])) {
        e.preventDefault();
        onSelectTab('reports');
      } else if (checkMatch(navShortcuts['medical-certificate'])) {
        e.preventDefault();
        onSelectTab('medical-certificate');
      } else if (checkMatch(navShortcuts['master-data'])) {
        e.preventDefault();
        onSelectTab('master-data');
      } else if (checkMatch(navShortcuts['doctor-profile'])) {
        e.preventDefault();
        onSelectTab('doctor-profile');
      } else if (!isInput && checkMatch(navShortcuts['universal-search'])) {
        e.preventDefault();
        if (onSearchFocus) onSearchFocus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSelectTab, onSearchFocus, navShortcuts]);

  return (
    <aside style={{ ...styles.sidebar, width: `${width}px` }}>
      {/* Navigation Tabs List */}
      <nav style={styles.navList}>
        {SIDEBAR_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const dynamicShortcut = navShortcuts[tab.id] || tab.shortcut;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              style={{
                ...styles.tabItem,
                ...(isActive ? styles.activeTabItem : styles.inactiveTabItem),
                justifyContent: isCompact ? 'center' : 'space-between',
                padding: isCompact ? '8px 4px' : '7px 10px',
              }}
              title={`${tab.label} (${dynamicShortcut})`}
            >
              <div style={styles.tabLeft}>
                <Icon
                  size={17}
                  color={isActive ? '#FFFFFF' : 'var(--text-muted)'}
                  strokeWidth={2.2}
                />
                {!isCompact && (
                  <span
                    style={{
                      ...styles.tabLabel,
                      color: isActive ? '#FFFFFF' : 'var(--text)',
                      fontWeight: isActive ? 600 : 500,
                    }}
                  >
                    {tab.label}
                  </span>
                )}
              </div>

              {!isCompact && (
                <span
                  style={{
                    ...styles.shortcutBadge,
                    ...(isActive ? styles.activeShortcutBadge : styles.inactiveShortcutBadge),
                  }}
                >
                  {dynamicShortcut}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom OPD Practice Mode & Shortcuts Guide */}
      {!isCompact && (
        <div style={styles.bottomSection}>
          <div style={styles.divider}></div>
          <div style={styles.modeBadge}>
            <UserCheck size={14} color="var(--primary)" strokeWidth={2.2} />
            <span style={styles.modeText}>OPD Practice</span>
          </div>

          <div style={styles.shortcutsBox}>
            <p style={styles.shortcutsLine}>
              {navShortcuts['family-head'] || 'F1'} Fam &middot; {navShortcuts['add-member'] || 'F2'} Mem &middot; {navShortcuts['patient-record'] || 'F3'} Case
            </p>
            <p style={styles.shortcutsLine}>
              {navShortcuts['dashboard'] || 'F4'} Dash &middot; {navShortcuts['master-data'] || 'F7'} Masters &middot; {navShortcuts['doctor-profile'] || 'F8'} Profile
            </p>
          </div>
        </div>
      )}
    </aside>
  );
};

const styles = {
  sidebar: {
    backgroundColor: 'var(--surface)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '10px 8px',
    height: 'calc(100vh - 46px)',
    minHeight: 'calc(100vh - 46px)',
    overflowY: 'auto',
    flexShrink: 0,
    userSelect: 'none',
    transition: 'width 0.05s ease-out',
  },
  navList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  tabItem: {
    display: 'flex',
    alignItems: 'center',
    borderRadius: '8px',
    fontSize: '0.84rem',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    transition: 'all 0.15s ease-in-out',
  },
  activeTabItem: {
    backgroundColor: 'var(--primary)',
    color: '#FFFFFF',
    boxShadow: '0 2px 8px rgba(20, 107, 92, 0.22)',
  },
  inactiveTabItem: {
    backgroundColor: 'transparent',
    color: 'var(--text)',
  },
  tabLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  tabLabel: {
    fontSize: '0.82rem',
    letterSpacing: '-0.01em',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  shortcutBadge: {
    fontSize: '0.68rem',
    fontWeight: 700,
    padding: '2px 5px',
    borderRadius: '4px',
    lineHeight: 1.1,
  },
  activeShortcutBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    color: '#FFFFFF',
    border: '1px solid rgba(255, 255, 255, 0.3)',
  },
  inactiveShortcutBadge: {
    backgroundColor: 'var(--surface-alt)',
    color: 'var(--text-muted)',
    border: '1px solid var(--border)',
  },
  bottomSection: {
    marginTop: 'auto',
    paddingTop: '8px',
  },
  divider: {
    height: '1px',
    backgroundColor: 'var(--border)',
    marginBottom: '8px',
  },
  modeBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'var(--surface-alt)',
    padding: '6px 8px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    marginBottom: '6px',
  },
  modeText: {
    fontSize: '0.74rem',
    fontWeight: 600,
    color: 'var(--primary-dark)',
  },
  shortcutsBox: {
    fontSize: '0.68rem',
    color: 'var(--text-muted)',
    lineHeight: 1.3,
  },
  shortcutsLine: {
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
};
