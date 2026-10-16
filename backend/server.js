// ============================================
// server.js
// ============================================

const express = require("express");
const path = require("path");
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/api", (req, res) => {
  res.json({ message: "API Location App operationnelle" });
});

const authRoutes = require("./routes/api/auth");
app.use("/api/auth", authRoutes);

const userRoutes = require("./routes/api/users");
app.use("/api/users", userRoutes);

const propertyRoutes = require("./routes/api/properties");
app.use("/api/properties", propertyRoutes);

const incidentRoutes = require("./routes/api/incidents");
app.use("/api/incidents", incidentRoutes);

const contractRoutes = require("./routes/api/contracts");
app.use("/api/contracts", contractRoutes);

const paymentRoutes = require("./routes/api/payments");
app.use("/api/payments", paymentRoutes);

const historyRoutes = require("./routes/api/history");
app.use("/api/history", historyRoutes);

const notificationRoutes = require("./routes/api/notifications");
app.use("/api/notifications", notificationRoutes);

const documentRoutes = require("./routes/api/documents");
app.use("/api/documents", documentRoutes);

app.listen(PORT, () => {
  console.log("Serveur demarre sur http://localhost:" + PORT);
});