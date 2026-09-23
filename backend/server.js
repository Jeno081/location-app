// ============================================
// server.js — Point d'entrée du backend
// ============================================

const express = require("express");
const path = require("path");
const app = express();
const PORT = 3000;

// --- Middlewares globaux ---
app.use(express.json());

// --- Servir le frontend ---
app.use(express.static(path.join(__dirname, "../frontend")));

// --- Servir les fichiers uploadés ---
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- Route API de base ---
app.get("/api", (req, res) => {
  res.json({ message: "API Location App operationnelle" });
});

// --- Routes API ---
const authRoutes = require("./routes/api/auth");
app.use("/api/auth", authRoutes);

const propertyRoutes = require("./routes/api/properties");
app.use("/api/properties", propertyRoutes);

const incidentRoutes = require("./routes/api/incidents");
app.use("/api/incidents", incidentRoutes);

const contractRoutes = require("./routes/api/contracts");
app.use("/api/contracts", contractRoutes);

const paymentRoutes = require("./routes/api/payments");
app.use("/api/payments", paymentRoutes);

// --- Démarrage ---
app.listen(PORT, () => {
  console.log("Serveur demarre sur http://localhost:" + PORT);
});