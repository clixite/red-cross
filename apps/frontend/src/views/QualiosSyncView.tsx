import React, { useState, useEffect } from 'react';
import { ApiClient } from '../api/client.js';
import { RefreshCw, CheckCircle2, RotateCcw, Activity } from 'lucide-react';

export const QualiosSyncView: React.FC = () => {
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [outboxTasks, setOutboxTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [logs, tasks] = await Promise.all([
        ApiClient.request<any[]>('/qualios/sync-logs'),
        ApiClient.request<any[]>('/qualios/outbox/tasks'),
      ]);
      setSyncLogs(logs);
      setOutboxTasks(tasks);
    } catch (err) {
      console.error('Erreur chargement synchronisation Qualios:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetryTask = async (taskId: string) => {
    try {
      await ApiClient.request(`/qualios/outbox/retry/${taskId}`, { method: 'POST' });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Erreur lors du rejeu de la tâche.');
    }
  };

  const handleRunReconciliation = async () => {
    setReconciling(true);
    try {
      const result = await ApiClient.request<{ totalChecked: number; discrepanciesFound: number }>(
        '/qualios/reconcile',
        { method: 'POST' }
      );
      alert(`Réconciliation terminée : ${result.totalChecked} réclamations vérifiées, ${result.discrepanciesFound} écarts détectés.`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la réconciliation.');
    } finally {
      setReconciling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <RefreshCw className="w-6 h-6 text-blue-600" />
            <span>Intégration & Synchronisation Qualios</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Outbox Pattern transactionnel, clés d'idempotence et Dead-Letter Queue
          </p>
        </div>

        <button
          onClick={handleRunReconciliation}
          disabled={reconciling}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
        >
          <Activity className="w-4 h-4" />
          <span>{reconciling ? 'Contrôle en cours...' : 'Lancer Réconciliation Immédiate'}</span>
        </button>
      </div>

      {/* Dead-Letter Queue & Outbox Tasks */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <h2 className="font-bold text-sm text-slate-900 dark:text-white">
          File Outbox & Dead-Letter Queue (DLQ)
        </h2>

        {loading ? (
          <div className="text-center py-6 text-slate-400">Chargement...</div>
        ) : outboxTasks.length === 0 ? (
          <div className="text-xs text-slate-400 py-3">Aucune tâche en file d'attente.</div>
        ) : (
          <div className="space-y-2">
            {outboxTasks.map((t) => (
              <div
                key={t.id}
                className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-between text-xs font-mono"
              >
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{t.taskType}</div>
                  <div className="text-[11px] text-slate-500">
                    Clé: {t.idempotencyKey} | Statut: <span className="font-bold uppercase text-blue-500">{t.status}</span> (Tentatives: {t.retries}/{t.maxRetries})
                  </div>
                  {t.lastError && (
                    <div className="text-[10px] text-red-500 font-sans mt-0.5">Erreur: {t.lastError}</div>
                  )}
                </div>

                {t.status === 'dead_letter' || t.status === 'failed' ? (
                  <button
                    onClick={() => handleRetryTask(t.id)}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-sans flex items-center space-x-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Rejouer</span>
                  </button>
                ) : (
                  <span className="text-emerald-600 text-[11px] font-sans flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Pris en charge</span>
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sync Logs */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <h2 className="font-bold text-sm text-slate-900 dark:text-white">
          Journal des Échanges Qualios
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-2.5">Date (UTC)</th>
                <th className="p-2.5">Sens / Adaptateur</th>
                <th className="p-2.5">Entité / Réf</th>
                <th className="p-2.5">Statut</th>
                <th className="p-2.5">Latence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {syncLogs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="p-2.5 text-slate-500">{new Date(l.timestamp).toLocaleTimeString()}</td>
                  <td className="p-2.5 font-sans">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{l.direction}</span> ({l.adapter})
                  </td>
                  <td className="p-2.5 font-bold text-blue-600 dark:text-blue-400">
                    {l.qualiosRef || l.entityId.slice(0, 8)}
                  </td>
                  <td className="p-2.5 font-sans">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        l.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td className="p-2.5 text-slate-500">{l.latencyMs}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
