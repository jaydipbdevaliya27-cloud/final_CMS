import React, { useState, useEffect, useRef } from 'react';
import { familyAPI } from '../services/api';
import { MasterDataInput } from '../components/common/MasterDataInput';
import { useDebounce } from '../hooks/useDebounce';
import {
  ListChecks,
  Network,
  Search,
  FolderOpen,
  CheckCircle,
  AlertCircle,
  Users,
  Phone,
  MapPin,
  UserCheck,
  SquarePen,
  Trash2,
  RotateCcw,
  Sparkles,
  GripVertical,
} from 'lucide-react';

const BLOOD_GROUPS = [
  '-- Select --',
  'A+',
  'A-',
  'B+',
  'B-',
  'O+',
  'O-',
  'AB+',
  'AB-',
];

const REGISTRATION_OPTIONS = [
  'Self (Head of Family)',
  'Family Member',
  'Clinic Staff',
];

export const FamilyHeadRegistration = ({ onNavigateToAddMember, onNavigateToPatient }) => {
  const [nextFamilyId, setNextFamilyId] = useState('00001');
  const [families, setFamilies] = useState([]);
  const [expandedFamilies, setExpandedFamilies] = useState({});
  const [directorySearch, setDirectorySearch] = useState('');
  const [directoryHighlightIndex, setDirectoryHighlightIndex] = useState(0);
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Toggle expansion of family card
  const toggleExpandFamily = (famId) => {
    setExpandedFamilies((prev) => ({
      ...prev,
      [famId]: !prev[famId],
    }));
  };

  // CRUD Edit State: null = Add Mode, object = Edit Mode
  const [editingFamily, setEditingFamily] = useState(null);

  // Draggable Splitter State
  const [formWidthPercent, setFormWidthPercent] = useState(52);
  const [isDraggingDivider, setIsDraggingDivider] = useState(false);
  const splitContainerRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingDivider || !splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const newPercent = Math.max(32, Math.min(72, (offsetX / rect.width) * 100));
      setFormWidthPercent(newPercent);
    };

    const handleMouseUp = () => {
      setIsDraggingDivider(false);
    };

    if (isDraggingDivider) {
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
  }, [isDraggingDivider]);

  // Form State
  const [formData, setFormData] = useState({
    headName: '',
    age: '',
    bloodGroup: '',
    allergy: '',
    society: '',
    area: '',
    registrationDoneBy: 'Self (Head of Family)',
    phone: '',
  });

  // Load preview next Family ID
  const loadNextId = async () => {
    try {
      const res = await familyAPI.getNextId();
      if (res.success && res.nextFamilyId) {
        setNextFamilyId(res.nextFamilyId);
      }
    } catch (err) {
      console.error('Error fetching next Family ID:', err);
    }
  };

  // Load directory list
  const loadFamilies = async (search = '') => {
    try {
      setLoadingDirectory(true);
      const res = await familyAPI.getAll(search);
      if (res.success) {
        const loaded = res.data || [];
        setFamilies(loaded);
        setDirectoryHighlightIndex(0); // Automatically select first match
        if (loaded.length === 1) {
          setExpandedFamilies((prev) => ({
            ...prev,
            [loaded[0].familyId]: true,
          }));
        }
      }
    } catch (err) {
      console.error('Error loading families directory:', err);
    } finally {
      setLoadingDirectory(false);
    }
  };

  // Debounced directory search
  const debouncedDirectorySearch = useDebounce(directorySearch, 300);

  useEffect(() => {
    loadNextId();
    loadFamilies(debouncedDirectorySearch);
  }, [debouncedDirectorySearch]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Switch form into Edit Mode
  const handleEditFamily = (fam) => {
    setEditingFamily(fam);
    setErrorMessage('');
    setSuccessMessage('');

    // Pre-populate fields from family & head patient
    setFormData({
      headName: fam.headName || '',
      age: fam.headPatientId?.age !== undefined ? String(fam.headPatientId.age) : '',
      bloodGroup: fam.headPatientId?.bloodGroup || '',
      allergy:
        fam.headPatientId?.allergies && fam.headPatientId.allergies.length > 0
          ? fam.headPatientId.allergies.join(', ')
          : '',
      society: fam.society || '',
      area: fam.area || '',
      registrationDoneBy: fam.registrationDoneBy || 'Self (Head of Family)',
      phone: fam.phone || '',
    });

    // Smooth scroll to top of form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cancel Edit Mode
  const handleCancelEdit = () => {
    setEditingFamily(null);
    setErrorMessage('');
    setFormData({
      headName: '',
      age: '',
      bloodGroup: '',
      allergy: '',
      society: '',
      area: '',
      registrationDoneBy: 'Self (Head of Family)',
      phone: '',
    });
  };

  // Delete Family
  const handleDeleteFamily = async (fam) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete Family FAM-${fam.familyId} (${fam.headName}) and all linked records?`
    );
    if (!confirmDelete) return;

    try {
      const res = await familyAPI.delete(fam.familyId);
      if (res.success) {
        setSuccessMessage(res.message);
        if (editingFamily && editingFamily.familyId === fam.familyId) {
          handleCancelEdit();
        }
        await loadFamilies(debouncedDirectorySearch);
        await loadNextId();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to delete family';
      setErrorMessage(msg);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!formData.headName.trim()) {
      setErrorMessage('Please enter Family Head Name.');
      return;
    }

    try {
      setIsSubmitting(true);
      const allergiesList = formData.allergy
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);

      const payload = {
        headName: formData.headName.trim(),
        age: formData.age ? Number(formData.age) : undefined,
        bloodGroup: formData.bloodGroup === '-- Select --' ? '' : formData.bloodGroup,
        allergies: allergiesList,
        society: formData.society.trim(),
        area: formData.area.trim(),
        registrationDoneBy: formData.registrationDoneBy,
        phone: formData.phone.trim(),
      };

      if (editingFamily) {
        // UPDATE Existing Family
        const res = await familyAPI.update(editingFamily.familyId, payload);
        if (res.success) {
          setSuccessMessage(
            `Family FAM-${editingFamily.familyId} ("${payload.headName}") updated successfully!`
          );
          handleCancelEdit();
          await loadFamilies(debouncedDirectorySearch);
        }
      } else {
        // CREATE New Family
        const res = await familyAPI.registerHead(payload);
        if (res.success) {
          setSuccessMessage(
            `Family Head "${res.family.headName}" registered as Patient with Family ID ${res.family.familyId}!`
          );

          setFormData({
            headName: '',
            age: '',
            bloodGroup: '',
            allergy: '',
            society: '',
            area: '',
            registrationDoneBy: 'Self (Head of Family)',
            phone: '',
          });

          await loadNextId();
          await loadFamilies(debouncedDirectorySearch);
        }
      }
    } catch (err) {
      const msg =
        err.response?.data?.message || err.message || 'Failed to save family record';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit(e);
    }
  };

  return (
    <div style={styles.container} onKeyDown={handleFormKeyDown}>
      <div ref={splitContainerRef} style={styles.gridContainer}>
        {/* LEFT PANE: Register / Update Family Head Form */}
        <section style={{ ...styles.formPane, width: `${formWidthPercent}%` }}>
          {/* Header */}
          <div style={styles.paneHeader}>
            <div style={styles.headerLeft}>
              <ListChecks size={22} color="var(--primary)" />
              <h2 style={styles.paneTitle}>
                {editingFamily
                  ? `Update Family Head · FAM-${editingFamily.familyId}`
                  : 'Step 1 · Register Family Head'}
              </h2>
            </div>

            <div style={styles.headerRightControls}>
              {editingFamily ? (
                <button onClick={handleCancelEdit} style={styles.cancelEditPill}>
                  <RotateCcw size={13} />
                  <span>Cancel Edit</span>
                </button>
              ) : (
                <div style={styles.clinicIdBadge}>
                  <Network size={14} color="var(--primary)" />
                  <span>Multi-Clinic ID</span>
                </div>
              )}
            </div>
          </div>

          {/* Auto-Generated / Active Family ID Card */}
          <div
            style={{
              ...styles.idCard,
              borderColor: editingFamily ? 'var(--accent)' : 'var(--primary)',
            }}
          >
            <div style={styles.idCardHeader}>
              <span style={styles.idCardLabel}>
                {editingFamily ? 'EDITING ASSIGNED FAMILY ID' : '% AUTO-GENERATED FAMILY ID'}
              </span>
              <div style={styles.badgeRow}>
                <span
                  style={{
                    ...styles.idPillDark,
                    backgroundColor: editingFamily ? 'var(--accent)' : 'var(--primary)',
                  }}
                >
                  {editingFamily ? editingFamily.familyId : nextFamilyId}
                </span>
                <span style={styles.idPillLight}>{new Date().getFullYear()}</span>
                <span style={styles.seqBadge}>
                  Seq:{' '}
                  <strong>
                    {parseInt(editingFamily ? editingFamily.familyId : nextFamilyId, 10) || 1}
                  </strong>
                </span>
              </div>
            </div>
            <div
              style={{
                ...styles.largeIdDisplay,
                color: editingFamily ? 'var(--accent)' : 'var(--primary)',
              }}
            >
              {parseInt(editingFamily ? editingFamily.familyId : nextFamilyId, 10) || 1}
            </div>
          </div>

          {/* Notification Messages */}
          {successMessage && (
            <div style={styles.successBox}>
              <CheckCircle size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <span style={styles.successText}>{successMessage}</span>
                {!editingFamily && onNavigateToAddMember && (
                  <button
                    onClick={onNavigateToAddMember}
                    style={styles.addMemberNowBtn}
                  >
                    Add Family Member Now (F2) &rarr;
                  </button>
                )}
              </div>
            </div>
          )}

          {errorMessage && (
            <div style={styles.errorBox}>
              <AlertCircle size={18} color="var(--danger)" style={{ flexShrink: 0 }} />
              <span style={styles.errorText}>{errorMessage}</span>
            </div>
          )}

          {/* Registration / Edit Form */}
          <form onSubmit={handleSubmit} style={styles.form}>
            {/* FAMILY HEAD NAME */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                FAMILY HEAD NAME <span style={styles.requiredMark}>*</span>
              </label>
              <input
                type="text"
                required
                placeholder="(SURNAME NAME FATHER'S NAME)"
                value={formData.headName}
                onChange={(e) => handleInputChange('headName', e.target.value)}
                style={styles.input}
                autoFocus
              />
            </div>

            {/* AGE, BLOOD GROUP, KNOWN ALLERGIES */}
            <div style={styles.grid3}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>AGE</label>
                <input
                  type="number"
                  placeholder="e.g. 45"
                  min="0"
                  max="125"
                  value={formData.age}
                  onChange={(e) => handleInputChange('age', e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>BLOOD GROUP</label>
                <select
                  value={formData.bloodGroup}
                  onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                  style={styles.select}
                >
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg === '-- Select --' ? '' : bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  KNOWN ALLERGIES <span style={styles.hintText}></span>
                </label>
                <MasterDataInput
                  type="allergy"
                  allowMultiple={true}
                  placeholder="e.g. PEN -> Penicillin"
                  value={formData.allergy}
                  onChange={(val) => handleInputChange('allergy', val)}
                />
              </div>
            </div>

            {/* SOCIETY / FLAT, AREA / LOCATION */}
            <div style={styles.grid2}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>SOCIETY / FLAT</label>
                <MasterDataInput
                  type="society"
                  placeholder="e.g. Shanti Niketan"
                  value={formData.society}
                  onChange={(val) => handleInputChange('society', val)}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  AREA / LOCATION <span style={styles.hintText}></span>
                </label>
                <MasterDataInput
                  type="area"
                  placeholder="e.g. Vastrapur"
                  value={formData.area}
                  onChange={(val) => handleInputChange('area', val)}
                />
              </div>
            </div>

            {/* REGISTRATION DONE BY, PHONE NUMBER */}
            <div style={styles.grid2}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  REGISTRATION DONE BY <span style={styles.requiredMark}>*</span>
                </label>
                <select
                  value={formData.registrationDoneBy}
                  onChange={(e) =>
                    handleInputChange('registrationDoneBy', e.target.value)
                  }
                  style={styles.select}
                >
                  {REGISTRATION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>PHONE NUMBER</label>
                <input
                  type="tel"
                  placeholder="10-digit mobile"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  style={styles.input}
                />
              </div>
            </div>

            {/* Actions: Save & Continue or Update / Cancel */}
            <div style={styles.buttonRow}>
              {editingFamily && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  style={styles.cancelBtn}
                >
                  Cancel Edit
                </button>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  ...styles.submitBtn,
                  backgroundColor: editingFamily ? 'var(--accent)' : 'var(--primary)',
                  opacity: isSubmitting ? 0.75 : 1,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                <div style={styles.submitBtnInner}>
                  <span>
                    {editingFamily ? 'Update Family Head Record' : 'Save & Continue'}
                  </span>
                  <span style={styles.enterBadge}>Enter</span>
                </div>
              </button>
            </div>
          </form>
        </section>

        {/* DRAGGER AT BORDER: Resize Form vs Directory */}
        <div
          onMouseDown={() => setIsDraggingDivider(true)}
          style={{
            ...styles.paneDragger,
            backgroundColor: isDraggingDivider ? 'var(--primary)' : 'var(--border)',
          }}
          title="Drag border to resize Form vs Directory width"
        >
          <GripVertical size={13} color="var(--text-muted)" />
        </div>

        {/* RIGHT PANE: Registered Families Directory with Full CRUD */}
        <section
          style={{
            ...styles.directoryPane,
            width: `calc(${100 - formWidthPercent}% - 8px)`,
          }}
        >
          <div style={styles.paneHeader}>
            <h3 style={styles.directoryTitle}>Registered Families Directory</h3>
            <span style={styles.countPill}>{families.length} families</span>
          </div>

          {/* Directory Search with Debounce */}
          <div style={styles.directorySearchWrap}>
            <Search size={16} color="var(--text-muted)" style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search by head name, society, area, or FAM ID..."
              value={directorySearch}
              onChange={(e) => setDirectorySearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  if (families.length > 0) {
                    e.preventDefault();
                    setDirectoryHighlightIndex((prev) => (prev < families.length - 1 ? prev + 1 : 0));
                  }
                } else if (e.key === 'ArrowUp') {
                  if (families.length > 0) {
                    e.preventDefault();
                    setDirectoryHighlightIndex((prev) => (prev > 0 ? prev - 1 : families.length - 1));
                  }
                } else if (e.key === 'Enter') {
                  if (families.length > 0) {
                    e.preventDefault();
                    const chosen = families[directoryHighlightIndex] || families[0];
                    if (chosen) toggleExpandFamily(chosen.familyId);
                  }
                }
              }}
              style={styles.directorySearchInput}
            />
          </div>

          {/* Families List with Edit & Delete Controls */}
          <div style={styles.directoryList}>
            {loadingDirectory ? (
              <div style={styles.loadingBox}>
                <div style={styles.spinner}></div>
                <span>Loading families from database...</span>
              </div>
            ) : families.length === 0 ? (
              <div style={styles.emptyBox}>
                <FolderOpen size={48} color="var(--border)" strokeWidth={1.5} />
                <p style={styles.emptyText}>No families found</p>
                <span style={styles.emptySub}>
                  Register a family head on the left to populate the directory.
                </span>
              </div>
            ) : (
              families.map((fam, idx) => {
                const isCurrentEdit = editingFamily && editingFamily.familyId === fam.familyId;
                const isExpanded = !!expandedFamilies[fam.familyId];
                const isHighlighted = idx === directoryHighlightIndex;
                let membersList = fam.members || [];
                if (membersList.length === 0 && fam.headName) {
                  membersList = [
                    {
                      _id: fam.headPatientId?._id || fam._id,
                      patientId: fam.headPatientId?.patientId || fam.familyId,
                      name: fam.headName,
                      relation: 'Head',
                      isHead: true,
                      allergies: fam.headPatientId?.allergies || [],
                    },
                  ];
                }
                const memberCount = membersList.length || fam.membersCount || 1;
                const famDisplayId = parseInt(fam.familyId, 10) || fam.familyId;

                return (
                  <div
                    key={fam._id || fam.familyId}
                    onClick={() => toggleExpandFamily(fam.familyId)}
                    onMouseEnter={() => setDirectoryHighlightIndex(idx)}
                    style={{
                      ...styles.familyCard,
                      border: isCurrentEdit
                        ? '2px solid var(--accent)'
                        : isHighlighted
                          ? '2px solid var(--primary)'
                          : isExpanded
                            ? '1px solid #146B5C'
                            : '1px solid var(--border)',
                      backgroundColor: isCurrentEdit
                        ? 'var(--accent-soft)'
                        : isHighlighted
                          ? 'var(--primary-soft)'
                          : '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    {/* Top Row: Head Name & Subtitle on left, FAM ID & Edit/Delete on right */}
                    <div style={styles.cardHeaderRow}>
                      <div style={styles.cardHeaderLeft}>
                        <h4 style={styles.cardHeadName}>{fam.headName}</h4>
                        <div style={styles.cardSubtitleText}>
                          <span>By {fam.registrationDoneBy || 'Self (Head of Family)'}</span>
                        </div>
                        <div style={styles.cardMemberCountText}>
                          &bull; {memberCount} {memberCount === 1 ? 'Member' : 'Members'}
                        </div>
                      </div>

                      <div style={styles.cardHeaderRight}>
                        <span style={styles.cardFamIdText}>
                          FAM &nbsp;{famDisplayId}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditFamily(fam);
                          }}
                          style={styles.cardEditBtn}
                          title="Edit Family Head Record"
                        >
                          <SquarePen size={13} color="#1558d6" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFamily(fam);
                          }}
                          style={styles.cardDeleteBtn}
                          title="Delete Family and Linked Records"
                        >
                          <Trash2 size={16} color="#DC2626" />
                        </button>
                      </div>
                    </div>

                    {/* Expandable Members Box (Matches Image 2) */}
                    {isExpanded && (
                      <div
                        style={styles.expandedMembersBox}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={styles.expandedBoxHeader}>
                          <div style={styles.expandedBoxTitleLeft}>
                            <Users size={16} color="#146B5C" />
                            <span style={styles.expandedBoxTitle}>
                              FAMILY MEMBERS ({memberCount}):
                            </span>
                          </div>
                          <span style={styles.expandedBoxHint}>
                            ↕ Scroll to view all &bull; Click to open
                          </span>
                        </div>

                        <div style={styles.expandedMembersList}>
                          {membersList.map((m) => {
                            const allergyText = Array.isArray(m.allergies)
                              ? m.allergies.filter(Boolean).join(', ')
                              : m.allergies || '';
                            const relationLabel = m.isHead
                              ? 'Head'
                              : m.relation || 'Member';
                            const displayPid = m.patientId || (m._id ? String(m._id).slice(-4) : 'PID');

                            return (
                              <div
                                key={m._id || m.patientId}
                                style={styles.memberCardItem}
                              >
                                <div style={styles.memberInfoLeft}>
                                  <div style={styles.memberNameLine}>
                                    <span style={styles.memberBoldName}>
                                      {m.name || m.fullName || fam.headName}
                                    </span>
                                    <span style={styles.memberRelationTag}>
                                      ({relationLabel})
                                    </span>
                                  </div>
                                  <div style={styles.memberAllergyLine}>
                                    &bull; Allergy: {allergyText || 'None'}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onNavigateToPatient) {
                                      onNavigateToPatient(m.patientId || m._id);
                                    }
                                  }}
                                  style={styles.memberRedirectBtn}
                                  title={`Open Patient Record for ${m.name || m.fullName || fam.headName}`}
                                >
                                  <span>{displayPid} &rarr;</span>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    height: '100%',
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  gridContainer: {
    display: 'flex',
    width: '100%',
    height: '100%',
    flex: 1,
    minHeight: 0,
    alignItems: 'stretch',
    gap: 0,
  },
  paneDragger: {
    width: '8px',
    cursor: 'col-resize',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    margin: '0 4px',
    borderRadius: '4px',
    transition: 'background-color 0.15s ease',
    userSelect: 'none',
  },
  formPane: {
    backgroundColor: 'var(--surface)',
    borderRadius: '8px',
    padding: '12px 14px',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    minWidth: '320px',
    height: '100%',
    minHeight: 0,
    boxSizing: 'border-box',
    overflowY: 'auto',
  },
  paneHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  paneTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: 'var(--text)',
    letterSpacing: '-0.01em',
  },
  headerRightControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  cancelEditPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 8px',
    backgroundColor: 'var(--surface-alt)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    fontSize: '0.72rem',
    fontWeight: 600,
    color: 'var(--text)',
    cursor: 'pointer',
  },
  clinicIdBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 8px',
    backgroundColor: 'var(--surface-alt)',
    borderRadius: '12px',
    fontSize: '0.70rem',
    fontWeight: 600,
    color: 'var(--primary)',
    border: '1px solid var(--border)',
  },
  idCard: {
    border: '1px dashed var(--primary)',
    borderRadius: '6px',
    backgroundColor: 'var(--surface-alt)',
    padding: '6px 10px',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  idCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  idCardLabel: {
    fontSize: '0.70rem',
    fontWeight: 700,
    color: 'var(--text)',
  },
  badgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  idPillDark: {
    backgroundColor: 'var(--primary)',
    color: '#FFFFFF',
    fontSize: '0.72rem',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: '4px',
  },
  idPillLight: {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    fontSize: '0.72rem',
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: '4px',
  },
  seqBadge: {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
    fontSize: '0.70rem',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  largeIdDisplay: {
    fontSize: '1.2rem',
    fontWeight: 800,
    color: 'var(--primary)',
    lineHeight: 1,
  },
  successBox: {
    backgroundColor: 'var(--primary-soft)',
    border: '1px solid var(--primary)',
    borderRadius: '6px',
    padding: '8px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  successText: {
    fontSize: '0.78rem',
    fontWeight: 600,
    color: 'var(--primary-dark)',
  },
  addMemberNowBtn: {
    marginLeft: '6px',
    backgroundColor: 'var(--primary)',
    color: '#FFFFFF',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '0.72rem',
    fontWeight: 600,
  },
  errorBox: {
    backgroundColor: 'var(--danger-soft)',
    border: '1px solid var(--danger)',
    borderRadius: '6px',
    padding: '8px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  errorText: {
    color: 'var(--danger)',
    fontSize: '0.78rem',
    fontWeight: 500,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    flex: 1,
    minHeight: 0,
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  label: {
    fontSize: '0.68rem',
    fontWeight: 700,
    color: 'var(--text)',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  requiredMark: {
    color: 'var(--danger)',
  },
  hintText: {
    fontSize: '0.66rem',
    color: 'var(--text-muted)',
    textTransform: 'none',
    fontWeight: 500,
  },
  input: {
    width: '100%',
    padding: '0 8px',
    height: '30px',
    fontSize: '12px',
    backgroundColor: 'var(--surface-alt)',
    border: '1px solid var(--border)',
    borderRadius: '5px',
    color: 'var(--text)',
  },
  select: {
    width: '100%',
    padding: '0 8px',
    height: '30px',
    fontSize: '12px',
    backgroundColor: 'var(--surface-alt)',
    border: '1px solid var(--border)',
    borderRadius: '5px',
    color: 'var(--text)',
    cursor: 'pointer',
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))',
    gap: '8px',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: '8px',
  },
  buttonRow: {
    display: 'flex',
    gap: '8px',
    marginTop: 'auto',
    paddingTop: '10px',
  },
  cancelBtn: {
    padding: '0 12px',
    height: '32px',
    backgroundColor: 'var(--surface-alt)',
    color: 'var(--text)',
    borderRadius: '5px',
    border: '1px solid var(--border)',
    fontSize: '0.82rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  submitBtn: {
    flex: 1,
    height: '32px',
    padding: '0 14px',
    color: '#FFFFFF',
    borderRadius: '5px',
    border: 'none',
    boxShadow: 'var(--shadow-sm)',
    transition: 'background 0.2s ease',
  },
  submitBtnInner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '0.82rem',
    fontWeight: 700,
  },
  enterBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: '1px 5px',
    borderRadius: '3px',
    fontSize: '0.68rem',
    fontWeight: 600,
  },
  directoryPane: {
    backgroundColor: 'var(--surface)',
    borderRadius: '8px',
    padding: '12px 14px',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    minWidth: '280px',
    height: '100%',
    minHeight: 0,
    boxSizing: 'border-box',
  },
  directoryTitle: {
    fontSize: '0.96rem',
    fontWeight: 700,
    color: 'var(--text)',
  },
  countPill: {
    backgroundColor: 'var(--primary-soft)',
    color: 'var(--primary-dark)',
    fontSize: '0.68rem',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: '8px',
  },
  directorySearchWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px',
  },
  searchIcon: {
    position: 'absolute',
    left: '8px',
    pointerEvents: 'none',
  },
  directorySearchInput: {
    width: '100%',
    padding: '0 8px 0 28px',
    height: '28px',
    fontSize: '12px',
    backgroundColor: 'var(--surface-alt)',
    border: '1px solid var(--border)',
    borderRadius: '5px',
    color: 'var(--text)',
  },
  directoryList: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    paddingRight: '2px',
  },
  emptyBox: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 16px',
    textAlign: 'center',
    gap: '8px',
  },
  emptyText: {
    fontSize: '1.05rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
  },
  emptySub: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    maxWidth: '260px',
    lineHeight: 1.4,
  },
  loadingBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 0',
    gap: '12px',
    color: 'var(--text-muted)',
    fontSize: '0.86rem',
  },
  spinner: {
    width: '28px',
    height: '28px',
    border: '3px solid var(--primary-soft)',
    borderTop: '3px solid var(--primary)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  familyCard: {
    borderRadius: '10px',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    transition: 'all 0.15s ease',
    boxShadow: '0 1px 3px rgba(20, 107, 92, 0.04)',
  },
  cardHeaderRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
  },
  cardHeaderLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    flex: 1,
  },
  cardHeadName: {
    fontSize: '14.5px',
    fontWeight: '800',
    color: '#1B2B29',
    textTransform: 'uppercase',
    letterSpacing: '0.2px',
    margin: 0,
  },
  cardSubtitleText: {
    fontSize: '12px',
    color: '#5E7572',
    fontWeight: '500',
    marginTop: '2px',
  },
  cardMemberCountText: {
    fontSize: '11.5px',
    color: '#5E7572',
    fontWeight: '500',
  },
  cardHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexShrink: 0,
  },
  cardFamIdText: {
    fontSize: '14px',
    fontWeight: '800',
    color: '#146B5C',
    letterSpacing: '0.5px',
  },
  cardEditBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 9px',
    backgroundColor: '#EDF7F4',
    border: '1px solid #D1E5E0',
    borderRadius: '6px',
    fontSize: '11.5px',
    fontWeight: '600',
    color: '#1B2B29',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  cardDeleteBtn: {
    background: 'none',
    border: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    cursor: 'pointer',
    borderRadius: '4px',
  },
  // Inner Expanded Mint Container (Matches Image 2)
  expandedMembersBox: {
    marginTop: '10px',
    backgroundColor: '#F0FDF8',
    border: '1px solid #A7F3D0',
    borderRadius: '8px',
    padding: '10px 12px',
  },
  expandedBoxHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
    flexWrap: 'wrap',
    gap: '6px',
  },
  expandedBoxTitleLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  expandedBoxTitle: {
    fontSize: '11.5px',
    fontWeight: '800',
    color: '#146B5C',
    letterSpacing: '0.4px',
    textTransform: 'uppercase',
  },
  expandedBoxHint: {
    fontSize: '11px',
    color: '#5E7572',
    fontWeight: '500',
  },
  expandedMembersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    maxHeight: '260px',
    overflowY: 'auto',
  },
  memberCardItem: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #DCEAE7',
    borderRadius: '6px',
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
  },
  memberInfoLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
  },
  memberNameLine: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    flexWrap: 'wrap',
  },
  memberBoldName: {
    fontSize: '13px',
    fontWeight: '800',
    color: '#1B2B29',
    textTransform: 'uppercase',
  },
  memberRelationTag: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#5E7572',
  },
  memberAllergyLine: {
    fontSize: '11.5px',
    color: '#5E7572',
  },
  memberRedirectBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px 12px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #146B5C',
    borderRadius: '6px',
    color: '#146B5C',
    fontWeight: '700',
    fontSize: '12.5px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
};
