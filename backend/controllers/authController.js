// ============================================
// authController.js — Logique d'inscription et connexion
// ============================================

const db = require("../database/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// La clé secrète pour signer les tokens JWT
// (Plus tard, on la mettra dans un fichier .env pour la sécurité)
const JWT_SECRET = "ma_cle_secrete_a_changer_plus_tard";

// ============================================
// INSCRIPTION — POST /api/auth/register
// ============================================
exports.register = (req, res) => {
  const { nom, email, mot_de_passe, telephone, role } = req.body;

  // 1. Vérifier que les champs obligatoires sont là
  if (!nom || !email || !mot_de_passe || !role) {
    return res.status(400).json({ message: "Champs obligatoires manquants" });
  }

  // 2. Vérifier que le rôle est valide
  if (role !== "bailleur" && role !== "locataire") {
    return res.status(400).json({ message: "Role invalide" });
  }

  // 3. Vérifier que l'email n'existe pas déjà
  const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existingUser) {
    return res.status(409).json({ message: "Cet email est deja utilise" });
  }

  // 4. Hacher le mot de passe
  const hashedPassword = bcrypt.hashSync(mot_de_passe, 10);

  // 5. Insérer l'utilisateur dans la base
  const result = db.prepare(
    "INSERT INTO users (nom, email, mot_de_passe, telephone, role) VALUES (?, ?, ?, ?, ?)"
  ).run(nom, email, hashedPassword, telephone || null, role);

  // 6. Renvoyer une réponse (sans le mot de passe !)
  res.status(201).json({
    message: "Compte cree avec succes",
    user: {
      id: result.lastInsertRowid,
      nom,
      email,
      telephone,
      role
    }
  });
};

// ============================================
// CONNEXION — POST /api/auth/login
// ============================================
exports.login = (req, res) => {
  const { email, mot_de_passe } = req.body;

  // 1. Vérifier les champs
  if (!email || !mot_de_passe) {
    return res.status(400).json({ message: "Email et mot de passe requis" });
  }

  // 2. Chercher l'utilisateur
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user) {
    return res.status(401).json({ message: "Email ou mot de passe incorrect" });
  }

  // 3. Comparer le mot de passe fourni avec le hash stocké
  const passwordOk = bcrypt.compareSync(mot_de_passe, user.mot_de_passe);
  if (!passwordOk) {
    return res.status(401).json({ message: "Email ou mot de passe incorrect" });
  }

  // 4. Générer un token JWT valable 7 jours
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  // 5. Renvoyer le token et les infos utilisateur
  res.json({
    message: "Connexion reussie",
    token,
    user: {
      id: user.id,
      nom: user.nom,
      email: user.email,
      role: user.role
    }
  });
};