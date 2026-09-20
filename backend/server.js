// ============================================
// server.js — Point d'entrée du backend
// ============================================

const express = require("express");
const path = require("path");
const app = express();
const PORT = 3000;

// --- Middlewares globaux ---
app.use(express.json());

// --- Servir le frontend (HTML, CSS, JS) ---
app.use(express.static(path.join(__dirname, "../frontend")));

// --- Routes API ---
app.get("/api", (req, res) => {
  res.json({ message: "API Location App operationnelle" });
});

const authRoutes = require("./routes/api/auth");
app.use("/api/auth", authRoutes);

const propertyRoutes = require("./routes/api/properties");
app.use("/api/properties", propertyRoutes);

// --- Démarrage ---
app.listen(PORT, () => {
  console.log("Serveur demarre sur http://localhost:" + PORT);
});