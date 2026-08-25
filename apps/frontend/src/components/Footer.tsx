import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Network, Bot, Scale } from 'lucide-react';

/**
 * Pied de page — mentions de conformité RGPD, NIS2 et AI Act
 * selon les pratiques belges (loi du 30/07/2018, loi NIS2 du 26/04/2024,
 * Autorité de protection des données, Centre for Cybersecurity Belgium).
 */
export const Footer: React.FC = () => {
  const { t } = useTranslation();

  const mentions = [
    { icon: ShieldCheck, titleKey: 'footer.gdpr.title', textKey: 'footer.gdpr.text' },
    { icon: Network, titleKey: 'footer.nis2.title', textKey: 'footer.nis2.text' },
    { icon: Bot, titleKey: 'footer.aiAct.title', textKey: 'footer.aiAct.text' },
  ];

  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {mentions.map(({ icon: Icon, titleKey, textKey }) => (
            <div key={titleKey} className="flex items-start space-x-3">
              <div className="shrink-0 w-9 h-9 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t(titleKey)}</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t(textKey)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 dark:text-slate-500">
          <span>{t('footer.copyright')}</span>
          <span className="flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5" />
            {t('footer.legalRefs')}
          </span>
        </div>
      </div>
    </footer>
  );
};
