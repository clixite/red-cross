import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiClient } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import {
  AlertCircle,
  Plus,
  Trash2,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowRight,
} from 'lucide-react';

export const NewComplaintView: React.FC<{ onSuccess: (complaintId: string) => void }> = ({ onSuccess }) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [category, setCategory] = useState('produit_sanguin');
  const [declaredCriticality, setDeclaredCriticality] = useState('mineure');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [patientImpact, setPatientImpact] = useState('non');
  const [patientImpactTypology, setPatientImpactTypology] = useState('aucun');

  // Produits concernés
  const [products, setProducts] = useState([
    {
      productCode: 'E0388V00',
      donationNumber: 'BE999925000001',
      bloodGroup: 'O+',
      quantity: 1,
      measuredTemperature: 4.0,
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdComplaint, setCreatedComplaint] = useState<any | null>(null);

  const addProductRow = () => {
    setProducts([
      ...products,
      {
        productCode: 'E0388V00',
        donationNumber: '',
        bloodGroup: 'A+',
        quantity: 1,
        measuredTemperature: 4.0,
      },
    ]);
  };

  const removeProductRow = (index: number) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  const updateProductRow = (index: number, field: string, val: any) => {
    const updated = [...products];
    (updated[index] as any)[field] = val;
    setProducts(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        category,
        declaredCriticality,
        incidentDate,
        description,
        patientImpact,
        patientImpactTypology,
        products: category === 'produit_sanguin' ? products : [],
      };

      const result = await ApiClient.request<any>('/complaints', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setCreatedComplaint(result);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la soumission de la réclamation.');
    } finally {
      setLoading(false);
    }
  };

  if (createdComplaint) {
    return (
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 p-8 rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-md text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t('complaint.successAck')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Un accusé de réception automatique a été envoyé à <span className="font-semibold">{user?.email}</span>.
          </p>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500 dark:text-slate-400">{t('complaint.portalNumberLabel')} :</span>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-base">
              {createdComplaint.portalNumber}
            </span>
          </div>

          <div className="flex justify-between items-center text-sm border-t border-slate-200 dark:border-slate-700 pt-2">
            <span className="text-slate-500 dark:text-slate-400 flex items-center space-x-1">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>{t('complaint.slaReceivabilityTarget')} (2j ouvrés) :</span>
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {new Date(createdComplaint.slaTargetReceivabilityAt).toLocaleDateString()}
            </span>
          </div>

          <div className="flex justify-between items-center text-sm border-t border-slate-200 dark:border-slate-700 pt-2">
            <span className="text-slate-500 dark:text-slate-400 flex items-center space-x-1">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span>{t('complaint.slaFinalTarget')} (30j) :</span>
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {new Date(createdComplaint.slaTargetFinalResponseAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        <button
          onClick={() => onSuccess(createdComplaint.id)}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm shadow-sm transition-colors flex items-center justify-center space-x-2 mx-auto"
        >
          <span>Consulter et suivre le dossier</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <AlertCircle className="w-6 h-6 text-blue-600" />
          <span>{t('complaint.declareTitle')}</span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t('complaint.declareSubtitle')}
        </p>
      </div>

      {/* Avertissement Strict Anti-Données Patient RGPD */}
      <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 text-amber-800 dark:text-amber-300 rounded-r-lg flex items-start space-x-3 text-xs leading-relaxed">
        <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <div>
          <span className="font-bold">{t('complaint.patientWarning')}</span>
          <p className="mt-0.5 opacity-90">
            Toute mention de NISS belge, date de naissance ou identifiant patient fera l'objet d'un blocage technique automatique côté serveur.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              {t('complaint.category')} *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
            >
              <option value="produit_sanguin">Produit Sanguin Labile (PSL)</option>
              <option value="transport_chaine_du_froid">Transport / Chaîne du froid</option>
              <option value="delai_disponibilite">Délai de disponibilité / Livraison</option>
              <option value="analyse_resultat">Analyse immuno-hématologique</option>
              <option value="documentation">Documentation / Étiquetage</option>
              <option value="livraison_conditionnement">Livraison & Conditionnement</option>
              <option value="relationnel_service">Relationnel & Service</option>
              <option value="facturation">Facturation</option>
              <option value="autre">Autre motif qualité</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              {t('complaint.criticality')} *
            </label>
            <select
              value={declaredCriticality}
              onChange={(e) => setDeclaredCriticality(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
            >
              <option value="mineure">Mineure (Sans risque patient)</option>
              <option value="majeure">Majeure (Risque transfusionnel potentiel)</option>
              <option value="critique">Critique (Urgence / Hémovigilance)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              {t('complaint.incidentDate')} *
            </label>
            <input
              type="date"
              required
              value={incidentDate}
              onChange={(e) => setIncidentDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
            />
          </div>
        </div>

        {/* Traçabilité Produit Sanguin ISBT 128 */}
        {category === 'produit_sanguin' && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {t('complaint.productsTitle')}
              </span>
              <button
                type="button"
                onClick={addProductRow}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('complaint.addProduct')}</span>
              </button>
            </div>

            {products.map((prod, idx) => (
              <div key={idx} className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
                <div className="sm:col-span-2">
                  <label className="text-[10px] uppercase font-semibold text-slate-500">{t('complaint.donationNumber')}</label>
                  <input
                    type="text"
                    required
                    value={prod.donationNumber}
                    onChange={(e) => updateProductRow(idx, 'donationNumber', e.target.value)}
                    placeholder="BE999925000001"
                    className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded bg-transparent font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-semibold text-slate-500">{t('complaint.productCode')}</label>
                  <input
                    type="text"
                    required
                    value={prod.productCode}
                    onChange={(e) => updateProductRow(idx, 'productCode', e.target.value)}
                    placeholder="E0388V00"
                    className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded bg-transparent font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-semibold text-slate-500">{t('complaint.bloodGroup')}</label>
                  <select
                    value={prod.bloodGroup}
                    onChange={(e) => updateProductRow(idx, 'bloodGroup', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded bg-transparent"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex-1">
                    <label className="text-[10px] uppercase font-semibold text-slate-500">{t('complaint.temperature')}</label>
                    <input
                      type="number"
                      step="0.1"
                      value={prod.measuredTemperature}
                      onChange={(e) => updateProductRow(idx, 'measuredTemperature', parseFloat(e.target.value))}
                      className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded bg-transparent"
                    />
                  </div>
                  {products.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeProductRow(idx)}
                      className="p-1 text-red-500 hover:text-red-700 mt-4"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            {t('complaint.description')} *
          </label>
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Décrivez les faits constatés, l'état du colis, les conditions de réception..."
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              {t('complaint.patientImpact')}
            </label>
            <select
              value={patientImpact}
              onChange={(e) => setPatientImpact(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
            >
              <option value="non">Non (Aucun impact patient)</option>
              <option value="oui">Oui (Impact ou retard transfusionnel)</option>
              <option value="inconnu">Inconnu au moment de la déclaration</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              {t('complaint.impactTypology')}
            </label>
            <select
              value={patientImpactTypology}
              onChange={(e) => setPatientImpactTypology(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
            >
              <option value="aucun">Aucun</option>
              <option value="destruction_produit_sans_impact">Destruction de poche sans conséquence patient</option>
              <option value="retard_transfusionnel">Retard transfusionnel sans gravité</option>
              <option value="effet_indesirable_receveur">Effet indésirable receveur (EIR)</option>
              <option value="reaction_transfusionnelle_grave">Réaction transfusionnelle grave (RTG)</option>
              <option value="autre_impact">Autre typologie</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm shadow-md transition-colors disabled:opacity-50"
        >
          {loading ? 'Transmission en cours...' : t('complaint.submitBtn')}
        </button>
      </form>
    </div>
  );
};
