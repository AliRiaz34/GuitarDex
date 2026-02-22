import { Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const { isLoading: dataLoading } = useData();

  const showLoading = loading || (user && dataLoading);

  if (!loading && !user) return <Navigate to="/auth" replace />;

  return (
    <>
      <AnimatePresence>
        {showLoading && (
          <motion.div
            key="loading-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: '#0e0e13',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
            }}
          >
            <img src="/pwa-192x192.png" alt="GuitarDex" style={{ width: 120, height: 120, marginBottom: 20 }} />
          </motion.div>
        )}
      </AnimatePresence>
      {!showLoading && user && children}
    </>
  );
}

export default ProtectedRoute;
