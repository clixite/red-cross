import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.js';
import {
  FileText,
  AlertCircle,
  PlusCircle,
  BarChart3,
  ShieldCheck,
  RefreshCw,
  Users,
  Inbox,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab }) => {
  const { t } = useTranslation();
  const { isInternalStaff, isReferentQualite, user } = useAuth();

  const isReaderOnly = user?.roles.includes('lecteur') && user.roles.length === 1;

  const clientNav = [
    { id: 'documents', label: t('nav.documents'), icon: FileText },
    ...(!isReaderOnly ? [
      { id: 'complaints', label: t('nav.complaints'), icon: AlertCircle },
      { id: 'newComplaint', label: t('nav.newComplaint'), icon: PlusCircle },
    ] : []),
    ...(isReferentQualite ? [
      { id: 'admin', label: t('nav.admin'), icon: Users },
    ] : []),
  ];

  const staffNav = [
    { id: 'documents', label: t('nav.documents'), icon: FileText },
    { id: 'backofficeComplaints', label: t('nav.backofficeComplaints'), icon: Inbox },
    { id: 'newComplaint', label: t('nav.newComplaint'), icon: PlusCircle },
    { id: 'dashboard', label: t('nav.dashboard'), icon: BarChart3 },
    { id: 'qualiosSync', label: t('nav.qualiosSync'), icon: RefreshCw },
    { id: 'auditTrail', label: t('nav.auditTrail'), icon: ShieldCheck },
    { id: 'admin', label: t('nav.admin'), icon: Users },
  ];

  const navItems = isInternalStaff ? staffNav : clientNav;

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 space-y-1 shrink-0">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 mb-2">
        {isInternalStaff ? t('app.backofficeBadge') : t('app.user')}
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
