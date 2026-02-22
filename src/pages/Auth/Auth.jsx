import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState({ field: '', msg: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => navigate('/', { replace: true }), 250);
      return () => clearTimeout(timer);
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError({ field: '', msg: '' });
    setIsSubmitting(true);

    const username = email.trim().toLowerCase();

    if (!username) {
      setError({ field: 'username', msg: 'enter username' });
      setIsSubmitting(false);
      return;
    }

    if (/[^a-z0-9._-]/.test(username)) {
      setError({ field: 'username', msg: 'invalid characters' });
      setIsSubmitting(false);
      return;
    }

    if (!password) {
      setError({ field: 'password', msg: 'enter password' });
      setIsSubmitting(false);
      return;
    }

    if (password.length < 6) {
      setError({ field: 'password', msg: 'too short' });
      setIsSubmitting(false);
      return;
    }

    if (isSignUp && (!confirmPassword || password !== confirmPassword)) {
      setError({ field: 'confirm', msg: 'doesnt match' });
      setIsSubmitting(false);
      return;
    }

    const fakeEmail = `${username}@guitardex.app`;

    try {
      if (isSignUp) {
        await signUp(fakeEmail, password);
      } else {
        await signIn(fakeEmail, password);
      }
      setLoginSuccess(true);
    } catch (err) {
      console.error('Auth error:', err.message);
      const msg = err.message?.toLowerCase() || '';
      if (isSignUp) {
        if (msg.includes('already registered') || msg.includes('already been registered')) {
          setError({ field: 'username', msg: 'username taken' });
        } else if (msg.includes('password') || msg.includes('short') || msg.includes('least')) {
          setError({ field: 'password', msg: 'too short' });
        } else if (msg.includes('rate') || msg.includes('limit')) {
          setError({ field: 'password', msg: 'too many attempts' });
        } else {
          setError({ field: 'password', msg: 'something went wrong' });
        }
      } else {
        setError({ field: 'password', msg: 'invalid password' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (error.field) {
      const timer = setTimeout(() => setError({ field: '', msg: '' }), 1200);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError({ field: '', msg: '' });
    setConfirmPassword('');
  };

  return (
    <motion.div
      id="auth-view"
      initial={{ opacity: 0 }}
      animate={{ opacity: loginSuccess ? 0 : 1 }}
      transition={{ duration: loginSuccess ? 0.35 : 0.4, ease: 'easeOut' }}
    >
      <div id="auth-logo-container">
        <img id="auth-logo" src="/pwa-192x192.png" alt="GuitarDex" />
        <h1 id="auth-title">GuitarDex</h1>
      </div>

      <form
        id="auth-form"
        onSubmit={handleSubmit}
        noValidate
      >
        <div id="auth-input-div">
          <div className="auth-field">
            <label htmlFor="auth-email" className="auth-label">username</label>
            <input
              type="text"
              className="auth-input"
              id="auth-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoCapitalize="off"
              autoComplete="username"
              autoCorrect="off"
              spellCheck="false"
            />
            <AnimatePresence>
              {error.field === 'username' && (
                <motion.div
                  className="error-bubble"
                  initial={{ opacity: 0, y: -3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="error-bubble-arrow" />
                  {error.msg}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="auth-field">
            <label htmlFor="auth-password" className="auth-label">password</label>
            <div className="auth-input-wrapper">
              <input
                type="text"
                className={`auth-input${!showPassword ? ' auth-input-masked' : ''}`}
                id="auth-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
              />
              {password && (
                <button
                  type="button"
                  className="auth-pw-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'o' : 'ø'}
                </button>
              )}
            </div>
            <AnimatePresence>
              {error.field === 'password' && (
                <motion.div
                  className="error-bubble"
                  initial={{ opacity: 0, y: -3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="error-bubble-arrow" />
                  {error.msg}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {isSignUp && (
              <motion.div
                style={{ overflow: 'visible' }}
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 30 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.35 }}
              >
                <div className="auth-field" style={{ marginTop: 0 }}>
                  <label htmlFor="auth-confirm" className="auth-label">confirm password</label>
                  <input
                    type="text"
                    className="auth-input auth-input-masked"
                    id="auth-confirm"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <AnimatePresence>
                    {error.field === 'confirm' && (
                      <motion.div
                        className="error-bubble"
                        initial={{ opacity: 0, y: -3 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -3 }}
                        transition={{ duration: 0.15 }}
                    >
                        <div className="error-bubble-arrow" />
                        {error.msg}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          type="submit"
          className="auth-submit"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? (isSignUp ? 'signing up...' : 'logging in...')
            : (isSignUp ? 'sign up' : 'log in')
          }
        </button>
      </form>

      <button
        id="auth-toggle"
        onClick={toggleMode}
      >
        {isSignUp ? 'already a member? log in' : 'no account? sign up'}
      </button>

    </motion.div>
  );
}

export default Auth;
