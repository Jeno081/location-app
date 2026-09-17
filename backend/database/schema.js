// ============================================
// schema.js — Création des tables de la base
// ============================================

const db = require("./db");

// ----- Table USERS (bailleurs + locataires) -----
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    mot_de_passe TEXT NOT NULL,
    telephone TEXT,
    role TEXT NOT NULL CHECK(role IN ('bailleur', 'locataire')),
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// ----- Table PROPERTIES (logements) -----
db.exec(`
  CREATE TABLE IF NOT EXISTS properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bailleur_id INTEGER NOT NULL,
    titre TEXT NOT NULL,
    adresse TEXT NOT NULL,
    ville TEXT,
    loyer REAL NOT NULL,
    charges REAL DEFAULT 0,
    description TEXT,
    photos TEXT,
    statut TEXT DEFAULT 'disponible',
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bailleur_id) REFERENCES users(id)
  )
`);

// ----- Table CONTRACTS (contrats de location) -----
db.exec(`
  CREATE TABLE IF NOT EXISTS contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL,
    locataire_id INTEGER NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE,
    montant_loyer REAL NOT NULL,
    statut TEXT DEFAULT 'en_attente',
    signature_bailleur TEXT,
    signature_locataire TEXT,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id),
    FOREIGN KEY (locataire_id) REFERENCES users(id)
  )
`);

// ----- Table PAYMENTS (paiements) -----
db.exec(`
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL,
    montant REAL NOT NULL,
    mois TEXT NOT NULL,
    methode TEXT,
    statut TEXT DEFAULT 'en_attente',
    date_paiement DATETIME,
    FOREIGN KEY (contract_id) REFERENCES contracts(id)
  )
`);

// ----- Table INCIDENTS (problèmes signalés) -----
db.exec(`
  CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL,
    locataire_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    photo TEXT,
    statut TEXT DEFAULT 'ouvert',
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id),
    FOREIGN KEY (locataire_id) REFERENCES users(id)
  )
`);

console.log("Tables creees avec succes !");