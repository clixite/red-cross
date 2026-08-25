import { Request, Response, NextFunction } from 'express';
import { JwtService, JwtPayload } from './jwt.service.js';
import { UserRole, ResourceAction, PermissionGuard } from '@sfs/domain';

export interface AuthenticatedUser extends JwtPayload {
  organizationId?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'AUTHENTICATION_REQUIRED',
      message: 'Jeton d authentification manquant ou invalide.',
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = JwtService.verify(token);
    req.user = payload;

    // Vérification de l'exigence MFA pour les rôles sensibles
    const sensitiveRoles = [
      UserRole.AGENT_RECEPTION,
      UserRole.RESPONSABLE_QUALITE,
      UserRole.ADMINISTRATEUR,
      UserRole.REFERENT_QUALITE,
    ];

    const hasSensitiveRole = payload.roles.some((r) => sensitiveRoles.includes(r));
    if (hasSensitiveRole && !payload.mfaVerified) {
      // Autoriser seulement les endpoints liés à la validation MFA
      if (!req.path.includes('/auth/mfa')) {
        return res.status(403).json({
          error: 'MFA_VERIFICATION_REQUIRED',
          message: 'Double facteur (TOTP) obligatoire pour ce profil avant d accéder aux ressources.',
        });
      }
    }

    next();
  } catch (err) {
    return res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Session expirée ou jeton d authentification non valide.',
    });
  }
};

export const requirePermission = (action: ResourceAction) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'AUTHENTICATION_REQUIRED' });
    }

    const hasPerm = PermissionGuard.hasPermission(req.user.roles, action);
    if (!hasPerm) {
      return res.status(403).json({
        error: 'FORBIDDEN_ACTION',
        message: `Droits insuffisants pour effectuer l action '${action}'.`,
      });
    }

    next();
  };
};
