import React, { useEffect } from 'react';
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
];

export const SidebarTabs = ({ activeTab, onSelectTab, onSearchFocus, width = 210 }) => {
  const isCompact = width < 140;

  // Global Keyboard Shortcuts handler (F1-F7 & '/')
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName.toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';

      if (e.key === 'F1') {
        e.preventDefault();
        onSelectTab('family-head');
      } else if (e.key === 'F2') {
        e.preventDefault();
        onSelectTab('add-member');
      } else if (e.key === 'F3') {
        e.preventDefault();
        onSelectTab('patient-record');
      } else if (e.key === 'F4') {
        e.preventDefault();
        onSelectTab('dashboard');
      } else if (e.key === 'F5') {
        e.preventDefault();
        onSelectTab('reports');
      } else if (e.key === 'F6') {
        e.preventDefault();
        onSelectTab('medical-certificate');
      } else if (e.key === 'F7') {
        e.preventDefault();
        onSelectTab('master-data');
      } else if (e.key === '/' && !isInput) {
        e.preventDefault();
        if (onSearchFocus) onSearchFocus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSelectTab, onSearchFocus]);

  return (
    <aside style={{ ...styles.sidebar, width: `${width}px` }}>
      {/* Navigation Tabs List */}
      <nav style={styles.navList}>
        {SIDEBAR_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

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
              title={`${tab.label} (${tab.shortcut})`}
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
                  {tab.shortcut}
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
            <p style={styles.shortcutsLine}>F1 Fam &middot; F2 Mem &middot; F3 Case</p>
            <p style={styles.shortcutsLine}>F4 Dash &middot; F7 Masters</p>
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
