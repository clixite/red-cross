import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiClient } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import {
  ArrowLeft,
  Clock,
  Send,
  FileCheck,
  Star,
} from 'lucide-react';

export const ComplaintDetailView: React.FC<{ complaintId: string; onBack: () => void }> = ({
  complaintId,
  onBack,
}) => {
  const { t } = useTranslation();
  const { isInternalStaff } = useAuth();
  const [complaint, setComplaint] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal / Inputs for transitions
  const [rejectionReason, setRejectionReason] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showConcludeModal, setShowConcludeModal] = useState(false);
  const [showRequestInfoModal, setShowRequestInfoModal] = useState(false);
  const [infoRequestComment, setInfoRequestComment] = useState('');

  // Survey
  const [csatScore, setCsatScore] = useState(5);
  const [csatVerbatim, setCsatVerbatim] = useState('');
  const [surveySubmitted, setSurveySubmitted] = useState(false);

  useEffect(() => {
    fetchDetail();
  }, [complaintId]);

  const fetchDetail = async () => {
    try {
      const data = await ApiClient.request<any>(`/complaints/${complaintId}`);
      setComplaint(data);
    } catch (err) {
      console.error('Erreur chargement réclamation:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await ApiClient.request(`/complaints/${complaintId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          content: newMessage,
          visibility: isInternalNote ? 'interne_sfs' : 'partage_client',
        }),
      });
      setNewMessage('');
      fetchDetail();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l envoi du message.');
    }
  };

  const handleTransition = async (toStatus: string, payload: Record<string, any> = {}) => {
    setActionLoading(true);
    try {
      await ApiClient.request(`/complaints/${complaintId}/transition`, {
        method: 'POST',
        body: JSON.stringify({ toStatus, ...payload }),
      });
      setShowRejectModal(false);
      setShowConcludeModal(false);
      setShowRequestInfoModal(false);
      fetchDetail();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la transition d état.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSurveySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiClient.request(`/surveys/complaint/${complaintId}`, {
        method: 'POST',
        body: JSON.stringify({ scoreCsat: csatScore, verbatim: csatVerbatim }),
      });
      setSurveySubmitted(true);
      fetchDetail();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la soumission de l enquête.');
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-400">Chargement du dossier...</div>;
  if (!complaint) return <div className="text-center py-12 text-red-500">Dossier introuvable.</div>;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 flex items-center space-x-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à la liste</span>
        </button>

        <div className="flex items-center space-x-2 font-mono text-sm">
          <span className="text-slate-400">Dossier :</span>
          <span className="font-bold text-blue-600 dark:text-blue-400">{complaint.portalNumber}</span>
          {complaint.qualiosNonConformityRef && (
            <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded text-xs">
              Qualios Ref: {complaint.qualiosNonConformityRef}
            </span>
          )}
        </div>
      </div>

      {/* Main Grid: Details + Timeline / Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Complaint metadata & SFS Actions */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="font-bold text-base text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              Informations Générales
            </h2>

            <div className="text-xs space-y-2 text-slate-600 dark:text-slate-400">
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Organisation :</span>{' '}
                {complaint.organization?.name}
              </div>
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Déclarant :</span>{' '}
                {complaint.declarant?.firstName} {complaint.declarant?.lastName} ({complaint.declarant?.email})
              </div>
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Catégorie :</span>{' '}
                <span className="capitalize">{complaint.category.replace(/_/g, ' ')}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Criticité déclarée :</span>{' '}
                <span className="uppercase font-mono font-bold text-amber-600">{complaint.declaredCriticality}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Date survenue :</span>{' '}
                {new Date(complaint.incidentDate).toLocaleDateString()}
              </div>
            </div>

            {/* SLA Box */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs space-y-2 border border-slate-200 dark:border-slate-700">
              <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>Engagements de Service (SLA)</span>
              </div>
              {complaint.slaSuspendedAt ? (
                <div className="p-2 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded font-semibold text-[11px]">
                  ⏸ Chronomètre SLA suspendu en attente d'information du déclarant.
                </div>
              ) : (
                <div className="space-y-1 text-slate-500 dark:text-slate-400">
                  <div>
                    Recevabilité cible :{' '}
                    <strong>{complaint.slaTargetReceivabilityAt ? new Date(complaint.slaTargetReceivabilityAt).toLocaleDateString() : 'N/A'}</strong>
                  </div>
                  <div>
                    Réponse finale cible :{' '}
                    <strong>{complaint.slaTargetFinalResponseAt ? new Date(complaint.slaTargetFinalResponseAt).toLocaleDateString() : 'N/A'}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Produits sanguins */}
            {complaint.products && complaint.products.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Unités Sanguines ({complaint.products.length})
                </div>
                {complaint.products.map((p: any) => (
                  <div key={p.id} className="p-2 bg-blue-50/50 dark:bg-blue-950/30 rounded border border-blue-100 dark:border-blue-900 text-xs font-mono space-y-0.5">
                    <div className="text-blue-700 dark:text-blue-300 font-bold">Don: {p.donationNumber}</div>
                    <div className="text-slate-600 dark:text-slate-400 text-[11px]">
                      Code: {p.productCode} | Grp: {p.bloodGroup || 'N/A'} | Temp: {p.measuredTemperature ? `${p.measuredTemperature}°C` : 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SFS Back-office Action Buttons */}
          {isInternalStaff && (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-blue-200 dark:border-blue-900 shadow-sm space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-blue-700 dark:text-blue-400">
                Actions Workflow Qualité SFS
              </h3>

              {complaint.status === 'recue' && (
                <button
                  onClick={() => handleTransition('en_analyse_recevabilite')}
                  disabled={actionLoading}
                  className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Ouvrir l'analyse de recevabilité
                </button>
              )}

              {complaint.status === 'en_analyse_recevabilite' && (
                <div className="space-y-2">
                  <button
                    onClick={() => handleTransition('en_investigation')}
                    disabled={actionLoading}
                    className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                  >
                    Déclarer Recevable ➔ Ouvrir Investigation
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={actionLoading}
                    className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                  >
                    Déclarer Irrecevable (Rejet avec motif)
                  </button>
                </div>
              )}

              {complaint.status === 'en_investigation' && (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowRequestInfoModal(true)}
                    disabled={actionLoading}
                    className="w-full py-2 px-3 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                  >
                    Demander un complément d'info (Gèle le SLA)
                  </button>
                  <button
                    onClick={() => setShowConcludeModal(true)}
                    disabled={actionLoading}
                    className="w-full py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                  >
                    Prononcer la conclusion technique
                  </button>
                </div>
              )}

              {complaint.status === 'conclue' && (
                <button
                  onClick={() => handleTransition('cloturee')}
                  disabled={actionLoading}
                  className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Clôturer définitivement le dossier (Envoie Enquête CSAT)
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Description, Timeline & Discussion */}
        <div className="space-y-6 lg:col-span-2">
          {/* Description */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
              Description Déclarée de l'Incident
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
              {complaint.description}
            </p>
          </div>

          {/* Conclusion if available */}
          {complaint.conclusion && (
            <div className="p-4 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl space-y-2">
              <h3 className="font-bold text-sm text-teal-800 dark:text-teal-300 flex items-center space-x-1.5">
                <FileCheck className="w-4 h-4" />
                <span>{t('tracking.conclusionTitle')}</span>
              </h3>
              <p className="text-sm text-teal-900 dark:text-teal-200 whitespace-pre-wrap">
                {complaint.conclusion}
              </p>
              {complaint.correctiveActionsSummary && (
                <div className="text-xs text-teal-700 dark:text-teal-400 pt-1 border-t border-teal-200 dark:border-teal-800">
                  <strong>Actions correctives (CAPA) :</strong> {complaint.correctiveActionsSummary}
                </div>
              )}
            </div>
          )}

          {/* Enquête de satisfaction post-clôture */}
          {complaint.status === 'cloturee' && !isInternalStaff && (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-amber-200 dark:border-amber-800 shadow-sm space-y-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>{t('tracking.takeSurvey')}</span>
              </h3>

              {complaint.satisfactionSurvey?.respondedAt || surveySubmitted ? (
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  ✓ Merci, votre évaluation a bien été enregistrée.
                </div>
              ) : (
                <form onSubmit={handleSurveySubmit} className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-500">Note de satisfaction globale :</span>
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setCsatScore(val)}
                        className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
                          csatScore === val ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={csatVerbatim}
                    onChange={(e) => setCsatVerbatim(e.target.value)}
                    placeholder="Commentaire ou suggestion d'amélioration..."
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />

                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold"
                  >
                    Envoyer mon évaluation
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Timeline & Discussion Thread */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
              {t('tracking.messages')}
            </h3>

            {/* Message List */}
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {complaint.messages?.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-4">Aucun message pour le moment.</div>
              ) : (
                complaint.messages?.map((m: any) => (
                  <div
                    key={m.id}
                    className={`p-3 rounded-xl text-xs space-y-1 ${
                      m.visibility === 'interne_sfs'
                        ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-center text-[10px] opacity-75">
                      <span className="font-bold">
                        {m.authorName} ({m.authorOrganization})
                        {m.visibility === 'interne_sfs' && ' • NOTE INTERNE SFS'}
                      </span>
                      <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Send Box */}
            <form onSubmit={handleSendMessage} className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <textarea
                rows={2}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={t('tracking.messagePlaceholder')}
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />

              <div className="flex items-center justify-between">
                {isInternalStaff && (
                  <label className="flex items-center space-x-1.5 text-xs text-amber-700 dark:text-amber-400">
                    <input
                      type="checkbox"
                      checked={isInternalNote}
                      onChange={(e) => setIsInternalNote(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>Note interne SFS (invisible client)</span>
                  </label>
                )}

                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 ml-auto"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{t('tracking.sendReply')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Modal Rejet / Irrecevabilité */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xl">
            <h3 className="font-bold text-base text-rose-600">Prononcer l'Irrecevabilité</h3>
            <p className="text-xs text-slate-500">
              Un motif explicite et motivé est légalement obligatoire. Il sera communiqué au déclarant.
            </p>
            <textarea
              required
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Motif de non-recevabilité (ex: produit non issu du Service du Sang, délai forclos)..."
              className="w-full p-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={() => handleTransition('irrecevable', { rejectionReason })}
                className="px-4 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded-lg"
              >
                Confirmer l'irrecevabilité
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Conclusion */}
      {showConcludeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xl">
            <h3 className="font-bold text-base text-teal-600">Prononcer la Conclusion Technique</h3>
            <textarea
              required
              rows={3}
              value={conclusion}
              onChange={(e) => setConclusion(e.target.value)}
              placeholder="Synthèse de l'investigation, cause racine identifiée..."
              className="w-full p-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowConcludeModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={() => handleTransition('conclue', { conclusion })}
                className="px-4 py-1.5 text-xs font-semibold bg-teal-600 text-white rounded-lg"
              >
                Enregistrer la conclusion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Demande d'information */}
      {showRequestInfoModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xl">
            <h3 className="font-bold text-base text-orange-600">Demander un Complément d'Information</h3>
            <p className="text-xs text-slate-500">
              Le chronomètre de SLA sera automatiquement gelé jusqu'à la réponse du client.
            </p>
            <textarea
              required
              rows={3}
              value={infoRequestComment}
              onChange={(e) => setInfoRequestComment(e.target.value)}
              placeholder="Précisez les éléments requis (ex: photo du numéro de lot, courbe de température)..."
              className="w-full p-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowRequestInfoModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={() => handleTransition('information_complementaire_demandee', { comment: infoRequestComment })}
                className="px-4 py-1.5 text-xs font-semibold bg-orange-600 text-white rounded-lg"
              >
                Envoyer la demande
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
