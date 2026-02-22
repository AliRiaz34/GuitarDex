import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import { initSync } from '../utils/sync';
import { clearQueue } from '../utils/syncQueue';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(true);
  const syncCleanupRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Initialize sync when user is authenticated
  useEffect(() => {
    if (!user) {
      // Clean up sync when user logs out
      if (syncCleanupRef.current) {
        syncCleanupRef.current();
        syncCleanupRef.current = null;
      }
      setSyncing(false);
      return;
    }

    let cancelled = false;

    async function startSync() {
      setSyncing(true);
      try {
        const cleanup = await initSync(user.id);
        if (!cancelled && cleanup) {
          syncCleanupRef.current = cleanup;
        }
      } catch (error) {
        console.error('Sync initialization error:', error);
      } finally {
        if (!cancelled) {
          setSyncing(false);
        }
      }
    }

    startSync();

    return () => {
      cancelled = true;
      if (syncCleanupRef.current) {
        syncCleanupRef.current();
        syncCleanupRef.current = null;
      }
    };
  }, [user]);

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    // Clean up sync before signing out (while session is still valid)
    if (syncCleanupRef.current) {
      syncCleanupRef.current();
      syncCleanupRef.current = null;
    }
    clearQueue();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, loading, syncing, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
