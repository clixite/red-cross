import { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { AuthenticatedRequest } from '../auth/auth.middleware.js';

export class SurveyController {
  public static async getByComplaintId(req: Request, res: Response) {
    const { complaintId } = req.params;
    const survey = await prisma.satisfactionSurvey.findUnique({
      where: { complaintId },
      include: { complaint: { select: { portalNumber: true, category: true, closedAt: true } } },
    });

    if (!survey) return res.status(404).json({ error: 'SURVEY_NOT_FOUND' });
    return res.json(survey);
  }

  public static async submit(req: Request, res: Response) {
    const { complaintId } = req.params;
    const { scoreCsat, verbatim } = req.body;

    if (!scoreCsat || scoreCsat < 1 || scoreCsat > 5) {
      return res.status(400).json({ error: 'INVALID_SCORE', message: 'La note de satisfaction doit être comprise entre 1 et 5.' });
    }

    const survey = await prisma.satisfactionSurvey.update({
      where: { complaintId },
      data: {
        scoreCsat: parseInt(scoreCsat, 10),
        verbatim,
        respondedAt: new Date(),
      },
    });

    return res.json({ success: true, message: 'Merci pour votre retour qualité.', survey });
  }

  public static async listAll(req: AuthenticatedRequest, res: Response) {
    const surveys = await prisma.satisfactionSurvey.findMany({
      where: { scoreCsat: { gt: 0 } },
      include: {
        complaint: { select: { portalNumber: true, category: true } },
        organization: { select: { name: true, type: true } },
      },
      orderBy: { respondedAt: 'desc' },
    });

    return res.json(surveys);
  }
}
