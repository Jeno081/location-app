// ============================================
// seed.js — Création du premier compte bailleur
// ============================================
//
// Utilisation :
//   npm run seed
//
// Variables lues dans .env ou dans l'environnement :
//   SEED_BAILLEUR_NOM
//   SEED_BAILLEUR_EMAIL
//   SEED_BAILLEUR_PASSWORD
//   SEED_BAILLEUR_TELEPHONE (optionnel)
//
// Le script est idempotent : si un bailleur existe déjà, il ne fait rien.
// L'option --reset-password permet de remplacer explicitement son mot de passe.

const bcrypt = require("bcryptjs");
const db = require("../database/db");
const { runMigrations } = require("../database/migrate");
const installationService = require("../services/installationService");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function valeurEnv(nom) {
  return String(process.env[nom] || "").trim();
}

function echouer(message) {
  console.error(`\n[seed] ${message}\n`);
  process.exitCode = 1;
}

async function creerBailleur() {
  const nom = valeurEnv("SEED_BAILLEUR_NOM");
  const email = valeurEnv("SEED_BAILLEUR_EMAIL").toLowerCase();
  const motDePasse = process.env.SEED_BAILLEUR_PASSWORD || "";
  const telephone = valeurEnv("SEED_BAILLEUR_TELEPHONE") || null;
  const reset = process.argv.includes("--reset-password");

  await runMigrations();

  const existant = await db.get("SELECT id, nom, email FROM users WHERE role = 'bailleur' LIMIT 1");
  if (existant) {
    if (!reset) {
      await installationService.marquerInstallee("existing");
      console.log(`\n[seed] Un bailleur existe déjà (${existant.email}). Aucune création.\n`);
      return;
    }

    if (!motDePasse || motDePasse.length < 12 || !/[A-Za-z]/.test(motDePasse) || !/\d/.test(motDePasse)) {
      echouer("SEED_BAILLEUR_PASSWORD doit contenir au moins 12 caractères, une lettre et un chiffre.");
      return;
    }

    const hash = bcrypt.hashSync(motDePasse, 12);
    await db.run(
      "UPDATE users SET mot_de_passe = ?, doit_changer_mot_de_passe = 1, token_version = token_version + 1 WHERE id = ?",
      [hash, existant.id]
    );
    await installationService.marquerInstallee("seed-reset");
    console.log(`\n[seed] Mot de passe du bailleur ${existant.email} réinitialisé.\n`);
    return;
  }

  if (!nom || !email || !motDePasse) {
    echouer("SEED_BAILLEUR_NOM, SEED_BAILLEUR_EMAIL et SEED_BAILLEUR_PASSWORD sont obligatoires.");
    return;
  }
  if (nom.length < 2 || nom.length > 100) {
    echouer("SEED_BAILLEUR_NOM doit contenir entre 2 et 100 caractères.");
    return;
  }
  if (!EMAIL_RE.test(email)) {
    echouer("SEED_BAILLEUR_EMAIL est invalide.");
    return;
  }
  if (motDePasse.length < 12 || !/[A-Za-z]/.test(motDePasse) || !/\d/.test(motDePasse)) {
    echouer("SEED_BAILLEUR_PASSWORD doit contenir au moins 12 caractères, une lettre et un chiffre.");
    return;
  }

  const hash = bcrypt.hashSync(motDePasse, 12);
  const result = await db.run(`
    INSERT INTO users (nom, email, mot_de_passe, telephone, role, doit_changer_mot_de_passe, cree_par_bailleur)
    VALUES (?, ?, ?, ?, 'bailleur', 1, 0)
  `, [nom, email, hash, telephone]);

  await installationService.marquerInstallee("seed");
  await db.run(
    "INSERT INTO app_settings (cle, valeur) VALUES ('seed_version', '1') ON DUPLICATE KEY UPDATE valeur = VALUES(valeur)"
  );

  console.log(`\n[seed] Bailleur créé : ${email} (id ${result.insertId}).`);
  console.log("[seed] L'instance est marquée comme installée.");
  console.log("[seed] Le mot de passe devra être changé à la première connexion.\n");
}

creerBailleur()
  .catch((err) => {
    console.error("\n[seed] Échec :", err.message, "\n");
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.close().catch(() => {});
  });
