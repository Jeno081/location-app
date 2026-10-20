// ============================================
// authController.js
// ============================================

const db = require("../database/db");
const bcrypt = require("bcryptjs");
const { signToken } = require("../middleware/authMiddleware");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function validatePassword(password) {
  if (typeof password !== "string" || password.length < 8) {
    return "Le mot de passe doit contenir au moins 8 caractères.";
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Le mot de passe doit contenir au moins une lettre et un chiffre.";
  }
  return null;
}

function publicUser(user) {
  return {
    id: user.id,
    nom: user.nom,
    email: user.email,
    role: user.role,
    telephone: user.telephone,
    photo_profil: user.photo_profil,
    doit_changer_mot_de_passe: user.doit_changer_mot_de_passe,
    onboarding_vu: user.onboarding_vu
  };
}

exports.register = async (req, res) => {
  const nom = String(req.body.nom || "").trim();
  const email = normalizeEmail(req.body.email);
  const mot_de_passe = req.body.mot_de_passe;
  const telephone = req.body.telephone ? String(req.body.telephone).trim() : null;
  const role = req.body.role;

  if (!nom || !email || !mot_de_passe || !role) {
    return res.status(400).json({ message: "Champs obligatoires manquants" });
  }
  if (nom.length < 2 || nom.length > 100) {
    return res.status(400).json({ message: "Le nom doit contenir entre 2 et 100 caractères." });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ message: "Adresse email invalide." });
  }
  if (role !== "bailleur") {
    return res.status(403).json({ message: "Inscription publique désactivée. Contactez le bailleur." });
  }

  const passwordError = validatePassword(mot_de_passe);
  if (passwordError) return res.status(400).json({ message: passwordError });

  const bailleur = await db.get("SELECT id FROM users WHERE role = 'bailleur' LIMIT 1");
  if (bailleur) return res.status(403).json({ message: "Un compte bailleur existe déjà." });

  const existing = await db.get("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
  if (existing) return res.status(409).json({ message: "Cet email est déjà utilisé" });

  const hashed = bcrypt.hashSync(mot_de_passe, 12);
  try {
    const result = await db.run(`
      INSERT INTO users (nom, email, mot_de_passe, telephone, role, doit_changer_mot_de_passe, cree_par_bailleur)
      VALUES (?, ?, ?, ?, 'bailleur', 0, 0)
    `, [nom, email, hashed, telephone]);

    res.status(201).json({
      message: "Compte créé avec succès",
      user: { id: result.insertId, nom, email, telephone, role: "bailleur" }
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Cet email est déjà utilisé" });
    }
    throw err;
  }
};

exports.login = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const mot_de_passe = req.body.mot_de_passe;
  if (!email || !mot_de_passe) {
    return res.status(400).json({ message: "Email et mot de passe requis" });
  }

  const user = await db.get("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
  const ok = user ? bcrypt.compareSync(mot_de_passe, user.mot_de_passe) : false;
  if (!ok) {
    return res.status(401).json({ message: "Email ou mot de passe incorrect" });
  }

  res.json({
    message: "Connexion réussie",
    token: signToken(user),
    user: publicUser(user)
  });
};

exports.logout = async (req, res) => {
  await db.run("UPDATE users SET token_version = COALESCE(token_version, 0) + 1 WHERE id = ?", [req.user.id]);
  res.json({ message: "Déconnecté" });
};

exports.me = async (req, res) => {
  const user = await db.get("SELECT * FROM users WHERE id = ?", [req.user.id]);
  if (!user) return res.status(404).json({ message: "Compte introuvable" });
  res.json({ user: publicUser(user) });
};

exports.bailleurExiste = async (req, res) => {
  const bailleur = await db.get("SELECT id FROM users WHERE role = 'bailleur' LIMIT 1");
  res.json({ existe: !!bailleur });
};
