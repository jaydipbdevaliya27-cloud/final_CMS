import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import {
  Stethoscope,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  HelpCircle,
  X,
  CheckCircle,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';

export const Login = () => {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  // Clean login state - No hardcoded credentials!
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Username, 2: Security Question, 3: New Password
  const [forgotUsername, setForgotUsername] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // If already logged in, redirect straight to dashboard
  if (!loading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      await login(username.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Invalid username or password.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Forgot Password Modal
  const handleOpenForgotModal = () => {
    setForgotUsername(username.trim() || '');
    setForgotStep(1);
    setSecurityQuestion('');
    setSecurityAnswer('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotError('');
    setShowForgotModal(true);
  };

  // Step 1: Submit Username & Fetch Security Question
  const handleForgotStep1 = async (e) => {
    e.preventDefault();
    setForgotError('');

    if (!forgotUsername.trim()) {
      setForgotError('Please enter your registered username / login ID.');
      return;
    }

    try {
      setForgotLoading(true);
      const res = await authAPI.getSecurityQuestion(forgotUsername.trim());
      if (res.success && res.securityQuestion) {
        setSecurityQuestion(res.securityQuestion);
        setForgotStep(2);
      } else {
        setForgotError('Could not retrieve security question for this user.');
      }
    } catch (err) {
      setForgotError(
        err.response?.data?.message ||
        'No doctor account found with this username. Please verify and try again.'
      );
    } finally {
      setForgotLoading(false);
    }
  };

  // Step 2: Verify Security Answer
  const handleForgotStep2 = async (e) => {
    e.preventDefault();
    setForgotError('');

    if (!securityAnswer.trim()) {
      setForgotError('Please enter your answer to the security question.');
      return;
    }

    try {
      setForgotLoading(true);
      const res = await authAPI.verifySecurityAnswer({
        username: forgotUsername.trim(),
        securityAnswer: securityAnswer.trim(),
      });
      if (res.success && res.resetToken) {
        setResetToken(res.resetToken);
        setForgotStep(3);
      } else {
        setForgotError('Verification failed. Please check your answer.');
      }
    } catch (err) {
      setForgotError(
        err.response?.data?.message || 'Incorrect security answer. Please try again.'
      );
    } finally {
      setForgotLoading(false);
    }
  };

  // Step 3: Set New Password
  const handleForgotStep3 = async (e) => {
    e.preventDefault();
    setForgotError('');

    if (!newPassword || newPassword.length < 6) {
      setForgotError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotError('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      setForgotLoading(true);
      const res = await authAPI.resetPassword({
        username: forgotUsername.trim(),
        resetToken,
        newPassword,
      });

      if (res.success) {
        setShowForgotModal(false);
        setUsername(forgotUsername.trim());
        setPassword('');
        setSuccessMsg('Password has been reset successfully! You can now log in with your new password.');
        setError('');
      }
    } catch (err) {
      setForgotError(
        err.response?.data?.message || 'Failed to reset password. Please try again.'
      );
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.ambientTop}></div>
      <div style={styles.ambientBottom}></div>

      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.iconWrapper}>
            <Stethoscope size={32} color="var(--primary)" />
          </div>
          <h1 style={styles.title}>Doctor Portal</h1>
          <p style={styles.subtitle}>Single Doctor Clinic Management System</p>
          <div style={styles.securityBadge}>
            <ShieldCheck size={13} color="var(--primary)" />
            <span>Encrypted Authentication & Session</span>
          </div>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div style={styles.successBox}>
            <CheckCircle size={18} color="#059669" style={{ flexShrink: 0 }} />
            <span style={styles.successText}>{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={18} color="var(--danger)" style={{ flexShrink: 0 }} />
            <span style={styles.errorText}>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Username / Login ID</label>
            <div style={styles.inputContainer}>
              <User size={18} color="var(--text-muted)" style={styles.inputIcon} />
              <input
                type="text"
                required
                placeholder="Enter doctor username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={styles.input}
                autoFocus
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <div style={styles.labelRow}>
              <label style={styles.label}>Password</label>
              <button
                type="button"
                onClick={handleOpenForgotModal}
                style={styles.forgotBtn}
              >
                Forgot Password?
              </button>
            </div>
            <div style={styles.inputContainer}>
              <Lock size={18} color="var(--text-muted)" style={styles.inputIcon} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff size={18} color="var(--text-muted)" />
                ) : (
                  <Eye size={18} color="var(--text-muted)" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              ...styles.submitBtn,
              opacity: isSubmitting ? 0.75 : 1,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to Clinic CMS</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>

      <div style={styles.footerNote}>
        Secure Doctor Session &bull; Hashed Credentials &bull; Single Doctor Medical Suite
      </div>

      {/* --- FORGOT PASSWORD MODAL --- */}
      {showForgotModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            {/* Modal Header */}
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={styles.modalIconWrap}>
                  <KeyRound size={20} color="var(--primary)" />
                </div>
                <div>
                  <h3 style={styles.modalTitle}>Password Recovery</h3>
                  <span style={styles.modalSubtitle}>
                    Step {forgotStep} of 3: {forgotStep === 1 ? 'Identify Account' : forgotStep === 2 ? 'Verify Security Question' : 'Set New Password'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                style={styles.modalCloseBtn}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Error */}
            {forgotError && (
              <div style={styles.modalErrorBox}>
                <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0 }} />
                <span>{forgotError}</span>
              </div>
            )}

            {/* STEP 1: Enter Username */}
            {forgotStep === 1 && (
              <form onSubmit={handleForgotStep1} style={styles.modalBody}>
                <p style={styles.modalInstructions}>
                  Enter your registered doctor username / login ID to retrieve your identity verification question.
                </p>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Doctor Username</label>
                  <div style={styles.inputContainer}>
                    <User size={18} color="var(--text-muted)" style={styles.inputIcon} />
                    <input
                      type="text"
                      required
                      placeholder="e.g. dhyey"
                      value={forgotUsername}
                      onChange={(e) => setForgotUsername(e.target.value)}
                      style={styles.input}
                      autoFocus
                    />
                  </div>
                </div>

                <div style={styles.modalActions}>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    style={styles.modalCancelBtn}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    style={styles.modalPrimaryBtn}
                  >
                    {forgotLoading ? 'Verifying...' : 'Continue to Question'}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Answer Security Question */}
            {forgotStep === 2 && (
              <form onSubmit={handleForgotStep2} style={styles.modalBody}>
                <div style={styles.questionCard}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <HelpCircle size={15} color="var(--primary)" />
                    <span style={styles.questionHeader}>Security Verification Question</span>
                  </div>
                  <strong style={styles.questionText}>{securityQuestion}</strong>
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Your Secret Answer</label>
                  <div style={styles.inputContainer}>
                    <Lock size={18} color="var(--text-muted)" style={styles.inputIcon} />
                    <input
                      type="text"
                      required
                      placeholder="Enter your security answer"
                      value={securityAnswer}
                      onChange={(e) => setSecurityAnswer(e.target.value)}
                      style={styles.input}
                      autoFocus
                    />
                  </div>
                  <span style={styles.inputHint}>
                    (Case-insensitive. For default doctor account, answer is your registration number: G-9035)
                  </span>
                </div>

                <div style={styles.modalActions}>
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    style={styles.modalCancelBtn}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    style={styles.modalPrimaryBtn}
                  >
                    {forgotLoading ? 'Checking...' : 'Verify Answer'}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Set New Password */}
            {forgotStep === 3 && (
              <form onSubmit={handleForgotStep3} style={styles.modalBody}>
                <p style={styles.modalInstructions}>
                  Security answer confirmed! Please choose a new secure password for <strong>{forgotUsername}</strong>.
                </p>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>New Password</label>
                  <div style={styles.inputContainer}>
                    <Lock size={18} color="var(--text-muted)" style={styles.inputIcon} />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={styles.input}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={styles.eyeBtn}
                    >
                      {showNewPassword ? <EyeOff size={18} color="var(--text-muted)" /> : <Eye size={18} color="var(--text-muted)" />}
                    </button>
                  </div>
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Confirm New Password</label>
                  <div style={styles.inputContainer}>
                    <Lock size={18} color="var(--text-muted)" style={styles.inputIcon} />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                </div>

                <div style={styles.modalActions}>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    style={styles.modalCancelBtn}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    style={styles.modalPrimaryBtn}
                  >
                    {forgotLoading ? 'Updating Password...' : 'Reset & Save Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg)',
    padding: '24px',
    position: 'relative',
    overflow: 'hidden',
  },
  ambientTop: {
    position: 'absolute',
    top: '-15%',
    right: '-10%',
    width: '450px',
    height: '450px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, var(--primary-soft) 0%, rgba(246, 250, 249, 0) 70%)',
    zIndex: 0,
    pointerEvents: 'none',
  },
  ambientBottom: {
    position: 'absolute',
    bottom: '-15%',
    left: '-10%',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, var(--accent-soft) 0%, rgba(246, 250, 249, 0) 70%)',
    zIndex: 0,
    pointerEvents: 'none',
  },
  card: {
    width: '100%',
    maxWidth: '430px',
    backgroundColor: 'var(--surface)',
    borderRadius: 'var(--radius-lg)',
    padding: '38px 34px',
    boxShadow: 'var(--shadow-lg)',
    border: '1px solid var(--border)',
    zIndex: 1,
    position: 'relative',
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  iconWrapper: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary-soft)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '14px',
    border: '1px solid var(--border)',
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    color: 'var(--text)',
    marginBottom: '4px',
    letterSpacing: '-0.3px',
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    marginBottom: '12px',
  },
  securityBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    backgroundColor: 'var(--primary-soft)',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--primary)',
    border: '1px solid rgba(20, 107, 92, 0.2)',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 14px',
    backgroundColor: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: 'var(--radius-md)',
    marginBottom: '20px',
  },
  errorText: {
    fontSize: '13px',
    color: '#991B1B',
    lineHeight: '1.4',
  },
  successBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 14px',
    backgroundColor: '#ECFDF5',
    border: '1px solid #A7F3D0',
    borderRadius: 'var(--radius-md)',
    marginBottom: '20px',
  },
  successText: {
    fontSize: '13px',
    color: '#065F46',
    lineHeight: '1.4',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  labelRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text)',
  },
  forgotBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--primary)',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '0',
    textDecoration: 'underline',
  },
  inputContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '12px',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    padding: '10px 14px 10px 38px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--surface)',
    fontSize: '13.5px',
    color: 'var(--text)',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  inputHint: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
  },
  submitBtn: {
    marginTop: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--primary)',
    color: '#FFFFFF',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    boxShadow: 'var(--shadow-sm)',
    transition: 'background-color 0.2s, opacity 0.2s',
  },
  footerNote: {
    marginTop: '24px',
    fontSize: '11.5px',
    color: 'var(--text-muted)',
    textAlign: 'center',
    zIndex: 1,
  },
  // Modal Styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '16px',
    backdropFilter: 'blur(3px)',
  },
  modalContent: {
    width: '100%',
    maxWidth: '460px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
    border: '1px solid var(--border)',
    overflow: 'hidden',
    animation: 'fadeIn 0.2s ease-out',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 20px',
    borderBottom: '1px solid var(--border)',
    backgroundColor: '#F8FAF9',
  },
  modalIconWrap: {
    width: '38px',
    height: '38px',
    borderRadius: '8px',
    backgroundColor: 'var(--primary-soft)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--text)',
    margin: 0,
  },
  modalSubtitle: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontWeight: '500',
  },
  modalCloseBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    padding: '4px',
    display: 'flex',
  },
  modalErrorBox: {
    margin: '16px 20px 0 20px',
    padding: '10px 12px',
    backgroundColor: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: '12px',
    color: '#991B1B',
  },
  modalBody: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  modalInstructions: {
    fontSize: '12.5px',
    color: 'var(--text-muted)',
    lineHeight: '1.5',
    margin: 0,
  },
  questionCard: {
    padding: '12px 14px',
    backgroundColor: '#F0FDF4',
    border: '1px solid #BBF7D0',
    borderRadius: '8px',
  },
  questionHeader: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--primary)',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  questionText: {
    fontSize: '13.5px',
    color: '#064E3B',
    display: 'block',
  },
  modalActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '6px',
  },
  modalCancelBtn: {
    padding: '9px 16px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    backgroundColor: '#FFFFFF',
    color: 'var(--text)',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  modalPrimaryBtn: {
    padding: '9px 18px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'var(--primary)',
    color: '#FFFFFF',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};
