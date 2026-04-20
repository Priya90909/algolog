/**
 * AlgoLog — main.jsx
 * Entry point. Wraps the app in Auth + Problem context providers.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ProblemProvider } from './context/ProblemContext.jsx';
import './index.css'; // Tailwind base + custom CSS variables

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      {/*
       * ProblemProvider sits inside AuthProvider so it can read
       * the authenticated user's ID without prop-drilling.
       */}
      <ProblemProvider>
        <App />
      </ProblemProvider>
    </AuthProvider>
  </React.StrictMode>
);
