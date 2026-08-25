import React, { useState } from 'react';
import { Header } from './components/Header.js';
import { Sidebar } from './components/Sidebar.js';
import { Footer } from './components/Footer.js';
import { LoginView } from './views/LoginView.js';
import { DocumentsView } from './views/DocumentsView.js';
import { NewComplaintView } from './views/NewComplaintView.js';
import { ComplaintsListView } from './views/ComplaintsListView.js';
import { ComplaintDetailView } from './views/ComplaintDetailView.js';
import { DashboardView } from './views/DashboardView.js';
import { AuditView } from './views/AuditView.js';
import { QualiosSyncView } from './views/QualiosSyncView.js';
import { AdminView } from './views/AdminView.js';
import { useAuth } from './context/AuthContext.js';

export const AppShell: React.FC = () => {
  const { user, loading, isInternalStaff } = useAuth();

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('sfs_dark_mode') === 'true';
  });
  const [currentTab, setCurrentTab] = useState('documents');
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('sfs_dark_mode', String(darkMode));
  }, [darkMode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Chargement du portail sécurisé...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
        <Header darkMode={darkMode} setDarkMode={setDarkMode} />
        <div className="flex-1">
          <LoginView />
        </div>
        <Footer />
      </div>
    );
  }

  const handleSelectComplaint = (id: string) => {
    setSelectedComplaintId(id);
    setCurrentTab('complaintDetail');
  };

  const renderTab = () => {
    switch (currentTab) {
      case 'documents':
        return <DocumentsView />;
      case 'complaints':
        return <ComplaintsListView onSelectComplaint={handleSelectComplaint} />;
      case 'backofficeComplaints':
        return <ComplaintsListView onSelectComplaint={handleSelectComplaint} />;
      case 'complaintDetail':
        return selectedComplaintId ? (
          <ComplaintDetailView
            complaintId={selectedComplaintId}
            onBack={() => {
              setSelectedComplaintId(null);
              setCurrentTab(isInternalStaff ? 'backofficeComplaints' : 'complaints');
            }}
          />
        ) : null;
      case 'newComplaint':
        return (
          <NewComplaintView
            onSuccess={(id) => {
              setSelectedComplaintId(id);
              setCurrentTab('complaintDetail');
            }}
          />
        );
      case 'dashboard':
        return <DashboardView />;
      case 'auditTrail':
        return <AuditView />;
      case 'qualiosSync':
        return <QualiosSyncView />;
      case 'admin':
        return <AdminView />;
      default:
        return <DocumentsView />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Header darkMode={darkMode} setDarkMode={setDarkMode} />
      <div className="flex flex-1 min-h-0">
        <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />
        <main className="flex-1 p-6 lg:p-8 overflow-x-hidden">
          {renderTab()}
        </main>
      </div>
      <Footer />
    </div>
  );
};
