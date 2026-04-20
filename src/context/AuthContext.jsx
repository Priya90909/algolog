import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { supabase } from '../services/supabase.js';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export function AuthProvider({ children }) {
  const [user, setUser]         = useState(null);
  const [session, setSession]   = useState(null);
  const [username, setUsername] = useState('');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  async function fetchUsername(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single();
    if (data?.username) setUsername(data.username);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) fetchUsername(data.session.user.id);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) fetchUsername(newSession.user.id);
        setLoading(false);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email, password, username) => {
    setError(null);
    const { data, error: err } = await supabase.auth.signUp({ email, password });
    if (err) { setError(err.message); return false; }

    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        username,
      });
      setUsername(username);
    }
    return true;
  }, []);

  const signIn = useCallback(async (email, password) => {
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); return false; }
    return true;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUsername('');
  }, []);

  const value = { user, session, username, loading, error, signUp, signIn, signOut };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}