import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import styles from './AuthModal.module.css';

export default function AuthModal({ onClose, defaultTab = 'login' }) {
  const { login, register, loading, error } = useAuth();
  const [tab, setTab]           = useState(defaultTab);
  const [rememberMe, setRemember] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent]   = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '',
    dob: '', school: '', grade: '10th Grade',
  });

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleLogin = async (e) => {
    e.preventDefault();
    const res = await login(form.email, form.password, rememberMe);
    if (res.success) onClose();
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const res = await register(form);
    if (res.success) onClose();
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    await supabase.auth.resetPasswordForEmail(forgotEmail.trim().toLowerCase(), {
      redirectTo: window.location.origin,
    });
    setForgotSent(true);
    setForgotLoading(false);
  };

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <button className={styles.close} onClick={onClose}>✕</button>

        <div className={styles.logo}>High <em>Caliber</em> <span className={styles.logoWord}>Gaming</span></div>

        {/* Forgot password flow */}
        {forgotMode ? (
          <>
            <p className={styles.sub}>Reset your password.</p>
            {forgotSent ? (
              <div className={styles.successBox}>
                ✅ Check your email for a password reset link.
                <button className={styles.backLink} onClick={() => { setForgotMode(false); setForgotSent(false); }}>
                  Back to login
                </button>
              </div>
            ) : (
              <form className={styles.form} onSubmit={handleForgot}>
                <div className="fg">
                  <label>Email address</label>
                  <input
                    type="email" placeholder="you@example.com"
                    value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={forgotLoading}>
                  {forgotLoading ? 'Sending...' : 'Send Reset Link →'}
                </button>
                <button type="button" className={styles.backLink} onClick={() => setForgotMode(false)}>
                  Back to login
                </button>
              </form>
            )}
          </>
        ) : (
          <>
            <p className={styles.sub}>{tab === 'login' ? 'Welcome back.' : 'Create your HCG account.'}</p>

            <div className={styles.tabs}>
              <button className={`${styles.tab} ${tab === 'login'    ? styles.active : ''}`} onClick={() => setTab('login')}>Log In</button>
              <button className={`${styles.tab} ${tab === 'register' ? styles.active : ''}`} onClick={() => setTab('register')}>Join Now</button>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            {tab === 'login' ? (
              <form className={styles.form} onSubmit={handleLogin}>
                <div className="fg">
                  <label>Email</label>
                  <input name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
                </div>
                <div className="fg">
                  <label>Password</label>
                  <input name="password" type="password" placeholder="••••••••" value={form.password} onChange={handleChange} required />
                </div>

                {/* Remember me */}
                <label className={styles.rememberRow}>
                  <span className={`${styles.checkbox} ${rememberMe ? styles.checkboxOn : ''}`} onClick={() => setRemember(p => !p)}>
                    {rememberMe && <span className={styles.checkmark}>✓</span>}
                  </span>
                  <span className={styles.rememberLabel} onClick={() => setRemember(p => !p)}>Keep me logged in</span>
                </label>

                <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={loading}>
                  {loading ? 'Logging in...' : 'Log In →'}
                </button>

                <button type="button" className={styles.forgot} onClick={() => setForgotMode(true)}>
                  Forgot password?
                </button>
              </form>
            ) : (
              <form className={styles.form} onSubmit={handleRegister}>
                <div className={styles.row}>
                  <div className="fg">
                    <label>First Name</label>
                    <input name="firstName" placeholder="John" value={form.firstName} onChange={handleChange} required />
                  </div>
                  <div className="fg">
                    <label>Last Name</label>
                    <input name="lastName" placeholder="Doe" value={form.lastName} onChange={handleChange} required />
                  </div>
                </div>
                <div className="fg">
                  <label>Email</label>
                  <input name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
                </div>
                <div className="fg">
                  <label>Password</label>
                  <input name="password" type="password" placeholder="Create a password" value={form.password} onChange={handleChange} required minLength={6} />
                </div>
                <div className="fg">
                  <label>Date of Birth</label>
                  <input name="dob" type="date" value={form.dob} onChange={handleChange} />
                </div>
                <div className="fg">
                  <label>School / Organization</label>
                  <input name="school" placeholder="Your school or org" value={form.school} onChange={handleChange} />
                </div>
                <div className="fg">
                  <label>Grade / Year</label>
                  <select name="grade" value={form.grade} onChange={handleChange}>
                    <option>9th Grade</option>
                    <option>10th Grade</option>
                    <option>11th Grade</option>
                    <option>12th Grade</option>
                    <option>College Freshman</option>
                    <option>College Sophomore</option>
                    <option>College Junior</option>
                    <option>College Senior</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className={styles.notice}>
                  Membership is <strong>$125/year</strong>. You'll be directed to payment after registration.
                </div>
                <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account →'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
