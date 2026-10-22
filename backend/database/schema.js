// ============================================
// schema.js — Schéma MySQL
// ============================================

// Colonnes générées : MySQL ne gère pas les index partiels de SQLite.
// On reproduit les contraintes métier avec une colonne NULLable + index unique
// (MySQL autorise plusieurs NULL dans un index unique).
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nom VARCHAR(100) NOT NULL,
    email VARCHAR(190) NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    telephone VARCHAR(30) NULL,
    role ENUM('bailleur', 'locataire') NOT NULL,
    photo_profil VARCHAR(255) NULL,
    doit_changer_mot_de_passe TINYINT(1) NOT NULL DEFAULT 0,
    onboarding_vu TINYINT(1) NOT NULL DEFAULT 0,
    cree_par_bailleur TINYINT(1) NOT NULL DEFAULT 0,
    token_version INT NOT NULL DEFAULT 0,
    date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    bailleur_unique TINYINT GENERATED ALWAYS AS (CASE WHEN role = 'bailleur' THEN 1 ELSE NULL END) STORED,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email),
    UNIQUE KEY uq_single_bailleur (bailleur_unique)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS properties (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    bailleur_id INT UNSIGNED NOT NULL,
    titre VARCHAR(120) NOT NULL,
    adresse VARCHAR(200) NOT NULL,
    ville VARCHAR(100) NULL,
    loyer DOUBLE NOT NULL,
    charges DOUBLE NOT NULL DEFAULT 0,
    description TEXT NULL,
    photos LONGTEXT NULL,
    statut ENUM('disponible', 'loue', 'archive') NOT NULL DEFAULT 'disponible',
    date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_properties_bailleur (bailleur_id),
    CONSTRAINT fk_properties_bailleur FOREIGN KEY (bailleur_id) REFERENCES users (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS contracts (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    property_id INT UNSIGNED NOT NULL,
    locataire_id INT UNSIGNED NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE NULL,
    montant_loyer DOUBLE NOT NULL,
    clauses_personnalisees TEXT NULL,
    statut ENUM('en_attente', 'actif', 'termine') NOT NULL DEFAULT 'en_attente',
    signature_bailleur DATETIME NULL,
    signature_locataire DATETIME NULL,
    date_terminaison DATETIME NULL,
    motif_terminaison VARCHAR(500) NULL,
    date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    contrat_ouvert INT UNSIGNED GENERATED ALWAYS AS (
      CASE WHEN statut IN ('actif', 'en_attente') THEN property_id ELSE NULL END
    ) STORED,
    PRIMARY KEY (id),
    KEY idx_contracts_property (property_id),
    KEY idx_contracts_locataire (locataire_id),
    KEY idx_contracts_statut (statut),
    UNIQUE KEY uq_contract_open_property (contrat_ouvert),
    CONSTRAINT fk_contracts_property FOREIGN KEY (property_id) REFERENCES properties (id),
    CONSTRAINT fk_contracts_locataire FOREIGN KEY (locataire_id) REFERENCES users (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS payments (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    contract_id INT UNSIGNED NOT NULL,
    montant DOUBLE NOT NULL,
    mois VARCHAR(7) NOT NULL,
    methode VARCHAR(30) NULL,
    statut ENUM('paye', 'en_attente', 'refuse') NOT NULL DEFAULT 'paye',
    statut_bailleur ENUM('en_attente', 'valide', 'refuse') NOT NULL DEFAULT 'en_attente',
    preuve_paiement VARCHAR(255) NULL,
    motif_refus VARCHAR(500) NULL,
    lot_id CHAR(36) NULL,
    date_decision DATETIME NULL,
    date_paiement DATETIME NULL,
    mois_actif VARCHAR(7) GENERATED ALWAYS AS (
      CASE WHEN statut_bailleur <> 'refuse' THEN mois ELSE NULL END
    ) STORED,
    PRIMARY KEY (id),
    KEY idx_payments_contract (contract_id),
    KEY idx_payments_mois (mois),
    KEY idx_payments_lot (lot_id),
    UNIQUE KEY uq_payments_contract_mois_actif (contract_id, mois_actif),
    CONSTRAINT fk_payments_contract FOREIGN KEY (contract_id) REFERENCES contracts (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS incidents (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    property_id INT UNSIGNED NOT NULL,
    locataire_id INT UNSIGNED NOT NULL,
    description TEXT NOT NULL,
    photo VARCHAR(255) NULL,
    statut ENUM('ouvert', 'en_cours', 'resolu') NOT NULL DEFAULT 'ouvert',
    date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_incidents_locataire (locataire_id),
    KEY idx_incidents_property (property_id),
    CONSTRAINT fk_incidents_property FOREIGN KEY (property_id) REFERENCES properties (id),
    CONSTRAINT fk_incidents_locataire FOREIGN KEY (locataire_id) REFERENCES users (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS documents (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    locataire_id INT UNSIGNED NOT NULL,
    type ENUM('cni', 'passeport', 'fiche_paie', 'autre') NOT NULL,
    nom_fichier VARCHAR(255) NOT NULL,
    chemin VARCHAR(255) NOT NULL,
    statut ENUM('en_attente', 'valide', 'refuse') NOT NULL DEFAULT 'en_attente',
    commentaire VARCHAR(500) NULL,
    date_upload DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_documents_locataire (locataire_id),
    CONSTRAINT fk_documents_locataire FOREIGN KEY (locataire_id) REFERENCES users (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS reminders (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    contract_id INT UNSIGNED NOT NULL,
    message VARCHAR(500) NOT NULL,
    statut ENUM('envoye', 'lu') NOT NULL DEFAULT 'envoye',
    date_envoi DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_lecture DATETIME NULL,
    date_confirmation DATETIME NULL,
    PRIMARY KEY (id),
    KEY idx_reminders_contract (contract_id),
    CONSTRAINT fk_reminders_contract FOREIGN KEY (contract_id) REFERENCES contracts (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Fichiers envoyés (photos, preuves, documents) : stockés en base pour
  // survivre aux redéploiements Render (disque éphémère).
  `CREATE TABLE IF NOT EXISTS files (
    path VARCHAR(255) NOT NULL,
    mime VARCHAR(100) NOT NULL,
    taille INT UNSIGNED NOT NULL,
    donnees LONGBLOB NOT NULL,
    date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (path)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
];

module.exports = { SCHEMA };


