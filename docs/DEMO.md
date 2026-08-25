# Script de Démonstration (10 minutes) — Comité de Direction

Objectif : convaincre en 10 minutes qu'un pharmacien biologiste sans compétence technique peut piloter le portail de bout en bout. Aucune préparation technique requise (stack démarrée, comptes démo pré-chargés).

---

## Préparation (avant la réunion)

1. `docker compose up --build` lancé la veille.
2. Vérifier : `http://localhost:3000` répond, `http://localhost:4000/api/v1/openapi.json` s'ouvre.
3. Onglets prêts : connexion (page d'accueil), tableau de bord, synchronisation Qualios.

---

## Déroulé (Minute par Minute)

### 00:00 — Introduction (30 s)
> « Voici le portail clients B2B du Service du Sang. Il permet à nos banques de sang hospitalières, laboratoires de recherche et écoles de déclarer des réclamations réglementées, de suivre leur traitement sous SLA opposables, et de consulter notre documentation qualité contrôlée. »

### 00:30 — Connexion Déclarant (1 min)
- Cliquer sur le compte **« Déclarant (Banque de Sang CHU Liège) »** puis « Se connecter ».
> « L'accès est réservé aux professionnels invités : aucune inscription publique. Ici, un technologue de laboratoire de la banque de sang du CHU. »

### 01:30 — Déclaration d'une réclamation produit (2 min 30)
- Onglet **« Déclarer une Réclamation »**.
- Choisir catégorie **Produit Sanguin Labile**.
- Numéro de don : `BE999925000001` — code produit `E0388V00` (CGR déleucocyté).
- Température : `12.8 °C` — **montrer l'avertissement orange** « hors plage réglementaire [2–6°C] ».
- Description : *« Poche livrée hors température constatée à la réception. »*
- Soumettre.
> « Numéro de dossier attribué : **SFS-2026-XXXXX**. Accusé de réception immédiat à l'écran et par e-mail dans la langue du déclarant. Les dates cibles SLA (recevabilité J+2 ouvrés, réponse finale J+30) sont affichées. »

### 04:00 — Démontrer la protection RGPD (1 min)
- Revenir au formulaire, saisir dans la description un numéro national fictif (`85.04.12-123.45` avec checksum valide) → **soumission bloquée** avec message explicite.
> « Le portail est conçu pour ne jamais recevoir de donnée patient. La détection heuristique bloque le NISS belge, les dates de naissance et les numéros de dossier, et journalise l'événement. »

### 05:00 — Suivi & traitement côté SFS (3 min)
- Se déconnecter, se connecter en **Responsable Qualité SFS**.
- Ouvrir la réclamation déclarée → **Gestion des Réclamations**.
- Enchaîner : « Ouvrir l'analyse de recevabilité » → « Déclarer Recevable → Ouvrir Investigation » → « Demander un complément d'info » (**montrer la suspension du SLA**) → « Prononcer la conclusion » → « Clôturer ».
> « Chaque étape est un événement horodaté inaltérable de la machine à états ; la clôture déclenche automatiquement l'enquête de satisfaction CSAT auprès du client. »

### 08:00 — Tableau de bord & Qualios (1 min 30)
- Onglet **« Tableau de Bord & SLA »** : volume (60 réclamations), taux de respect SLA (≈95 %), délai moyen, CSAT moyen, répartition par catégorie et segment.
- Onglet **« Synchronisation Qualios »** : montrer le journal des échanges (`NC-2025-0XXX`), la file Outbox et la Dead-Letter Queue.
> « Chaque réclamation est poussée vers notre système qualité Qualios via une file transactionnelle avec clés d'idempotence : aucune double non-conformité possible, même en cas de rejeu. Si l'API Qualios n'existe pas encore, le mode manuel prend le relais sans aucun impact pour nos clients. »

### 09:30 — Piste d'audit & synthèse (30 s)
- Onglet **« Piste d'Audit »** : montrer les entrées horodatées et l'export CSV signé SHA-256.
> « Tout est tracé : qui, quoi, quand, depuis quelle organisation, quelle IP. Rien n'est supprimable. »

---

## Phrases Clés à Retenir

1. « Une réclamation client n'est pas un ticket : c'est un **enregistrement qualité réglementé**, possiblement déclencheur d'une non-conformité, d'un rappel de lot ou d'une déclaration d'hémovigilance. »
2. « **Zéro donnée patient** par conception — la conformité RGPD est technique, pas seulement documentaire. »
3. « **Qualios reste la source de vérité** : le portail ne sert jamais un document périmé ou retiré. »
4. « Le système fonctionne à **100 % sans Qualios** (mode manuel) puis bascule en temps réel dès que l'interface existe. »
5. « L'emblème de la croix rouge n'est pas reproduit : l'identité est un **thème paramétrable** prêt pour la charte réelle. »

## Indicateurs à Montrer (déjà parlants dans le jeu de données)

- **60 réclamations** réparties sur 14 mois, toutes catégories et statuts représentés.
- **Cas hors SLA** présents pour démontrer les alertes.
- **Réclamations irrecevables** avec motif obligatoire.
- **Réclamations multi-unités** (2 poches) pour la traçabilité produit.
- **CSAT moyen** alimenté par les enquêtes post-clôture répondues.
