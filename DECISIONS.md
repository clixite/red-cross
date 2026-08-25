# Registre des Décisions d'Architecture (ADR) — Portail « Service du Sang »

Ce document répertorie l'ensemble des choix d'architecture et de conception pris en l'absence de spécification préalable ou pour répondre aux contraintes réglementaires du secteur transfusionnel.

---

## ADR-001 : Mode de greffe sur le site existant
- **Statut** : Décidé (à valider par le métier)
- **Contexte** : Le portail doit s'intégrer à l'écosystème web existant du Service du Sang (Croix-Rouge de Belgique).
- **Décision** : Déploiement en sous-domaine dédié (`portail.croix-rouge.be` ou `portail.transfusion.be`) avec en-tête visuel harmonisé et jetons graphiques configurables.
- **Alternatives écartées** :
  - *Sous-chemin (`/portail`) sur le reverse-proxy principal* : impose un couplage fort avec le CMS existant et complexifie la politique CSP et les certificats TLS.
  - *Module/Plugin interne au CMS (ex. WordPress/Drupal)* : risque de sécurité critique et non-respect d'OWASP ASVS niveau 2 pour des données qualité transfusionnelles.
- **Conséquences** : Isolation complète des dépendances et de la sécurité, cookies de session scoped au sous-domaine, autonomie de cycle de vie et de mise à jour.

---

## ADR-002 : Format des identifiants externes et numéro de réclamation
- **Statut** : Décidé (à valider par le métier)
- **Contexte** : Prévention de l'énumération d'identifiants (OWASP) tout en offrant un identifiant humainement communicable pour les professionnels de santé.
- **Décision** :
  - Utilisation systématique de UUID v4 (ou CUID2) pour toutes les clés primaires et identifiants techniques exposés via l'API.
  - Numéro métier structuré, public et lisible pour les réclamations : `SFS-AAAA-NNNNN` (ex: `SFS-2025-00142`), avec compteur séquentiel annuel garanti sans collision.
- **Alternatives écartées** :
  - *IDs entiers séquentiels exposés (`/reclamations/42`)* : Vulnérable à l'énumération et fuite d'informations sur les volumes d'activité.
  - *UUID brut pour les utilisateurs finaux* : Inexploitable lors des échanges téléphoniques ou réconciliations avec les banques de sang hospitalières.
- **Conséquences** : Sécurité renforcée contre l'énumération, simplicité d'échange lors des appels d'urgence transfusionnelle.

---

## ADR-003 : Validation et formats des produits sanguins labiles (ISBT 128)
- **Statut** : Décidé (à valider par le métier)
- **Contexte** : Dans le secteur transfusionnel, la traçabilité repose sur la norme internationale ISBT 128 et les règles nationales belges.
- **Décision** :
  - Validation stricte du format du Numéro d'Identification de Don (DIN / Eurocode) : format `=A9999YYNNNNNNCC` ou standard belge `B9999YYNNNNNN`.
  - Contrôle obligatoire du code produit (ex: `E0388V00` pour Concentré de Globules Rouges déleucocyté, `E3845V00` pour Mélange de Concentrés de Plaquettes, `E0799V00` pour Plasma Frais Congelé).
  - Contrôle du groupe ABO-RhD (`A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`) et de la date de péremption cohérente avec le type de PSL (42 jours max CGR, 7 jours max plaquettes, 1 an max plasma).
- **Alternatives écartées** :
  - *Champ texte libre pour le produit* : Proscrit réglementairement (impossibilité d'automatiser les rappels de lots ou analyses de tendances).
- **Conséquences** : Saisie fiable, impossible de soumettre un produit mal formé, alertes qualité immédiates.

---

## ADR-004 : Détection heuristique anti-données de santé et NISS belge
- **Statut** : Décidé (à valider par le métier)
- **Contexte** : Le portail est conçu pour les échanges qualité inter-établissements et ne doit **jamais** contenir d'identifiant nominatif de patient (RGPD / Données de santé).
- **Décision** :
  - Validation heuristique bloquante côté serveur inspectant tous les champs de texte libre (descriptions, messages, commentaires) :
    - Algorithme de détection et validation modulo 97 du Numéro de Registre National Belge (NISS / INSZ) au format `YY.MM.DD-XXX.CC` ou `YYMMDDXXXCC`.
    - Expressions régulières détectant les formats de date de naissance (`né le`, `DD/MM/YYYY`), de numéro de dossier patient hospitalier (`IPP`, `NIP`, `DPI`).
  - Blocage immédiat de la soumission avec message explicite invitant à anonymiser les propos, et consignation d'une tentative au journal de sécurité.
- **Alternatives écartées** :
  - *Simple avertissement informatif non bloquant* : Risque légal trop élevé de contamination de la base par des données de santé sans consentement explicite du patient.
  - *Masquage/Anonymisation silencieuse automatique* : Risque de perte de sens dans la description de l'incident qualité.
- **Conséquences** : Garantie que la base du portail ne devient pas un sous-traitant de données de santé identifiantes.

---

## ADR-005 : Piste d'Audit inaltérable (Append-Only)
- **Statut** : Décidé (à valider par le métier)
- **Contexte** : Les normes BPF/GMP et les inspections de l'AFMPS imposent une traçabilité totale des événements sur les réclamations et modifications d'états.
- **Décision** :
  - Tables `ComplaintEvent` et `AuditLog` en mode append-only strict (aucune opération UPDATE ou DELETE autorisée au niveau de l'ORM et triggers base de données).
  - Enregistrement systématique de : timestamp serveur UTC, identifiant acteur, rôle, organisation, type d'action, snapshot des champs modifiés (avant/après), adresse IP et User-Agent.
  - Export CSV signé cryptographiquement (génération d'un condensat SHA-256 scellé avec horodatage).
- **Alternatives écartées** :
  - *Logs applicatifs purs sur fichier sans persistance en base* : Inexploitable pour l'affichage de l'historique réglementaire dans l'interface et risque de perte.
- **Conséquences** : Non-répudiation des actions, auditabilité immédiate par les inspecteurs qualité.

---

## ADR-006 : Couche anticorruption Qualios & Stratégie 3 Adaptateurs
- **Statut** : Décidé (à valider par le métier)
- **Contexte** : Les spécifications exactes de l'API de l'instance Qualios du client ne sont pas encore stabilisées lors du démarrage du projet.
- **Décision** :
  - Modélisation d'un port interne stable `QualiosPort`.
  - Implémentation de 3 adaptateurs interchangeables par variable `QUALIOS_ADAPTER` :
    1. `rest` : Client HTTP REST avec OAuth2/API Key, retry exponentiel, disjoncteur (circuit breaker) et gestion ETag.
    2. `file` : Échange de fichiers batch (CSV/XML atomiques avec fichier de contrôle `.done` sur partage SFTP/réseau).
    3. `manual` (défaut de démonstration) : File d'attente d'enregistrement manuel pour les équipes SFS avec saisie guidée de la référence Qualios.
  - Utilisation du pattern Transactional Outbox pour garantir la cohérence des écritures sortantes sans risque de double création grâce à des clés d'idempotence.
- **Alternatives écartées** :
  - *Couplage direct dans les services métier* : Rendrait le code instable et dépendrait d'une API potentiellement indisponible.
- **Conséquences** : Le portail fonctionne immédiatement en autonome et s'adapte sans refonte à n'importe quel choix technique de l'éditeur Qualnet.

---

## ADR-007 : Gestion des Délais et Calcul des SLA
- **Statut** : Décidé (à valider par le métier)
- **Contexte** : Les engagements de service (SLA) sont opposables : Accusé de réception immédiat, recevabilité sous 2 jours ouvrés (16h), réponse finale sous 30 jours calendrier.
- **Décision** :
  - Calcul dynamique excluant les week-ends (samedi/dimanche) et jours fériés légaux belges pour le SLA de recevabilité.
  - Mécanisme de suspension du chronomètre de SLA lorsque la réclamation passe au statut `information_complementaire_demandee` : le temps passé en attente de réponse du client n'est pas imputé au SFS.
  - Reprise automatique du décompte dès réception de la réponse du client.
- **Alternatives écartées** :
  - *Compteur calendaire brut sans suspension* : Pénaliserait injustement le SFS lorsque le client tarde à fournir les photos ou numéros de lots requis.
- **Conséquences** : Indicateurs de respect de SLA justes, transparents et conformes aux pratiques qualité hospitalières.

---

## ADR-008 : Authentification, Multi-Facteurs (MFA) & Abstraction SSO
- **Statut** : Décidé (à valider par le métier)
- **Contexte** : OWASP ASVS niveau 2 et exigences de sécurité hospitalière.
- **Décision** :
  - Inscription sur invitation exclusive (aucune auto-inscription publique).
  - MFA TOTP (Time-based One-Time Password) obligatoire pour tous les rôles internes SFS et pour les référents qualité clients.
  - Abstraction de fournisseur d'authentification (`AuthProvider`) préparant l'intégration OIDC/SAML future pour les fédérations hospitalières.
- **Alternatives écartées** :
  - *MFA par simple SMS* : Moins sécurisé (SIM swapping) et coûts d'infrastructure additionnels.
- **Conséquences** : Protection robuste des accès B2B, conformité ASVS 2.
