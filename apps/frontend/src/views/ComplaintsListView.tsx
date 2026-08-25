import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiClient } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { AlertCircle, Clock, ChevronRight } from 'lucide-react';

export const ComplaintsListView: React.FC<{ onSelectComplaint: (id: string) => void }> = ({ onSelectComplaint }) => {
  const { t } = useTranslation();
  const { isInternalStaff } = useAuth();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const data = await ApiClient.request<any[]>('/complaints');
      setComplaints(data);
    } catch (err) {
      console.error('Erreur chargement réclamations:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      recue: { label: 'Reçue', color: 'bg-blue-50 text-blue-700 border-blue-200' },
      en_analyse_recevabilite: { label: 'En Analyse Recevabilité', color: 'bg-amber-50 text-amber-700 border-amber-200' },
      en_investigation: { label: 'En Investigation', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
      information_complementaire_demandee: { label: 'Attente Info Client', color: 'bg-orange-50 text-orange-700 border-orange-200' },
      conclue: { label: 'Conclue', color: 'bg-teal-50 text-teal-700 border-teal-200' },
      cloturee: { label: 'Clôturée', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      irrecevable: { label: 'Irrecevable', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    };
    const s = map[status] || { label: status, color: 'bg-slate-100 text-slate-700 border-slate-200' };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s.color}`}>
        {s.label}
      </span>
    );
  };

  const filtered = complaints.filter((c) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return c.status !== 'cloturee' && c.status !== 'irrecevable';
    return c.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <AlertCircle className="w-6 h-6 text-blue-600" />
            <span>{isInternalStaff ? t('nav.backofficeComplaints') : t('nav.complaints')}</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {complaints.length} réclamations enregistrées
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
        >
          <option value="all">Tous les statuts</option>
          <option value="active">En cours de traitement</option>
          <option value="recue">Reçue</option>
          <option value="en_analyse_recevabilite">En analyse recevabilité</option>
          <option value="en_investigation">En investigation</option>
          <option value="information_complementaire_demandee">Attente info client</option>
          <option value="conclue">Conclue</option>
          <option value="cloturee">Clôturée</option>
          <option value="irrecevable">Irrecevable</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Chargement des dossiers...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500">
          Aucune réclamation trouvée pour ce filtre.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => onSelectComplaint(c.id)}
              className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer flex items-center justify-between transition-colors"
            >
              <div className="space-y-1 pr-4">
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                    {c.portalNumber}
                  </span>
                  {getStatusBadge(c.status)}
                  {c.qualiosNonConformityRef && (
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded font-mono">
                      QMS: {c.qualiosNonConformityRef}
                    </span>
                  )}
                  {c.slaSuspendedAt && (
                    <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 px-1.5 py-0.5 rounded flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>SLA suspendu</span>
                    </span>
                  )}
                </div>

                <div className="text-sm font-medium text-slate-900 dark:text-white line-clamp-1">
                  {c.description}
                </div>

                <div className="text-xs text-slate-400 flex items-center space-x-4">
                  <span>Organisation : <strong className="text-slate-600 dark:text-slate-300">{c.organization?.name}</strong></span>
                  <span>Déclaré le : {new Date(c.declarationDate).toLocaleDateString()}</span>
                  {c.products && c.products.length > 0 && (
                    <span className="font-mono text-blue-500">
                      {c.products.length} unité(s) PSL
                    </span>
                  )}
                </div>
              </div>

              <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
