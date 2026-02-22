import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Social.css';

function Social() {
  const { signOut, offlineMode } = useAuth();
  const navigate = useNavigate();

  return (
    <motion.div
      className="social-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {offlineMode ? (
        <button className="login-btn" onClick={() => navigate('/auth', { replace: true })}>
          LOG IN
        </button>
      ) : (
        <button className="logout-btn" onClick={signOut}>
          LOG OUT
        </button>
      )}
    </motion.div>
  );
}

export default Social;
