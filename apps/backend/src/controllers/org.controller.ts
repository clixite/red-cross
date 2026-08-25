import { Response } from 'express';
import { prisma } from '../db/prisma.js';
import { AuthenticatedRequest } from '../auth/auth.middleware.js';
import { PermissionGuard } from '@sfs/domain';

export class OrgController {
  public static async list(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });

    if (PermissionGuard.isInternalStaff(req.user.roles)) {
      const orgs = await prisma.organization.findMany({
        orderBy: { name: 'asc' },
        include: { _count: { select: { users: true, complaints: true } } },
      });
      return res.json(orgs);
    }

    if (!req.user.organizationId) {
      return res.json([]);
    }

    const org = await prisma.organization.findUnique({
      where: { id: req.user.organizationId },
      include: { _count: { select: { users: true, complaints: true } } },
    });

    return res.json(org ? [org] : []);
  }

  public static async getById(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const org = await prisma.organization.findUnique({
      where: { id },
      include: { users: true, _count: { select: { complaints: true } } },
    });

    if (!org) return res.status(404).json({ error: 'ORGANIZATION_NOT_FOUND' });
    return res.json(org);
  }

  public static async create(req: AuthenticatedRequest, res: Response) {
    const { name, type, businessNumber, siteName, address, defaultLanguage } = req.body;

    if (!name || !type || !address) {
      return res.status(400).json({ error: 'MISSING_FIELDS', message: 'Nom, type et adresse obligatoires.' });
    }

    const org = await prisma.organization.create({
      data: {
        name,
        type: type as any,
        businessNumber,
        siteName,
        address,
        defaultLanguage: defaultLanguage || 'fr',
      },
    });

    return res.status(201).json(org);
  }
}
