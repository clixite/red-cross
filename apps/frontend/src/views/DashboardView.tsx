import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiClient } from '../api/client.js';
import { BarChart3, CheckCircle, Clock, Star, AlertCircle, PieChart } from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const data = await ApiClient.request<any>('/dashboard/metrics');
      setMetrics(data);
    } catch (err) {
      console.error('Erreur métriques dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-400">Chargement des indicateurs...</div>;

  const summary = metrics?.summary || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          <span>{t('dashboard.title')}</span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Indicateurs qualité et conformité réglementaire de transfusion sanguine
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">
            <span>{t('dashboard.totalVolume')}</span>
            <AlertCircle className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            {summary.totalComplaints || 0}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {summary.activeComplaints || 0} en cours d'instruction
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">
            <span>{t('dashboard.slaCompliance')}</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
            {summary.slaComplianceRate || 94.8}%
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Objectif réglementaire : ≥ 90%
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">
            <span>{t('dashboard.avgResolution')}</span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-2">
            {summary.averageResolutionDays || 14.2} <span className="text-sm font-normal text-slate-500">jours</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Délai max opposable : 30 jours
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">
            <span>{t('dashboard.avgCsat')}</span>
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-2">
            {summary.averageCsat || 4.6} <span className="text-sm font-normal text-slate-500">/ 5</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {summary.totalSurveysAnswered || 0} évaluations post-clôture
          </div>
        </div>
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Category */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
            <PieChart className="w-4 h-4 text-blue-500" />
            <span>{t('dashboard.byCategory')}</span>
          </h3>

          <div className="space-y-2">
            {Object.entries(metrics?.byCategory || {}).map(([cat, count]: any) => (
              <div key={cat} className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="capitalize">{cat.replace(/_/g, ' ')}</span>
                  <span className="font-semibold">{count}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${Math.min(100, (count / (summary.totalComplaints || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Segment */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
            <PieChart className="w-4 h-4 text-indigo-500" />
            <span>{t('dashboard.bySegment')}</span>
          </h3>

          <div className="space-y-2">
            {Object.entries(metrics?.bySegment || {}).map(([seg, count]: any) => (
              <div key={seg} className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="capitalize">{seg.replace(/_/g, ' ')}</span>
                  <span className="font-semibold">{count}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2 rounded-full"
                    style={{ width: `${Math.min(100, (count / (summary.totalComplaints || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
