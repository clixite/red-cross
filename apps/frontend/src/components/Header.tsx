import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.js';
import { Globe, Moon, Sun, LogOut } from 'lucide-react';
import { Logo } from './Logo.js';

interface HeaderProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ darkMode, setDarkMode }) => {
  const { t, i18n } = useTranslation();
  const { user, logout, isInternalStaff } = useAuth();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand : logo neutre original (placeholder de marque, sans emblème protégé) */}
        <div className="flex items-center space-x-3">
          <Logo size={36} className="shadow-sm" />
          <div>
            <div className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <span>{t('app.title')}</span>
              {isInternalStaff && (
                <span className="text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-semibold px-2 py-0.5 rounded">
                  {t('app.backofficeBadge')}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {user?.organization ? user.organization.name : t('app.tagline')}
            </div>
          </div>
        </div>

        {/* Right tools: Language, Theme, User */}
        <div className="flex items-center space-x-3">
          {/* Language Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-md p-0.5 text-xs font-semibold">
            <Globe className="w-3.5 h-3.5 ml-1.5 mr-1 text-slate-500" />
            <button
              onClick={() => changeLanguage('fr')}
              className={`px-2 py-1 rounded ${i18n.language === 'fr' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}
              aria-label="Français"
            >
              FR
            </button>
            <button
              onClick={() => changeLanguage('nl')}
              className={`px-2 py-1 rounded ${i18n.language === 'nl' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}
              aria-label="Nederlands"
            >
              NL
            </button>
            <button
              onClick={() => changeLanguage('en')}
              className={`px-2 py-1 rounded ${i18n.language === 'en' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}
              aria-label="English"
            >
              EN
            </button>
          </div>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-md text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800"
            aria-label={darkMode ? t('app.themeLight') : t('app.themeDark')}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Profile & Logout */}
          {user && (
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-medium text-slate-900 dark:text-white">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  {user.roles.join(', ')}
                </div>
              </div>
              <button
                onClick={logout}
                className="p-2 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30"
                title={t('app.logout')}
                aria-label={t('app.logout')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
