// ============================================
// db.js — Configuration de la base de données
// ============================================

const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const config = require("../config");

fs.mkdirSync(path.dirname(config.DB_PATH), { recursive: true });

const db = new Database(config.DB_PATH);

// Intégrité et comportement en cas de concurrence.
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");
db.pragma("synchronous = NORMAL");

console.log("Base de donnees connectee :", config.DB_PATH);

module.exports = db;
