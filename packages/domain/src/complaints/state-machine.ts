import { ComplaintStatus, UserRole } from '../types/enums.js';

export interface TransitionPayload {
  toStatus: ComplaintStatus;
  userRole: UserRole;
  rejectionReason?: string;
  validatedCriticality?: string;
  conclusion?: string;
  correctiveActionsSummary?: string;
}

export interface TransitionResult {
  valid: boolean;
  error?: string;
  requiresRejectionReason?: boolean;
  requiresConclusion?: boolean;
  isTerminal?: boolean;
}

export const VALID_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  [ComplaintStatus.BROUILLON]: [ComplaintStatus.SOUMISE],
  [ComplaintStatus.SOUMISE]: [ComplaintStatus.RECUE],
  [ComplaintStatus.RECUE]: [ComplaintStatus.EN_ANALYSE_RECEVABILITE],
  [ComplaintStatus.EN_ANALYSE_RECEVABILITE]: [
    ComplaintStatus.IRRECEVABLE,
    ComplaintStatus.EN_INVESTIGATION,
  ],
  [ComplaintStatus.IRRECEVABLE]: [], // Terminal
  [ComplaintStatus.EN_INVESTIGATION]: [
    ComplaintStatus.INFORMATION_COMPLEMENTAIRE_DEMANDEE,
    ComplaintStatus.CONCLUE,
  ],
  [ComplaintStatus.INFORMATION_COMPLEMENTAIRE_DEMANDEE]: [
    ComplaintStatus.EN_INVESTIGATION,
  ],
  [ComplaintStatus.CONCLUE]: [ComplaintStatus.CLOTUREE],
  [ComplaintStatus.CLOTUREE]: [], // Terminal
};

export const SFS_INTERNAL_ROLES: UserRole[] = [
  UserRole.AGENT_RECEPTION,
  UserRole.RESPONSABLE_QUALITE,
  UserRole.ADMINISTRATEUR,
];

export const CLIENT_EDIT_ROLES: UserRole[] = [
  UserRole.DECLARANT,
  UserRole.REFERENT_QUALITE,
];

export class ComplaintStateMachine {
  /**
   * Vérifie si une transition entre deux statuts est valide selon le graphe d'états
   */
  public static canTransition(
    currentStatus: ComplaintStatus,
    targetStatus: ComplaintStatus
  ): boolean {
    const allowed = VALID_TRANSITIONS[currentStatus];
    return allowed ? allowed.includes(targetStatus) : false;
  }

  /**
   * Valide une transition complète en tenant compte du rôle de l'utilisateur et des champs requis
   */
  public static validateTransition(
    currentStatus: ComplaintStatus,
    payload: TransitionPayload
  ): TransitionResult {
    const { toStatus, userRole, rejectionReason, conclusion } = payload;

    if (!this.canTransition(currentStatus, toStatus)) {
      return {
        valid: false,
        error: `Transition non autorisée de '${currentStatus}' vers '${toStatus}'.`,
      };
    }

    // Contrôles spécifiques de rôles pour chaque transition
    if (currentStatus === ComplaintStatus.BROUILLON && toStatus === ComplaintStatus.SOUMISE) {
      if (!CLIENT_EDIT_ROLES.includes(userRole) && userRole !== UserRole.ADMINISTRATEUR) {
        return { valid: false, error: "Seul un déclarant ou un référent qualité peut soumettre une réclamation." };
      }
    }

    if (toStatus === ComplaintStatus.IRRECEVABLE) {
      if (userRole !== UserRole.RESPONSABLE_QUALITE && userRole !== UserRole.ADMINISTRATEUR) {
        return { valid: false, error: "Seul le responsable qualité ou l'administrateur peut déclarer une réclamation irrecevable." };
      }
      if (!rejectionReason || rejectionReason.trim().length < 5) {
        return {
          valid: false,
          error: "Un motif explicite de rejet (au moins 5 caractères) est obligatoire pour déclarer l'irrecevabilité.",
          requiresRejectionReason: true,
        };
      }
    }

    if (currentStatus === ComplaintStatus.EN_ANALYSE_RECEVABILITE && toStatus === ComplaintStatus.EN_INVESTIGATION) {
      if (userRole !== UserRole.RESPONSABLE_QUALITE && userRole !== UserRole.ADMINISTRATEUR) {
        return { valid: false, error: "Seul le responsable qualité ou l'administrateur peut ouvrir l'investigation." };
      }
    }

    if (toStatus === ComplaintStatus.INFORMATION_COMPLEMENTAIRE_DEMANDEE) {
      if (!SFS_INTERNAL_ROLES.includes(userRole)) {
        return { valid: false, error: "Seul un agent ou responsable SFS peut demander des informations complémentaires." };
      }
    }

    if (currentStatus === ComplaintStatus.INFORMATION_COMPLEMENTAIRE_DEMANDEE && toStatus === ComplaintStatus.EN_INVESTIGATION) {
      // Peut être déclenché par le client qui répond ou le SFS qui valide la réponse
      if (!CLIENT_EDIT_ROLES.includes(userRole) && !SFS_INTERNAL_ROLES.includes(userRole)) {
        return { valid: false, error: "Rôle non autorisé pour reprendre l'investigation." };
      }
    }

    if (toStatus === ComplaintStatus.CONCLUE) {
      if (userRole !== UserRole.RESPONSABLE_QUALITE && userRole !== UserRole.ADMINISTRATEUR) {
        return { valid: false, error: "Seul le responsable qualité ou l'administrateur peut conclure une réclamation." };
      }
      if (!conclusion || conclusion.trim().length < 10) {
        return {
          valid: false,
          error: "Une conclusion détaillée (au moins 10 caractères) est obligatoire pour prononcer la conclusion.",
          requiresConclusion: true,
        };
      }
    }

    if (toStatus === ComplaintStatus.CLOTUREE) {
      if (userRole !== UserRole.RESPONSABLE_QUALITE && userRole !== UserRole.ADMINISTRATEUR) {
        return { valid: false, error: "Seul le responsable qualité ou l'administrateur peut clôturer une réclamation." };
      }
    }

    const isTerminal = toStatus === ComplaintStatus.IRRECEVABLE || toStatus === ComplaintStatus.CLOTUREE;

    return { valid: true, isTerminal };
  }

  /**
   * Retourne la liste des statuts cibles autorisés depuis le statut actuel pour un rôle donné
   */
  public static getAllowedNextStatuses(
    currentStatus: ComplaintStatus,
    role: UserRole
  ): ComplaintStatus[] {
    const rawAllowed = VALID_TRANSITIONS[currentStatus] || [];
    return rawAllowed.filter((target) => {
      // Basic role pre-check
      if (target === ComplaintStatus.SOUMISE && !CLIENT_EDIT_ROLES.includes(role) && role !== UserRole.ADMINISTRATEUR) return false;
      if (target === ComplaintStatus.IRRECEVABLE && role !== UserRole.RESPONSABLE_QUALITE && role !== UserRole.ADMINISTRATEUR) return false;
      if (target === ComplaintStatus.CONCLUE && role !== UserRole.RESPONSABLE_QUALITE && role !== UserRole.ADMINISTRATEUR) return false;
      if (target === ComplaintStatus.CLOTUREE && role !== UserRole.RESPONSABLE_QUALITE && role !== UserRole.ADMINISTRATEUR) return false;
      return true;
    });
  }
}
