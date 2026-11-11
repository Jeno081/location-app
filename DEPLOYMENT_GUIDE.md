# Deployment Guide — Private SaaS (one instance per client)

This guide deploys a **new independent instance** for a client. Each client gets its own:

- Clever Cloud MySQL database;
- Render web service;
- GitHub repository;
- Cloudinary folder/account;
- Firebase project (if push notifications are enabled);
- custom domain.

The code is a **master template**. No database, Cloudinary account, Firebase project or `.env` file is shared between clients.

> The interface is in French. Commands and environment variable names are universal.

---

## 0. Before you start

### Accounts and tools

- GitHub account
- Render account
- Clever Cloud account with a MySQL add-on
- Cloudinary account (free plan is enough for photos/avatars)
- Firebase project (optional but required for push notifications)
- Domain name (optional for a first test; a Render URL works)
- Node.js 22+
- Git and npm

### Naming convention for this guide

Example for **Client B**:

| Item | Value |
|---|---|
| `CLIENT_SLUG` | `client-b` |
| GitHub repo | `location-app-client-b` |
| Render service | `location-app-client-b` |
| Clever Cloud database | `location-app-client-b` |
| Cloudinary folder | `client-b` |
| App URL | `https://app.client-b.com` or the Render URL |
| Seed email | `bailleur@client-b.com` |

Use a unique slug everywhere. Never reuse Client A's values.

### Security rules

- Never commit `.env`, service account JSON, Cloudinary secrets or seed passwords.
- Never reuse the production database, Cloudinary account or Firebase project.
- Run `npm run seed` only against the new client database.
- Remove `SEED_BAILLEUR_*` from your shell and Render after installation.
- Use a different `JWT_SECRET` for every client.

---

## 1. Prepare the master template on GitHub

1. Push the current master branch.
2. On GitHub, open the master repository → **Settings**.
3. Enable **Template repository**.
4. Tag the release:

```powershell
git tag -a v1.0.0 -m "Private SaaS master v1.0.0"
git push origin v1.0.0
```

5. Create the client repository:
   - **Use this template** → **Create a new repository**
   - Name: `location-app-client-b`
   - Visibility: **Private**
   - Do not include any `.env` file.

6. Clone it:

```powershell
git clone https://github.com/YOUR_ACCOUNT/location-app-client-b.git
cd location-app-client-b
```

7. Edit `render.yaml` in the **client repository**:

```yaml
services:
  - type: web
    name: location-app-client-b
```

Keep the rest of the blueprint.

8. Add the master as `upstream` for future upgrades:

```powershell
git remote add upstream https://github.com/YOUR_ACCOUNT/location-app.git
```

9. Commit and push:

```powershell
git add render.yaml
git commit -m "Configure Render service for Client B"
git push origin master
```

> Do not copy `.env` from Client A. Do not reuse its database URL or Firebase service account.

---

## 2. Create the Clever Cloud MySQL database

1. Clever Cloud Console → **Create → Add-on → MySQL**.
2. Choose the smallest plan that fits the client.
3. Name it `location-app-client-b`.
4. Wait until the add-on is **running**.
5. Open the add-on details and note:

```text
DB_HOST
DB_PORT
DB_USER
DB_PASSWORD
DB_NAME
```

6. The Clever Cloud DEV MySQL user has a **5-connection limit**. Keep:

```env
DB_POOL_SIZE=2
DB_SSL=false
```

A Render deployment can briefly run old + new instances during a zero-downtime deploy. Pool 2 leaves room, but avoid running many extra tools at the same time.

7. Do not run the seed yet. First create the Render service, or seed before first deploy if you prefer; both work.

### Database backups

Before any future upgrade, create a Clever Cloud backup or export:

```sql
mysqldump ...
```

Store backups outside the database.

---

## 3. Create the Cloudinary account/folder

### Option A — separate Cloudinary account per client (recommended)

1. Create a Cloudinary account for the client.
2. Copy from the dashboard:

```text
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

3. Use a folder matching the client:

```env
CLOUDINARY_FOLDER=client-b
```

### Option B — one Cloudinary account, separate folders

This is acceptable for a small number of clients, but every client must have a unique folder:

```env
CLOUDINARY_FOLDER=client-b
```

Never put the API secret in frontend code, GitHub, screenshots or chat.

### What goes to Cloudinary

Only:

- property photos → `client-b/properties`;
- profile avatars → `client-b/profiles`;
- incident photos/videos → `client-b/incidents`.

Never upload identity documents or payment proofs to Cloudinary.

### Branding assets

Upload optional logo/icons to Cloudinary or keep them in `frontend/icons`. Set:

```env
APP_LOGO_URL=...
APP_ICON_192_URL=...
APP_ICON_512_URL=...
APP_ICON_MASKABLE_URL=...
APP_APPLE_ICON_URL=...
```

The PWA manifest is generated from these URLs.

---

## 4. Create the Firebase project (push notifications)

Skip this section if the client does not need push notifications. If you skip it, do not set any `FIREBASE_*` variable; the app will run without push. Keep `CLIENT_SLUG=client-b` set for storage isolation and branding.

1. Create a new Firebase project: `location-app-client-b`.
2. Add a **Web app**.
3. Copy the public Web configuration:

```text
FIREBASE_WEB_API_KEY
FIREBASE_WEB_AUTH_DOMAIN
FIREBASE_WEB_PROJECT_ID
FIREBASE_WEB_STORAGE_BUCKET
FIREBASE_WEB_MESSAGING_SENDER_ID
FIREBASE_WEB_APP_ID
```

4. Enable **Cloud Messaging**.
5. Create a **Web Push certificate** and copy the VAPID public key:

```text
FIREBASE_VAPID_KEY
```

6. Project settings → **Service accounts** → generate a new private key.
7. Store the JSON as a Render secret. The easiest format is:

```text
FIREBASE_SERVICE_ACCOUNT_JSON=<raw JSON or base64-encoded JSON>
```

Alternatively:

```text
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

`FIREBASE_PRIVATE_KEY` must keep its newline escapes.

The Firebase project must belong to this client only. Never reuse Client A's project: FCM tokens would be mixed.

---

## 5. Create the Render web service

1. Render Dashboard → **New → Blueprint**.
2. Connect the `location-app-client-b` repository.
3. Render reads `render.yaml`.
4. Name the service `location-app-client-b`.
5. Choose the **Free** plan for a test, or a paid plan for production.
6. Set the environment variables below.
7. Create/deploy the service.

### Required environment variables

```env
NODE_ENV=production
NODE_VERSION=22
JWT_SECRET=<generate 32+ random characters>

DB_HOST=<Clever Cloud host>
DB_PORT=3306
DB_USER=<Clever Cloud user>
DB_PASSWORD=<Clever Cloud password>
DB_NAME=<Clever Cloud database>
DB_SSL=false
DB_POOL_SIZE=2

APP_URL=https://location-app-client-b.onrender.com
APP_NAME=Client B Immobilier
APP_SHORT_NAME=Client B
APP_COMPANY_NAME=Client B Immobilier
APP_TAGLINE=Gestion locative
APP_DEFAULT_LANGUAGE=fr
APP_LOCALE=fr-FR
APP_CURRENCY=USD
APP_CURRENCY_SYMBOL=$
APP_TIMEZONE=Africa/Kinshasa
APP_PRIMARY_COLOR=#4f46e5
APP_ACCENT_COLOR=#14b8a6
APP_THEME_COLOR=#0b1220
APP_BACKGROUND_COLOR=#000000
CLIENT_SLUG=client-b
```

Generate a JWT secret:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### Optional branding

```env
APP_LOGO_URL=...
APP_ICON_192_URL=...
APP_ICON_512_URL=...
APP_ICON_MASKABLE_URL=...
APP_APPLE_ICON_URL=...
APP_FAVICON_URL=...
APP_SUPPORT_EMAIL=...
APP_SUPPORT_PHONE=...
```

### Cloudinary

Only if public media should go to Cloudinary:

```env
PUBLIC_MEDIA_STORAGE=cloudinary
CLOUDINARY_CLOUD_NAME=<cloud name>
CLOUDINARY_API_KEY=<key>
CLOUDINARY_API_SECRET=<secret>
CLOUDINARY_FOLDER=client-b
```

If these are missing or incomplete, the app falls back to MySQL and logs a warning. `/api/health` reports the effective storage.

### Firebase

```env
FIREBASE_SERVICE_ACCOUNT_JSON=<raw JSON or base64>
FIREBASE_WEB_API_KEY=...
FIREBASE_WEB_AUTH_DOMAIN=...
FIREBASE_WEB_PROJECT_ID=...
FIREBASE_WEB_STORAGE_BUCKET=...
FIREBASE_WEB_MESSAGING_SENDER_ID=...
FIREBASE_WEB_APP_ID=...
FIREBASE_VAPID_KEY=...
```

Do **not** add `SEED_BAILLEUR_*` to Render if you seed locally. They are not used by the running app.

### First deploy

The app starts and runs migrations. On a fresh database with no landlord:

- `/` and `/login.html` redirect to `/install.html`;
- private APIs return `503 NOT_INSTALLED`;
- production registration is blocked;
- `/api/install/status` returns `installed: false`.

That is expected.

---

## 6. Custom domain and `APP_URL`

For a test, the Render URL is enough:

```env
APP_URL=https://location-app-client-b.onrender.com
```

For production:

1. Render → Settings → **Custom Domains** → add `app.client-b.com`.
2. Create the DNS record requested by Render.
3. Wait for the certificate.
4. Update Render:

```env
APP_URL=https://app.client-b.com
```

5. Redeploy.
6. Regenerate the PWA QR code/poster with the final URL.

`APP_URL` is used by push notifications, QR codes and links.

---

## 7. Seed the first landlord

The seed must run against **Client B's new database**, never Client A's.

### PowerShell

```powershell
$env:NODE_ENV="development"
$env:DB_HOST="<client-b-db-host>"
$env:DB_PORT="3306"
$env:DB_USER="<client-b-db-user>"
$env:DB_PASSWORD="<client-b-db-password>"
$env:DB_NAME="<client-b-db-name>"
$env:DB_SSL="false"

$env:SEED_BAILLEUR_NOM="Bailleur Client B"
$env:SEED_BAILLEUR_EMAIL="bailleur@client-b.com"
$env:SEED_BAILLEUR_PASSWORD="UnMotDePasseSolide123!"
$env:SEED_BAILLEUR_TELEPHONE="+243..."

npm run seed
```

Expected:

```text
[seed] Bailleur créé : bailleur@client-b.com (id 1).
[seed] L'instance est marquée comme installée.
[seed] Le mot de passe devra être changé à la première connexion.
```

Run it a second time to prove idempotence:

```text
[seed] Un bailleur existe déjà (...). Aucune création.
```

### If the shell must not keep secrets

Close the terminal after the seed. In PowerShell, also remove:

```powershell
Remove-Item Env:SEED_BAILLEUR_PASSWORD
Remove-Item Env:SEED_BAILLEUR_EMAIL
Remove-Item Env:SEED_BAILLEUR_NOM
Remove-Item Env:SEED_BAILLEUR_TELEPHONE
```

### Optional password reset

Only for an existing client:

```powershell
node backend/scripts/seed.js --reset-password
```

This changes the password and invalidates existing sessions. Do not use it on a new database.

### What the seed does

- runs migrations;
- creates the landlord;
- sets `doit_changer_mot_de_passe = 1`;
- writes `app_settings.installed_at`;
- does not create demo data;
- never logs the password.

After seed, reload `/install.html`. It redirects to login automatically within a few seconds. Log in with the seed email/password and change the password.

---

## 8. Smoke test the new client

### Public endpoints

```text
GET /api/health
GET /api/install/status
GET /api/config
GET /manifest.json
```

Expected:

- health `200`, with `"storage":"cloudinary"` (or `"db"`);
- install `{"installed":true}`;
- config shows Client B app name, currency and `CLIENT_SLUG`;
- manifest shows Client B name and icons.

### User flows

- [ ] Landlord login works.
- [ ] Forced password change works.
- [ ] Create a property.
- [ ] Upload a property photo.
- [ ] Photo URL is `https://res.cloudinary.com/.../client-b/properties/...` if Cloudinary is enabled.
- [ ] Change the profile avatar.
- [ ] Avatar is under `.../client-b/profiles/...`.
- [ ] Create a tenant and contract.
- [ ] Tenant uploads an identity document.
- [ ] Document path is `/uploads/documents/...`, **not** Cloudinary.
- [ ] Tenant declares a payment with a proof.
- [ ] Proof path is in MySQL, **not** Cloudinary.
- [ ] Tenant creates an incident with a photo/video.
- [ ] Incident media opens through `/api/incidents/...`.
- [ ] Push notification test works (if Firebase configured).
- [ ] PWA installs with Client B name and icons.
- [ ] `/install.html` is no longer accessible as a waiting page.

### Database verification

```sql
SELECT id, path, mime, taille FROM files ORDER BY id DESC LIMIT 10;
SELECT id, photos FROM properties ORDER BY id DESC LIMIT 5;
SELECT id, photo_profil FROM users ORDER BY id DESC LIMIT 5;
SELECT id, path, type FROM incident_media ORDER BY id DESC LIMIT 5;
SELECT id, chemin FROM documents ORDER BY id DESC LIMIT 5;
SELECT id, preuve_paiement FROM payments ORDER BY id DESC LIMIT 5;
SELECT cle, valeur FROM app_settings;
```

Expected:

- `properties.photos` and `users.photo_profil` contain Cloudinary URLs;
- `incident_media.path` contains Cloudinary URLs;
- `documents.chemin` and `payments.preuve_paiement` point to `/uploads/...`;
- `app_settings.installed_at` exists.

### Cloudinary verification

In Cloudinary Media Library, you should see only:

```text
client-b/properties
client-b/profiles
client-b/incidents
```

You should **not** see documents or payment proofs.

---

## 9. Client B simulation checklist

Use this exact sequence to practice before selling:

1. Create `location-app-client-b` from the template.
2. Edit only `render.yaml` service name in that repo.
3. Create `location-app-client-b` MySQL on Clever Cloud.
4. Create a Cloudinary folder `client-b`.
5. Create a separate Firebase project (or skip push and do not set `CLIENT_SLUG` until web config is ready).
6. Create the Render Blueprint service.
7. Add all environment variables.
8. Deploy.
9. Verify `/install.html` and `installed: false`.
10. Run the seed against Client B's DB.
11. Verify `installed: true`.
12. Log in, change password.
13. Run the smoke tests.
14. Check no Client A data appears.
15. Check Cloudinary folder is `client-b`, not `location-app`.
16. Check documents/payment proofs are in MySQL.
17. Remove seed variables.
18. Tag the client repo `v1.0.0-client-b` after acceptance.

If any step uses Client A's DB, Cloudinary account or Firebase project, stop and fix it before continuing.

---

## 10. Updating client instances later

The master template evolves independently from client repositories.

### Master release

```powershell
git checkout master
git pull
npm --prefix backend test
git tag -a v1.1.0 -m "Release 1.1.0"
git push origin master --tags
```

### Client update

```powershell
cd location-app-client-b
git fetch upstream --tags
git checkout -b upgrade-v1.1.0
git merge v1.1.0
npm --prefix backend install
npm --prefix backend test
```

Then:

1. Back up the client database.
2. Review migrations.
3. Deploy to a staging service if possible.
4. Deploy to production.
5. Run the smoke test.

Never auto-merge the master branch into all client repositories. Never copy a production `.env` between clients.

---

## 11. Operations and security checklist

- [ ] Different `JWT_SECRET` per client.
- [ ] Different database per client.
- [ ] Different Firebase project per client.
- [ ] Cloudinary folder/account per client.
- [ ] `CLIENT_SLUG` unique.
- [ ] `CLOUDINARY_FOLDER` unique.
- [ ] `.env` not committed.
- [ ] Service account JSON not committed.
- [ ] `SEED_*` removed after installation.
- [ ] Database backups enabled.
- [ ] Cloudinary API secret rotated if exposed.
- [ ] `APP_URL` set to the final domain.
- [ ] QR code/poster regenerated for the final domain.
- [ ] `PUBLIC_MEDIA_STORAGE` verified via `/api/health`.
- [ ] Documents/payment proofs verified in MySQL.

---

## 12. Troubleshooting

### `storage` stays `db` after setting Cloudinary

- Check all three credentials are present.
- Check `PUBLIC_MEDIA_STORAGE=cloudinary`.
- Redeploy.
- Look for the config warning in Render logs.

### Photo upload fails

- Check Cloudinary credentials and folder.
- Check Cloudinary free-plan limits.
- Check the Render logs for `[cloudinary]`.
- If needed, temporarily set `PUBLIC_MEDIA_STORAGE=db` to restore service.

### Images don't display

- Verify the URL in `/api/config` and `properties.photos`.
- Check browser console for CSP errors.
- The CSP must allow `https://res.cloudinary.com`.
- Clear the PWA cache or reinstall the PWA after a deployment.

### Login returns 500

- Check `/api/health`.
- Check `/api/install/status`.
- Check Render logs for database errors.
- Restart Render once.
- Do not delete the database.

### Seed refuses to run

- The database already has a landlord. That is normal on an installed instance.
- Use a new database for a new client.
- Use `--reset-password` only when intentionally resetting an existing account.

### `ECONNREFUSED` database errors

- Test the database host/port from your machine.
- Restart Render first.
- Restart the Clever Cloud add-on only if its console shows a problem.
- Verify `DB_POOL_SIZE=2`.
- Contact Clever Cloud support with the exact timestamp if Render alone cannot connect.

---

## 13. Final architecture check

```text
Client B
├── GitHub private repo: location-app-client-b
├── Render web service: location-app-client-b
├── Clever Cloud MySQL: location-app-client-b
├── Cloudinary folder: client-b
├── Firebase project: location-app-client-b
└── Domain: app.client-b.com
```

No row, file, credential or token is shared with Client A.
