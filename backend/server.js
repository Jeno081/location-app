// ============================================
// server.js — Point d'entrée de notre backend
// ============================================

const express = require("express");
const app = express();
const PORT = 3000;

// --- Middleware global ---
app.use(express.json()); // Permet de recevoir du JSON dans les requêtes

// --- Routes ---
app.get("/", (req, res) => {
  res.send("Bienvenue sur l'API de Location App !");
});

// Routes d'authentification
const authRoutes = require("./routes/api/auth");
app.use("/api/auth", authRoutes);

const propertyRoutes = require("./routes/api/properties");
app.use("/api/properties", propertyRoutes);

// --- Démarrage ---
app.listen(PORT, () => {
  console.log("Serveur demarre sur http://localhost:" + PORT);
});