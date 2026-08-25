import { Response } from 'express';
import { prisma } from '../db/prisma.js';
import { AuthenticatedRequest } from '../auth/auth.middleware.js';
import { NotificationService } from '../notifications/notification.service.js';
import { PermissionGuard, UserRole } from '@sfs/domain';
import crypto from 'crypto';

export class UserController {
  public static async list(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });

    let whereClause: any = {};
    if (!PermissionGuard.isInternalStaff(req.user.roles)) {
      if (!req.user.organizationId) return res.json([]);
      whereClause.organizationId = req.user.organizationId;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        organizationId: true,
        email: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        language: true,
        roles: true,
        mfaEnabled: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        organization: { select: { id: true, name: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(users);
  }

  public static async invite(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const { email, firstName, lastName, jobTitle, language, roles, organizationId } = req.body;

    if (!email || !firstName || !lastName) {
      return res.status(400).json({ error: 'MISSING_FIELDS' });
    }

    let targetOrgId = organizationId;
    if (!PermissionGuard.isInternalStaff(req.user.roles)) {
      targetOrgId = req.user.organizationId;
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return res.status(400).json({ error: 'EMAIL_ALREADY_EXISTS', message: 'Un utilisateur avec cet email existe déjà.' });
    }

    const invitationToken = crypto.randomBytes(32).toString('hex');
    const invitationExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72h

    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        firstName,
        lastName,
        jobTitle,
        language: language || 'fr',
        roles: roles && roles.length > 0 ? roles : [UserRole.DECLARANT],
        organizationId: targetOrgId || null,
        status: 'invited',
        invitationToken,
        invitationExpiresAt,
      },
      include: { organization: true },
    });

    // Envoi de notification d'invitation
    const activationUrl = `http://localhost:3000/activate?token=${invitationToken}`;
    await NotificationService.send({
      recipientEmail: newUser.email,
      recipientName: `${newUser.firstName} ${newUser.lastName}`,
      language: newUser.language as any,
      type: 'USER_INVITATION',
      data: {
        recipientName: `${newUser.firstName} ${newUser.lastName}`,
        organizationName: newUser.organization?.name || 'Service du Sang',
        activationUrl,
      },
    });

    return res.status(201).json({
      id: newUser.id,
      email: newUser.email,
      status: newUser.status,
      invitationToken,
      activationUrl,
    });
  }
}
