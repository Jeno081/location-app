// ============================================
// schema.js — Création des tables
// ============================================

const db = require("./db");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    mot_de_passe TEXT NOT NULL,
    telephone TEXT,
    role TEXT NOT NULL CHECK(role IN ('bailleur', 'locataire')),
    photo_profil TEXT,
    doit_changer_mot_de_passe INTEGER DEFAULT 0,
    onboarding_vu INTEGER DEFAULT 0,
    cree_par_bailleur INTEGER DEFAULT 0,
    token_version INTEGER DEFAULT 0,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

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
    statut TEXT DEFAULT 'disponible' CHECK(statut IN ('disponible', 'loue', 'archive')),
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bailleur_id) REFERENCES users(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL,
    locataire_id INTEGER NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE,
    montant_loyer REAL NOT NULL,
    clauses_personnalisees TEXT,
    statut TEXT DEFAULT 'en_attente' CHECK(statut IN ('en_attente', 'actif', 'termine')),
    signature_bailleur TEXT,
    signature_locataire TEXT,
    date_terminaison DATETIME,
    motif_terminaison TEXT,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id),
    FOREIGN KEY (locataire_id) REFERENCES users(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL,
    montant REAL NOT NULL,
    mois TEXT NOT NULL,
    methode TEXT,
    statut TEXT DEFAULT 'paye' CHECK(statut IN ('paye', 'en_attente', 'refuse')),
    statut_bailleur TEXT DEFAULT 'en_attente' CHECK(statut_bailleur IN ('en_attente', 'valide', 'refuse')),
    preuve_paiement TEXT,
    date_paiement DATETIME,
    FOREIGN KEY (contract_id) REFERENCES contracts(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL,
    locataire_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    photo TEXT,
    statut TEXT DEFAULT 'ouvert' CHECK(statut IN ('ouvert', 'en_cours', 'resolu')),
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id),
    FOREIGN KEY (locataire_id) REFERENCES users(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    locataire_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('cni', 'passeport', 'fiche_paie', 'autre')),
    nom_fichier TEXT NOT NULL,
    chemin TEXT NOT NULL,
    statut TEXT DEFAULT 'en_attente' CHECK(statut IN ('en_attente', 'valide', 'refuse')),
    commentaire TEXT,
    date_upload DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (locataire_id) REFERENCES users(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    statut TEXT DEFAULT 'envoye' CHECK(statut IN ('envoye', 'lu')),
    date_envoi DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contract_id) REFERENCES contracts(id)
  )
`);

console.log("Tables creees avec succes !");
