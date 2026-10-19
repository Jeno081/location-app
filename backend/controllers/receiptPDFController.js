// ============================================
// receiptPDFController.js — Quittance de loyer
// ============================================

const db = require("../database/db");
const {
  createDocument,
  drawHeader,
  section,
  infoCard,
  card,
  label,
  value,
  paragraph,
  finalize,
  formatDate,
  formatMonth,
  money,
  COLORS
} = require("../utils/pdfTheme");

function buildReceiptPDF(doc, payment) {
  const reference = `QUI-${String(payment.id).padStart(6, "0")}`;
  const valide = payment.statut_bailleur === "valide";
  const status = valide
    ? { label: "Paiement validé", tone: "success" }
    : { label: "En attente de validation", tone: "warning" };

  drawHeader(doc, {
    title: "QUITTANCE DE LOYER",
    reference,
    date: `Émise le ${formatDate(payment.date_paiement)}`,
    status
  });

  paragraph(
    doc,
    "La présente quittance atteste que le locataire désigné ci-dessous s'est acquitté du loyer et des charges pour la période indiquée.",
    { size: 8.8, color: COLORS.muted, lineGap: 4 }
  );

  // --- Parties ---
  section(doc, "Les parties");
  let y = doc.y;
  const cardWidth = (doc.page.width - 120) / 2;
  infoCard(doc, 50, y, cardWidth, 84, {
    caption: "Le bailleur",
    name: payment.bailleur_nom,
    lines: [payment.bailleur_email, payment.bailleur_tel],
    accent: true
  });
  infoCard(doc, 70 + cardWidth, y, cardWidth, 84, {
    caption: "Le locataire",
    name: payment.locataire_nom,
    lines: [payment.locataire_email]
  });
  doc.y = y + 96;

  // --- Montant ---
  const width = doc.page.width - 100;
  y = doc.y;
  doc.save();
  doc.roundedRect(50, y, width, 84, 12).fill(COLORS.ink);
  doc.rect(50, y, 5, 84).fill(COLORS.gold);
  doc.restore();

  label(doc, "Montant réglé", 70, y + 15, 200, "#94a3b8");
  doc.font("Helvetica-Bold").fontSize(26).fillColor("#ffffff")
    .text(money(payment.montant), 70, y + 28, { width: 260, lineBreak: false });
  label(doc, "Période concernée", 350, y + 15, 170, "#94a3b8");
  value(doc, formatMonth(payment.mois), 350, y + 28, 170, { size: 13, color: "#ffffff" });
  doc.font("Helvetica").fontSize(7.5).fillColor("#94a3b8")
    .text(`Quittance ${reference}`, 350, y + 52, { width: 170, lineBreak: false });
  doc.y = y + 100;

  // --- Détails ---
  section(doc, "Détails du règlement");
  y = doc.y;
  card(doc, 50, y, width, 128);
  const col1 = 66;
  const col2 = 300;

  label(doc, "Logement", col1, y + 14, 210);
  value(doc, payment.property_titre, col1, y + 27, 210, { size: 10 });
  label(doc, "Adresse", col1, y + 49, 210);
  doc.font("Helvetica").fontSize(8.5).fillColor(COLORS.slate)
    .text(`${payment.property_adresse || "—"}${payment.property_ville ? " · " + payment.property_ville : ""}`, col1, y + 62, {
      width: 210, lineBreak: false, ellipsis: true
    });

  label(doc, "Méthode", col2, y + 14, 210);
  const methode = (payment.methode || "—").replace(/_/g, " ");
  value(doc, methode.charAt(0).toUpperCase() + methode.slice(1), col2, y + 27, 210, { size: 10 });
  label(doc, "Date du paiement", col2, y + 49, 210);
  value(doc, formatDate(payment.date_paiement), col2, y + 62, 210, { size: 10 });

  doc.moveTo(66, y + 84).lineTo(50 + width - 16, y + 84).lineWidth(0.6).strokeColor(COLORS.line).stroke();
  label(doc, "Loyer", col1, y + 96, 150);
  value(doc, money(payment.montant_loyer), col1, y + 108, 150, { size: 10 });
  label(doc, "Charges", col2, y + 96, 150);
  value(doc, money(payment.property_charges || 0), col2, y + 108, 150, { size: 10 });
  doc.y = y + 144;

  // --- Mention ---
  section(doc, "Validation");
  y = doc.y;
  card(doc, 50, y, width, 76);
  label(doc, valide ? "Quittance validée par le bailleur" : "En attente de validation du bailleur", 66, y + 14, width - 32);
  value(doc, payment.bailleur_nom, 66, y + 28, 260, { size: 10 });
  doc.font("Helvetica").fontSize(8).fillColor(COLORS.muted)
    .text(
      valide
        ? `Paiement validé le ${formatDate(payment.date_paiement)}. Cette quittance vaut reçu pour la période indiquée.`
        : "Cette quittance sera définitive après validation du paiement par le bailleur.",
      66,
      y + 45,
      { width: width - 32, lineGap: 2 }
    );
  doc.y = y + 92;

  paragraph(
    doc,
    "Cette quittance ne vaut pas pour les périodes futures. Elle est générée automatiquement par Location App et conservée dans l'espace locatif.",
    { size: 7.4, color: COLORS.soft, lineGap: 2 }
  );
}

exports.downloadReceiptPDF = (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const role = req.user.role;

  const payment = db.prepare(`
    SELECT pay.*, c.locataire_id, c.montant_loyer, c.date_debut,
           p.titre AS property_titre, p.adresse AS property_adresse, p.ville AS property_ville,
           p.charges AS property_charges, p.bailleur_id,
           b.nom AS bailleur_nom, b.email AS bailleur_email, b.telephone AS bailleur_tel,
           l.nom AS locataire_nom, l.email AS locataire_email
    FROM payments pay
    JOIN contracts c ON pay.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    JOIN users b ON p.bailleur_id = b.id
    JOIN users l ON c.locataire_id = l.id
    WHERE pay.id = ?
  `).get(id);

  if (!payment) return res.status(404).json({ message: "Paiement introuvable" });

  const autorise = (role === "bailleur" && payment.bailleur_id === userId)
    || (role === "locataire" && payment.locataire_id === userId);
  if (!autorise) return res.status(403).json({ message: "Non autorisé" });

  const chunks = [];
  const doc = createDocument({
    title: `Quittance ${String(payment.id).padStart(6, "0")}`,
    subject: "Quittance de loyer"
  });

  doc.on("data", (chunk) => chunks.push(chunk));
  doc.on("error", (err) => {
    console.error("Erreur génération quittance:", err);
    if (!res.headersSent) res.status(500).json({ message: "Erreur lors de la génération de la quittance" });
  });
  doc.on("end", () => {
    if (res.headersSent || res.writableEnded) return;
    const pdf = Buffer.concat(chunks);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="quittance-${id}.pdf"`);
    res.setHeader("Content-Length", pdf.length);
    res.setHeader("Cache-Control", "no-store");
    res.end(pdf);
  });

  try {
    buildReceiptPDF(doc, payment);
    finalize(doc, { documentLabel: "Quittance de loyer" });
  } catch (err) {
    console.error("Erreur génération quittance:", err);
    if (!res.headersSent) res.status(500).json({ message: "Erreur lors de la génération de la quittance" });
  }
};
