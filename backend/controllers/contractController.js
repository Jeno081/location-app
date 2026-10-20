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

exports.createContract = async (req, res) => {
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

  const property = await db.get("SELECT * FROM properties WHERE id = ?", [property_id]);
  if (!property) return res.status(404).json({ message: "Logement introuvable" });
  if (property.bailleur_id !== bailleur_id) return res.status(403).json({ message: "Non autorisé" });

  const locataireExistant = await db.get("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
  if (locataireExistant && locataireExistant.role === "bailleur") {
    return res.status(400).json({ message: "Un compte bailleur ne peut pas être locataire." });
  }
  if (!locataireExistant && !String(locataire_nom || "").trim()) {
    return res.status(400).json({ message: "Le nom du locataire est obligatoire." });
  }

  try {
    const { contractId, motDePasseTemporaire } = await db.transaction(async (tx) => {
      const logement = await tx.get("SELECT * FROM properties WHERE id = ? FOR UPDATE", [property_id]);
      if (!logement || logement.statut !== "disponible") {
        throw httpError(409, "Ce logement n'est plus disponible.");
      }

      const ouvert = await tx.get(`
        SELECT id FROM contracts WHERE property_id = ? AND statut IN ('en_attente', 'actif') LIMIT 1
      `, [property_id]);
      if (ouvert) throw httpError(409, "Un contrat est déjà en cours pour ce logement.");

      let locataire = locataireExistant;
      let motDePasse = null;

      if (!locataire) {
        motDePasse = genererMotDePasse();
        const hashedPassword = bcrypt.hashSync(motDePasse, 12);
        const result = await tx.run(`
          INSERT INTO users (nom, email, mot_de_passe, telephone, role, doit_changer_mot_de_passe, cree_par_bailleur)
          VALUES (?, ?, ?, ?, 'locataire', 1, 1)
        `, [
          String(locataire_nom).trim(),
          email,
          hashedPassword,
          locataire_telephone ? String(locataire_telephone).trim() : null
        ]);
        locataire = { id: result.insertId };
      }

      const result = await tx.run(`
        INSERT INTO contracts (property_id, locataire_id, date_debut, date_fin, montant_loyer, clauses_personnalisees, statut)
        VALUES (?, ?, ?, ?, ?, ?, 'en_attente')
      `, [
        property_id,
        locataire.id,
        date_debut,
        date_fin || null,
        loyer,
        clauses_personnalisees ? String(clauses_personnalisees).slice(0, 5000) : null
      ]);

      return { contractId: result.insertId, motDePasseTemporaire: motDePasse };
    });

    res.status(201).json({
      message: "Contrat créé",
      contractId,
      locataire_email: email,
      mot_de_passe_temporaire: motDePasseTemporaire
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Un contrat ouvert existe déjà pour ce logement." });
    }
    throw err;
  }
};

exports.getMyContractsAsBailleur = async (req, res) => {
  const contracts = await db.all(`
    SELECT c.*, p.titre AS property_titre, p.adresse AS property_adresse,
           u.nom AS locataire_nom, u.email AS locataire_email
    FROM contracts c
    JOIN properties p ON c.property_id = p.id
    JOIN users u ON c.locataire_id = u.id
    WHERE p.bailleur_id = ?
    ORDER BY c.date_creation DESC
  `, [req.user.id]);
  res.json({ contracts });
};

exports.getMyContractsAsLocataire = async (req, res) => {
  const contracts = await db.all(`
    SELECT c.*, p.titre AS property_titre, p.adresse AS property_adresse,
           u.nom AS bailleur_nom, u.email AS bailleur_email
    FROM contracts c
    JOIN properties p ON c.property_id = p.id
    JOIN users u ON p.bailleur_id = u.id
    WHERE c.locataire_id = ?
    ORDER BY c.date_creation DESC
  `, [req.user.id]);
  res.json({ contracts });
};

exports.signContract = async (req, res) => {
  const { id } = req.params;
  const { role, id: userId } = req.user;

  const contract = await db.get(`
    SELECT c.*, p.bailleur_id FROM contracts c
    JOIN properties p ON c.property_id = p.id
    WHERE c.id = ?
  `, [id]);

  if (!contract) return res.status(404).json({ message: "Contrat introuvable" });
  if (contract.statut === "termine") {
    return res.status(409).json({ message: "Ce contrat est terminé et ne peut plus être signé." });
  }

  if (role === "bailleur") {
    if (contract.bailleur_id !== userId) return res.status(403).json({ message: "Non autorisé" });
  } else {
    if (contract.locataire_id !== userId) return res.status(403).json({ message: "Non autorisé" });
  }

  await db.transaction(async (tx) => {
    const now = new Date().toISOString();
    if (role === "bailleur") {
      await tx.run("UPDATE contracts SET signature_bailleur = ? WHERE id = ?", [now, id]);
    } else {
      await tx.run("UPDATE contracts SET signature_locataire = ? WHERE id = ?", [now, id]);
    }

    const updated = await tx.get("SELECT * FROM contracts WHERE id = ?", [id]);
    if (updated.signature_bailleur && updated.signature_locataire) {
      await tx.run("UPDATE contracts SET statut = 'actif' WHERE id = ?", [id]);
      await tx.run("UPDATE properties SET statut = 'loue' WHERE id = ?", [updated.property_id]);
    }
  });

  res.json({ message: "Contrat signé" });
};

exports.terminerContrat = async (req, res) => {
  const { id } = req.params;
  const bailleur_id = req.user.id;

  const contract = await db.get(`
    SELECT c.*, p.bailleur_id FROM contracts c
    JOIN properties p ON c.property_id = p.id
    WHERE c.id = ?
  `, [id]);

  if (!contract) return res.status(404).json({ message: "Contrat introuvable" });
  if (contract.bailleur_id !== bailleur_id) return res.status(403).json({ message: "Non autorisé" });

  const motif = String((req.body && req.body.motif) || "Non précisé").slice(0, 500);
  const locataireId = contract.locataire_id;

  try {
    const compteSupprime = await db.transaction(async (tx) => {
      const now = new Date().toISOString();
      await tx.run(`
        UPDATE contracts SET statut = 'termine', date_terminaison = ?, motif_terminaison = ? WHERE id = ?
      `, [now, motif, id]);
      await tx.run("UPDATE properties SET statut = 'disponible' WHERE id = ?", [contract.property_id]);

      const autres = await tx.get(`
        SELECT COUNT(*) AS nb FROM contracts
        WHERE locataire_id = ? AND id != ? AND statut IN ('actif', 'en_attente')
      `, [locataireId, id]);

      if (Number(autres.nb) > 0) return false;
      return (await deleteTenantAccount(locataireId, tx)) > 0;
    });

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

exports.updateClauses = async (req, res) => {
  const { id } = req.params;
  const clauses = req.body.clauses_personnalisees;

  const contract = await db.get(`
    SELECT c.*, p.bailleur_id FROM contracts c
    JOIN properties p ON c.property_id = p.id
    WHERE c.id = ?
  `, [id]);

  if (!contract) return res.status(404).json({ message: "Contrat introuvable" });
  if (contract.bailleur_id !== req.user.id) return res.status(403).json({ message: "Non autorisé" });
  if (contract.statut === "termine") {
    return res.status(409).json({ message: "Impossible de modifier un contrat terminé." });
  }

  const valeur = clauses ? String(clauses).slice(0, 5000) : null;
  await db.run("UPDATE contracts SET clauses_personnalisees = ? WHERE id = ?", [valeur, id]);
  res.json({ message: "Clauses mises à jour" });
};
