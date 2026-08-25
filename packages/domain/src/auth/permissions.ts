import { UserRole } from '../types/enums.js';

export type ResourceAction =
  | 'documents:read'
  | 'documents:download'
  | 'documents:manage'
  | 'complaints:create'
  | 'complaints:read_own'
  | 'complaints:read_org'
  | 'complaints:read_all'
  | 'complaints:edit_draft'
  | 'complaints:receive_and_qualify'
  | 'complaints:adjudicate_receivability'
  | 'complaints:investigate'
  | 'complaints:request_info'
  | 'complaints:conclude'
  | 'complaints:close'
  | 'messages:create'
  | 'messages:read_internal'
  | 'organizations:manage_own_users'
  | 'organizations:manage_all'
  | 'qualios:manage_sync'
  | 'audit:read'
  | 'audit:export'
  | 'dashboards:view'
  | 'surveys:manage_export';

export const ROLE_PERMISSIONS: Record<UserRole, ResourceAction[]> = {
  [UserRole.LECTEUR]: [
    'documents:read',
    'documents:download',
  ],

  [UserRole.DECLARANT]: [
    'documents:read',
    'documents:download',
    'complaints:create',
    'complaints:read_own',
    'complaints:edit_draft',
    'messages:create',
  ],

  [UserRole.REFERENT_QUALITE]: [
    'documents:read',
    'documents:download',
    'complaints:create',
    'complaints:read_own',
    'complaints:read_org',
    'complaints:edit_draft',
    'messages:create',
    'organizations:manage_own_users',
  ],

  [UserRole.AGENT_RECEPTION]: [
    'documents:read',
    'documents:download',
    'complaints:read_all',
    'complaints:receive_and_qualify',
    'complaints:request_info',
    'messages:create',
    'messages:read_internal',
    'dashboards:view',
  ],

  [UserRole.RESPONSABLE_QUALITE]: [
    'documents:read',
    'documents:download',
    'complaints:read_all',
    'complaints:receive_and_qualify',
    'complaints:adjudicate_receivability',
    'complaints:investigate',
    'complaints:request_info',
    'complaints:conclude',
    'complaints:close',
    'messages:create',
    'messages:read_internal',
    'qualios:manage_sync',
    'audit:read',
    'audit:export',
    'dashboards:view',
    'surveys:manage_export',
  ],

  [UserRole.ADMINISTRATEUR]: [
    'documents:read',
    'documents:download',
    'documents:manage',
    'complaints:create',
    'complaints:read_all',
    'complaints:receive_and_qualify',
    'complaints:adjudicate_receivability',
    'complaints:investigate',
    'complaints:request_info',
    'complaints:conclude',
    'complaints:close',
    'messages:create',
    'messages:read_internal',
    'organizations:manage_own_users',
    'organizations:manage_all',
    'qualios:manage_sync',
    'audit:read',
    'audit:export',
    'dashboards:view',
    'surveys:manage_export',
  ],

  [UserRole.LECTEUR_DIRECTION]: [
    'documents:read',
    'documents:download',
    'dashboards:view',
    'surveys:manage_export',
  ],
};

export class PermissionGuard {
  /**
   * Vérifie si un ensemble de rôles confère une permission spécifique
   */
  public static hasPermission(roles: UserRole[], action: ResourceAction): boolean {
    if (!roles || roles.length === 0) return false;
    return roles.some((role) => {
      const allowedActions = ROLE_PERMISSIONS[role] || [];
      return allowedActions.includes(action);
    });
  }

  /**
   * Vérifie si l'utilisateur est un membre interne du Service du Sang
   */
  public static isInternalStaff(roles: UserRole[]): boolean {
    const internalRoles = [
      UserRole.AGENT_RECEPTION,
      UserRole.RESPONSABLE_QUALITE,
      UserRole.ADMINISTRATEUR,
      UserRole.LECTEUR_DIRECTION,
    ];
    return roles.some((r) => internalRoles.includes(r));
  }

  /**
   * Vérifie si un utilisateur a le droit d'accéder à une réclamation donnée
   */
  public static canAccessComplaint(
    user: { id: string; organizationId?: string | null; roles: UserRole[] },
    complaint: { organizationId: string; declarantId: string }
  ): boolean {
    // 1. Les équipes internes SFS ayant droit de lecture peuvent tout lire
    if (this.isInternalStaff(user.roles)) {
      return this.hasPermission(user.roles, 'complaints:read_all');
    }

    // 2. Cloisonnement strict multi-tenant : même organisation obligatoire
    if (!user.organizationId || user.organizationId !== complaint.organizationId) {
      return false; // Tentative d'accès transversal inter-organisation !
    }

    // 3. Référent qualité client : voit toutes les réclamations de son organisation
    if (user.roles.includes(UserRole.REFERENT_QUALITE)) {
      return true;
    }

    // 4. Déclarant client : voit ses propres réclamations
    if (user.roles.includes(UserRole.DECLARANT)) {
      return complaint.declarantId === user.id;
    }

    return false;
  }
}
