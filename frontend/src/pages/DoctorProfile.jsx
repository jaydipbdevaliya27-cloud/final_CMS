import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Building,
  Lock,
  ShieldCheck,
  KeyRound,
  CheckCircle,
  AlertCircle,
  Save,
  Phone,
  Mail,
  MapPin,
  Award,
  HelpCircle,
  Eye,
  EyeOff,
  Stethoscope,
  Info,
} from 'lucide-react';

export const DoctorProfile = () => {
  const { doctor, updateProfile, changeCredentials } = useAuth();

  // Clinic and Doctor Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: '',
    clinicName: '',
    clinicTagline: '',
    specialization: '',
    degree: '',
    regNo: '',
    phone: '',
    email: '',
    address: '',
    medicalStore: '',
  });

  // Credentials State (Requires Current Password Authentication)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Recovery Question State
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [showSecurityAnswer, setShowSecurityAnswer] = useState(false);

  // Status & Feedback States
  const [profileSaving, setProfileSaving] = useState(false);
  const [credentialsSaving, setCredentialsSaving] = useState(false);
  const [recoverySaving, setRecoverySaving] = useState(false);

  const [profileToast, setProfileToast] = useState({ text: '', type: 'success' });
  const [credToast, setCredToast] = useState({ text: '', type: 'success' });
  const [recoveryToast, setRecoveryToast] = useState({ text: '', type: 'success' });

  // Sync state from doctor object in AuthContext
  useEffect(() => {
    if (doctor) {
      setProfileForm({
        name: doctor.name || 'Dr. Chirag Paghdal',
        clinicName: doctor.clinicName || 'Dhyey Clinic & Nursing Home',
        clinicTagline: doctor.clinicTagline || 'Single Doctor Medical Suite',
        specialization: doctor.specialization || 'FAMILY PHYSICIAN (B.H.M.S.)',
        degree: doctor.degree || 'B.H.M.S.',
        regNo: doctor.regNo || 'G-9035',
        phone: doctor.phone || '98793 80508',
        email: doctor.email || '',
        address: doctor.address || 'Shop No. 1, Mahavir Heights, New Kosad Road, Amroli, Surat.',
        medicalStore: doctor.medicalStore || 'Harsh Medical & General Stores',
      });
      setNewUsername(doctor.username || 'dhyey');
      setSecurityQuestion(
        doctor.securityQuestion || 'What is your Medical Council / Clinic Registration No?'
      );
    }
  }, [doctor]);

  const showNotification = (setter, text, type = 'success') => {
    setter({ text, type });
    setTimeout(() => setter({ text: '', type: 'success' }), 5000);
  };

  // Handle Practice & Clinic Details Update
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setProfileSaving(true);
      await updateProfile(profileForm);
      showNotification(setProfileToast, 'Clinic details and doctor profile updated successfully!', 'success');
    } catch (err) {
      showNotification(
        setProfileToast,
        err.response?.data?.message || err.message || 'Failed to update profile',
        'error'
      );
    } finally {
      setProfileSaving(false);
    }
  };

  // Handle Credentials Change (Requires Current Password)
  const handleChangeCredentials = async (e) => {
    e.preventDefault();

    if (!currentPassword) {
      showNotification(
        setCredToast,
        'Please enter your current password to verify your identity.',
        'error'
      );
      return;
    }

    if (!newUsername.trim()) {
      showNotification(setCredToast, 'Username cannot be blank.', 'error');
      return;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        showNotification(setCredToast, 'New password must be at least 6 characters long.', 'error');
        return;
      }
      if (newPassword !== confirmPassword) {
        showNotification(setCredToast, 'New password and confirmation do not match.', 'error');
        return;
      }
    }

    try {
      setCredentialsSaving(true);
      await changeCredentials({
        currentPassword,
        newUsername: newUsername.trim(),
        newPassword: newPassword.trim() || undefined,
      });

      // Clear password fields upon success
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showNotification(
        setCredToast,
        'Authentication verified! Your login credentials have been safely updated.',
        'success'
      );
    } catch (err) {
      showNotification(
        setCredToast,
        err.response?.data?.message || err.message || 'Current password authentication failed.',
        'error'
      );
    } finally {
      setCredentialsSaving(false);
    }
  };

  // Handle Security Question & Answer Update
  const handleSaveRecovery = async (e) => {
    e.preventDefault();
    if (!securityAnswer.trim()) {
      showNotification(setRecoveryToast, 'Please provide an answer for the security question.', 'error');
      return;
    }

    try {
      setRecoverySaving(true);
      await updateProfile({
        securityQuestion: securityQuestion.trim(),
        securityAnswer: securityAnswer.trim(),
      });
      setSecurityAnswer('');
      showNotification(setRecoveryToast, 'Password recovery question and answer updated successfully!', 'success');
    } catch (err) {
      showNotification(
        setRecoveryToast,
        err.response?.data?.message || err.message || 'Failed to save recovery question.',
        'error'
      );
    } finally {
      setRecoverySaving(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Top Banner / Identity Summary */}
      <div style={styles.heroBanner}>
        <div style={styles.heroLeft}>
          <div style={styles.avatarWrap}>
            <Stethoscope size={30} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={styles.heroName}>{doctor?.name || 'Dr. Chirag Paghdal'}</h2>
              <span style={styles.verifiedBadge}>
                <ShieldCheck size={12} />
                <span>Verified Physician</span>
              </span>
            </div>
            <p style={styles.heroSub}>
              {doctor?.clinicName || 'Dhyey Clinic & Nursing Home'} &bull;{' '}
              {doctor?.clinicTagline || 'Single Doctor Medical Suite'} &bull; User ID: <strong>{doctor?.username || 'dhyey'}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Grid: 3 Main Cards */}
      <div style={styles.cardsGrid}>
        {/* CARD 1: Clinic Identity & Practice Details */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.headerIconWrap}>
              <Building size={18} color="var(--primary)" />
            </div>
            <div>
              <h3 style={styles.cardTitle}>Clinic & Practice Identity</h3>
              <p style={styles.cardSub}>Controls Clinic Name, Header Tagline, and Letterhead print details</p>
            </div>
          </div>

          {profileToast.text && (
            <div
              style={{
                ...styles.toastNotice,
                backgroundColor: profileToast.type === 'error' ? '#FEF2F2' : '#ECFDF5',
                borderColor: profileToast.type === 'error' ? '#FECACA' : '#A7F3D0',
                color: profileToast.type === 'error' ? '#991B1B' : '#065F46',
              }}
            >
              {profileToast.type === 'error' ? (
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
              ) : (
                <CheckCircle size={16} style={{ flexShrink: 0 }} />
              )}
              <span>{profileToast.text}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} style={styles.cardBody}>
            <div style={styles.formRow2}>
              <div style={styles.fieldCol}>
                <label style={styles.label}>Clinic Name *</label>
                <input
                  type="text"
                  required
                  value={profileForm.clinicName}
                  onChange={(e) => setProfileForm({ ...profileForm, clinicName: e.target.value })}
                  style={styles.input}
                  placeholder="e.g. Dhyey Clinic & Nursing Home"
                />
              </div>

              <div style={styles.fieldCol}>
                <label style={styles.label}>Dashboard Tagline / Description</label>
                <input
                  type="text"
                  value={profileForm.clinicTagline}
                  onChange={(e) => setProfileForm({ ...profileForm, clinicTagline: e.target.value })}
                  style={styles.input}
                  placeholder="e.g. Single Doctor Medical Suite"
                />
              </div>
            </div>

            <div style={styles.formRow2}>
              <div style={styles.fieldCol}>
                <label style={styles.label}>Doctor Full Name *</label>
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  style={styles.input}
                  placeholder="e.g. Dr. Chirag Paghdal"
                />
              </div>

              <div style={styles.fieldCol}>
                <label style={styles.label}>Qualifications & Degree</label>
                <input
                  type="text"
                  value={profileForm.degree}
                  onChange={(e) => setProfileForm({ ...profileForm, degree: e.target.value })}
                  style={styles.input}
                  placeholder="e.g. B.H.M.S."
                />
              </div>
            </div>

            <div style={styles.formRow2}>
              <div style={styles.fieldCol}>
                <label style={styles.label}>Specialization</label>
                <input
                  type="text"
                  value={profileForm.specialization}
                  onChange={(e) => setProfileForm({ ...profileForm, specialization: e.target.value })}
                  style={styles.input}
                  placeholder="e.g. FAMILY PHYSICIAN (B.H.M.S.)"
                />
              </div>

              <div style={styles.fieldCol}>
                <label style={styles.label}>Medical Council Reg. No.</label>
                <input
                  type="text"
                  value={profileForm.regNo}
                  onChange={(e) => setProfileForm({ ...profileForm, regNo: e.target.value })}
                  style={styles.input}
                  placeholder="e.g. G-9035"
                />
              </div>
            </div>

            <div style={styles.formRow2}>
              <div style={styles.fieldCol}>
                <label style={styles.label}>Clinic Phone / Mobile</label>
                <input
                  type="text"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  style={styles.input}
                  placeholder="e.g. 98793 80508"
                />
              </div>

              <div style={styles.fieldCol}>
                <label style={styles.label}>Official Email (Optional)</label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  style={styles.input}
                  placeholder="doctor@clinic.com"
                />
              </div>
            </div>

            <div style={styles.fieldCol}>
              <label style={styles.label}>Clinic Full Address (Prints on Prescription Header)</label>
              <textarea
                rows={2}
                value={profileForm.address}
                onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                style={styles.textarea}
                placeholder="Shop No. 1, Mahavir Heights, New Kosad Road, Amroli, Surat."
              />
            </div>

            <div style={styles.fieldCol}>
              <label style={styles.label}>Associated Medical Store (Prescription Footer)</label>
              <input
                type="text"
                value={profileForm.medicalStore}
                onChange={(e) => setProfileForm({ ...profileForm, medicalStore: e.target.value })}
                style={styles.input}
                placeholder="e.g. Harsh Medical & General Stores"
              />
            </div>

            <button type="submit" disabled={profileSaving} style={styles.primaryBtn}>
              <Save size={15} />
              <span>{profileSaving ? 'Saving...' : 'Save Practice & Clinic Details'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: CARD 2 (Change Credentials) & CARD 3 (Recovery Setup) */}
        <div style={styles.sideStack}>
          {/* CARD 2: Security & Credentials Management */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={styles.headerIconWrap}>
                <KeyRound size={18} color="var(--primary)" />
              </div>
              <div>
                <h3 style={styles.cardTitle}>Login Credentials (ID & Password)</h3>
                <p style={styles.cardSub}>Requires authentication with your current password</p>
              </div>
            </div>

            <div style={styles.authNoticeBox}>
              <Lock size={15} color="#D97706" style={{ flexShrink: 0 }} />
              <span>
                To change your Login ID or Password, you must first provide your <strong>Current Password</strong> for verification.
              </span>
            </div>

            {credToast.text && (
              <div
                style={{
                  ...styles.toastNotice,
                  backgroundColor: credToast.type === 'error' ? '#FEF2F2' : '#ECFDF5',
                  borderColor: credToast.type === 'error' ? '#FECACA' : '#A7F3D0',
                  color: credToast.type === 'error' ? '#991B1B' : '#065F46',
                }}
              >
                {credToast.type === 'error' ? (
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                ) : (
                  <CheckCircle size={16} style={{ flexShrink: 0 }} />
                )}
                <span>{credToast.text}</span>
              </div>
            )}

            <form onSubmit={handleChangeCredentials} style={styles.cardBody}>
              {/* CURRENT PASSWORD (STRICT REQUIREMENT) */}
              <div style={{ ...styles.fieldCol, padding: '10px 12px', backgroundColor: '#FEF3C7', borderRadius: '8px', border: '1px solid #FCD34D' }}>
                <label style={{ ...styles.label, color: '#92400E' }}>
                  Current Password * (Authentication Required)
                </label>
                <div style={styles.inputContainer}>
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    required
                    placeholder="Enter current password to authorize"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    style={{ ...styles.input, backgroundColor: '#FFFFFF' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    style={styles.eyeBtn}
                  >
                    {showCurrentPass ? <EyeOff size={16} color="var(--text-muted)" /> : <Eye size={16} color="var(--text-muted)" />}
                  </button>
                </div>
              </div>

              {/* NEW USERNAME */}
              <div style={styles.fieldCol}>
                <label style={styles.label}>Doctor Username / Login ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. dhyey"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  style={styles.input}
                />
                <span style={styles.inputHint}>Used to sign in to the Doctor Portal</span>
              </div>

              {/* NEW PASSWORD */}
              <div style={styles.formRow2}>
                <div style={styles.fieldCol}>
                  <label style={styles.label}>New Password (Optional)</label>
                  <div style={styles.inputContainer}>
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      placeholder="Leave blank to keep same"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={styles.input}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      style={styles.eyeBtn}
                    >
                      {showNewPass ? <EyeOff size={16} color="var(--text-muted)" /> : <Eye size={16} color="var(--text-muted)" />}
                    </button>
                  </div>
                </div>

                <div style={styles.fieldCol}>
                  <label style={styles.label}>Confirm New Password</label>
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={styles.input}
                    disabled={!newPassword}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={credentialsSaving || !currentPassword}
                style={{
                  ...styles.primaryBtn,
                  opacity: !currentPassword ? 0.6 : 1,
                  cursor: !currentPassword ? 'not-allowed' : 'pointer',
                }}
              >
                <ShieldCheck size={15} />
                <span>{credentialsSaving ? 'Authenticating...' : 'Authenticate & Update Credentials'}</span>
              </button>
            </form>
          </div>

          {/* CARD 3: Forgot Password Security Question Setup */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={styles.headerIconWrap}>
                <HelpCircle size={18} color="var(--primary)" />
              </div>
              <div>
                <h3 style={styles.cardTitle}>Forgot Password Recovery Setup</h3>
                <p style={styles.cardSub}>Used to reset your password if you ever forget it at login</p>
              </div>
            </div>

            {recoveryToast.text && (
              <div
                style={{
                  ...styles.toastNotice,
                  backgroundColor: recoveryToast.type === 'error' ? '#FEF2F2' : '#ECFDF5',
                  borderColor: recoveryToast.type === 'error' ? '#FECACA' : '#A7F3D0',
                  color: recoveryToast.type === 'error' ? '#991B1B' : '#065F46',
                }}
              >
                {recoveryToast.type === 'error' ? (
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                ) : (
                  <CheckCircle size={16} style={{ flexShrink: 0 }} />
                )}
                <span>{recoveryToast.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveRecovery} style={styles.cardBody}>
              <div style={styles.fieldCol}>
                <label style={styles.label}>Secret Security Question</label>
                <select
                  value={securityQuestion}
                  onChange={(e) => setSecurityQuestion(e.target.value)}
                  style={styles.select}
                >
                  <option value="What is your Medical Council / Clinic Registration No?">
                    What is your Medical Council / Clinic Registration No?
                  </option>
                  <option value="What city was your clinic established in?">
                    What city was your clinic established in?
                  </option>
                  <option value="What was the name of your first hospital or clinic?">
                    What was the name of your first hospital or clinic?
                  </option>
                  <option value="What was your primary medical college or university name?">
                    What was your primary medical college or university name?
                  </option>
                </select>
              </div>

              <div style={styles.fieldCol}>
                <label style={styles.label}>Secret Answer (Case-Insensitive)</label>
                <div style={styles.inputContainer}>
                  <input
                    type={showSecurityAnswer ? 'text' : 'password'}
                    required
                    placeholder="Enter answer (e.g. G-9035)"
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    style={styles.input}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecurityAnswer(!showSecurityAnswer)}
                    style={styles.eyeBtn}
                  >
                    {showSecurityAnswer ? <EyeOff size={16} color="var(--text-muted)" /> : <Eye size={16} color="var(--text-muted)" />}
                  </button>
                </div>
                <span style={styles.inputHint}>
                  Default answer is your registration number: <strong>{doctor?.regNo || 'G-9035'}</strong>
                </span>
              </div>

              <button type="submit" disabled={recoverySaving} style={styles.secondaryBtn}>
                <Save size={15} />
                <span>{recoverySaving ? 'Saving...' : 'Save Recovery Question'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px 24px',
    maxWidth: '1280px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  heroBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
    padding: '18px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '16px',
    background: 'linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 100%)',
  },
  heroLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  avatarWrap: {
    width: '54px',
    height: '54px',
    borderRadius: '12px',
    backgroundColor: 'var(--primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 6px -1px rgba(20, 107, 92, 0.25)',
  },
  heroName: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'var(--text)',
    margin: 0,
  },
  verifiedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    backgroundColor: '#ECFDF5',
    color: '#059669',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '700',
    border: '1px solid #A7F3D0',
  },
  heroSub: {
    fontSize: '12.5px',
    color: 'var(--text-muted)',
    marginTop: '3px',
    marginBottom: 0,
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(320px, 1.25fr) minmax(320px, 1fr)',
    gap: '20px',
    alignItems: 'start',
  },
  sideStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border)',
    backgroundColor: '#F8FAF9',
  },
  headerIconWrap: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: 'var(--primary-soft)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--text)',
    margin: 0,
  },
  cardSub: {
    fontSize: '11.5px',
    color: 'var(--text-muted)',
    margin: '2px 0 0 0',
  },
  authNoticeBox: {
    margin: '14px 18px 0 18px',
    padding: '10px 12px',
    backgroundColor: '#FFFBEB',
    border: '1px solid #FDE68A',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#B45309',
  },
  toastNotice: {
    margin: '14px 18px 0 18px',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12.5px',
    fontWeight: '500',
  },
  cardBody: {
    padding: '18px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  formRow2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  fieldCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text)',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--surface)',
    fontSize: '13px',
    color: 'var(--text)',
    outline: 'none',
  },
  select: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--surface)',
    fontSize: '13px',
    color: 'var(--text)',
    outline: 'none',
  },
  textarea: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--surface)',
    fontSize: '13px',
    color: 'var(--text)',
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  inputContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  eyeBtn: {
    position: 'absolute',
    right: '10px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
  },
  inputHint: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px 18px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'var(--primary)',
    color: '#FFFFFF',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '6px',
    boxShadow: 'var(--shadow-sm)',
    transition: 'background-color 0.2s',
  },
  secondaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px 18px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    backgroundColor: '#F8FAF9',
    color: 'var(--text)',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '6px',
  },
};

