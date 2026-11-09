// ============================================
// installationService.js — État d'installation de l'instance
// ============================================

const db = require("../database/db");

const CACHE_MS = 5000;
let cache = { expiration: 0, valeur: null };

function invaliderCache() {
  cache = { expiration: 0, valeur: null };
}

async function lireInstallation() {
  const bailleur = await db.get("SELECT id FROM users WHERE role = 'bailleur' LIMIT 1");
  let reglage = await db.get("SELECT valeur FROM app_settings WHERE cle = 'installed_at' LIMIT 1");

  // Une base existante avec un bailleur est considérée installée même si la
  // migration de backfill n'a pas encore été exécutée.
  if (bailleur && !reglage) {
    const valeur = new Date().toISOString();
    await db.run(
      "INSERT IGNORE INTO app_settings (cle, valeur) VALUES ('installed_at', ?), ('installation_source', 'runtime')",
      [valeur]
    );
    reglage = { valeur };
  }

  return {
    installed: Boolean(bailleur),
    installedAt: reglage ? reglage.valeur : null
  };
}

async function etatInstallation(force = false) {
  if (!force && cache.valeur && Date.now() < cache.expiration) {
    return cache.valeur;
  }

  try {
    const etat = await lireInstallation();
    cache = { valeur: etat, expiration: Date.now() + CACHE_MS };
    return etat;
  } catch (err) {
    // Ne jamais verrouiller une instance à cause d'une erreur transitoire de base.
    console.error("[installation] état illisible :", err.message);
    return { installed: true, installedAt: null, error: "database_unavailable" };
  }
}

async function marquerInstallee(source = "seed") {
  const maintenant = new Date().toISOString();
  await db.run(
    "INSERT INTO app_settings (cle, valeur) VALUES ('installed_at', ?) ON DUPLICATE KEY UPDATE valeur = VALUES(valeur)",
    [maintenant]
  );
  await db.run(
    "INSERT INTO app_settings (cle, valeur) VALUES ('installation_source', ?) ON DUPLICATE KEY UPDATE valeur = VALUES(valeur)",
    [source]
  );
  invaliderCache();
  return maintenant;
}

async function statutPublic() {
  const etat = await etatInstallation(true);
  return {
    installed: etat.installed,
    installedAt: etat.installedAt
  };
}

module.exports = {
  etatInstallation,
  marquerInstallee,
  statutPublic,
  invaliderCache
};
