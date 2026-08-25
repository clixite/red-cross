import { Response } from 'express';
import { prisma } from '../db/prisma.js';
import { AuthenticatedRequest } from '../auth/auth.middleware.js';
import { StorageService } from '../storage/storage.service.js';
import { AntivirusService } from '../antivirus/antivirus.service.js';

export class AttachmentController {
  public static async upload(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({ error: 'FILE_REQUIRED', message: 'Aucun fichier fourni.' });
    }

    const { complaintId, messageId } = req.body;

    // 1. Analyse Antivirus
    const scan = await AntivirusService.scanBuffer(file.buffer, file.originalname, file.mimetype);
    if (!scan.isClean) {
      return res.status(400).json({
        error: 'ANTIVIRUS_REJECTED',
        threat: scan.threatName,
        message: scan.details || 'Fichier rejeté par la politique de sécurité antivirus.',
      });
    }

    // 2. Upload vers stockage objets S3/MinIO
    const { storageKey } = await StorageService.uploadFile(file.buffer, file.originalname, file.mimetype);

    // 3. Enregistrement en base
    const attachment = await prisma.attachment.create({
      data: {
        complaintId: complaintId || null,
        messageId: messageId || null,
        fileName: file.originalname,
        fileSizeBytes: file.size,
        mimeType: file.mimetype,
        storageKey,
        antivirusStatus: 'clean',
        uploadedById: req.user.userId,
      },
    });

    const downloadUrl = await StorageService.getSignedDownloadUrl(storageKey, 900);

    return res.status(201).json({
      ...attachment,
      downloadUrl,
    });
  }

  public static async getSignedUrl(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const attachment = await prisma.attachment.findUnique({ where: { id } });
    if (!attachment) return res.status(404).json({ error: 'ATTACHMENT_NOT_FOUND' });

    const downloadUrl = await StorageService.getSignedDownloadUrl(attachment.storageKey, 900);
    return res.json({ downloadUrl, fileName: attachment.fileName });
  }
}
