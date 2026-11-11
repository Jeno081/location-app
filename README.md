# Location App

Application de gestion locative pour un bailleur unique et ses locataires : biens, contrats, signatures, loyers, quittances, refus motivés et reprise de paiement, relances avec accusé de réception, annonces et messagerie, réinitialisation des mots de passe, documents, signalements et calendrier.

## Application installable (PWA)

Location App peut être installée sur Android et iPhone depuis le navigateur, sans magasin d'applications :

- `frontend/manifest.json` — manifeste de secours ; le manifeste PWA réel est généré dynamiquement depuis `/api/config` ;
- `frontend/sw.js` — cache des ressources statiques et page hors ligne ;
- `frontend/js/pwa.js` — enregistrement du Service Worker et bouton d'installation ;
- `frontend/offline.html` — écran hors ligne ;
- `frontend/icons/` — icônes 192, 512, maskable 512, Apple 180 et favicon.

Le Service Worker ne met jamais en cache les réponses `/api/` ni les fichiers privés `/uploads/`. Il faut servir l'application en HTTPS (Render le fait) ou sur `localhost` pour que l'installation fonctionne.

Les supports imprimables (QR code vers l'application déployée) se trouvent dans `print/` : `location-app-qr.png`, `location-app-qr.svg`, `location-app-affiche-A4.png` et `location-app-affiche-A4.pdf`.

## Notifications push

Les notifications Web Push (messages, annonces, signalements, paiements, documents, contrats, mots de passe) utilisent Firebase Cloud Messaging. La procédure complète de configuration et de test se trouve dans [PUSH_NOTIFICATIONS.md](PUSH_NOTIFICATIONS.md).

L'application affiche aussi :

- des badges sur les onglets Documents, Rappels, Annonces, Messages, Paiements, Incidents, etc. ;
- un badge numérique sur l'icône de l'application installée (Badging API) ;
- l'actualisation par glissement vers le bas sur les tableaux de bord bailleur et locataire.

## Branding par instance

Le nom, le logo, les couleurs, la devise et la locale sont configurables par les variables `APP_*` (voir `.env.example`). Ils sont exposés publiquement par `/api/config`, injectés dans `/app-config.js` et utilisés dans le manifeste PWA généré par `/manifest.json`.

Les PDF (contrats et quittances) utilisent également le nom de l'application et le symbole monétaire configurés.

## Installation d'une nouvelle instance

Une base sans bailleur est verrouillée : les pages redirigent vers `/install.html` et les API privées répondent `503 NOT_INSTALLED`. L'inscription publique du bailleur est désactivée en production.

Créer le premier compte avec :

```bash
npm run seed
```

Variables nécessaires : `SEED_BAILLEUR_NOM`, `SEED_BAILLEUR_EMAIL`, `SEED_BAILLEUR_PASSWORD` (12 caractères minimum), `SEED_BAILLEUR_TELEPHONE` (optionnel). Le script exécute les migrations, crée le bailleur, marque `app_settings.installed_at` et est idempotent. L'option `--reset-password` remplace explicitement le mot de passe d'un bailleur existant.

Une base qui possède déjà un bailleur est automatiquement marquée comme installée par la migration de backfill : une instance existante n'est jamais verrouillée.

## Stockage des médias

- `PUBLIC_MEDIA_STORAGE=db` : photos de logement, avatars et signalements restent dans MySQL (comportement historique).
- `PUBLIC_MEDIA_STORAGE=cloudinary` : ces médias publics vont sur Cloudinary, dans `CLOUDINARY_FOLDER/<catégorie>`.
- Les documents d'identité et preuves de paiement restent **toujours** dans MySQL, quel que soit le réglage.

Variables Cloudinary : `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER`. Le secret ne doit jamais être exposé au frontend.

## Stack

- **Backend** : Node.js, Express 5, mysql2, JWT, bcrypt, PDFKit, Multer, Cloudinary
- **Frontend** : HTML / CSS / JavaScript vanilla, Chart.js, Lucide
- **Base** : MySQL 8 (Clever Cloud) — pool de connexions, clés étrangères et contraintes d'unicité. Les fichiers privés sont stockés dans la table `files` ; les médias publics peuvent aller sur Cloudinary.

## Démarrage

Prérequis : Node.js ≥ 20 et une base MySQL accessible (Clever Cloud, MySQL local, etc.).

```bash
# 1. Dépendances
npm --prefix backend install

# 2. Configuration
cp .env.example .env
# Renseignez JWT_SECRET et les variables DB_* (ou MYSQL_ADDON_* fournies par Clever Cloud)
# node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# 3. Initialisation / migrations de la base
npm run db:migrate

# 4. Lancement
npm start
# → http://localhost:3000
```

En production, le compte bailleur est créé par `npm run seed` ; l'inscription publique est désactivée. En développement/test, l'inscription initiale reste disponible.

Le déploiement d'une nouvelle instance cliente est décrit pas à pas dans [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md). L'ancien guide mono-instance reste dans [DEPLOYMENT.md](DEPLOYMENT.md).

### Windows — lancement en un clic

Double-cliquez sur **`start.cmd`** à la racine du projet : le serveur démarre, la base est migrée automatiquement et le navigateur s'ouvre sur http://localhost:3000. Laissez la fenêtre ouverte ; `Ctrl+C` arrête le serveur.

> Si PowerShell refuse `npm` avec « running scripts is disabled on this system », la stratégie d'exécution Windows bloque `npm.ps1`. Utilisez `npm.cmd` (par exemple `npm.cmd start`, `npm.cmd test`) ou le lanceur `start.cmd`, qui n'est pas concerné.

## Scripts

| Commande | Description |
| --- | --- |
| `npm start` | Démarre le serveur |
| `npm run dev` | Démarre avec nodemon |
| `npm test` | Lance les tests d'intégration API |
| `npm run db:migrate` | Applique les migrations MySQL |
| `npm run db:import-sqlite` | Importe une base SQLite locale vers MySQL |
| `npm --prefix backend test` | Équivalent direct |

## Variables d'environnement

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `NODE_ENV` | `development` | `production` active HSTS et exige un secret fort |
| `PORT` | `3000` | Port HTTP |
| `JWT_SECRET` | secret de dev | **Obligatoire en production** (≥ 32 caractères) |
| `JWT_EXPIRES_IN` | `7d` | Durée des sessions |
| `DB_HOST` / `MYSQL_ADDON_HOST` | `127.0.0.1` | Hôte MySQL |
| `DB_PORT` / `MYSQL_ADDON_PORT` | `3306` | Port MySQL |
| `DB_USER` / `MYSQL_ADDON_USER` | `root` | Utilisateur MySQL |
| `DB_PASSWORD` / `MYSQL_ADDON_PASSWORD` | *(vide)* | Mot de passe MySQL |
| `DB_NAME` / `MYSQL_ADDON_DB` | `location_app` | Base MySQL |
| `DB_SSL` | `false` | Active TLS vers MySQL |
| `DB_URI` | — | URL complète `mysql://…` (prioritaire) |
| `UPLOAD_DIR` | `backend/uploads` | Dossier des fichiers |

`.env` est ignoré par Git. Ne committez jamais de secret, de base ou de document personnel.

## Sécurité

- Secret JWT chargé depuis l'environnement, sessions révocables via `token_version`.
- Changement de mot de passe obligatoire côté serveur pour les comptes temporaires.
- Mots de passe : 8 caractères minimum, une lettre et un chiffre, bcrypt coût 12.
- Contrôle des rôles et des propriétaires sur chaque ressource.
- Documents et preuves de paiement servis via des routes authentifiées (`/api/documents/:id/file`, `/api/payments/:id/preuve`, `/api/incidents/:id/photo`), jamais en statique.
- En-têtes de sécurité, CSP, limitation de la force brute sur la connexion.
- Validation des montants, dates, mois (`AAAA-MM`) et transitions de contrats.
- Contraintes d'unicité : un bailleur, un contrat ouvert par logement, un paiement par contrat et par mois.

## Structure

```
backend/
  app.js                 Application Express (middlewares, routes)
  server.js              Démarrage + arrêt propre
  config.js              Configuration / .env
  controllers/           Logique métier
  database/              db.js, schema.js, migrate.js
  middleware/            auth, sécurité, uploads
  routes/api/            Routes REST
  services/              Suppression transactionnelle des locataires
  tests/api.test.js      Parcours complet API
frontend/
  *.html                 Landing, auth, dashboards, profil
  css/style.css          Styles historiques
  css/theme.css          Design system (chargé en dernier)
  js/                    Pages + helpers (ui.js, navbar.js)
```

## Notes de données

Les anciens libellés de mois (`Octobre 2026`) sont normalisés en `AAAA-MM` par la migration. Les contrats et paiements restent liés au locataire ; la suppression d'un compte locataire supprime ses contrats et paiements dans une transaction (les fichiers associés sont nettoyés). Pour reprendre les données d'une ancienne base SQLite : `node scripts/import-sqlite.js backend/database/location.sqlite`.

## Tests

```bash
npm test
```

Les tests créent une base MySQL temporaire (préfixe `location_app_test_`) puis la suppriment. Ils utilisent les variables `TEST_DB_HOST`, `TEST_DB_PORT`, `TEST_DB_USER`, `TEST_DB_PASSWORD` (sinon `DB_*`). Avec une base locale : `TEST_DB_PORT=3306 TEST_DB_PASSWORD=... npm test`. À exécuter contre un MySQL local : l'utilisateur Clever Cloud n'a pas le droit de créer des bases.

Ils couvrent : inscription/connexion, contrat, signature, PDF, paiement avec preuve, validation, refus motivé et nouvelle déclaration pour le même mois, relance avec accusé de réception, protections d'accès, suppression du compte locataire et garde-fous sur la suppression d'un bien.
