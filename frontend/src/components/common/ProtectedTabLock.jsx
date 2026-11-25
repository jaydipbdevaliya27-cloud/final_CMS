import React, { useState, useRef, useEffect } from 'react';
import { authAPI } from '../../services/api';
import {
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  AlertTriangle,
  AlertCircle,
  X,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';

/**
 * ProtectedTabLock
 * Restricts access to confidential clinical/financial tabs (Expense Master, Cut Master, Dashboard)
 * Styled in strict alignment with Cut Master & Expense Master theme (#0F172A, #F59E0B, #CBD5E1)
 */
export const ProtectedTabLock = ({ tabName = 'Confidential Section', onUnlock, onCancel }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const passwordInputRef = useRef(null);

  // Auto-focus on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (passwordInputRef.current) {
        passwordInputRef.current.focus();
      }
    }, 80);
    return () => clearTimeout(timer);
  }, []);

  // Keyboard shortcut listener (Esc to cancel, Enter handled by form)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (onCancel) onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!password.trim()) {
      setError('Please enter your doctor password.');
      if (passwordInputRef.current) passwordInputRef.current.focus();
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await authAPI.verifyPassword(password);
      if (res?.success) {
        if (onUnlock) onUnlock();
      } else {
        setError(res?.message || 'Incorrect doctor password. Access denied.');
        if (passwordInputRef.current) passwordInputRef.current.select();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Incorrect doctor password. Access denied.';
      setError(msg);
      if (passwordInputRef.current) passwordInputRef.current.select();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* 1. TOP HEADER BAR (Exact match to Cut Master / Expense Master dark bar) */}
      <div style={styles.headerBar}>
        <div style={styles.headerTitleWrap}>
          <div style={styles.headerAmberBadge}>
            <Lock size={15} color="#F59E0B" />
          </div>
          <span style={styles.headerTitleText}>
            Restricted Clinical Area — {tabName} (Protected)
          </span>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={styles.headerCloseBtn}
            title="Return to Patient Record (Esc)"
          >
            <X size={18} color="#FFFFFF" />
          </button>
        )}
      </div>

      {/* 2. CENTERED LOCK CARD */}
      <div style={styles.contentArea}>
        <div style={styles.lockCard}>
          {/* Card Top Icon & Title */}
          <div style={styles.iconCircle}>
            <div style={styles.innerIconBadge}>
              <Lock size={32} color="#0F172A" strokeWidth={2.4} />
            </div>
          </div>

          <h2 style={styles.cardTitle}>{tabName} is Locked</h2>
          <p style={styles.cardSubtitle}>
            This section contains confidential clinic financial metrics, company expenses, and doctor revenue records.
          </p>

          {/* Security Notice Pill */}
          <div style={styles.noticeBanner}>
            <AlertTriangle size={15} color="#B45309" style={{ flexShrink: 0 }} />
            <span>
              Doctor authorization required to view sensitive clinical data.
            </span>
          </div>

          {/* Error Message */}
          {error && (
            <div style={styles.errorBox}>
              <AlertCircle size={15} color="#B91C1C" style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Password Form */}
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.fieldLabel}>
                <span>Doctor Password:</span>
                <span style={styles.requiredStar}>*</span>
              </label>

              <div style={styles.inputWrap}>
                <div style={styles.inputPrefixIcon}>
                  <KeyRound size={15} color="#64748B" />
                </div>
                <input
                  ref={passwordInputRef}
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter doctor password to unlock..."
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  disabled={loading}
                  style={styles.passwordInput}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.toggleVisibilityBtn}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff size={15} color="#64748B" />
                  ) : (
                    <Eye size={15} color="#64748B" />
                  )}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={styles.actionRow}>
              <button
                type="submit"
                disabled={loading || !password.trim()}
                style={{
                  ...styles.unlockBtn,
                  opacity: loading || !password.trim() ? 0.65 : 1,
                  cursor: loading || !password.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? (
                  <>
                    <span style={styles.spinner} />
                    <span>Verifying Doctor Password...</span>
                  </>
                ) : (
                  <>
                    <Unlock size={16} color="#FFFFFF" />
                    <span>Unlock {tabName} (Enter)</span>
                  </>
                )}
              </button>

              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={loading}
                  style={styles.cancelBtn}
                >
                  <ArrowLeft size={15} color="#475569" />
                  <span>Return to Patient Record (Esc)</span>
                </button>
              )}
            </div>
          </form>

          {/* Footer Security Badge */}
          <div style={styles.cardFooter}>
            <ShieldCheck size={14} color="#15803D" />
            <span>Protected by Paghdal Clinic Security &bull; Doctor Session Verification</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    backgroundColor: '#F8FAFC',
    userSelect: 'none',
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },

  // 1. Header Bar matching Cut Master and Expense Master exactly
  headerBar: {
    backgroundColor: '#0F172A',
    color: '#FFFFFF',
    padding: '8px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '13.5px',
    fontWeight: 700,
    flexShrink: 0,
    borderBottom: '1px solid #1E293B',
  },
  headerTitleWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  headerAmberBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleText: {
    letterSpacing: '0.01em',
  },
  headerCloseBtn: {
    background: '#1E293B',
    border: '1px solid #334155',
    color: '#FFFFFF',
    borderRadius: '4px',
    width: '26px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
    transition: 'background 0.15s ease',
  },

  // 2. Center Content Area
  contentArea: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    overflowY: 'auto',
  },
  lockCard: {
    width: '100%',
    maxWidth: '460px',
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    border: '1px solid #CBD5E1',
    boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)',
    padding: '28px 24px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },

  // Lock Icon Circle
  iconCircle: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: '#F1F5F9',
    border: '2px solid #E2E8F0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
    position: 'relative',
  },
  innerIconBadge: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    backgroundColor: '#FEF3C7',
    border: '1px solid #FDE68A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardTitle: {
    fontSize: '18px',
    fontWeight: 800,
    color: '#0F172A',
    margin: '0 0 6px 0',
    letterSpacing: '-0.01em',
  },
  cardSubtitle: {
    fontSize: '12.5px',
    color: '#64748B',
    lineHeight: 1.45,
    margin: '0 0 16px 0',
  },

  // Warning Notice Pill
  noticeBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#FEF3C7',
    border: '1px solid #FDE68A',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#92400E',
    textAlign: 'left',
    width: '100%',
    boxSizing: 'border-box',
    marginBottom: '16px',
  },

  // Error Alert
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#B91C1C',
    textAlign: 'left',
    width: '100%',
    boxSizing: 'border-box',
    marginBottom: '16px',
  },

  // Form
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    textAlign: 'left',
  },
  fieldLabel: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#1E293B',
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
  },
  requiredStar: {
    color: '#DC2626',
    fontWeight: 700,
  },
  inputWrap: {
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
    border: '1px solid #CBD5E1',
    borderRadius: '6px',
    backgroundColor: '#FFFFFF',
    transition: 'border-color 0.15s ease',
  },
  inputPrefixIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: '10px',
  },
  passwordInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    padding: '9px 10px',
    fontSize: '13px',
    color: '#0F172A',
    backgroundColor: 'transparent',
    fontFamily: 'inherit',
  },
  toggleVisibilityBtn: {
    background: 'none',
    border: 'none',
    padding: '0 10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Action Buttons
  actionRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '4px',
  },
  unlockBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    backgroundColor: '#0F172A',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '0.01em',
    transition: 'background 0.15s ease',
  },
  cancelBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    backgroundColor: '#F1F5F9',
    border: '1px solid #CBD5E1',
    borderRadius: '6px',
    padding: '8px 14px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#475569',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  },

  // Spinner
  spinner: {
    width: '14px',
    height: '14px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: '#FFFFFF',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'spin 0.8s linear infinite',
  },

  // Footer
  cardFooter: {
    marginTop: '20px',
    paddingTop: '14px',
    borderTop: '1px solid #F1F5F9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#64748B',
  },
};
