import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../services/supabase.js';

const NAV = [
  { label: 'Dashboard', to: '/' },
  { label: 'Add Problem', to: '/add' },
];

export default function Navbar() {
  const { user, signOut } = useAuth();
  const { pathname } = useLocation();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await supabase.from('profiles').delete().eq('id', user.id);
      await supabase.from('problems').delete().eq('user_id', user.id);
      await supabase.rpc('delete_user');
      await signOut();
    } catch (err) {
      console.error(err);
      alert('Could not delete account. Please contact support.');
    }
    setDeleting(false);
  }

  if (!user) return null;

  return (
    <>
      <nav className="sticky top-0 z-50 h-[52px] bg-[var(--bg-surface)] border-b border-[var(--border)] flex items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link to="/" className="font-mono text-[15px] font-medium text-amber-500 tracking-wider">
            <svg width="90" height="24" viewBox="0 0 200 50" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="44" height="44" rx="8" fill="rgba(245,158,11,0.12)" stroke="#f59e0b" strokeWidth="1.5"/>
  <text x="5" y="16" fontSize="10" fontFamily="monospace" fontWeight="500" fill="#f59e0b">&lt;/&gt;</text>
  <circle cx="22" cy="32" r="4" fill="#f59e0b"/>
  <line x1="22" y1="28" x2="22" y2="22" stroke="#f59e0b" strokeWidth="1.5"/>
  <line x1="22" y1="22" x2="30" y2="22" stroke="#f59e0b" strokeWidth="1.5"/>
  <circle cx="30" cy="22" r="2.5" fill="none" stroke="#f59e0b" strokeWidth="1.5"/>
  <line x1="22" y1="22" x2="14" y2="22" stroke="#f59e0b" strokeWidth="1.5"/>
  <circle cx="14" cy="22" r="2.5" fill="none" stroke="#f59e0b" strokeWidth="1.5"/>
  <text x="50" y="32" fontSize="22" fontFamily="monospace" fontWeight="500" fill="#f0f0f5">Algo<tspan fill="#f59e0b">Log</tspan></text>
</svg>
          </Link>
          <div className="flex gap-1">
            {NAV.map(n => (
              <Link
                key={n.to}
                to={n.to}
                className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
                  pathname === n.to
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {n.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--text-muted)] font-mono hidden sm:block">
            {user.email}
          </span>
          <button
            onClick={signOut}
            className="text-xs text-[var(--text-muted)] hover:text-rose-400 transition-colors px-2 py-1"
          >
            Sign out
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            className="text-xs text-[var(--text-muted)] hover:text-rose-400 transition-colors px-2 py-1 border border-rose-500/20 rounded-md hover:border-rose-500/50"
          >
            Delete Account
          </button>
        </div>
      </nav>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Delete Account</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              This will permanently delete your account and all your problems, code versions, and review history. This cannot be undone.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="btn-ghost flex-1 justify-center"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-rose-500 text-white hover:bg-rose-400 active:scale-95 transition-all disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}