import { Response } from 'express';
import { prisma } from '../db/prisma.js';
import { AuthenticatedRequest } from '../auth/auth.middleware.js';
import { StorageService } from '../storage/storage.service.js';
import { PermissionGuard } from '@sfs/domain';

export class DocumentController {
  public static async list(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });

    // Récupérer tous les documents "en_vigueur"
    const documents = await prisma.document.findMany({
      where: { status: 'en_vigueur' },
      include: { audiences: true },
      orderBy: { qualiosReference: 'asc' },
    });

    // Si personnel interne SFS, accès complet
    if (PermissionGuard.isInternalStaff(req.user.roles)) {
      return res.json(documents);
    }

    // Récupérer le type de l'organisation de l'utilisateur
    let orgType: string | null = null;
    if (req.user.organizationId) {
      const org = await prisma.organization.findUnique({ where: { id: req.user.organizationId } });
      orgType = org?.type || null;
    }

    const filtered = documents.filter((doc) => {
      // Si aucune audience spécifique configurée, document public pour tous les clients
      if (!doc.audiences || doc.audiences.length === 0) return true;

      return doc.audiences.some((aud) => {
        // 1. Filtre par type d'organisation
        const matchesType = aud.allowedOrgTypes.length === 0 || (orgType && aud.allowedOrgTypes.includes(orgType as any));

        // 2. Filtre par organisation spécifique
        const matchesOrg = aud.allowedOrgIds.length === 0 || (req.user?.organizationId && aud.allowedOrgIds.includes(req.user.organizationId));

        // 3. Filtre par rôle
        const matchesRole = aud.allowedRoles.length === 0 || aud.allowedRoles.some((r) => req.user?.roles.includes(r as any));

        return matchesType && matchesOrg && matchesRole;
      });
    });

    return res.json(filtered);
  }

  public static async getById(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const document = await prisma.document.findUnique({
      where: { id },
      include: { audiences: true },
    });

    if (!document) {
      return res.status(404).json({ error: 'DOCUMENT_NOT_FOUND', message: 'Document non trouvé.' });
    }

    if (document.status === 'retire') {
      return res.status(410).json({
        error: 'DOCUMENT_RETIRED',
        message: `Ce document (${document.qualiosReference} v${document.version}) a été retiré et n'est plus en vigueur.`,
        reference: document.qualiosReference,
        version: document.version,
      });
    }

    return res.json(document);
  }

  public static async getDownloadUrl(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const document = await prisma.document.findUnique({ where: { id } });

    if (!document) return res.status(404).json({ error: 'DOCUMENT_NOT_FOUND' });

    if (document.status !== 'en_vigueur') {
      return res.status(410).json({
        error: 'DOCUMENT_RETIRED',
        message: 'Impossible de télécharger un document retiré.',
      });
    }

    const downloadUrl = await StorageService.getSignedDownloadUrl(document.storageKey, 900); // 15 min TTL

    return res.json({
      downloadUrl,
      fileName: `${document.qualiosReference}_v${document.version}.pdf`,
      checksum: document.checksum,
      version: document.version,
      applicationDate: document.applicationDate,
    });
  }
}
