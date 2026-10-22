# Déploiement en production — Render + MySQL Clever Cloud

Architecture retenue :

```
Navigateur
   │ HTTPS
   ▼
Render (service web Node.js, plan gratuit)
   │ connexion MySQL (port 3306)
   ▼
Clever Cloud (add-on MySQL, plan DEV gratuit)
```

- **Render** exécute l'application Express et sert le frontend.
- **Clever Cloud** héberge la base MySQL.
- Les migrations sont appliquées **automatiquement au démarrage** du serveur.

---

## Étape 1 — Créer la base MySQL sur Clever Cloud

1. Connectez-vous sur <https://console.clever-cloud.com> (compte gratuit).
2. En haut à droite : **Create… → Add an add-on**.
3. Choisissez **MySQL**.
4. Sélectionnez le plan **DEV** (gratuit, destiné aux tests) et la région **Paris**.
5. Donnez un nom (par ex. `location-app-db`) puis validez.
6. Ouvrez l'add-on, onglet **Informations** (ou **Environment variables**) et relevez :

| Information | Variable Clever Cloud | Exemple |
| --- | --- | --- |
| Hôte | `MYSQL_ADDON_HOST` | `bxxxxxxx-mysql.services.clever-cloud.com` |
| Port | `MYSQL_ADDON_PORT` | `3306` |
| Base | `MYSQL_ADDON_DB` | `bxxxxxxx` |
| Utilisateur | `MYSQL_ADDON_USER` | `uxxxxxxx` |
| Mot de passe | `MYSQL_ADDON_PASSWORD` | `…` |

> La base et l'utilisateur sont créés par Clever Cloud. **Vous ne pouvez pas créer
> d'autre base** : utilisez exactement `MYSQL_ADDON_DB` comme `DB_NAME`.

> ⚠️ Le plan DEV est gratuit mais **sans sauvegarde automatique**. Exportez
> régulièrement la base (`mysqldump` ou phpMyAdmin) avant de passer sur un plan payant.

---

## Étape 2 — Configurer et tester en local

À la racine du projet, créez `.env` à partir de `.env.example` :

```bash
cp .env.example .env
```

Renseignez les valeurs Clever Cloud. Le plus simple est de coller directement les
variables fournies par Clever Cloud (elles sont reconnues automatiquement) :

```dotenv
NODE_ENV=development
PORT=3000
JWT_SECRET=remplacez-par-un-secret-de-64-caracteres
JWT_EXPIRES_IN=7d

MYSQL_ADDON_HOST=bxxxxxxx-mysql.services.clever-cloud.com
MYSQL_ADDON_PORT=3306
MYSQL_ADDON_DB=bxxxxxxx
MYSQL_ADDON_USER=uxxxxxxx
MYSQL_ADDON_PASSWORD=votre-mot-de-passe
```

Ou la forme générique :

```dotenv
DB_HOST=bxxxxxxx-mysql.services.clever-cloud.com
DB_PORT=3306
DB_NAME=bxxxxxxx
DB_USER=uxxxxxxx
DB_PASSWORD=votre-mot-de-passe
DB_SSL=false
```

Générez un secret solide :

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Créez les tables et lancez l'application :

```bash
npm --prefix backend install
npm run db:migrate
npm start
```

Vous devez voir `[migrate] Base de donnees prete.` puis le serveur démarrer.

> Si la connexion échoue avec `ECONNREFUSED` ou `ETIMEDOUT`, vérifiez l'hôte,
> le port et que l'add-on Clever Cloud est bien démarré (il peut se réveiller
> en quelques secondes).

---

## Étape 3 — Reprendre les données SQLite (optionnel)

La production démarre avec une base vide : le premier écran permet de recréer le
compte bailleur. Pour conserver vos données locales :

```bash
node scripts/import-sqlite.js backend/database/location.sqlite
```

Le script copie utilisateurs, logements, contrats, paiements, incidents, documents
et rappels en conservant les identifiants. Il refuse de s'exécuter si la base MySQL
contient déjà des comptes ; ajoutez `--force` pour la vider avant l'import.

Les fichiers (photos, preuves, pièces d'identité) restent dans `backend/uploads`.
Copiez-les vers le stockage de production (voir la section « Fichiers envoyés »).

---

## Étape 4 — Pousser le code sur GitHub

Si le dépôt local n'a pas encore de remote :

```bash
git remote add origin https://github.com/<votre-compte>/<votre-depot>.git
git push -u origin master
```

Sinon, poussez simplement la branche courante :

```bash
git add .
git commit -m "Migration MySQL et configuration de déploiement"
git push origin master
```

> La branche du projet est `master`. Si votre dépôt GitHub utilise `main`,
> remplacez `master` par `main` ci-dessus et dans le champ **Branch** de Render.

Vérifiez que `.env`, `node_modules` et `backend/uploads` ne sont **pas** versionnés
(le `.gitignore` du projet s'en charge).

---

## Étape 5 — Créer le service web sur Render

1. Connectez-vous sur <https://render.com> avec GitHub.
2. **New + → Web Service**.
3. Sélectionnez votre dépôt GitHub `location-app`.
4. Renseignez :

| Champ | Valeur exacte |
| --- | --- |
| **Name** | `location-app` |
| **Region** | `Frankfurt (EU Central)` |
| **Branch** | `master` (ou `main` selon votre dépôt) |
| **Root Directory** | *(vide)* |
| **Runtime** | `Node` |
| **Build Command** | `npm --prefix backend install` |
| **Start Command** | `node backend/server.js` |
| **Health Check Path** | `/api/health` |
| **Instance Type** | `Free` |

> Le fichier `render.yaml` fourni permet aussi de créer le service en un clic via
> **New + → Blueprint**.

### Variables d'environnement (onglet « Environment »)

Ajoutez exactement ces variables :

| Clé | Valeur |
| --- | --- |
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `22` |
| `JWT_SECRET` | le secret généré à l'étape 2 (64 caractères) |
| `JWT_EXPIRES_IN` | `7d` |
| `DB_HOST` | hôte MySQL Clever Cloud |
| `DB_PORT` | port MySQL Clever Cloud |
| `DB_USER` | utilisateur MySQL |
| `DB_PASSWORD` | mot de passe MySQL |
| `DB_NAME` | nom de la base MySQL |
| `DB_SSL` | `false` |
| `DB_POOL_SIZE` | `2` |

Cliquez sur **Create Web Service**. Render installe les dépendances, démarre
`node backend/server.js` ; les journaux doivent afficher :

```
[migrate] Base de donnees prete.
Serveur démarré sur http://localhost:10000 (production)
```

Le port est fourni par Render via `PORT`, la configuration le lit automatiquement.

---

## Étape 6 — Première mise en ligne

1. Ouvrez l'URL fournie (`https://location-app-xxxx.onrender.com`).
2. Créez le **compte bailleur** (premier écran).
3. Ajoutez un logement, créez un contrat, signez, déclarez un paiement :
   le parcours complet doit fonctionner comme en local.
4. Vérifiez `https://votre-url/api/health` → `{"status":"ok","version":"1.0.0"}`.

---

## Fichiers envoyés (photos, preuves, documents)

Les fichiers sont désormais **stockés dans MySQL** (table `files`), pas sur le
disque de Render. Ils survivent donc aux redéploiements, aux redémarrages et aux
réveils du service gratuit.

- Les images sont compressées automatiquement (max 1600 px, qualité 82) avant
  enregistrement, pour limiter la taille de la base.
- La taille disponible dépend du plan MySQL Clever Cloud (plan DEV : quota réduit).
  Surveillez l'espace si vous envoyez de nombreux documents.
- `UPLOAD_DIR` ne sert plus que de dossier temporaire pendant l'envoi et de repli
  pour les anciens fichiers locaux.

> Les photos envoyées avant cette mise à jour ont été perdues lors des
> redéploiements précédents : elles doivent être renvoyées une fois. Les nouvelles
> sont conservées.

---

## Mises à jour

```bash
git add .
git commit -m "Description du changement"
git push origin main
```

Render redéploie automatiquement. Les migrations sont rejouées au démarrage
(`runMigrations()` est idempotent).

---

## Dépannage

| Symptôme | Cause probable | Solution |
| --- | --- | --- |
| `ER_ACCESS_DENIED_ERROR` | identifiants MySQL erronés | recopiez les valeurs Clever Cloud, attention aux espaces |
| `ECONNREFUSED` / `ETIMEDOUT` | add-on arrêté ou mauvais port | réveillez l'add-on, vérifiez `DB_PORT` |
| `ER_BAD_DB_ERROR` | `DB_NAME` incorrect | utilisez `MYSQL_ADDON_DB` |
| `ER_NO_SUCH_TABLE` | migration non exécutée | vérifiez les logs de démarrage, relancez le service |
| 502 sur Render | démarrage échoué | consultez les logs Render, la cause est affichée |
| Déconnexion après redéploiement | `JWT_SECRET` différent | gardez la même valeur |
| Réveil lent (30–60 s) | plan gratuit Render | normal : le service s'endort après 15 min d'inactivité |

---

## Sécurité

- `JWT_SECRET` : 64 caractères aléatoires, jamais commité.
- Identifiants MySQL uniquement dans les variables Render / `.env` local.
- `NODE_ENV=production` active HSTS et exige un secret fort.
- Le plan DEV Clever Cloud n'a pas de sauvegardes : exportez la base avant toute
  opération risquée.
- Limitez l'accès au tableau de bord Clever Cloud et à Render aux personnes concernées.
