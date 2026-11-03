import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Stethoscope, Lock, User, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';

export const Login = () => {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('dhyey');
  const [password, setPassword] = useState('123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, redirect straight to dashboard
  if (!loading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      await login(username, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Invalid username or password.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
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
            <Lock size={12} color="var(--primary)" />
            <span>Authorized Medical Access Only</span>
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={18} color="var(--danger)" style={{ flexShrink: 0 }} />
            <span style={styles.errorText}>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Username</label>
            <div style={styles.inputContainer}>
              <User size={18} color="var(--text-muted)" style={styles.inputIcon} />
              <input
                type="text"
                required
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={styles.input}
                autoFocus
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
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
              <span>Logging in...</span>
            ) : (
              <>
                <span>Sign In to CMS</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>

      <div style={styles.footerNote}>
        Secure Doctor Session &bull; Direct Database Storage &bull; Single Doctor Suite
      </div>
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
    padding: '40px 36px',
    boxShadow: 'var(--shadow-lg)',
    border: '1px solid var(--border)',
    zIndex: 1,
    position: 'relative',
  },
  header: {
    textAlign: 'center',
    marginBottom: '28px',
  },
  iconWrapper: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary-soft)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
    border: '1px solid var(--border)',
  },
  title: {
    fontSize: '1.6rem',
    fontWeight: 700,
    color: 'var(--text)',
    letterSpacing: '-0.02em',
    marginBottom: '6px',
  },
  subtitle: {
    fontSize: '0.88rem',
    color: 'var(--text-muted)',
    marginBottom: '14px',
  },
  securityBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    backgroundColor: 'var(--surface-alt)',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--primary-dark)',
    border: '1px solid var(--border)',
  },
  errorBox: {
    backgroundColor: 'var(--danger-soft)',
    border: '1px solid var(--danger)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
  },
  errorText: {
    color: 'var(--danger)',
    fontSize: '0.86rem',
    fontWeight: 500,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '0.82rem',
    fontWeight: 600,
    color: 'var(--text)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  inputContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    padding: '12px 42px 12px 42px',
    fontSize: '0.95rem',
    backgroundColor: 'var(--surface-alt)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text)',
    transition: 'all 0.2s ease',
  },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
  },
  submitBtn: {
    width: '100%',
    padding: '14px',
    marginTop: '6px',
    backgroundColor: 'var(--primary)',
    color: '#FFFFFF',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.95rem',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow: 'var(--shadow-sm)',
  },
  footerNote: {
    marginTop: '24px',
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    zIndex: 1,
    textAlign: 'center',
  },
};
