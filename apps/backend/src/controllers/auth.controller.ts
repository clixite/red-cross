import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db/prisma.js';
import { JwtService } from '../auth/jwt.service.js';
import { MfaService } from '../auth/mfa.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AuthenticatedRequest } from '../auth/auth.middleware.js';
import { UserRole } from '@sfs/domain';

export class AuthController {
  public static async login(req: Request, res: Response) {
    const { email, password, totpCode } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'EMAIL_AND_PASSWORD_REQUIRED', message: 'Email et mot de passe obligatoires.' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { organization: true },
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Identifiants invalides.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'ACCOUNT_NOT_ACTIVE', message: 'Ce compte n est pas actif ou est suspendu.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Identifiants invalides.' });
    }

    // Gestion MFA
    let mfaVerified = !user.mfaEnabled;
    if (user.mfaEnabled && user.mfaSecret) {
      if (!totpCode) {
        return res.status(200).json({
          requiresMfa: true,
          tempToken: JwtService.sign(
            {
              userId: user.id,
              email: user.email,
              organizationId: user.organizationId,
              roles: user.roles as any,
              mfaVerified: false,
            },
            '10m'
          ),
          message: 'Code TOTP double facteur requis.',
        });
      }

      const isValid = MfaService.verifyToken(totpCode, user.mfaSecret);
      if (!isValid) {
        return res.status(401).json({ error: 'INVALID_MFA_CODE', message: 'Code TOTP invalide.' });
      }
      mfaVerified = true;
    }

    // Mise à jour de la dernière connexion
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = JwtService.sign({
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId,
      roles: user.roles as any,
      mfaVerified,
    });

    await AuditService.log({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.roles.join(','),
      actorOrgId: user.organizationId,
      action: 'USER_LOGIN_SUCCESS',
      entityType: 'USER',
      entityId: user.id,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'],
    });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        language: user.language,
        organization: user.organization,
        mfaEnabled: user.mfaEnabled,
      },
    });
  }

  public static async getMe(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { organization: true },
    });

    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });

    return res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      jobTitle: user.jobTitle,
      language: user.language,
      roles: user.roles,
      organization: user.organization,
      mfaEnabled: user.mfaEnabled,
      consentQualityCharter: user.consentQualityCharter,
      lastLoginAt: user.lastLoginAt,
    });
  }

  public static async setupMfa(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const secret = MfaService.generateSecret();
    const { otpauthUrl, qrCodeDataUrl } = await MfaService.generateQrCode(req.user.email, secret);

    // Stockage temporaire du secret
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { mfaSecret: secret },
    });

    return res.json({
      secret,
      otpauthUrl,
      qrCodeDataUrl,
    });
  }

  public static async confirmMfa(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const { totpCode } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user || !user.mfaSecret) {
      return res.status(400).json({ error: 'MFA_NOT_INITIALIZED' });
    }

    const isValid = MfaService.verifyToken(totpCode, user.mfaSecret);
    if (!isValid) {
      return res.status(400).json({ error: 'INVALID_TOTP_CODE', message: 'Le code saisi est incorrect.' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { mfaEnabled: true },
    });

    const token = JwtService.sign({
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId,
      roles: user.roles as any,
      mfaVerified: true,
    });

    return res.json({ success: true, token, message: 'MFA activé avec succès.' });
  }

  public static async activateInvitation(req: Request, res: Response) {
    const { token, password, consentCharter } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'TOKEN_AND_PASSWORD_REQUIRED' });
    }

    const user = await prisma.user.findFirst({
      where: {
        invitationToken: token,
        invitationExpiresAt: { gte: new Date() },
        status: 'invited',
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'INVALID_OR_EXPIRED_TOKEN', message: 'Lien d invitation invalide ou expiré.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        status: 'active',
        consentQualityCharter: !!consentCharter,
        invitationToken: null,
        invitationExpiresAt: null,
      },
    });

    return res.json({ success: true, message: 'Compte activé avec succès. Vous pouvez désormais vous connecter.' });
  }
}
