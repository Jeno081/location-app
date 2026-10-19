# Location App

Application de gestion locative pour un bailleur unique et ses locataires : biens, contrats, signatures, loyers, quittances, documents, signalements et calendrier.

## Stack

- **Backend** : Node.js, Express 5, better-sqlite3, JWT, bcrypt, PDFKit, Multer
- **Frontend** : HTML / CSS / JavaScript vanilla, Chart.js, Lucide
- **Base** : SQLite (mode WAL, clés étrangères activées)

## Démarrage

```bash
# 1. Dépendances
npm install
npm --prefix backend install

# 2. Configuration
cp .env.example .env
# Éditez .env et définissez un JWT_SECRET long et aléatoire :
# node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# 3. Initialisation / migrations de la base
npm run db:migrate

# 4. Lancement
npm start
# → http://localhost:3000
```

Le premier écran permet de créer le **compte bailleur unique**. Les comptes locataires sont ensuite créés par le bailleur lors de la création d'un contrat (mot de passe temporaire à changer à la première connexion).

### Windows — lancement en un clic

Double-cliquez sur **`start.cmd`** à la racine du projet : le serveur démarre, la base est migrée automatiquement et le navigateur s'ouvre sur http://localhost:3000. Laissez la fenêtre ouverte ; `Ctrl+C` arrête le serveur.

> Si PowerShell refuse `npm` avec « running scripts is disabled on this system », la stratégie d'exécution Windows bloque `npm.ps1`. Utilisez `npm.cmd` (par exemple `npm.cmd start`, `npm.cmd test`) ou le lanceur `start.cmd`, qui n'est pas concerné.

## Scripts

| Commande | Description |
| --- | --- |
| `npm start` | Démarre le serveur |
| `npm run dev` | Démarre avec nodemon |
| `npm test` | Lance les tests d'intégration API |
| `npm run db:migrate` | Applique les migrations SQLite |
| `npm --prefix backend test` | Équivalent direct |

## Variables d'environnement

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `NODE_ENV` | `development` | `production` active HSTS et exige un secret fort |
| `PORT` | `3000` | Port HTTP |
| `JWT_SECRET` | secret de dev | **Obligatoire en production** (≥ 32 caractères) |
| `JWT_EXPIRES_IN` | `7d` | Durée des sessions |
| `DB_PATH` | `backend/database/location.sqlite` | Fichier SQLite |
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

Les anciens libellés de mois (`Octobre 2026`) sont normalisés en `AAAA-MM` par la migration. Les photos de profil historiques sont migrées vers `/uploads/avatars`. Les contrats et paiements restent liés au locataire ; la suppression d'un compte locataire supprime ses contrats et paiements dans une transaction (les fichiers associés sont nettoyés).

## Tests

```bash
npm test
```

Les tests utilisent une base SQLite temporaire et couvrent : inscription/connexion, contrat, signature, PDF, paiement avec preuve, validation, protections d'accès, suppression du compte locataire et garde-fous sur la suppression d'un bien.
