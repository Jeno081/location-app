// ============================================
// import-sqlite.js — Reprise des données SQLite vers MySQL
// ============================================
//
// Usage :
//   node scripts/import-sqlite.js [chemin/vers/location.sqlite] [--force]
//
// La base MySQL cible est configurée par les variables DB_* (ou MYSQL_ADDON_*).
// Sans --force, le script refuse de s'exécuter si la base contient déjà des comptes.
// Les fichiers (photos, preuves) restent dans backend/uploads : copiez ce dossier
// vers le disque persistant de production si nécessaire.

const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const mysql = require("../backend/node_modules/mysql2/promise");
const config = require("../backend/config");
const db = require("../backend/database/db");
const { runMigrations } = require("../backend/database/migrate");

const TABLES = ["users", "properties", "contracts", "payments", "incidents", "documents", "reminders"];
const GENERATED = {
  users: ["bailleur_unique"],
  contracts: ["contrat_ouvert"],
  payments: ["mois_actif"]
};

const sqlitePath = path.resolve(process.argv[2] && !process.argv[2].startsWith("--")
  ? process.argv[2]
  : path.join(__dirname, "..", "backend", "database", "location.sqlite"));
const force = process.argv.includes("--force");

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

function normalize(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && ISO_RE.test(value)) return value.slice(0, 19).replace("T", " ");
  if (value instanceof Uint8Array) return Buffer.from(value);
  return value;
}

async function main() {
  if (!fs.existsSync(sqlitePath)) {
    console.error(`Fichier SQLite introuvable : ${sqlitePath}`);
    process.exit(1);
  }

  const sqlite = new DatabaseSync(sqlitePath, { readOnly: true });

  // Le schéma MySQL doit exister avant l'import.
  await runMigrations();

  const connection = await mysql.createConnection({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
    charset: "utf8mb4",
    dateStrings: true
  });

  const [existing] = await connection.query("SELECT COUNT(*) AS nb FROM users");
  if (Number(existing[0].nb) > 0 && !force) {
    console.error("La base MySQL contient déjà des comptes. Utilisez --force pour la vider avant l'import.");
    await connection.end();
    process.exit(1);
  }

  await connection.query("SET FOREIGN_KEY_CHECKS = 0");
  if (force) {
    for (const table of [...TABLES].reverse()) {
      await connection.query(`DELETE FROM \`${table}\``);
    }
  }

  for (const table of TABLES) {
    const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
    if (rows.length === 0) {
      console.log(`${table}: 0 ligne`);
      continue;
    }

    const sqliteColumns = sqlite.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
    const [mysqlColumns] = await connection.query(`SHOW COLUMNS FROM \`${table}\``);
    const available = new Set(
      mysqlColumns
        .filter((c) => !String(c.Extra || "").toUpperCase().includes("GENERATED"))
        .map((c) => c.Field)
    );

    const columns = sqliteColumns.filter((c) => available.has(c));
    const values = rows.map((row) => columns.map((column) => normalize(row[column])));

    for (let i = 0; i < values.length; i += 200) {
      const chunk = values.slice(i, i + 200);
      await connection.query(
        `INSERT INTO \`${table}\` (${columns.map((c) => `\`${c}\``).join(", ")}) VALUES ?`,
        [chunk]
      );
    }

    const maxId = Math.max(...rows.map((r) => Number(r.id) || 0));
    if (maxId > 0) {
      await connection.query(`ALTER TABLE \`${table}\` AUTO_INCREMENT = ${maxId + 1}`);
    }
    console.log(`${table}: ${rows.length} ligne(s) importée(s) (colonnes: ${columns.join(", ")})`);
  }

  await connection.query("SET FOREIGN_KEY_CHECKS = 1");
  await connection.end();
  await db.close();
  sqlite.close();
  console.log("\nImport terminé. Copiez backend/uploads vers le stockage de production si besoin.");
}

main().catch((err) => {
  console.error("Echec de l'import :", err.message);
  process.exit(1);
});
