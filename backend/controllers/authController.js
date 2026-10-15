// ============================================
// authController.js
// ============================================

const db = require("../database/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = "ma_cle_secrete_a_changer_plus_tard";

exports.register = (req, res) => {
  const { nom, email, mot_de_passe, telephone, role } = req.body;

  if (!nom || !email || !mot_de_passe || !role) {
    return res.status(400).json({ message: "Champs obligatoires manquants" });
  }
  if (role !== "bailleur" && role !== "locataire") {
    return res.status(400).json({ message: "Role invalide" });
  }
  if (role === "locataire") {
    return res.status(403).json({ message: "Inscription publique desactivee. Contactez le bailleur." });
  }
  if (role === "bailleur") {
    const b = db.prepare("SELECT id FROM users WHERE role = 'bailleur'").get();
    if (b) return res.status(403).json({ message: "Un compte bailleur existe deja." });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return res.status(409).json({ message: "Cet email est deja utilise" });

  const hashed = bcrypt.hashSync(mot_de_passe, 10);
  const result = db.prepare(
    "INSERT INTO users (nom, email, mot_de_passe, telephone, role, doit_changer_mot_de_passe, cree_par_bailleur) VALUES (?, ?, ?, ?, ?, 0, 0)"
  ).run(nom, email, hashed, telephone || null, role);

  res.status(201).json({
    message: "Compte cree avec succes",
    user: { id: result.lastInsertRowid, nom, email, telephone, role }
  });
};

exports.login = (req, res) => {
  const { email, mot_de_passe } = req.body;
  if (!email || !mot_de_passe) return res.status(400).json({ message: "Email et mot de passe requis" });

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user) return res.status(401).json({ message: "Email ou mot de passe incorrect" });

  const ok = bcrypt.compareSync(mot_de_passe, user.mot_de_passe);
  if (!ok) return res.status(401).json({ message: "Email ou mot de passe incorrect" });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    message: "Connexion reussie",
    token,
    user: {
      id: user.id,
      nom: user.nom,
      email: user.email,
      role: user.role,
      telephone: user.telephone,
      photo_profil: user.photo_profil,
      doit_changer_mot_de_passe: user.doit_changer_mot_de_passe
    }
  });
};

// ============================================
// Vérifier si un bailleur existe — GET /api/auth/bailleur-existe
// ============================================
exports.bailleurExiste = (req, res) => {
  const b = db.prepare("SELECT id FROM users WHERE role = 'bailleur' LIMIT 1").get();
  res.json({ existe: !!b });
};