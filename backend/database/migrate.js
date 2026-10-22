// ============================================
// migrate.js — Initialisation et migrations MySQL
// ============================================

const db = require("./db");
const { SCHEMA } = require("./schema");

const MOIS_FR = {
  janvier: "01", fevrier: "02", mars: "03", avril: "04", mai: "05", juin: "06",
  juillet: "07", aout: "08", septembre: "09", octobre: "10", novembre: "11", decembre: "12"
};

function normaliserMois(value) {
  if (!value || typeof value !== "string") return null;
  const texte = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

  const iso = texte.match(/^(\d{4})-(\d{1,2})$/);
  if (iso) {
    const mois = Number(iso[2]);
    if (mois < 1 || mois > 12) return null;
    return `${iso[1]}-${String(mois).padStart(2, "0")}`;
  }

  const francais = texte.match(/^([a-z]+)\s+(\d{4})$/);
  if (francais && MOIS_FR[francais[1]]) {
    return `${francais[2]}-${MOIS_FR[francais[1]]}`;
  }

  const court = texte.match(/^([a-z]{3,4})\.?\s+(\d{4})$/);
  if (court) {
    const prefixe = court[1];
    const cle = Object.keys(MOIS_FR).find((m) => m.startsWith(prefixe) && prefixe.length >= 3);
    if (cle) return `${court[2]}-${MOIS_FR[cle]}`;
  }

  return null;
}

async function columnExists(table, column) {
  const row = await db.get(
    `SELECT 1 AS ok FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, column]
  );
  return !!row;
}

async function addColumn(table, column, definition) {
  if (await columnExists(table, column)) return false;
  await db.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  return true;
}

async function indexExists(table, index) {
  const row = await db.get(
    `SELECT 1 AS ok FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
    [table, index]
  );
  return !!row;
}

async function ensureIndex(table, index, definition) {
  if (await indexExists(table, index)) return false;
  await db.query(`ALTER TABLE ${table} ADD ${definition}`);
  return true;
}

async function runMigrations() {
  // 1. Tables de base (idempotent).
  for (const statement of SCHEMA) {
    await db.query(statement);
  }

  // 2. Colonnes ajoutées au fil des versions (bases existantes).
  const colonnes = [
    ["users", "token_version", "INT NOT NULL DEFAULT 0"],
    ["users", "photo_profil", "VARCHAR(255) NULL"],
    ["payments", "statut_bailleur", "ENUM('en_attente', 'valide', 'refuse') NOT NULL DEFAULT 'en_attente'"],
    ["payments", "preuve_paiement", "VARCHAR(255) NULL"],
    ["payments", "motif_refus", "VARCHAR(500) NULL"],
    ["payments", "lot_id", "CHAR(36) NULL"],
    ["payments", "date_decision", "DATETIME NULL"],
    ["contracts", "clauses_personnalisees", "TEXT NULL"],
    ["reminders", "date_lecture", "DATETIME NULL"],
    ["reminders", "date_confirmation", "DATETIME NULL"],
    ["users", "bailleur_unique", "TINYINT GENERATED ALWAYS AS (CASE WHEN role = 'bailleur' THEN 1 ELSE NULL END) STORED"],
    ["contracts", "contrat_ouvert", "INT UNSIGNED GENERATED ALWAYS AS (CASE WHEN statut IN ('actif', 'en_attente') THEN property_id ELSE NULL END) STORED"],
    ["payments", "mois_actif", "VARCHAR(7) GENERATED ALWAYS AS (CASE WHEN statut_bailleur <> 'refuse' THEN mois ELSE NULL END) STORED"]
  ];
  for (const [table, column, definition] of colonnes) {
    try {
      if (await addColumn(table, column, definition)) {
        console.log(`[migrate] colonne ${table}.${column} ajoutee`);
      }
    } catch (err) {
      console.warn(`[migrate] colonne ${table}.${column} ignoree: ${err.message}`);
    }
  }

  // 3. Contraintes d'unicité métier (colonnes générées = index partiels).
  const contraintes = [
    ["users", "uq_users_email", "UNIQUE KEY uq_users_email (email)"],
    ["users", "uq_single_bailleur", "UNIQUE KEY uq_single_bailleur (bailleur_unique)"],
    ["contracts", "uq_contract_open_property", "UNIQUE KEY uq_contract_open_property (contrat_ouvert)"],
    ["payments", "uq_payments_contract_mois_actif", "UNIQUE KEY uq_payments_contract_mois_actif (contract_id, mois_actif)"],
    ["payments", "idx_payments_lot", "KEY idx_payments_lot (lot_id)"]
  ];
  for (const [table, index, definition] of contraintes) {
    try {
      await ensureIndex(table, index, definition);
    } catch (err) {
      console.warn(`[migrate] contrainte ${index} ignoree: ${err.message}`);
    }
  }

  // 4. Normaliser les anciens libellés de mois (« Octobre 2026 » -> « 2026-10 »).
  const paiements = await db.all("SELECT id, mois FROM payments");
  let normalises = 0;
  for (const paiement of paiements) {
    const cle = normaliserMois(paiement.mois);
    if (cle && cle !== paiement.mois) {
      await db.run("UPDATE payments SET mois = ? WHERE id = ?", [cle, paiement.id]);
      normalises++;
    }
  }
  if (normalises > 0) console.log(`[migrate] ${normalises} paiement(s) renormalise(s)`);

  console.log("[migrate] Base de donnees prete.");
}

module.exports = { runMigrations, normaliserMois };


