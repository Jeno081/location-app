// ============================================
// contractController.js
// ============================================

const crypto = require("crypto");
const db = require("../database/db");
const bcrypt = require("bcryptjs");
const { deleteTenantAccount } = require("../services/tenantService");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function genererMotDePasse() {
  // 23 caractères, toujours au moins une lettre et un chiffre.
  return `Lk${crypto.randomInt(10)}${crypto.randomBytes(10).toString("hex")}`;
}

function estDateValide(value) {
  if (!value || typeof value !== "string") return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

exports.createContract = (req, res) => {
  const {
    property_id, locataire_email, locataire_nom, locataire_telephone,
    date_debut, date_fin, montant_loyer, clauses_personnalisees
  } = req.body;
  const bailleur_id = req.user.id;

  if (!property_id || !locataire_email || !date_debut || montant_loyer === undefined) {
    return res.status(400).json({ message: "Champs obligatoires manquants" });
  }

  const email = String(locataire_email).trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return res.status(400).json({ message: "Adresse email du locataire invalide." });
  if (!estDateValide(date_debut)) return res.status(400).json({ message: "Date de début invalide." });
  if (date_fin && !estDateValide(date_fin)) return res.status(400).json({ message: "Date de fin invalide." });
  if (date_fin && new Date(date_fin) <= new Date(date_debut)) {
    return res.status(400).json({ message: "La date de fin doit être après la date de début." });
  }

  const loyer = Number(montant_loyer);
  if (!Number.isFinite(loyer) || loyer <= 0) {
    return res.status(400).json({ message: "Le loyer doit être un montant positif." });
  }

  const property = db.prepare("SELECT * FROM properties WHERE id = ?").get(property_id);
  if (!property) return res.status(404).json({ message: "Logement introuvable" });
  if (property.bailleur_id !== bailleur_id) return res.status(403).json({ message: "Non autorisé" });

  const locataireExistant = db.prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE").get(email);
  if (locataireExistant && locataireExistant.role === "bailleur") {
    return res.status(400).json({ message: "Un compte bailleur ne peut pas être locataire." });
  }
  if (!locataireExistant && !String(locataire_nom || "").trim()) {
    return res.status(400).json({ message: "Le nom du locataire est obligatoire." });
  }

  const creer = db.transaction(() => {
    const logement = db.prepare("SELECT * FROM properties WHERE id = ?").get(property_id);
    if (!logement || logement.statut !== "disponible") {
      throw httpError(409, "Ce logement n'est plus disponible.");
    }

    const ouvert = db.prepare(`
      SELECT id FROM contracts WHERE property_id = ? AND statut IN ('en_attente', 'actif') LIMIT 1
    `).get(property_id);
    if (ouvert) throw httpError(409, "Un contrat est déjà en cours pour ce logement.");

    let locataire = locataireExistant;
    let motDePasseTemporaire = null;

    if (!locataire) {
      motDePasseTemporaire = genererMotDePasse();
      const hashedPassword = bcrypt.hashSync(motDePasseTemporaire, 12);
      const result = db.prepare(`
        INSERT INTO users (nom, email, mot_de_passe, telephone, role, doit_changer_mot_de_passe, cree_par_bailleur)
        VALUES (?, ?, ?, ?, 'locataire', 1, 1)
      `).run(
        String(locataire_nom).trim(),
        email,
        hashedPassword,
        locataire_telephone ? String(locataire_telephone).trim() : null
      );
      locataire = { id: result.lastInsertRowid };
    }

    const result = db.prepare(`
      INSERT INTO contracts (property_id, locataire_id, date_debut, date_fin, montant_loyer, clauses_personnalisees, statut)
      VALUES (?, ?, ?, ?, ?, ?, 'en_attente')
    `).run(
      property_id,
      locataire.id,
      date_debut,
      date_fin || null,
      loyer,
      clauses_personnalisees ? String(clauses_personnalisees).slice(0, 5000) : null
    );

    return { contractId: result.lastInsertRowid, motDePasseTemporaire };
  });

  try {
    const { contractId, motDePasseTemporaire } = creer();
    res.status(201).json({
      message: "Contrat créé",
      contractId,
      locataire_email: email,
      mot_de_passe_temporaire: motDePasseTemporaire
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ message: "Un contrat ouvert existe déjà pour ce logement." });
    }
    throw err;
  }
};

exports.getMyContractsAsBailleur = (req, res) => {
  const contracts = db.prepare(`
    SELECT c.*, p.titre AS property_titre, p.adresse AS property_adresse,
           u.nom AS locataire_nom, u.email AS locataire_email
    FROM contracts c
    JOIN properties p ON c.property_id = p.id
    JOIN users u ON c.locataire_id = u.id
    WHERE p.bailleur_id = ?
    ORDER BY c.date_creation DESC
  `).all(req.user.id);
  res.json({ contracts });
};

exports.getMyContractsAsLocataire = (req, res) => {
  const contracts = db.prepare(`
    SELECT c.*, p.titre AS property_titre, p.adresse AS property_adresse,
           u.nom AS bailleur_nom, u.email AS bailleur_email
    FROM contracts c
    JOIN properties p ON c.property_id = p.id
    JOIN users u ON p.bailleur_id = u.id
    WHERE c.locataire_id = ?
    ORDER BY c.date_creation DESC
  `).all(req.user.id);
  res.json({ contracts });
};

exports.signContract = (req, res) => {
  const { id } = req.params;
  const { role, id: userId } = req.user;

  const contract = db.prepare(`
    SELECT c.*, p.bailleur_id FROM contracts c
    JOIN properties p ON c.property_id = p.id
    WHERE c.id = ?
  `).get(id);

  if (!contract) return res.status(404).json({ message: "Contrat introuvable" });
  if (contract.statut === "termine") {
    return res.status(409).json({ message: "Ce contrat est terminé et ne peut plus être signé." });
  }

  if (role === "bailleur") {
    if (contract.bailleur_id !== userId) return res.status(403).json({ message: "Non autorisé" });
  } else {
    if (contract.locataire_id !== userId) return res.status(403).json({ message: "Non autorisé" });
  }

  const signer = db.transaction(() => {
    const now = new Date().toISOString();
    if (role === "bailleur") {
      db.prepare("UPDATE contracts SET signature_bailleur = ? WHERE id = ?").run(now, id);
    } else {
      db.prepare("UPDATE contracts SET signature_locataire = ? WHERE id = ?").run(now, id);
    }

    const updated = db.prepare("SELECT * FROM contracts WHERE id = ?").get(id);
    if (updated.signature_bailleur && updated.signature_locataire) {
      db.prepare("UPDATE contracts SET statut = 'actif' WHERE id = ?").run(id);
      db.prepare("UPDATE properties SET statut = 'loue' WHERE id = ?").run(updated.property_id);
    }
  });

  signer();
  res.json({ message: "Contrat signé" });
};

exports.terminerContrat = (req, res) => {
  const { id } = req.params;
  const bailleur_id = req.user.id;

  const contract = db.prepare(`
    SELECT c.*, p.bailleur_id FROM contracts c
    JOIN properties p ON c.property_id = p.id
    WHERE c.id = ?
  `).get(id);

  if (!contract) return res.status(404).json({ message: "Contrat introuvable" });
  if (contract.bailleur_id !== bailleur_id) return res.status(403).json({ message: "Non autorisé" });

  const motif = String((req.body && req.body.motif) || "Non précisé").slice(0, 500);
  const locataireId = contract.locataire_id;

  const terminer = db.transaction(() => {
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE contracts SET statut = 'termine', date_terminaison = ?, motif_terminaison = ? WHERE id = ?
    `).run(now, motif, id);
    db.prepare("UPDATE properties SET statut = 'disponible' WHERE id = ?").run(contract.property_id);

    const autres = db.prepare(`
      SELECT COUNT(*) AS nb FROM contracts
      WHERE locataire_id = ? AND id != ? AND statut IN ('actif', 'en_attente')
    `).get(locataireId, id).nb;

    if (autres > 0) return false;
    return deleteTenantAccount(locataireId) > 0;
  });

  try {
    const compteSupprime = terminer();
    res.json({
      message: compteSupprime
        ? "Contrat terminé et compte locataire supprimé."
        : "Contrat terminé. Le locataire conserve son compte."
    });
  } catch (err) {
    console.error("[terminerContrat]", err);
    res.status(500).json({ message: "Erreur lors de la terminaison du contrat." });
  }
};

exports.updateClauses = (req, res) => {
  const { id } = req.params;
  const clauses = req.body.clauses_personnalisees;

  const contract = db.prepare(`
    SELECT c.*, p.bailleur_id FROM contracts c
    JOIN properties p ON c.property_id = p.id
    WHERE c.id = ?
  `).get(id);

  if (!contract) return res.status(404).json({ message: "Contrat introuvable" });
  if (contract.bailleur_id !== req.user.id) return res.status(403).json({ message: "Non autorisé" });
  if (contract.statut === "termine") {
    return res.status(409).json({ message: "Impossible de modifier un contrat terminé." });
  }

  const valeur = clauses ? String(clauses).slice(0, 5000) : null;
  db.prepare("UPDATE contracts SET clauses_personnalisees = ? WHERE id = ?").run(valeur, id);
  res.json({ message: "Clauses mises à jour" });
};
