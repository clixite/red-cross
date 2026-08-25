import React, { useState, useEffect } from 'react';
import { ApiClient } from '../api/client.js';
import { ShieldCheck, Download, ShieldAlert } from 'lucide-react';

export const AuditView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const data = await ApiClient.request<any[]>('/audit?limit=100');
      setLogs(data);
    } catch (err) {
      console.error('Erreur chargement audit:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCsv = () => {
    window.open('/api/v1/audit/export-signed-csv', '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            <span>Piste d'Audit Inaltérable (Append-Only)</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Enregistrements scellés et non modifiables — Conformité GMP / AFMPS
          </p>
        </div>

        <button
          onClick={handleDownloadCsv}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
        >
          <Download className="w-4 h-4" />
          <span>Exporter CSV Signé (SHA-256)</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-slate-400">Chargement de la piste d'audit...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-slate-500">Aucun log enregistré pour le moment.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Horodatage (UTC)</th>
                  <th className="p-3">Acteur / Rôle</th>
                  <th className="p-3">Action Qualité</th>
                  <th className="p-3">Entité Cible</th>
                  <th className="p-3">IP / Contexte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {logs.map((log) => {
                  const isSecurityAlert = log.action.includes('SECURITY') || log.action.includes('BLOCKED');
                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                        isSecurityAlert ? 'bg-red-50/50 dark:bg-red-950/20 text-red-900 dark:text-red-300' : ''
                      }`}
                    >
                      <td className="p-3 text-slate-500">{new Date(log.timestamp).toISOString()}</td>
                      <td className="p-3 font-sans">
                        <div className="font-semibold text-slate-900 dark:text-white">{log.actorEmail}</div>
                        <div className="text-[10px] text-slate-400">{log.actorRole}</div>
                      </td>
                      <td className="p-3 font-semibold">
                        {isSecurityAlert ? (
                          <span className="flex items-center space-x-1 text-red-600 dark:text-red-400">
                            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                            <span>{log.action}</span>
                          </span>
                        ) : (
                          <span className="text-blue-600 dark:text-blue-400">{log.action}</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        {log.entityType} ({log.entityId.slice(0, 8)}...)
                      </td>
                      <td className="p-3 text-slate-400">{log.ipAddress}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
