import { describe, it, expect } from 'vitest';
import {
  PermissionGuard,
  UserRole,
  ROLE_PERMISSIONS,
  ResourceAction,
} from '../src/index.js';

describe('PermissionGuard & Matrice de Droits', () => {
  it('garantit que chaque rôle dispose exactement des permissions déclarées', () => {
    // Vérification exhaustive de la table des rôles
    const allRoles = Object.values(UserRole);
    for (const role of allRoles) {
      const perms = ROLE_PERMISSIONS[role];
      expect(perms).toBeDefined();
      expect(Array.isArray(perms)).toBe(true);

      for (const p of perms) {
        expect(PermissionGuard.hasPermission([role], p as ResourceAction)).toBe(true);
      }
    }
  });

  it('bloque strictement un lecteur documentaire sur la création de réclamations', () => {
    expect(PermissionGuard.hasPermission([UserRole.LECTEUR], 'complaints:create')).toBe(false);
    expect(PermissionGuard.hasPermission([UserRole.LECTEUR], 'documents:read')).toBe(true);
  });

  it('interdit l accès transversal entre deux organisations clientes distinctes (Multi-tenant)', () => {
    const userClientA = {
      id: 'user-001',
      organizationId: 'org-chu-charleroi',
      roles: [UserRole.REFERENT_QUALITE],
    };

    const complaintOrgB = {
      organizationId: 'org-hopital-namur',
      declarantId: 'user-999',
    };

    const complaintOrgA = {
      organizationId: 'org-chu-charleroi',
      declarantId: 'user-888',
    };

    // Refus catégorique pour l'organisation B
    expect(PermissionGuard.canAccessComplaint(userClientA, complaintOrgB)).toBe(false);

    // Accord pour l'organisation A car rôle REFERENT_QUALITE
    expect(PermissionGuard.canAccessComplaint(userClientA, complaintOrgA)).toBe(true);
  });

  it('autorise les agents et responsables SFS à accéder aux réclamations de toutes les organisations', () => {
    const sfsResp = {
      id: 'sfs-user-01',
      organizationId: null,
      roles: [UserRole.RESPONSABLE_QUALITE],
    };

    const complaintAny = {
      organizationId: 'org-any-hospital',
      declarantId: 'any-user',
    };

    expect(PermissionGuard.canAccessComplaint(sfsResp, complaintAny)).toBe(true);
  });
});
