import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import './Social.css';

function Social() {
  const { signOut } = useAuth();

  return (
    <motion.div
      className="social-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <button className="logout-btn" onClick={signOut}>
        LOG OUT
      </button>
    </motion.div>
  );
}

export default Social;
