import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiClient } from '../api/client.js';
import { FileText, Download, Search, CheckCircle2 } from 'lucide-react';

export const DocumentsView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const data = await ApiClient.request<any[]>('/documents');
      setDocuments(data);
    } catch (err) {
      console.error('Erreur chargement documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (docId: string) => {
    try {
      const data = await ApiClient.request<{ downloadUrl: string; fileName: string }>(
        `/documents/${docId}/download-url`
      );
      window.open(data.downloadUrl, '_blank');
    } catch (err: any) {
      alert(err.message || 'Erreur lors du téléchargement du document contrôlé.');
    }
  };

  const getDocTitle = (doc: any) => {
    const lang = i18n.language;
    if (lang === 'nl' && doc.titleNl) return doc.titleNl;
    if (lang === 'en' && doc.titleEn) return doc.titleEn;
    return doc.titleFr;
  };

  const filteredDocs = documents.filter((doc) => {
    const title = getDocTitle(doc).toLowerCase();
    const ref = doc.qualiosReference.toLowerCase();
    const matchesSearch = title.includes(search.toLowerCase()) || ref.includes(search.toLowerCase());
    const matchesType = selectedType === 'all' || doc.type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <FileText className="w-6 h-6 text-blue-600" />
          <span>{t('documents.title')}</span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t('documents.subtitle')}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('documents.searchPlaceholder')}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
        >
          <option value="all">{t('documents.allCategories')}</option>
          <option value="procedure">Procédures</option>
          <option value="mode_operatoire">Modes Opératoires</option>
          <option value="fiche_technique">Fiches Techniques</option>
          <option value="notice">Notices & Formulaires</option>
          <option value="bulletin_information">Bulletins d'Information</option>
        </select>
      </div>

      {/* Document List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Chargement des documents...</div>
      ) : filteredDocs.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500">
          {t('documents.noDocuments')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-shadow shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-100 dark:border-blue-900">
                    {doc.qualiosReference}
                  </span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center space-x-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>v{doc.version} en vigueur</span>
                  </span>
                </div>

                <h3 className="font-semibold text-slate-900 dark:text-white text-base mb-1">
                  {getDocTitle(doc)}
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                  {doc.descriptionFr || 'Document qualité contrôlé du Service du Sang.'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="text-[11px] text-slate-400">
                  {t('documents.appliedOn')} : {new Date(doc.applicationDate).toLocaleDateString()}
                </div>

                <button
                  onClick={() => handleDownload(doc.id)}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t('documents.download')}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
