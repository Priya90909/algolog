/**
 * AlgoLog — App.jsx
 * Root router. Uses React.lazy + Suspense for code-split pages.
 */
import React, { Suspense, lazy } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import PageLoader from './components/PageLoader.jsx';

// ── Lazy-loaded pages (code-split at the route level) ────────
const Dashboard    = lazy(() => import('./pages/Dashboard.jsx'));
const ProblemView  = lazy(() => import('./pages/ProblemView.jsx'));
const AddProblem   = lazy(() => import('./pages/AddProblem.jsx'));
const StudyRoom    = lazy(() => import('./pages/StudyRoom.jsx'));
const Login        = lazy(() => import('./pages/Login.jsx'));

// ── Route guards ─────────────────────────────────────────────

/** Redirects unauthenticated users to /login. */
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return user ? children : <Navigate to="/login" replace />;
}

/** Redirects already-authenticated users away from auth pages. */
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return !user ? children : <Navigate to="/" replace />;
}

// ── App ──────────────────────────────────────────────────────
export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-sans">
        <Navbar />

        {/* Single Suspense boundary — PageLoader shown during any lazy import */}
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ── Public ── */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />

            {/* Shared problem view (read-only, no auth required) */}
            <Route path="/share/:slug" element={<ProblemView shared />} />

            {/* ── Private ── */}
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/problem/:id"
              element={
                <PrivateRoute>
                  <ProblemView />
                </PrivateRoute>
              }
            />
            <Route
              path="/add"
              element={
                <PrivateRoute>
                  <AddProblem />
                </PrivateRoute>
              }
            />
            <Route
              path="/room/:roomId"
              element={
                <PrivateRoute>
                  <StudyRoom />
                </PrivateRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}
