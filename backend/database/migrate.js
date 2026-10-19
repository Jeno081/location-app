// ============================================
// migrate.js — Initialisation et migrations SQLite
// ============================================

const db = require("./db");

function hasColumn(table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column);
}

function addColumn(table, column, definition) {
  if (hasColumn(table, column)) return false;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  return true;
}

function safeExec(label, sql) {
  try {
    db.exec(sql);
    return true;
  } catch (err) {
    console.warn(`[migrate] ${label} ignore: ${err.message}`);
    return false;
  }
}

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

function runMigrations() {
  // 1. Tables de base (idempotent).
  require("./schema");

  // 2. Colonnes ajoutées au fil des versions.
  const colonnes = [
    ["users", "token_version", "INTEGER DEFAULT 0"],
    ["users", "photo_profil", "TEXT"],
    ["payments", "statut_bailleur", "TEXT DEFAULT 'en_attente'"],
    ["payments", "preuve_paiement", "TEXT"],
    ["contracts", "clauses_personnalisees", "TEXT"]
  ];
  for (const [table, column, definition] of colonnes) {
    if (addColumn(table, column, definition)) {
      console.log(`[migrate] colonne ${table}.${column} ajoutee`);
    }
  }

  // 3. Index de performance (les clés étrangères ne sont pas indexées par SQLite).
  const index = [
    "CREATE INDEX IF NOT EXISTS idx_properties_bailleur ON properties(bailleur_id)",
    "CREATE INDEX IF NOT EXISTS idx_contracts_property ON contracts(property_id)",
    "CREATE INDEX IF NOT EXISTS idx_contracts_locataire ON contracts(locataire_id)",
    "CREATE INDEX IF NOT EXISTS idx_contracts_statut ON contracts(statut)",
    "CREATE INDEX IF NOT EXISTS idx_payments_contract ON payments(contract_id)",
    "CREATE INDEX IF NOT EXISTS idx_payments_mois ON payments(mois)",
    "CREATE INDEX IF NOT EXISTS idx_incidents_locataire ON incidents(locataire_id)",
    "CREATE INDEX IF NOT EXISTS idx_incidents_property ON incidents(property_id)",
    "CREATE INDEX IF NOT EXISTS idx_documents_locataire ON documents(locataire_id)",
    "CREATE INDEX IF NOT EXISTS idx_reminders_contract ON reminders(contract_id)"
  ];
  for (const sql of index) safeExec("index", sql);

  // 4. Contraintes d'unicité métier.
  safeExec(
    "un seul bailleur",
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_single_bailleur ON users(role) WHERE role = 'bailleur'"
  );
  safeExec(
    "un seul contrat ouvert par logement",
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_contract_open_property ON contracts(property_id) WHERE statut IN ('actif', 'en_attente')"
  );
  safeExec(
    "email insensible a la casse",
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_nocase ON users(email COLLATE NOCASE)"
  );
  safeExec(
    "un paiement par contrat et par mois",
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_contract_mois ON payments(contract_id, mois)"
  );

  // 5. Normaliser les anciens libellés de mois (« Octobre 2026 » -> « 2026-10 »).
  const paiements = db.prepare("SELECT id, mois FROM payments").all();
  const updateMois = db.prepare("UPDATE payments SET mois = ? WHERE id = ?");
  let normalises = 0;
  const normaliser = db.transaction(() => {
    for (const p of paiements) {
      const cle = normaliserMois(p.mois);
      if (cle && cle !== p.mois) {
        updateMois.run(cle, p.id);
        normalises++;
      }
    }
  });
  normaliser();
  if (normalises > 0) console.log(`[migrate] ${normalises} paiement(s) renormalise(s)`);

  db.pragma("user_version = 1");
  console.log("[migrate] Base de donnees prete.");
}

module.exports = { runMigrations, normaliserMois };
