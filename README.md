# Transvirex — ERP Logistique « Moving Intelligence »

> Plateforme de gestion logistique et de transport : les répartiteurs créent des missions de
> livraison, assignent les chauffeurs, suivent les livraisons en temps réel, et le service
> facturation génère les factures — le tout via des applications web par rôle, adossées à une
> architecture micro-services conteneurisée, avec un agent IA d'aide à l'affectation.

Ce README est conçu comme support de **soutenance**. Pour le **livrable** (rapport), voir
[`docs/livrable.md`](./docs/livrable.md). Pour la documentation technique détaillée, voir
[`docs/`](./docs/README.md).

---

## 1. Contexte & démarche

**Le problème métier.** Transvirex Logistics est une société de transport régionale (160+ chauffeurs
indépendants, ~15 000 livraisons/mois) qui souffrait de :

- des répartiteurs travaillant sur WhatsApp / téléphone / e-mail, sans vue d'ensemble ;
- des chauffeurs recevant des informations de tournée incomplètes ou tardives ;
- des délais de facturation de ~6 jours en moyenne ;
- une hausse des réclamations clients faute de suivi de livraison.

**L'objectif.** Un **ERP logistique** qui centralise les opérations, permet le suivi de livraison en
temps réel, automatise la facturation, et intègre un **agent IA** pour un dispatching plus
intelligent — déployé sous forme de conteneurs Docker.

**La démarche.** Spécification d'abord (brainstorming → document de conception → plan →
implémentation), découpage en micro-services par domaine métier, intégration temps réel, puis
conteneurisation complète. Le détail de la démarche figure dans le [livrable](./docs/livrable.md).

---

## 2. Choix techniques

| Choix | Justification |
|---|---|
| **Monorepo pnpm + Turborepo** | Un seul dépôt pour 4 apps + 6 services + types partagés ; builds ordonnés et cache incrémental. |
| **TypeScript partout** | Types partagés bout-en-bout (front ↔ back) via le paquet `@transvirex/shared`. |
| **React 18 + Vite + Tailwind** | Démarrage rapide, HMR, UI cohérente entre les 4 apps. |
| **Express (Node 22)** | Micro-services HTTP légers, un service = un domaine. |
| **PostgreSQL** | Données relationnelles (utilisateurs, missions, factures). |
| **MongoDB** | Données semi-structurées à fort volume (événements GPS, messages de chat). |
| **Socket.IO** | Temps réel bidirectionnel (statuts de mission, messagerie répartiteur ↔ chauffeur). |
| **TensorFlow.js** | Réseau de neurones d'aide à l'affectation, embarqué dans le service IA. |
| **Docker / Docker Compose** | Conteneurisation reproductible de toute la pile (bases + services + apps). |

---

## 3. Architecture micro-services

Toutes les applications front communiquent **exclusivement** avec l'**API Gateway** (port 4000), qui
vérifie le JWT et relaie la requête vers le micro-service approprié. Seul le service de
**notification** (Socket.IO) est joint directement par les fronts (port 4005).

```
Navigateur ──→ Gateway :4000 ──→ Auth        :4001  (PostgreSQL)
                            ├──→ Mission     :4002  (PostgreSQL + MongoDB)
                            ├──→ Billing     :4003  (PostgreSQL)
                            └──→ IA          :4004  (sans état)

Navigateur ──→ Notification :4005             (MongoDB, Socket.IO)
```

| Composant | Répertoire | Port | Rôle |
|-----------|-----------|------|------|
| App Management | `apps/management` | 3000 | Admin : utilisateurs, chauffeurs, tableau de bord |
| App Driver | `apps/driver` | 3001 | Chauffeur : voir / accepter / terminer les missions |
| App Dispatcher | `apps/dispatcher` | 3002 | Répartiteur : créer / assigner / suivre les missions |
| App Billing | `apps/billing` | 3003 | Facturation : factures et paiements |
| API Gateway | `services/gateway` | 4000 | Ingress unique, garde JWT, proxy |
| Service Auth | `services/auth` | 4001 | Utilisateurs, chauffeurs, émission JWT |
| Service Mission | `services/mission` | 4002 | CRUD missions + événements de livraison |
| Service Billing | `services/billing-svc` | 4003 | Factures + paiements |
| Service IA | `services/ai` | 4004 | Scoring d'affectation des chauffeurs |
| Service Notification | `services/notification` | 4005 | Hub temps réel Socket.IO |

**Points clés :**
- **Ingress unique** — le gateway est le seul point d'entrée ; les services backend ne sont pas
  exposés à l'extérieur.
- **Réécriture de chemin** — `pathRewrite` ré-attache le préfixe (`/auth`, `/missions`…) supprimé
  par Express avant de relayer en amont.
- **Contrat de message normalisé** — toute réponse suit l'enveloppe `ApiResponse<T>` :
  `{ status, data?, error?, timestamp }`.

> Détails : [`docs/architecture.md`](./docs/architecture.md).

---

## 4. Sécurité de la solution

| Mécanisme | Mise en œuvre |
|---|---|
| **Authentification JWT** | Émis par le service Auth, signé `HS256`, contient `{ userId, role, email }`. |
| **Garde au gateway** | `jwtGuard` vérifie le Bearer token sur **chaque** requête sauf les routes publiques. |
| **Routes publiques en liste blanche** | Uniquement `POST /auth/login` et `POST /auth/register`. |
| **Mots de passe** | Hachés avec **bcrypt (coût 12)** — jamais stockés en clair (`auth.controller.ts`). |
| **Propagation d'identité** | Le gateway injecte `x-user-id` / `x-user-role` / `x-user-email` ; les services aval lisent ces en-têtes et ne re-vérifient pas le JWT (confiance au gateway). |
| **Contrôle d'accès par rôle (RBAC)** | Ex. `requireManagement` réserve la gestion des comptes au rôle `management` ; rôles valides contrôlés à l'inscription. |
| **Isolation réseau** | Seuls le gateway, la notification et les 4 apps sont mappés sur l'hôte ; le reste reste interne au réseau Docker. |

**Limites connues (à durcir avant production)** — utiles à présenter en toute transparence :
- `JWT_SECRET` par défaut dans `docker-compose.yml` (à remplacer par un secret fort / gestionnaire de secrets) ;
- MongoDB sans authentification activée ;
- URL du gateway figée au build des fronts (`VITE_GATEWAY_URL`) — non configurable à l'exécution.

---

## 5. Conteneurisation

Toute la pile tourne en conteneurs via `docker-compose.yml` — **12 conteneurs** : 2 bases de données
+ 6 micro-services + 4 applications front.

- **Dockerfiles multi-étapes** — étape *builder* (compilation TypeScript / build Vite) puis étape
  *runtime* allégée (uniquement `dist/` + dépendances de production ; nginx pour les SPA).
- **Bases de données managées** — `postgres:16` et `mongo:7` avec `healthcheck` ; les services
  attendent `service_healthy` via `depends_on`.
- **SPA servies par nginx** — `nginx.conf` avec fallback `try_files … /index.html` pour le routage
  côté client.
- **Surface d'exposition minimale** — seuls gateway (4000), notification (4005) et les 4 apps
  (3000-3003) sont mappés sur l'hôte.

```bash
docker compose up --build      # construit et démarre les 12 conteneurs
docker compose ps              # vérifie l'état (postgres / mongodb = healthy)
docker compose logs -f gateway # suit les logs d'un service
docker compose down -v         # arrête tout et purge les volumes de données
```

> **Note d'implémentation.** Le paquet partagé `@transvirex/shared` est déclaré en dépendance
> `workspace:*` dans chaque service pour être résolu dans l'étape runtime isolée ; l'image Postgres
> est épinglée sur la variante Debian `postgres:16` (stable sous Windows/WSL2).

---

## 6. Modules fonctionnels de l'ERP

| Module | Service / App | Fonctionnalités |
|---|---|---|
| **Utilisateurs & chauffeurs** | `auth` + `management` | Inscription/connexion, gestion des comptes staff, fiches chauffeurs (véhicule, position, charge, taux d'acceptation). |
| **Missions / livraisons** | `mission` + `dispatcher` / `driver` | CRUD missions, machine à états (en attente → assignée → en cours → livrée), acceptation/refus chauffeur, suivi GPS, **preuve de livraison (POD)** par photo. |
| **Facturation** | `billing-svc` + `billing` | Génération de factures depuis missions livrées, suivi des paiements, **export PDF**, gestion **SLA**. |
| **Notifications temps réel** | `notification` | Statuts de mission en direct, alertes de retard, **messagerie répartiteur ↔ chauffeur**. |
| **Assistance IA** | `ai` | Scoring et classement des chauffeurs pour une mission, avec explication en langage naturel (voir §8). |
| **Tableau de bord / KPI** | `management` | Vue d'ensemble des indicateurs, performance des chauffeurs, graphiques. |

---

## 7. Utilisateurs

Quatre rôles, chacun avec son application dédiée :

| Rôle | Application | Port | Responsabilités principales |
|---|---|---|---|
| **Chauffeur** (`driver`) | App Driver | 3001 | Consulter ses missions, accepter/refuser, mettre à jour le statut (récupérée / livrée / incident), dialoguer avec le répartiteur. |
| **Répartiteur** (`dispatcher`) | App Dispatcher | 3002 | Créer des missions, demander une suggestion IA, assigner, suivre l'avancement en temps réel. |
| **Facturation** (`billing`) | App Billing | 3003 | Générer les factures, suivre les paiements, exporter les PDF, gérer les SLA. |
| **Management** (`management`) | App Management | 3000 | Gérer les comptes, superviser les KPI, analyser la performance. |

---

## 8. Agentique IA

Le service `ai` combine **deux couches** complémentaires :

**1. Scoring par réseau de neurones (TensorFlow.js).** Un modèle dense
(`Dense(16, relu) → Dense(8, relu) → Dense(1, sigmoid)`) est entraîné à chaud sur ~2 000 échantillons
synthétiques au démarrage (`services/ai/src/ml/model.ts`). Il évalue chaque chauffeur candidat sur
**7 caractéristiques** : distance au point de retrait, charge actuelle, taux d'acceptation
historique, expérience, urgence de la mission, heure de la journée, correspondance de zone. Sortie :
une probabilité de succès par chauffeur, d'où un classement.

**2. Explication en langage naturel (Hugging Face — SmolLM2).** Au-delà du score, l'agent
**justifie** sa recommandation. `explainMatch` (`services/ai/src/ml/hf.ts`) interroge le modèle
`SmolLM2-1.7B-Instruct` avec un prompt en français pour produire une phrase courte (« très proche,
disponible, haute fiabilité »). En l'absence de jeton Hugging Face ou en cas d'erreur, un **fallback
déterministe** génère l'explication à partir des features — l'agent reste donc fonctionnel hors-ligne.

```
POST /ai/suggest-assignment   Body: { missionId }
→ ApiResponse<{ suggestions: [{ driverId, name, score, features, explanation }] }>
```

C'est le cœur « agentique » de la solution : l'IA ne se contente pas de **scorer**, elle **explique**
son raisonnement au répartiteur, qui garde la décision finale (suggestion, non automatisation aveugle).

---

## Démarrage rapide

```bash
# Installer les dépendances
pnpm install

# Lancer toute la pile en conteneurs (PostgreSQL + MongoDB inclus)
docker compose up --build

# — ou — en mode développement (tous les services + apps)
pnpm dev
```

| Application | URL |
|---|---|
| Management | http://localhost:3000 |
| Driver | http://localhost:3001 |
| Dispatcher | http://localhost:3002 |
| Billing | http://localhost:3003 |
| API Gateway | http://localhost:4000 |

> Documentation complète : [`docs/`](./docs/README.md) · Livrable : [`docs/livrable.md`](./docs/livrable.md)
