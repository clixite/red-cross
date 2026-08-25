import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { apiRouter } from './routes/api.router.js';

export const createApp = (): Express => {
  const app = express();

  // Middleware de sécurité
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Correlation ID / Trace Request ID
  app.use((req: Request, res: Response, next: NextFunction) => {
    const correlationId = (req.headers['x-correlation-id'] as string) || crypto.randomUUID();
    res.setHeader('x-correlation-id', correlationId);
    next();
  });

  // Endpoints de Santé & Observabilité
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'HEALTHY', timestamp: new Date().toISOString() });
  });

  app.get('/ready', (req: Request, res: Response) => {
    res.json({ status: 'READY', uptime: process.uptime() });
  });

  // Routes API v1
  app.use('/api/v1', apiRouter);

  // Gestionnaire d'erreurs global (JSON structuré)
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('[UNHANDLED_ERROR]', err);
    res.status(err.status || 500).json({
      error: err.name || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'Une erreur interne est survenue.',
      correlationId: res.getHeader('x-correlation-id'),
    });
  });

  return app;
};
