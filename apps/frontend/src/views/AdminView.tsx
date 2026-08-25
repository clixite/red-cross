import React, { useState, useEffect } from 'react';
import { ApiClient } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { Users, UserPlus } from 'lucide-react';

export const AdminView: React.FC = () => {
  const { isInternalStaff, user } = useAuth();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Invite Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteRole, setInviteRole] = useState('declarant');
  const [inviteOrgId, setInviteOrgId] = useState('');
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [orgs, usrs] = await Promise.all([
        ApiClient.request<any[]>('/organizations'),
        ApiClient.request<any[]>('/users'),
      ]);
      setOrganizations(orgs);
      setUsers(usrs);
      if (orgs.length > 0) setInviteOrgId(orgs[0].id);
    } catch (err) {
      console.error('Erreur admin:', err);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteSuccessMsg(null);
    try {
      const result = await ApiClient.request<any>('/users/invite', {
        method: 'POST',
        body: JSON.stringify({
          email: inviteEmail,
          firstName: inviteFirstName,
          lastName: inviteLastName,
          roles: [inviteRole],
          organizationId: isInternalStaff ? inviteOrgId : user?.organization?.id,
        }),
      });

      setInviteSuccessMsg(`Invitation envoyée avec succès à ${inviteEmail} (Lien : ${result.activationUrl})`);
      setInviteEmail('');
      setInviteFirstName('');
      setInviteLastName('');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l envoi de l invitation.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Users className="w-6 h-6 text-blue-600" />
            <span>Administration & Utilisateurs</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestion des organisations clientes, habilitations et invitations
          </p>
        </div>

        <button
          onClick={() => setShowInviteModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          <span>Inviter un Utilisateur</span>
        </button>
      </div>

      {inviteSuccessMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs break-all">
          {inviteSuccessMsg}
        </div>
      )}

      {/* Users list */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <h2 className="font-bold text-sm text-slate-900 dark:text-white">
          Utilisateurs Enregistrés ({users.length})
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-2.5">Nom & Email</th>
                <th className="p-2.5">Organisation</th>
                <th className="p-2.5">Rôles</th>
                <th className="p-2.5">Statut</th>
                <th className="p-2.5">MFA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="p-2.5">
                    <div className="font-bold text-slate-900 dark:text-white">{u.firstName} {u.lastName}</div>
                    <div className="text-slate-400 text-[11px]">{u.email}</div>
                  </td>
                  <td className="p-2.5 text-slate-600 dark:text-slate-300">
                    {u.organization?.name || 'Service du Sang'}
                  </td>
                  <td className="p-2.5 font-mono text-[11px] text-blue-600 dark:text-blue-400">
                    {u.roles.join(', ')}
                  </td>
                  <td className="p-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        u.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="p-2.5">
                    {u.mfaEnabled ? (
                      <span className="text-emerald-600 font-semibold text-[11px]">✓ Actif</span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Non requis</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xl">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              <span>Inviter un Professionnel</span>
            </h3>

            <form onSubmit={handleInviteSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Email professionnel *</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="contact@hopital.be"
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">Prénom *</label>
                  <input
                    type="text"
                    required
                    value={inviteFirstName}
                    onChange={(e) => setInviteFirstName(e.target.value)}
                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">Nom *</label>
                  <input
                    type="text"
                    required
                    value={inviteLastName}
                    onChange={(e) => setInviteLastName(e.target.value)}
                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {isInternalStaff && (
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">Organisation cible *</label>
                  <select
                    value={inviteOrgId}
                    onChange={(e) => setInviteOrgId(e.target.value)}
                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name} ({org.type})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Rôle attribué *</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="declarant">Déclarant (Crée et suit ses réclamations)</option>
                  <option value="referent_qualite">Référent Qualité (Vue sur toute l'organisation)</option>
                  <option value="lecteur">Lecteur Documentaire (Consultation seule)</option>
                  {isInternalStaff && <option value="agent_reception">Agent Réception SFS</option>}
                  {isInternalStaff && <option value="responsable_qualite">Responsable Qualité SFS</option>}
                  {isInternalStaff && <option value="lecteur_direction">Lecteur Direction SFS</option>}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold bg-blue-600 text-white rounded-lg"
                >
                  Envoyer l'invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
