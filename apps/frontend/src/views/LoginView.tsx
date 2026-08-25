import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiClient } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { KeyRound, ArrowRight, UserCheck } from 'lucide-react';
import { Logo } from '../components/Logo.js';

export const LoginView: React.FC = () => {
  const { t } = useTranslation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const demoAccounts = [
    {
      label: 'Déclarant (Banque de Sang CHU Liège)',
      email: 'declarant@chu-liege.be',
      pass: 'DemoPass2025!',
      role: 'declarant',
    },
    {
      label: 'Référent Qualité (CHU Liège)',
      email: 'qualite@chu-liege.be',
      pass: 'DemoPass2025!',
      role: 'referent_qualite',
    },
    {
      label: 'Lecteur Documentaire (Université)',
      email: 'lecteur@univ-bruxelles.be',
      pass: 'DemoPass2025!',
      role: 'lecteur',
    },
    {
      label: 'Agent Réception SFS',
      email: 'reception@service-du-sang.be',
      pass: 'DemoPass2025!',
      role: 'agent_reception',
    },
    {
      label: 'Responsable Qualité SFS',
      email: 'responsable.qualite@service-du-sang.be',
      pass: 'DemoPass2025!',
      role: 'responsable_qualite',
    },
    {
      label: 'Administrateur SFS',
      email: 'admin@service-du-sang.be',
      pass: 'DemoPass2025!',
      role: 'administrateur',
    },
    {
      label: 'Direction SFS (KPI / Lecture)',
      email: 'direction@service-du-sang.be',
      pass: 'DemoPass2025!',
      role: 'lecteur_direction',
    },
  ];

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await ApiClient.request<{
        token?: string;
        user?: any;
        requiresMfa?: boolean;
        message?: string;
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, totpCode }),
      });

      if (data.requiresMfa) {
        setRequiresMfa(true);
        setLoading(false);
        return;
      }

      if (data.token && data.user) {
        login(data.token, data.user);
      }
    } catch (err: any) {
      setError(err.message || 'Identifiants invalides.');
    } finally {
      setLoading(false);
    }
  };

  const selectDemoAccount = (acc: typeof demoAccounts[0]) => {
    setEmail(acc.email);
    setPassword(acc.pass);
    setRequiresMfa(false);
    setTotpCode('');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-900 p-8 rounded-xl shadow-md border border-slate-200 dark:border-slate-800">
        <div className="text-center">
          <Logo size={56} className="mx-auto shadow-md rounded-2xl" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('auth.login')}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('auth.charterNotice')}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleLogin}>
          {!requiresMfa ? (
            <>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  {t('auth.email')}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@hopital.be"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  {t('auth.password')}
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          ) : (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3">
              <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-300 font-semibold text-sm">
                <KeyRound className="w-4 h-4" />
                <span>{t('auth.mfaPrompt')}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Saisissez le code à 6 chiffres affiché sur votre application d'authentification.
              </p>
              <input
                type="text"
                required
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="123456"
                className="w-full text-center tracking-widest text-lg font-mono px-3 py-2 border border-blue-300 dark:border-blue-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{requiresMfa ? t('auth.mfaSubmit') : t('auth.submit')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Comptes de Démonstration Clés en Main */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
            <UserCheck className="w-4 h-4 text-blue-500" />
            <span>{t('auth.demoAccountsTitle')} :</span>
          </div>
          <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
            {demoAccounts.map((acc, i) => (
              <button
                key={i}
                type="button"
                onClick={() => selectDemoAccount(acc)}
                className="text-left px-2.5 py-1.5 text-xs rounded bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-between transition-colors"
              >
                <span className="font-medium truncate">{acc.label}</span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono ml-2">Tester</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
