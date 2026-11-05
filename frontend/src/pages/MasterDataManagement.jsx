import React, { useState, useEffect } from 'react';
import { masterDataAPI } from '../services/api';
import { useDebounce } from '../hooks/useDebounce';
import {
  Search,
  Plus,
  SquarePen,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  Layers,
  Activity,
  FlaskConical,
  Pill,
  UtensilsCrossed,
  Compass,
  Building,
  MapPin,
  ShieldAlert,
} from 'lucide-react';

export const CATEGORIES = [
  {
    id: 'complaint',
    label: 'Complaints',
    icon: Activity,
    title: 'All Clinical Complaints & Symptoms',
    singular: 'Complaint',
    plural: 'Complaints',
    codeHeader: 'SHORTCUT / CODE',
    nameHeader: 'COMPLAINT / SYMPTOM FULL NAME',
    searchPlaceholder: 'Search complaint or code...',
    namePlaceholder: 'e.g. FEVER or COUGH',
    codePlaceholder: 'e.g. FEV or COF',
  },
  {
    id: 'investigation',
    label: 'Investigations',
    icon: FlaskConical,
    title: 'All Clinical Lab Investigations & Tests',
    singular: 'Investigation',
    plural: 'Investigations',
    codeHeader: 'TEST CODE / SHORTCUT',
    nameHeader: 'LAB / DIAGNOSTIC TEST NAME',
    searchPlaceholder: 'Search investigation or code...',
    namePlaceholder: 'e.g. COMPLETE BLOOD COUNT (CBC)',
    codePlaceholder: 'e.g. CBC or LFT',
  },
  {
    id: 'medicine',
    label: 'Medicines',
    icon: Pill,
    title: 'All Medicines & Formulations',
    singular: 'Medicine',
    plural: 'Medicines',
    codeHeader: 'DRUG CODE / SHORTCUT',
    nameHeader: 'MEDICINE BRAND / GENERIC FORMULATION',
    searchPlaceholder: 'Search medicine or drug code...',
    namePlaceholder: 'e.g. TAB PARACETAMOL 650MG',
    codePlaceholder: 'e.g. PCM650 or DOLO',
  },
  {
    id: 'dietary',
    label: 'Dietary',
    icon: UtensilsCrossed,
    title: 'All Dietary Advice & Lifestyle Instructions',
    singular: 'Dietary Instruction',
    plural: 'Dietary Instructions',
    codeHeader: 'SHORTCUT / CODE',
    nameHeader: 'DIETARY ADVICE / LIFESTYLE INSTRUCTION',
    searchPlaceholder: 'Search dietary advice or code...',
    namePlaceholder: 'e.g. STRICT DIABETIC DIET (NO ADDED SUGAR)',
    codePlaceholder: 'e.g. DIAB or LSD',
  },
  {
    id: 'navigation',
    label: 'Navigation Shortcuts',
    icon: Compass,
    title: 'All Navigation & Clinical Keyboard Shortcuts',
    singular: 'Navigation Shortcut',
    plural: 'Navigation Shortcuts',
    codeHeader: 'KEY SHORTCUT',
    nameHeader: 'WORKFLOW ACTION & TARGET VIEW',
    searchPlaceholder: 'Search shortcut or command...',
    namePlaceholder: 'e.g. FAMILY HEAD REGISTRATION (F1)',
    codePlaceholder: 'e.g. F1, F2, F3, etc.',
  },
  {
    id: 'society',
    label: 'Societies',
    icon: Building,
    title: 'All Societies & Flats',
    singular: 'Society',
    plural: 'Societies',
    codeHeader: 'CODE / TAG',
    nameHeader: 'SOCIETY / FLAT NAME',
    searchPlaceholder: 'Search society...',
    namePlaceholder: 'e.g. Shanti Niketan',
    codePlaceholder: 'e.g. SN',
  },
  {
    id: 'area',
    label: 'Areas',
    icon: MapPin,
    title: 'All Areas & Locations',
    singular: 'Area',
    plural: 'Areas',
    codeHeader: 'AREA CODE',
    nameHeader: 'AREA / LOCATION NAME',
    searchPlaceholder: 'Search area...',
    namePlaceholder: 'e.g. Vastrapur',
    codePlaceholder: 'e.g. VST',
  },
  {
    id: 'allergy',
    label: 'Allergies',
    icon: ShieldAlert,
    title: 'All Known Allergies',
    singular: 'Allergy',
    plural: 'Allergies',
    codeHeader: 'SHORTCUT',
    nameHeader: 'ALLERGY FULL NAME',
    searchPlaceholder: 'Search allergy or code...',
    namePlaceholder: 'e.g. Penicillin',
    codePlaceholder: 'e.g. PEN',
  },
];

export const NAVIGATION_TARGETS = [
  {
    group: 'Sidebar Navigation Tabs',
    items: [
      {
        value: 'Family Head Reg. (Register Family Head)',
        shortcut: 'F1',
        description: 'Open Family Head Registration form (F1)',
      },
      {
        value: 'Add Member (Add Patient to Existing Family)',
        shortcut: 'F2',
        description: 'Open Add Family Member form (F2)',
      },
      {
        value: 'Patient Record (OPD Consultation & Clinical History)',
        shortcut: 'F3',
        description: 'Open Patient Consultation & Visit Records (F3)',
      },
      {
        value: 'Dashboard (Clinical Overview & OPD Stats)',
        shortcut: 'F4',
        description: 'Open Main Dashboard with KPI analytics (F4)',
      },
      {
        value: 'Reports (Financial, Billing & Patient Logs)',
        shortcut: 'F5',
        description: 'Open Financial, Due & Practice Reports (F5)',
      },
      {
        value: 'Medical Certificate (Generate & Print Certificates)',
        shortcut: 'F6',
        description: 'Open Medical & Fitness Certificate Generator (F6)',
      },
      {
        value: 'Master Data (Medicines, Diagnoses & Configuration)',
        shortcut: 'F7',
        description: 'Open Master Data Management (F7)',
      },
      {
        value: 'Doctor Profile (Manage Credentials & Clinic Settings)',
        shortcut: 'F8',
        description: 'Open Doctor Profile & Password Security (F8)',
      },
    ],
  },
  {
    group: 'Search & Global Navigation',
    items: [
      {
        value: 'Universal Search Bar (Search Patient, FAM ID, Mobile, Area)',
        shortcut: '/',
        description: 'Focus top universal search bar from anywhere',
      },
    ],
  },
  {
    group: 'Clinical Case Entry & Prescriptions',
    items: [
      {
        value: 'New Case Entry (Open New Visit in Patient Record)',
        shortcut: 'Alt+N',
        description: 'Open clean clinical case consultation form',
      },
      {
        value: 'Save Case Entry (Save Clinical Visit without Printing)',
        shortcut: 'Ctrl+S',
        description: 'Save consultation & update due balance instantly',
      },
      {
        value: 'Save & Print Prescription (Save Visit & Open Clean Letterhead)',
        shortcut: 'Ctrl+Enter',
        description: 'Save case and immediately launch print letterhead preview',
      },
      {
        value: 'Print Prescription (Clean Letterhead Mode)',
        shortcut: 'Ctrl+P',
        description: 'Print letterhead prescription preview',
      },
    ],
  },
  {
    group: 'Modal & Form Navigation',
    items: [
      {
        value: 'Close Active Modal / Cancel Dialog',
        shortcut: 'Esc',
        description: 'Dismiss current popup, modal or clear form',
      },
      {
        value: 'Next Field / Accept Autocomplete Suggestion',
        shortcut: 'Enter',
        description: 'Select highlighted suggestion or jump to next input',
      },
    ],
  },
];

export const SHORTCUT_KEYS = [
  {
    group: 'Function Keys (F1 - F12)',
    items: [
      { key: 'F1', label: 'F1 — Standard Family Head Registration' },
      { key: 'F2', label: 'F2 — Standard Add Member' },
      { key: 'F3', label: 'F3 — Standard Patient Record & Case Entry' },
      { key: 'F4', label: 'F4 — Standard Dashboard' },
      { key: 'F5', label: 'F5 — Standard Reports' },
      { key: 'F6', label: 'F6 — Standard Medical Certificate' },
      { key: 'F7', label: 'F7 — Standard Master Data' },
      { key: 'F8', label: 'F8 — Standard Doctor Profile' },
      { key: 'F9', label: 'F9 — Function Key 9' },
      { key: 'F10', label: 'F10 — Function Key 10' },
      { key: 'F11', label: 'F11 — Function Key 11' },
      { key: 'F12', label: 'F12 — Function Key 12' },
    ],
  },
  {
    group: 'Alt Key Combinations',
    items: [
      { key: 'Alt+N', label: 'Alt + N — New Case / Entry' },
      { key: 'Alt+S', label: 'Alt + S — Save Case' },
      { key: 'Alt+P', label: 'Alt + P — Print Prescription' },
      { key: 'Alt+D', label: 'Alt + D — Dashboard' },
      { key: 'Alt+F', label: 'Alt + F — Family Head' },
      { key: 'Alt+M', label: 'Alt + M — Add Member' },
      { key: 'Alt+R', label: 'Alt + R — Reports' },
      { key: 'Alt+C', label: 'Alt + C — Certificate' },
      { key: 'Alt+B', label: 'Alt + B — Focus BP Field' },
    ],
  },
  {
    group: 'Ctrl Key Combinations',
    items: [
      { key: 'Ctrl+S', label: 'Ctrl + S — Save Case' },
      { key: 'Ctrl+Enter', label: 'Ctrl + Enter — Save & Print Prescription' },
      { key: 'Ctrl+P', label: 'Ctrl + P — System Print Dialog' },
      { key: 'Ctrl+F', label: 'Ctrl + F — Find / Search' },
    ],
  },
  {
    group: 'Special & Single Keys',
    items: [
      { key: '/', label: '/ (Slash) — Universal Search Focus' },
      { key: 'Enter', label: 'Enter — Next Field / Select Suggestion' },
      { key: 'Esc', label: 'Esc — Close Modal / Cancel Dialog' },
      { key: 'Tab', label: 'Tab — Next Field Focus' },
    ],
  },
];

const ALL_FLAT_TARGETS = NAVIGATION_TARGETS.flatMap((g) => g.items);
const ALL_FLAT_KEYS = SHORTCUT_KEYS.flatMap((g) => g.items);

export const MasterDataManagement = () => {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // Pagination State
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formShortcut, setFormShortcut] = useState('');
  const [formValue, setFormValue] = useState('');
  const [selectedTarget, setSelectedTarget] = useState('');
  const [selectedKey, setSelectedKey] = useState('');
  const [modalError, setModalError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await masterDataAPI.getItems(
        activeCategory.id,
        debouncedSearch,
        page,
        rowsPerPage
      );
      if (res.success) {
        setItems(res.data || []);
        setTotalCount(res.total || 0);
        setTotalPages(res.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load master data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeCategory, debouncedSearch, page, rowsPerPage]);

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    setSearch('');
    setPage(1);
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormShortcut('');
    setFormValue('');
    setSelectedTarget('');
    setSelectedKey('');
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setModalError('');
    setIsModalOpen(true);

    if (activeCategory.id === 'navigation') {
      const foundTarget = ALL_FLAT_TARGETS.find(
        (t) => t.value.trim().toLowerCase() === (item.value || '').trim().toLowerCase()
      );
      if (foundTarget) {
        setSelectedTarget(foundTarget.value);
        setFormValue(foundTarget.value);
      } else {
        setSelectedTarget('__custom__');
        setFormValue(item.value || '');
      }

      const foundKey = ALL_FLAT_KEYS.find(
        (k) => k.key.trim().toUpperCase() === (item.shortcut || '').trim().toUpperCase()
      );
      if (foundKey) {
        setSelectedKey(foundKey.key);
        setFormShortcut(foundKey.key);
      } else {
        setSelectedKey('__custom__');
        setFormShortcut(item.shortcut || '');
      }
    } else {
      setFormShortcut(item.shortcut || '');
      setFormValue(item.value || '');
    }
  };

  const handleTargetChange = (val) => {
    setSelectedTarget(val);
    if (val === '__custom__') {
      setFormValue('');
    } else {
      setFormValue(val);
      // Auto-suggest standard key if no key is chosen yet
      const matched = ALL_FLAT_TARGETS.find((t) => t.value === val);
      if (matched && matched.shortcut && !selectedKey) {
        setSelectedKey(matched.shortcut);
        setFormShortcut(matched.shortcut);
      }
    }
  };

  const handleKeyChange = (val) => {
    setSelectedKey(val);
    if (val === '__custom__') {
      setFormShortcut('');
    } else {
      setFormShortcut(val);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setSelectedTarget('');
    setSelectedKey('');
    setModalError('');
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    setModalError('');

    const finalVal = activeCategory.id === 'navigation'
      ? (selectedTarget === '__custom__' ? formValue.trim() : (selectedTarget || formValue.trim()))
      : formValue.trim();

    const finalShort = activeCategory.id === 'navigation'
      ? (selectedKey === '__custom__' ? formShortcut.trim().toUpperCase() : (selectedKey || formShortcut.trim().toUpperCase()))
      : formShortcut.trim().toUpperCase();

    if (!finalVal) {
      setModalError(
        activeCategory.id === 'navigation'
          ? 'Please select or enter where to assign the navigation shortcut.'
          : `Please enter ${activeCategory.singular} name.`
      );
      return;
    }

    if (activeCategory.id === 'navigation' && !finalShort) {
      setModalError('Please select or enter a shortcut key.');
      return;
    }

    try {
      setIsSaving(true);
      if (editingItem) {
        const res = await masterDataAPI.updateItem(editingItem._id, {
          value: finalVal,
          shortcut: finalShort,
        });
        if (res.success) {
          showToast(`Updated "${finalVal}" successfully.`);
          if (activeCategory.id === 'navigation') {
            window.dispatchEvent(new CustomEvent('cms-navigation-shortcuts-updated'));
          }
          handleCloseModal();
          loadData();
        }
      } else {
        const res = await masterDataAPI.addItem({
          type: activeCategory.id,
          value: finalVal,
          shortcut: finalShort,
        });
        if (res.success) {
          showToast(`Added "${finalVal}" to ${activeCategory.plural}.`);
          if (activeCategory.id === 'navigation') {
            window.dispatchEvent(new CustomEvent('cms-navigation-shortcuts-updated'));
          }
          handleCloseModal();
          loadData();
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Operation failed';
      setModalError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${item.value}" from ${activeCategory.plural}?`
      )
    ) {
      return;
    }

    try {
      const res = await masterDataAPI.deleteItem(item._id);
      if (res.success) {
        showToast(`Deleted "${item.value}" from master records.`);
        if (activeCategory.id === 'navigation') {
          window.dispatchEvent(new CustomEvent('cms-navigation-shortcuts-updated'));
        }
        loadData();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '01/11/2026';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const startEntry = totalCount === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const endEntry = Math.min(page * rowsPerPage, totalCount);

  return (
    <div style={styles.container}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={styles.toast}>
          <CheckCircle size={18} color="var(--primary)" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Category Pills Navigation */}
      <div style={styles.categoryPills}>
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory.id === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat)}
              style={{
                ...styles.categoryBtn,
                backgroundColor: isActive ? 'var(--primary)' : 'var(--surface)',
                color: isActive ? '#FFFFFF' : 'var(--text)',
                borderColor: isActive ? 'var(--primary)' : 'var(--border)',
                fontWeight: isActive ? 700 : 500,
                boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
              }}
            >
              <Icon size={16} strokeWidth={2.2} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Table Container Card (Matching Screenshot) */}
      <div style={styles.card}>
        {/* Top Header Bar */}
        <div style={styles.headerBar}>
          <div style={styles.headerLeft}>
            <h2 style={styles.headerTitle}>{activeCategory.title}</h2>
            <span style={styles.countBadge}>
              {totalCount} {totalCount === 1 ? activeCategory.singular : activeCategory.plural}
            </span>
          </div>

          <div style={styles.headerRight}>
            {/* Search Input with Debounce */}
            <div style={styles.searchBox}>
              <Search size={16} color="var(--text-muted)" style={styles.searchIcon} />
              <input
                type="text"
                placeholder={activeCategory.searchPlaceholder}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                style={styles.searchInput}
              />
            </div>

            {/* + Add Button */}
            <button onClick={handleOpenAddModal} style={styles.addBtn}>
              <Plus size={18} strokeWidth={2.5} />
              <span>+ Add {activeCategory.singular}</span>
            </button>
          </div>
        </div>

        {/* Master Data Table */}
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeadRow}>
                <th style={{ ...styles.th, width: '60px' }}>#</th>
                <th style={{ ...styles.th, width: '180px' }}>{activeCategory.codeHeader}</th>
                <th style={styles.th}>{activeCategory.nameHeader}</th>
                <th style={{ ...styles.th, width: '150px' }}>ADDED ON</th>
                <th style={{ ...styles.th, width: '120px', textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={styles.loadingCell}>
                    <div style={styles.spinner}></div>
                    <span>Loading {activeCategory.plural.toLowerCase()}...</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} style={styles.emptyCell}>
                    <Layers size={36} color="var(--border)" />
                    <p style={styles.emptyText}>No {activeCategory.plural.toLowerCase()} found</p>
                    <span style={styles.emptySub}>
                      Click "+ Add {activeCategory.singular}" above to create a new entry.
                    </span>
                  </td>
                </tr>
              ) : (
                items.map((item, index) => {
                  const seqNum = startEntry + index;
                  return (
                    <tr key={item._id} style={styles.tr}>
                      {/* # Number */}
                      <td style={styles.tdSeq}>{seqNum}</td>

                      {/* Shortcut / Code Pill */}
                      <td style={styles.td}>
                        {item.shortcut ? (
                          <span style={styles.shortcutPill}>{item.shortcut}</span>
                        ) : (
                          <span style={styles.noShortcutText}>—</span>
                        )}
                      </td>

                      {/* Full Name */}
                      <td style={styles.tdName}>{item.value}</td>

                      {/* Added On */}
                      <td style={styles.tdDate}>{formatDate(item.createdAt)}</td>

                      {/* Actions */}
                      <td style={styles.tdActions}>
                        <div style={styles.actionsWrap}>
                          {/* Blue Edit Icon */}
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            style={styles.actionEditBtn}
                            title="Edit Record"
                          >
                            <SquarePen size={18} color="#1558d6" />
                          </button>

                          {/* Red Trash Icon */}
                          <button
                            onClick={() => handleDelete(item)}
                            style={styles.actionDeleteBtn}
                            title="Delete Record"
                          >
                            <Trash2 size={18} color="var(--danger)" />
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

        {/* Footer with Pagination matching image */}
        <div style={styles.footerBar}>
          <div style={styles.entriesText}>
            Showing {startEntry} to {endEntry} of {totalCount} entries
          </div>

          <div style={styles.rowsPerPageWrap}>
            <span style={styles.rowsLabel}>Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(1);
              }}
              style={styles.rowsSelect}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div style={styles.paginationWrap}>
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1}
              style={{
                ...styles.pageBtn,
                opacity: page <= 1 ? 0.5 : 1,
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              &lt; Prev
            </button>

            <span style={styles.pageText}>
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </span>

            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              style={{
                ...styles.nextBtn,
                opacity: page >= totalPages ? 0.5 : 1,
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              Next &gt;
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal Dialog */}
      {isModalOpen && (
        <div style={styles.modalOverlay} onClick={handleCloseModal}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {editingItem ? `Edit ${activeCategory.singular}` : `+ Add New ${activeCategory.singular}`}
              </h3>
              <button onClick={handleCloseModal} style={styles.closeBtn}>
                <X size={20} color="var(--text-muted)" />
              </button>
            </div>

            {modalError && (
              <div style={styles.modalErrorBox}>
                <AlertCircle size={16} color="var(--danger)" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveModal} style={styles.modalForm}>
              {activeCategory.id === 'navigation' ? (
                <>
                  {/* 1. Target Destination / Workflow Selection */}
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>
                      Where to Assign Navigation Shortcut <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <select
                      value={selectedTarget}
                      onChange={(e) => handleTargetChange(e.target.value)}
                      style={styles.modalSelect}
                      required
                    >
                      <option value="">-- Select Target Workflow / View --</option>
                      {NAVIGATION_TARGETS.map((grp) => (
                        <optgroup key={grp.group} label={grp.group}>
                          {grp.items.map((it) => (
                            <option key={it.value} value={it.value}>
                              {it.value}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                      <optgroup label="Custom Option">
                        <option value="__custom__">+ Type Custom Action / Target...</option>
                      </optgroup>
                    </select>

                    {selectedTarget === '__custom__' && (
                      <input
                        type="text"
                        required
                        placeholder="e.g. Export Reports to Excel"
                        value={formValue}
                        onChange={(e) => setFormValue(e.target.value)}
                        style={{ ...styles.modalInput, marginTop: '8px' }}
                        autoFocus
                      />
                    )}
                  </div>

                  {/* 2. Shortcut Key Selection */}
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>
                      Shortcut Key (Key Combination) <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <select
                      value={selectedKey}
                      onChange={(e) => handleKeyChange(e.target.value)}
                      style={styles.modalSelect}
                      required
                    >
                      <option value="">-- Select Shortcut Key --</option>
                      {SHORTCUT_KEYS.map((grp) => (
                        <optgroup key={grp.group} label={grp.group}>
                          {grp.items.map((k) => (
                            <option key={k.key} value={k.key}>
                              {k.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                      <optgroup label="Custom Option">
                        <option value="__custom__">+ Type Custom Key Combination...</option>
                      </optgroup>
                    </select>

                    {selectedKey === '__custom__' && (
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ctrl+Shift+S or Alt+1"
                        value={formShortcut}
                        onChange={(e) => setFormShortcut(e.target.value)}
                        style={{ ...styles.modalInput, marginTop: '8px' }}
                      />
                    )}
                  </div>

                  {/* 3. Live Configuration Preview Card */}
                  {(selectedTarget || formValue) && (selectedKey || formShortcut) && (
                    <div style={styles.shortcutLivePreview}>
                      <span style={styles.previewHeading}>Active Mapping Preview:</span>
                      <div style={styles.previewRow}>
                        <span style={styles.previewKey}>
                          {selectedKey === '__custom__' ? formShortcut : selectedKey}
                        </span>
                        <span style={styles.previewArrow}>➔</span>
                        <span style={styles.previewTarget}>
                          {selectedTarget === '__custom__' ? formValue : selectedTarget}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>
                      {activeCategory.singular} Full Name <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={activeCategory.namePlaceholder}
                      value={formValue}
                      onChange={(e) => setFormValue(e.target.value)}
                      style={styles.modalInput}
                      autoFocus
                    />
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>
                      Shortcut / Code <span style={styles.optionalText}>(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder={activeCategory.codePlaceholder}
                      value={formShortcut}
                      onChange={(e) => setFormShortcut(e.target.value)}
                      style={styles.modalInput}
                    />
                  </div>
                </>
              )}

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    ...styles.saveBtn,
                    opacity: isSaving ? 0.75 : 1,
                  }}
                >
                  {isSaving ? 'Saving...' : editingItem ? 'Save Changes' : `Add ${activeCategory.singular}`}
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
    gap: '12px',
    width: '100%',
    height: '100%',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 18px',
    backgroundColor: 'var(--primary-soft)',
    color: 'var(--primary-dark)',
    border: '1px solid var(--primary)',
    borderRadius: '8px',
    fontSize: '0.88rem',
    fontWeight: 600,
  },
  categoryPills: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  categoryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '4px 10px',
    borderRadius: '14px',
    fontSize: '0.78rem',
    border: '1px solid var(--border)',
    transition: 'all 0.15s ease',
  },
  card: {
    backgroundColor: 'var(--surface)',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
  },
  headerBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderBottom: '1px solid var(--border)',
    flexWrap: 'wrap',
    gap: '8px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  headerTitle: {
    fontSize: '0.98rem',
    fontWeight: 800,
    color: 'var(--text)',
    letterSpacing: '-0.01em',
  },
  countBadge: {
    backgroundColor: '#DCEFEA',
    color: '#0E4F44',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '0.70rem',
    fontWeight: 700,
    letterSpacing: '0.02em',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  searchBox: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '8px',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '200px',
    height: '28px',
    padding: '0 10px 0 28px',
    backgroundColor: 'var(--surface-alt)',
    border: '1px solid var(--border)',
    borderRadius: '14px',
    fontSize: '0.78rem',
    color: 'var(--text)',
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '0 10px',
    height: '28px',
    backgroundColor: '#146B5C',
    color: '#FFFFFF',
    borderRadius: '6px',
    fontSize: '0.78rem',
    fontWeight: 700,
    boxShadow: '0 2px 6px rgba(20, 107, 92, 0.25)',
  },
  tableWrap: {
    overflowX: 'auto',
    overflowY: 'auto',
    flex: 1,
    minHeight: 0,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  tableHeadRow: {
    backgroundColor: '#F0F6F4',
    borderBottom: '1px solid var(--border)',
  },
  th: {
    padding: '6px 10px',
    fontSize: '0.70rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  tr: {
    borderBottom: '1px solid var(--border)',
    transition: 'background 0.15s ease',
  },
  tdSeq: {
    padding: '6px 10px',
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
  td: {
    padding: '6px 10px',
  },
  shortcutPill: {
    display: 'inline-block',
    backgroundColor: '#E8F6F3',
    color: '#0E4F44',
    border: '1px solid #C4E8DF',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '0.72rem',
    fontWeight: 800,
    letterSpacing: '0.03em',
  },
  noShortcutText: {
    color: 'var(--text-muted)',
    fontSize: '0.74rem',
  },
  tdName: {
    padding: '6px 10px',
    fontSize: '0.80rem',
    fontWeight: 800,
    color: 'var(--text)',
    textTransform: 'uppercase',
    letterSpacing: '0.01em',
  },
  tdDate: {
    padding: '6px 10px',
    fontSize: '0.74rem',
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
  tdActions: {
    padding: '6px 10px',
  },
  actionsWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
  },
  actionEditBtn: {
    background: 'none',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  actionDeleteBtn: {
    background: 'none',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  loadingCell: {
    padding: '40px 18px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '0.88rem',
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '3px solid var(--primary-soft)',
    borderTop: '3px solid var(--primary)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto 10px auto',
  },
  emptyCell: {
    padding: '50px 18px',
    textAlign: 'center',
    color: 'var(--text-muted)',
  },
  emptyText: {
    fontSize: '1rem',
    fontWeight: 600,
    color: 'var(--text)',
    marginTop: '8px',
  },
  emptySub: {
    fontSize: '0.82rem',
    color: 'var(--text-muted)',
  },
  footerBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    backgroundColor: 'var(--surface)',
    borderTop: '1px solid var(--border)',
    flexWrap: 'wrap',
    gap: '16px',
  },
  entriesText: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
  rowsPerPageWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  rowsLabel: {
    fontSize: '0.84rem',
    color: 'var(--text-muted)',
  },
  rowsSelect: {
    padding: '4px 10px',
    fontSize: '0.85rem',
    backgroundColor: 'var(--surface-alt)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    color: 'var(--text)',
    cursor: 'pointer',
  },
  paginationWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  pageBtn: {
    padding: '6px 14px',
    backgroundColor: 'var(--surface-alt)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    fontSize: '0.82rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
  },
  pageText: {
    fontSize: '0.84rem',
    color: 'var(--text)',
  },
  nextBtn: {
    padding: '6px 14px',
    backgroundColor: '#1E60D5',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.82rem',
    fontWeight: 700,
    letterSpacing: '0.02em',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(27, 43, 41, 0.45)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modalCard: {
    backgroundColor: 'var(--surface)',
    borderRadius: '14px',
    padding: '28px',
    width: '100%',
    maxWidth: '460px',
    boxShadow: 'var(--shadow-lg)',
    border: '1px solid var(--border)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  modalTitle: {
    fontSize: '1.2rem',
    fontWeight: 700,
    color: 'var(--text)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalErrorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    backgroundColor: 'var(--danger-soft)',
    color: 'var(--danger)',
    borderRadius: '6px',
    fontSize: '0.84rem',
    marginBottom: '16px',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.78rem',
    fontWeight: 700,
    color: 'var(--text)',
    textTransform: 'uppercase',
  },
  optionalText: {
    fontSize: '0.74rem',
    color: 'var(--text-muted)',
    textTransform: 'none',
    fontWeight: 400,
  },
  modalInput: {
    width: '100%',
    padding: '11px 14px',
    fontSize: '0.92rem',
    backgroundColor: 'var(--surface-alt)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text)',
  },
  modalSelect: {
    width: '100%',
    padding: '11px 14px',
    fontSize: '0.92rem',
    backgroundColor: 'var(--surface-alt)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text)',
    outline: 'none',
    cursor: 'pointer',
    fontWeight: 600,
  },
  shortcutLivePreview: {
    padding: '12px 14px',
    backgroundColor: '#EEF8F5',
    border: '1px solid #BBF7D0',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginTop: '2px',
  },
  previewHeading: {
    fontSize: '0.72rem',
    fontWeight: 700,
    color: '#065F46',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  previewRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  previewKey: {
    display: 'inline-block',
    padding: '4px 10px',
    backgroundColor: '#0E4F44',
    color: '#FFFFFF',
    borderRadius: '6px',
    fontWeight: 800,
    fontSize: '0.85rem',
    letterSpacing: '0.03em',
    boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
  },
  previewArrow: {
    fontSize: '14px',
    fontWeight: 800,
    color: '#0E4F44',
  },
  previewTarget: {
    fontSize: '0.86rem',
    fontWeight: 700,
    color: '#0F172A',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  modalActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '12px',
  },
  cancelBtn: {
    padding: '10px 18px',
    backgroundColor: 'var(--surface-alt)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    fontSize: '0.88rem',
    fontWeight: 600,
    color: 'var(--text)',
  },
  saveBtn: {
    padding: '10px 20px',
    backgroundColor: '#146B5C',
    color: '#FFFFFF',
    borderRadius: '8px',
    fontSize: '0.88rem',
    fontWeight: 700,
  },
};
