import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './i18n/index.js';
import { AuthProvider } from './context/AuthContext.js';
import { AppShell } from './AppShell.js';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  </React.StrictMode>
);
