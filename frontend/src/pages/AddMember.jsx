import React, { useState, useEffect } from 'react';
import { familyAPI, patientAPI } from '../services/api';
import { MasterDataInput } from '../components/common/MasterDataInput';
import { useDebounce } from '../hooks/useDebounce';
import {
  UserPlus,
  Users,
  Search,
  CheckCircle,
  AlertCircle,
  Phone,
  MapPin,
  ArrowRight,
  X,
  RotateCcw,
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

const COMMON_RELATIONS = [
  'Spouse',
  'Wife',
  'Husband',
  'Son',
  'Daughter',
  'Father',
  'Mother',
  'Brother',
  'Sister',
  'Other',
];

export const AddMember = ({ initialFamilyId, onProceedToCaseEntry, onNavigateToFamilyHead }) => {
  const [families, setFamilies] = useState([]);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [familySearch, setFamilySearch] = useState('');
  const debouncedFamilySearch = useDebounce(familySearch, 250);
  const [loadingFamilies, setLoadingFamilies] = useState(false);

  // Member Form State
  const [formData, setFormData] = useState({
    name: '',
    relation: '',
    age: '',
    bloodGroup: '',
    allergy: '',
    society: '',
    area: '',
    phone: '',
  });

  const [relationSuggestions, setRelationSuggestions] = useState(COMMON_RELATIONS);
  const [showRelationDropdown, setShowRelationDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch all families or search matches
  const loadFamilies = async (search = '') => {
    try {
      setLoadingFamilies(true);
      const res = await familyAPI.getAll(search);
      if (res.success) {
        const list = res.data || [];
        setFamilies(list);

        // Pre-select only if explicitly passed via initialFamilyId
        if (initialFamilyId && !selectedFamily) {
          const match = list.find((f) => f.familyId === initialFamilyId);
          if (match) selectFamily(match);
        }
      }
    } catch (err) {
      console.error('Error loading families:', err);
    } finally {
      setLoadingFamilies(false);
    }
  };

  useEffect(() => {
    loadFamilies(debouncedFamilySearch);
  }, [debouncedFamilySearch]);

  // When a family head is selected, pre-fill common reusable fields (Society, Area, Phone)
  const selectFamily = (fam) => {
    setSelectedFamily(fam);
    setFamilySearch('');
    setErrorMessage('');
    setSuccessMessage('');

    setFormData((prev) => ({
      ...prev,
      society: fam.society || '',
      area: fam.area || '',
      phone: fam.phone || '',
    }));
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleRelationChange = (val) => {
    handleInputChange('relation', val);
    if (val.trim()) {
      const filtered = COMMON_RELATIONS.filter((r) =>
        r.toLowerCase().includes(val.toLowerCase())
      );
      setRelationSuggestions(filtered.length > 0 ? filtered : COMMON_RELATIONS);
    } else {
      setRelationSuggestions(COMMON_RELATIONS);
    }
    setShowRelationDropdown(true);
  };

  const handleRelationSelect = (rel) => {
    handleInputChange('relation', rel);
    setShowRelationDropdown(false);
  };

  const handleResetForm = () => {
    setFormData({
      name: '',
      relation: '',
      age: '',
      bloodGroup: '',
      allergy: '',
      society: selectedFamily?.society || '',
      area: selectedFamily?.area || '',
      phone: selectedFamily?.phone || '',
    });
    setErrorMessage('');
  };

  // Submit and redirect to patient record for case entry
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!selectedFamily) {
      setErrorMessage('Please search and select a Family Head first.');
      return;
    }

    if (!formData.name.trim()) {
      setErrorMessage('Please enter Member Full Name.');
      return;
    }

    if (!formData.relation.trim()) {
      setErrorMessage('Please specify Relation to Family Head.');
      return;
    }

    try {
      setIsSubmitting(true);
      const allergiesList = formData.allergy
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);

      const payload = {
        familyId: selectedFamily.familyId,
        name: formData.name.trim(),
        relation: formData.relation.trim(),
        age: formData.age.trim(),
        bloodGroup: formData.bloodGroup === '-- Select --' ? '' : formData.bloodGroup,
        allergies: allergiesList,
        society: formData.society.trim(),
        area: formData.area.trim(),
        phone: formData.phone.trim(),
      };

      const res = await patientAPI.addMember(payload);

      if (res.success && res.patient) {
        setSuccessMessage(
          `Member "${res.patient.name}" (${res.patient.patientId}) registered successfully! Redirecting to Case Entry...`
        );

        // Immediate redirect to Patient Record (F3) with this newly registered member
        setTimeout(() => {
          if (onProceedToCaseEntry) {
            onProceedToCaseEntry(res.patient, res.family);
          }
        }, 500);
      }
    } catch (err) {
      const msg =
        err.response?.data?.message || err.message || 'Failed to add family member';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit(e);
    }
  };

  return (
    <div style={styles.container} onKeyDown={handleKeyDown}>
      {/* Top Header Row Matching Uploaded Image */}
      <div style={styles.pageHeaderRow}>
        <h2 style={styles.pageTitle}>Add Family Member</h2>
        <div style={styles.registrationBadgePill}>
          <UserPlus size={14} color="var(--primary)" />
          <span>Member Registration</span>
        </div>
      </div>

      {/* Top Search Card: SEARCH FAMILY HEAD * */}
      <div style={styles.searchCard}>
        <div style={styles.searchLabelWrap}>
          <Search size={14} color="var(--text)" />
          <span style={styles.searchLabel}>SEARCH FAMILY HEAD *</span>
        </div>

        <div style={styles.searchInputWrapper}>
          <Search size={15} color="var(--text-muted)" style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Type family head name, FAM ID, society, or area..."
            value={familySearch}
            onChange={(e) => setFamilySearch(e.target.value)}
            style={styles.searchInput}
          />
          {familySearch && (
            <button
              type="button"
              onClick={() => setFamilySearch('')}
              style={styles.clearBtn}
            >
              <X size={14} color="var(--text-muted)" />
            </button>
          )}
        </div>

        {/* RECENT / MATCHING FAMILIES (CLICK TO SELECT) - Hidden when family is selected, visible when searching */}
        {(!selectedFamily || familySearch.trim() !== '') && (
          <div style={styles.recentSection}>
            <span style={styles.recentLabel}>
              {familySearch.trim()
                ? 'MATCHING FAMILIES (CLICK TO SELECT):'
                : 'RECENT FAMILIES (CLICK TO SELECT):'}
            </span>

            {loadingFamilies ? (
              <div style={styles.loadingText}>Searching families...</div>
            ) : families.length === 0 ? (
              <div style={styles.noFamiliesFound}>
                <span>No matching family heads found.</span>
                {onNavigateToFamilyHead && (
                  <button
                    type="button"
                    onClick={onNavigateToFamilyHead}
                    style={styles.registerNewHeadBtn}
                  >
                    + Register Family Head (F1)
                  </button>
                )}
              </div>
            ) : (
              <div style={styles.familyCardsList}>
                {families.slice(0, 4).map((fam) => {
                  const isSelected = selectedFamily?.familyId === fam.familyId;
                  return (
                    <div
                      key={fam._id || fam.familyId}
                      onClick={() => selectFamily(fam)}
                      style={{
                        ...styles.familyCardItem,
                        borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                        backgroundColor: isSelected ? 'var(--primary-soft)' : '#FFFFFF',
                      }}
                    >
                      <div style={styles.familyCardLeft}>
                        <h4 style={styles.familyCardHeadName}>{fam.headName}</h4>
                        <div style={styles.familyCardMetaRow}>
                          <span>&bull; {fam.membersCount || 1} Member(s)</span>
                          {fam.phone && (
                            <>
                              <span>&bull;</span>
                              <span style={styles.phoneMeta}>📞 {fam.phone}</span>
                            </>
                          )}
                          {(fam.area || fam.society) && (
                            <>
                              <span>&bull;</span>
                              <span>{[fam.society, fam.area].filter(Boolean).join(', ')}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div style={styles.familyCardRight}>
                        <div style={styles.famIdPillBtn}>
                          <span>FAM {fam.familyId} &rarr;</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CONDITIONAL BOTTOM VIEW:
          1. If NO Family Head selected -> Show Mint/Teal Empty Prompt Card matching uploaded image
          2. If Family Head IS selected -> Show Member Registration Form matching reference image
      */}
      {!selectedFamily ? (
        <div style={styles.emptyPromptCard}>
          <div style={styles.emptySearchCircle}>
            <Search size={26} color="var(--primary)" />
          </div>
          <h3 style={styles.emptyPromptTitle}>
            Search and select a Family Head above
          </h3>
          <p style={styles.emptyPromptSub}>
            Once a family head is selected, the member details form will appear.
          </p>
        </div>
      ) : (
        <div style={styles.formCard}>
          {/* Active Family Head Banner */}
          <div style={styles.activeHeadBanner}>
            <div style={styles.activeHeadLeft}>
              <span style={styles.selectedFamBadge}>FAM-{selectedFamily.familyId}</span>
              <div>
                <span style={styles.selectedHeadLabel}>Selected Family Head:</span>
                <strong style={styles.selectedHeadName}>{selectedFamily.headName}</strong>
                <span style={styles.selectedHeadLocation}>
                  {[selectedFamily.society, selectedFamily.area].filter(Boolean).join(', ')}
                  {selectedFamily.phone ? ` &bull; 📞 ${selectedFamily.phone}` : ''}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedFamily(null)}
              style={styles.changeHeadBtn}
              title="Select a different family head"
            >
              <RotateCcw size={13} />
              <span>Change Head</span>
            </button>
          </div>

          {/* Success / Error Messages */}
          {successMessage && (
            <div style={styles.successBox}>
              <CheckCircle size={16} color="var(--primary)" />
              <span style={styles.successText}>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div style={styles.errorBox}>
              <AlertCircle size={16} color="var(--danger)" />
              <span style={styles.errorText}>{errorMessage}</span>
            </div>
          )}

          {/* Registration Form (Matching Reference Image media_1793636589247_117aec1f.png) */}
          <form onSubmit={handleSubmit} style={styles.form}>
            {/* ROW 1: MEMBER FULL NAME * & RELATION TO HEAD (ENTER TO MATCH) * */}
            <div style={styles.grid2}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  MEMBER FULL NAME <span style={styles.requiredMark}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PATEL ANITA MUKESHBHAI"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  style={styles.inputHighlight}
                  autoFocus
                />
              </div>

              {/* RELATION TO HEAD */}
              <div style={{ ...styles.inputGroup, position: 'relative' }}>
                <label style={styles.label}>
                  RELATION TO HEAD <span style={styles.hintSub}>(ENTER TO MATCH)</span>{' '}
                  <span style={styles.requiredMark}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Head, Spouse, Son, Daughter..."
                  value={formData.relation}
                  onChange={(e) => handleRelationChange(e.target.value)}
                  onFocus={() => setShowRelationDropdown(true)}
                  style={styles.input}
                />

                {/* Quick Select Relation Dropdown */}
                {showRelationDropdown && (
                  <div style={styles.relationDropdown}>
                    <div style={styles.relationDropdownHeader}>
                      Quick Select Relation:
                    </div>
                    <div style={styles.relationChips}>
                      {relationSuggestions.map((rel) => (
                        <button
                          key={rel}
                          type="button"
                          onClick={() => handleRelationSelect(rel)}
                          style={{
                            ...styles.relationChip,
                            backgroundColor:
                              formData.relation.toLowerCase() === rel.toLowerCase()
                                ? 'var(--primary)'
                                : 'var(--surface-alt)',
                            color:
                              formData.relation.toLowerCase() === rel.toLowerCase()
                                ? '#FFFFFF'
                                : 'var(--text)',
                          }}
                        >
                          {rel}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ROW 2: AGE, BLOOD GROUP, KNOWN ALLERGIES */}
            <div style={styles.grid3}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>AGE</label>
                <input
                  type="text"
                  placeholder="e.g. 35, 6M"
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
                  KNOWN ALLERGIES <span style={styles.hintSub}>(SHORTCUT + ENTER)</span>
                </label>
                <MasterDataInput
                  type="allergy"
                  allowMultiple={true}
                  placeholder="e.g. PEN -> Penicillin,"
                  value={formData.allergy}
                  onChange={(val) => handleInputChange('allergy', val)}
                  inputStyle={styles.input}
                />
              </div>
            </div>

            {/* ROW 3: SOCIETY / FLAT & AREA / LOCATION (AUTO-FILLED, EDITABLE) */}
            <div style={styles.grid2}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  SOCIETY / FLAT <span style={styles.autoFilledTag}>(AUTO-FILLED, EDITABLE)</span>
                </label>
                <MasterDataInput
                  type="society"
                  placeholder="e.g. Shanti Niketan"
                  value={formData.society}
                  onChange={(val) => handleInputChange('society', val)}
                  inputStyle={styles.input}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  AREA / LOCATION <span style={styles.hintSub}>(ENTER TO MATCH)</span>{' '}
                  <span style={styles.autoFilledTag}>(AUTO-FILLED, EDITABLE)</span>
                </label>
                <MasterDataInput
                  type="area"
                  placeholder="e.g. Vastrapur"
                  value={formData.area}
                  onChange={(val) => handleInputChange('area', val)}
                  inputStyle={styles.input}
                />
              </div>
            </div>

            {/* ROW 4: CONTACT PHONE (OPTIONAL) */}
            <div style={styles.grid1}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  CONTACT PHONE <span style={styles.optionalTag}>(OPTIONAL)</span>
                </label>
                <input
                  type="tel"
                  placeholder="Mobile number"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  style={{ ...styles.input, maxWidth: '320px' }}
                />
              </div>
            </div>

            {/* ROW 5: ACTION BUTTONS (MATCHING IMAGE) */}
            <div style={styles.buttonRow}>
              <button
                type="button"
                onClick={handleResetForm}
                style={styles.cancelBtn}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  ...styles.submitBtn,
                  opacity: isSubmitting ? 0.75 : 1,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                <UserPlus size={16} strokeWidth={2.4} />
                <span style={styles.submitBtnText}>
                  {isSubmitting
                    ? 'Registering & Redirecting...'
                    : 'Update Patient & Return to Case Entry'}
                </span>
                <span style={styles.enterBadge}>Enter</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// --- HIGH DENSITY STYLES (MATCHING UPLOADED IMAGE) ---
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: '100%',
    height: '100%',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },

  pageHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '2px 0',
  },
  pageTitle: {
    fontSize: '1.15rem',
    fontWeight: 800,
    color: 'var(--text)',
    letterSpacing: '-0.01em',
    margin: 0,
  },
  registrationBadgePill: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#DCEFEA',
    color: '#0E4F44',
    padding: '4px 10px',
    borderRadius: '16px',
    fontSize: '0.76rem',
    fontWeight: 700,
  },

  // Search Family Head Card
  searchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '10px',
    padding: '14px 18px',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  searchLabelWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  searchLabel: {
    fontSize: '0.74rem',
    fontWeight: 800,
    letterSpacing: '0.5px',
    color: 'var(--text)',
    textTransform: 'uppercase',
  },
  searchInputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    height: '38px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid var(--primary)',
    borderRadius: '8px',
    padding: '0 32px 0 36px',
    fontSize: '13px',
    color: 'var(--text)',
    boxShadow: '0 0 0 2px var(--primary-soft)',
  },
  clearBtn: {
    position: 'absolute',
    right: '10px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px',
  },

  // Recent Families Section
  recentSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  recentLabel: {
    fontSize: '0.72rem',
    fontWeight: 800,
    letterSpacing: '0.5px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
  loadingText: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    padding: '8px',
  },
  noFamiliesFound: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    backgroundColor: 'var(--surface-alt)',
    borderRadius: '6px',
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  registerNewHeadBtn: {
    backgroundColor: 'var(--primary)',
    color: '#FFFFFF',
    padding: '4px 10px',
    borderRadius: '5px',
    fontSize: '11px',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
  },
  familyCardsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  familyCardItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 14px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  familyCardLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  familyCardHeadName: {
    fontSize: '13px',
    fontWeight: 800,
    color: 'var(--text)',
    margin: 0,
  },
  familyCardMetaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  phoneMeta: {
    color: '#D98E3F',
    fontWeight: 600,
  },
  familyCardRight: {
    display: 'flex',
    alignItems: 'center',
  },
  famIdPillBtn: {
    backgroundColor: '#EEF6F4',
    border: '1px solid #C4E8DF',
    color: '#0E4F44',
    padding: '3px 10px',
    borderRadius: '14px',
    fontSize: '11px',
    fontWeight: 700,
  },

  // Mint / Teal Empty Prompt Card (Matching Uploaded Image)
  emptyPromptCard: {
    backgroundColor: '#EEF8F5',
    border: '1px solid #D2EBE4',
    borderRadius: '10px',
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    gap: '8px',
    flex: 1,
    minHeight: 0,
  },
  emptySearchCircle: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    backgroundColor: '#FFFFFF',
    border: '1px solid #D2EBE4',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(20, 107, 92, 0.08)',
    marginBottom: '2px',
  },
  emptyPromptTitle: {
    fontSize: '14px',
    fontWeight: 800,
    color: 'var(--text)',
    margin: 0,
  },
  emptyPromptSub: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    margin: 0,
  },

  // Form Card
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '10px',
    padding: '14px 18px',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
  },
  activeHeadBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'var(--surface-alt)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '8px 12px',
    flexWrap: 'wrap',
    gap: '8px',
  },
  activeHeadLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  selectedFamBadge: {
    fontSize: '11px',
    fontWeight: 800,
    backgroundColor: 'var(--primary)',
    color: '#FFFFFF',
    padding: '3px 8px',
    borderRadius: '4px',
  },
  selectedHeadLabel: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginRight: '6px',
  },
  selectedHeadName: {
    fontSize: '13px',
    color: 'var(--text)',
    marginRight: '8px',
  },
  selectedHeadLocation: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  changeHeadBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },

  successBox: {
    backgroundColor: 'var(--primary-soft)',
    border: '1px solid var(--primary)',
    borderRadius: '6px',
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--primary-dark)',
  },
  errorBox: {
    backgroundColor: 'var(--danger-soft)',
    border: '1px solid var(--danger)',
    borderRadius: '6px',
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--danger)',
  },

  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    flex: 1,
    minHeight: 0,
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1.6fr',
    gap: '10px',
  },
  grid1: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '10px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  label: {
    fontSize: '0.70rem',
    fontWeight: 700,
    color: 'var(--text)',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  requiredMark: {
    color: 'var(--danger)',
  },
  hintSub: {
    fontSize: '0.66rem',
    color: 'var(--text-muted)',
    textTransform: 'none',
    fontWeight: 500,
  },
  autoFilledTag: {
    fontSize: '0.66rem',
    color: 'var(--primary)',
    textTransform: 'uppercase',
    fontWeight: 600,
    letterSpacing: '0.02em',
  },
  optionalTag: {
    fontSize: '0.66rem',
    color: 'var(--text-muted)',
    textTransform: 'none',
    fontWeight: 400,
  },
  input: {
    width: '100%',
    height: '32px',
    padding: '0 10px',
    fontSize: '12px',
    backgroundColor: 'var(--surface-alt)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    color: 'var(--text)',
  },
  inputHighlight: {
    width: '100%',
    height: '32px',
    padding: '0 10px',
    fontSize: '12px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid var(--primary)',
    borderRadius: '6px',
    color: 'var(--text)',
    boxShadow: '0 0 0 2px var(--primary-soft)',
  },
  select: {
    width: '100%',
    height: '32px',
    padding: '0 10px',
    fontSize: '12px',
    backgroundColor: 'var(--surface-alt)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    color: 'var(--text)',
  },

  relationDropdown: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    boxShadow: 'var(--shadow-md)',
    zIndex: 100,
    padding: '6px',
  },
  relationDropdownHeader: {
    fontSize: '10px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    marginBottom: '4px',
    textTransform: 'uppercase',
  },
  relationChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
  },
  relationChip: {
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
  },

  buttonRow: {
    display: 'flex',
    gap: '10px',
    marginTop: 'auto',
    paddingTop: '8px',
  },
  cancelBtn: {
    padding: '0 16px',
    height: '36px',
    backgroundColor: '#FFFFFF',
    color: 'var(--text)',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  submitBtn: {
    flex: 1,
    height: '36px',
    padding: '0 16px',
    backgroundColor: 'var(--primary)',
    color: '#FFFFFF',
    borderRadius: '6px',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow: 'var(--shadow-sm)',
    cursor: 'pointer',
  },
  submitBtnText: {
    fontSize: '13px',
    fontWeight: 700,
  },
  enterBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: '2px 6px',
    borderRadius: '3px',
    fontSize: '10px',
    fontWeight: 600,
  },
};
