# Livrable — Transvirex ERP Logistique

**Projet :** Transvirex Logistics ERP (« Moving Intelligence »)
**Type :** Projet individuel (solo)
**Période :** 24 mai → 11 juin 2026 (~2,5 semaines)

Ce document constitue le livrable écrit du projet. Le support de soutenance se trouve dans le
[`README.md`](../README.md) à la racine ; la documentation technique détaillée dans
[`docs/`](./README.md).

---

## 1. Analyse préliminaire du besoin

**Contexte.** Transvirex Logistics est une société de transport régionale gérant plus de 160
chauffeurs indépendants et environ 15 000 livraisons par mois. Son organisation reposait sur des
outils non centralisés.

**Problèmes identifiés.**

| Problème | Impact |
|---|---|
| Répartition via WhatsApp / téléphone / e-mail | Aucune vue d'ensemble, erreurs d'affectation |
| Informations de tournée incomplètes ou tardives | Retards de livraison, chauffeurs mal informés |
| Facturation manuelle (~6 jours de délai) | Trésorerie ralentie, erreurs de facturation |
| Absence de suivi de livraison | Réclamations clients en hausse |

**Objectifs de la solution.**

1. **Centraliser** les opérations dans un ERP unique accessible par rôle.
2. **Suivre** les livraisons en temps réel (statuts + position GPS).
3. **Automatiser** la facturation à partir des missions livrées.
4. **Assister** le répartiteur via un agent IA d'aide à l'affectation.
5. **Déployer** la solution de façon reproductible (conteneurs Docker).

**Parties prenantes.** Chauffeurs, répartiteurs, service facturation, direction (management), et les
clients finaux (bénéficiaires indirects du meilleur suivi).

---

## 2. Identification des fonctionnalités et user stories

### Authentification (tous rôles)
- En tant qu'**utilisateur**, je veux me connecter avec mon e-mail et mon mot de passe afin
  d'accéder à l'application correspondant à mon rôle.
- En tant que **nouvel utilisateur**, je veux créer un compte afin d'être enregistré dans le système.

### Chauffeur
- En tant que **chauffeur**, je veux consulter la liste de mes missions afin de planifier ma journée.
- En tant que **chauffeur**, je veux accepter ou refuser une mission afin de gérer ma charge de travail.
- En tant que **chauffeur**, je veux mettre à jour le statut d'une mission (récupérée / livrée /
  incident) afin d'informer le répartiteur en temps réel.
- En tant que **chauffeur**, je veux téléverser une photo de **preuve de livraison (POD)** afin de
  confirmer la remise du colis.
- En tant que **chauffeur**, je veux échanger des messages avec le répartiteur afin de résoudre les
  imprévus rapidement.

### Répartiteur
- En tant que **répartiteur**, je veux créer une mission de livraison afin de la confier à un chauffeur.
- En tant que **répartiteur**, je veux obtenir une **suggestion IA** des meilleurs chauffeurs afin
  d'optimiser l'affectation.
- En tant que **répartiteur**, je veux assigner une mission (suggestion IA ou choix manuel) afin de
  lancer la livraison.
- En tant que **répartiteur**, je veux suivre l'avancement des missions en temps réel afin de réagir
  aux retards.

### Facturation
- En tant qu'**agent facturation**, je veux générer une facture à partir d'une mission livrée afin
  d'accélérer le cycle de facturation.
- En tant qu'**agent facturation**, je veux suivre le statut des paiements (brouillon / envoyée /
  payée) afin de gérer les encaissements.
- En tant qu'**agent facturation**, je veux exporter une facture en **PDF** afin de la transmettre au
  client.

### Management
- En tant que **responsable**, je veux visualiser les KPI et la performance des chauffeurs afin de
  piloter l'activité.
- En tant que **responsable**, je veux gérer les comptes du personnel afin de contrôler les accès.

---

## 3. Schéma de l'architecture initiale

```
┌──────────────────────────────────────────────────────────┐
│                 FRONTEND (4 apps React)                  │
│  ┌──────────┐ ┌────────────┐ ┌─────────┐ ┌──────────┐   │
│  │  Driver  │ │ Dispatcher │ │ Billing │ │ Mgmt/KPI │   │
│  │  :3001   │ │   :3002    │ │  :3003  │ │  :3000   │   │
│  └────┬─────┘ └─────┬──────┘ └────┬────┘ └────┬─────┘   │
└───────┼─────────────┼─────────────┼────────────┼─────────┘
        └─────────────┴──────┬──────┴────────────┘
                             │  Tout HTTP → un seul point d'entrée
                   ┌─────────▼─────────┐       ┌──────────────────┐
                   │    API GATEWAY    │       │ Notification Svc │
                   │  (JWT + Routage)  │       │  Socket.IO :4005 │
                   └─────────┬─────────┘       └──────────────────┘
         ┌───────────┬───────┴───────────┬──────────┐
         │           │                   │          │
  ┌──────▼─────┐ ┌──▼──────────┐ ┌──────▼───┐ ┌────▼─────┐
  │  Auth Svc  │ │ Mission Svc │ │ Billing  │ │  IA Svc  │
  │   :4001    │ │   :4002     │ │ Svc:4003 │ │  :4004   │
  └──────┬─────┘ └──┬──────┬───┘ └─────┬────┘ └──────────┘
         │          │      │           │
    ┌────▼──┐  ┌────▼─┐ ┌──▼───┐  ┌────▼──┐
    │  PG   │  │  PG  │ │Mongo │  │  PG   │
    │ users │  │ miss.│ │events│  │ inv.  │
    └───────┘  └──────┘ └──────┘  └───────┘
```

> Cette architecture initiale a été conservée durant tout le projet. Détails et flux d'authentification :
> [`docs/architecture.md`](./architecture.md) ; modèle de données : [`docs/database.md`](./database.md).

---

## 4. Organisation (projet solo)

Projet réalisé par **un seul développeur**. Pour structurer le travail malgré l'absence d'équipe, les
responsabilités ont été découpées par **domaine fonctionnel**, chacun développé sur sa propre branche
de fonctionnalité puis intégré via *pull request* :

| Domaine | Branche | Livrables |
|---|---|---|
| Authentification & gateway | `feat/auth` | Service Auth, gateway JWT, paquet partagé |
| Missions & temps réel | `feat/mission` | Service Mission, notification, suivi, POD |
| Facturation | `feat/bill` | Service Billing, PDF, SLA |
| IA & documentation | `feat/AI` | Service IA, explication HF, conteneurisation, docs |

Ce découpage reproduit, à l'échelle d'une personne, une répartition par module telle qu'on
l'organiserait au sein d'une équipe.

---

## 5. Planification initiale vs réelle

Estimation initiale : ~2 semaines. Déroulé réel reconstitué depuis l'historique Git :

| Phase | Période | Travaux réalisés |
|---|---|---|
| **1 — Conception & socle** | 24–25 mai | Document de conception, services backend (auth, gateway, mission, billing-svc), service IA (TF.js), notification (Socket.IO), `docker-compose` + Dockerfiles, scaffolding des 4 apps React. |
| **2 — Intégration temps réel** | 6–8 juin | Mises à jour temps réel et notifications (dispatcher/driver), suivi & refus de missions, preuve de livraison (POD), premières fonctionnalités de facturation. |
| **3 — Facturation avancée** | 8–10 juin | Téléchargement PDF des factures, mises à jour temps réel facturation, gestion des SLA, détails de facture. |
| **4 — Finalisation** | 11 juin | Corrections de conteneurisation (image Postgres, dépendance `@transvirex/shared`, plateforme), rédaction de la documentation et du livrable. |

> Écart principal : un palier entre le 25 mai et le 6 juin, puis une intégration temps réel et une
> facturation plus riches que prévu initialement.

---

## 6. Wireframes / mockups préliminaires

Maquettes basse-fidélité issues des flux utilisateurs, ayant guidé l'implémentation.

**Écran de connexion (commun)**
```
┌────────────────────────────┐
│         TRANSVIREX         │
│  ┌──────────────────────┐  │
│  │ E-mail               │  │
│  └──────────────────────┘  │
│  ┌──────────────────────┐  │
│  │ Mot de passe         │  │
│  └──────────────────────┘  │
│       [  Se connecter  ]   │
│   Pas de compte ? S'inscrire│
└────────────────────────────┘
```

**App Driver — « Mes missions » (mobile-first)**
```
┌────────────────────────────┐
│ ☰  Mes missions      🔔 3  │
├────────────────────────────┤
│ ▸ #1042  Casablanca → Rabat│
│   Échéance 14:30   [EN COURS]│
│   [ Récupérée ] [ Livrée ] │
├────────────────────────────┤
│ ▸ #1043  Ain Sebaa → Salé  │
│   Échéance 16:00   [ASSIGNÉE]│
│   [ Accepter ]  [ Refuser ]│
├────────────────────────────┤
│ [ 🗺 Carte ]  [ 💬 Chat ]  │
└────────────────────────────┘
```

**App Dispatcher — Tableau Kanban + suggestion IA**
```
┌──────────────────────────────────────────────┐
│  Tableau des missions          [+ Mission]   │
├───────────┬───────────┬──────────┬───────────┤
│ EN ATTENTE│ ASSIGNÉE  │ EN COURS │  LIVRÉE   │
│ ┌───────┐ │ ┌───────┐ │ ┌──────┐ │ ┌───────┐ │
│ │ #1044 │ │ │ #1043 │ │ │#1042 │ │ │ #1040 │ │
│ └───────┘ │ └───────┘ │ └──────┘ │ └───────┘ │
└───────────┴───────────┴──────────┴───────────┘
  Suggestion IA — mission #1044
  ┌──────────────────────────────────────────┐
  │ 1. Karim   score 0.92  « très proche,    │
  │                          haute fiabilité »│
  │ 2. Yassine score 0.81  « disponible »    │
  │            [ Assigner ]  [ Manuel ]      │
  └──────────────────────────────────────────┘
```

**App Billing — Liste des factures**
```
┌────────────────────────────────────────────┐
│  Factures                 [Générer facture]│
├──────────┬───────────┬─────────┬───────────┤
│ N°       │ Client    │ Montant │ Statut    │
├──────────┼───────────┼─────────┼───────────┤
│ INV-2041 │ ACME SARL │ 1 250 DH│ Payée     │
│ INV-2042 │ Globex    │   870 DH│ Envoyée   │
│ INV-2043 │ Initech   │   430 DH│ Brouillon │
│          │           │ [Payer] [PDF ⬇]     │
└──────────┴───────────┴─────────┴───────────┘
```

**App Management — Tableau de bord KPI**
```
┌────────────────────────────────────────────┐
│  Tableau de bord                           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │Livraisons│ │ Délai   │ │Factures │       │
│  │  1 284  │ │ moy 2.1h│ │ payées  │       │
│  └─────────┘ └─────────┘ └─────────┘       │
│  Performance chauffeurs                     │
│  Karim     ▇▇▇▇▇▇▇▇▇   94 %                  │
│  Yassine   ▇▇▇▇▇▇▇     78 %                  │
│  Sara      ▇▇▇▇▇▇▇▇    85 %                  │
└────────────────────────────────────────────┘
```

---

## 7. Présentation de la démarche projet

La démarche suit un cycle **« spécification d'abord »** :

1. **Brainstorming** — exploration du besoin et des contraintes.
2. **Document de conception** — architecture, modèle de données, flux utilisateurs validés avant tout
   code (voir [le spec d'origine](./superpowers/specs/2026-05-24-transvirex-logistics-erp-design.md)).
3. **Plan d'implémentation** — découpage en tâches par domaine.
4. **Implémentation incrémentale** — une branche de fonctionnalité par module, intégrée par *pull
   request* (`feat/auth`, `feat/mission`, `feat/bill`, `feat/AI`).
5. **Conteneurisation & vérification** — `docker compose up --build`, parcours de bout en bout
   (inscription → création mission → suggestion IA → livraison → facturation → KPI).

**Principes structurants.** Monorepo (un dépôt, builds ordonnés), types partagés bout-en-bout,
contrat de réponse normalisé `ApiResponse<T>`, un service = un domaine métier, ingress unique
sécurisé par JWT.

---

## 8. Note de rédaction

Ce livrable s'appuie sur les documents suivants, à consulter pour approfondir :

- [`README.md`](../README.md) — support de soutenance (contexte, choix, architecture, sécurité,
  conteneurisation, modules, utilisateurs, agentique IA).
- [`docs/architecture.md`](./architecture.md) — flux d'authentification, gateway, temps réel.
- [`docs/database.md`](./database.md) — schémas PostgreSQL + collections MongoDB.
- [`docs/environment.md`](./environment.md) — variables d'environnement par service.
- [`docs/frontend.md`](./frontend.md) — routes et pages de chaque application.
- [`docs/api/`](./api/) — référence des API (gateway, auth, missions, billing, notification, ai).
