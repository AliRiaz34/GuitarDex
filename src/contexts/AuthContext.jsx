import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataRevision, setDataRevision] = useState(0);

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

  // Realtime subscriptions for cross-device sync
  useEffect(() => {
    if (!user) return;

    let debounceTimer = null;
    const bumpRevision = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => setDataRevision(r => r + 1), 300);
    };

    const channel = supabase.channel('guitardex-realtime');
    ['songs', 'practices', 'decks', 'deck_songs'].forEach(table => {
      channel.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table, filter: `user_id=eq.${user.id}` },
        bumpRevision
      );
      channel.on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table, filter: `user_id=eq.${user.id}` },
        bumpRevision
      );
      channel.on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table, filter: `user_id=eq.${user.id}` },
        bumpRevision
      );
    });
    channel.subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [user]);

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    // Create profile row with username extracted from email
    if (data?.user) {
      const username = email.split('@')[0];
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({ id: data.user.id, username });
      if (profileError) {
        console.error('Error creating profile:', profileError);
      }
    }

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
    setUser(null);
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, loading, dataRevision, signUp, signIn, signOut }}>
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
