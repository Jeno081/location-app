// ============================================
// db.js — Configuration de la base de données
// ============================================

const Database = require("better-sqlite3");
const path = require("path");

// Le fichier de base de données sera créé dans le dossier database/
const dbPath = path.join(__dirname, "location.sqlite");

// On ouvre (ou crée) la base de données
const db = new Database(dbPath);

// On active les clés étrangères (pour lier les tables entre elles)
db.pragma("foreign_keys = ON");

console.log("Base de donnees connectee :", dbPath);

// On exporte db pour pouvoir l'utiliser ailleurs
module.exports = db;