import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';
import { PermissionGuard } from '@sfs/domain';

export const requireTenantMatch = (
  extractResourceOrgId: (req: AuthenticatedRequest) => string | undefined | null
) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'AUTHENTICATION_REQUIRED' });
    }

    // Les personnels internes SFS ont une vue globale (selon permissions)
    if (PermissionGuard.isInternalStaff(req.user.roles)) {
      return next();
    }

    const targetOrgId = extractResourceOrgId(req);

    // Si la ressource ciblée ne spécifie pas d'organisation, on applique l'organisation de l'utilisateur
    if (!targetOrgId) {
      return next();
    }

    // Cloisonnement strict multi-tenant pour les clients
    if (!req.user.organizationId || req.user.organizationId !== targetOrgId) {
      // Log de sécurité
      console.warn(
        `[SECURITY_ALERT] Tentative d accès transversal bloquée! User: ${req.user.userId} (Org: ${req.user.organizationId}) -> Cible Org: ${targetOrgId} | IP: ${req.ip} | Route: ${req.method} ${req.originalUrl}`
      );

      return res.status(403).json({
        error: 'TENANT_ACCESS_DENIED',
        message: 'Accès interdit : Cette ressource appartient à une autre organisation.',
      });
    }

    next();
  };
};
