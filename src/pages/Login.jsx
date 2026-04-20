import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { signIn, signUp, error } = useAuth();
  const [mode, setMode]         = useState('signin');
  const [email, setEmail]       = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [msg, setMsg]           = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    if (mode === 'signin') {
      await signIn(email, password);
    } else {
      const ok = await signUp(email, password, username);
      if (ok) setMsg('Check your email to confirm your account.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-[calc(100vh-52px)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-mono text-[11px] text-amber-500 uppercase tracking-widest mb-2">AlgoLog</p>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {mode === 'signin' ? 'Welcome back' : 'Create account'}
          </h1>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6 space-y-4">
          {(error || msg) && (
            <div className={`text-xs px-3 py-2 rounded-lg ${msg ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              {msg || error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] block mb-1.5">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  placeholder="e.g. priya123"
                  className="input"
                />
              </div>
            )}
            <div>
              <label className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="input"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] block mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="input"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 disabled:opacity-50"
            >
              {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-xs text-[var(--text-muted)]">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              className="text-amber-400 hover:underline"
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}