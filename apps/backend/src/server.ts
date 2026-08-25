import { createApp } from './app.js';
import { config } from './config.js';
import { StorageService } from './storage/storage.service.js';
import { OutboxWorker } from './qualios/outbox.worker.js';

const startServer = async () => {
  const app = createApp();

  // Initialisation du stockage S3/MinIO
  await StorageService.initBucket();

  // Démarrage du worker Outbox transactionnel (synchronisation Qualios)
  OutboxWorker.start();

  app.listen(config.port, () => {
    console.log(`[BACKEND] Serveur démarré sur http://localhost:${config.port}`);
    console.log(`[BACKEND] Documentation OpenAPI disponible sur http://localhost:${config.port}/api/v1/openapi.json`);
    console.log(`[BACKEND] Adaptateur Qualios actif : ${config.qualios.adapter}`);
  });
};

startServer().catch((err) => {
  console.error('[BACKEND_FATAL_ERROR]', err);
  process.exit(1);
});
