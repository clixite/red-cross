export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'API Portail Clients - Service du Sang (Croix-Rouge de Belgique)',
    version: '1.0.0',
    description:
      'API REST sécurisée pour le portail B2B réglementé des professionnels de santé. Gestion documentaire contrôlée, réclamations produits ISBT 128, traçabilité inaltérable et synchronisation Qualios.',
    contact: {
      name: 'Service Qualité - Service du Sang',
      email: 'qualite-service-du-sang@croix-rouge-demo.be',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Serveur API v1',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
  paths: {
    '/auth/login': {
      post: {
        summary: 'Authentification utilisateur avec mot de passe et support MFA',
        tags: ['Authentification'],
      },
    },
    '/auth/me': {
      get: {
        summary: 'Récupérer le profil de l utilisateur connecté',
        tags: ['Authentification'],
      },
    },
    '/documents': {
      get: {
        summary: 'Lister les documents contrôlés en vigueur selon l audience',
        tags: ['Documents Qualios'],
      },
    },
    '/complaints': {
      get: {
        summary: 'Lister les réclamations selon les droits et l organisation',
        tags: ['Réclamations'],
      },
      post: {
        summary: 'Créer une nouvelle réclamation avec traçabilité produit et contrôle anti-données patient',
        tags: ['Réclamations'],
      },
    },
    '/complaints/{id}/transition': {
      post: {
        summary: 'Transitionner le statut d une réclamation selon la machine à états',
        tags: ['Réclamations'],
      },
    },
    '/audit': {
      get: {
        summary: 'Consulter la piste d audit inaltérable (append-only)',
        tags: ['Audit & Sécurité'],
      },
    },
    '/audit/export-signed-csv': {
      get: {
        summary: 'Télécharger un export CSV de la piste d audit signé par sceau SHA-256',
        tags: ['Audit & Sécurité'],
      },
    },
    '/dashboard/metrics': {
      get: {
        summary: 'Indicateurs de performance qualité, SLA et statistiques CSAT',
        tags: ['Tableaux de bord'],
      },
    },
  },
};
