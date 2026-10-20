// ============================================
// contractPDFController.js — Contrat de location
// ============================================

const db = require("../database/db");
const {
  createDocument,
  drawHeader,
  ensureSpace,
  section,
  infoCard,
  card,
  metric,
  label,
  value,
  paragraph,
  clausesBox,
  signatureCard,
  finalize,
  formatDate,
  money,
  COLORS
} = require("../utils/pdfTheme");

function statutInfo(statut) {
  if (statut === "actif") return { label: "Contrat actif", tone: "success" };
  if (statut === "termine") return { label: "Contrat terminé", tone: "neutral" };
  return { label: "En attente de signature", tone: "warning" };
}

function buildContractPDF(doc, contract) {
  const reference = `CTR-${String(contract.id).padStart(6, "0")}`;
  const status = statutInfo(contract.statut);

  drawHeader(doc, {
    title: "CONTRAT DE LOCATION",
    reference,
    date: `Établi le ${formatDate(contract.date_creation)}`,
    status
  });

  paragraph(
    doc,
    "Le présent contrat de location est conclu entre les parties désignées ci-dessous.",
    { size: 8.6, color: COLORS.muted, lineGap: 3 }
  );

  // --- Parties ---
  section(doc, "Les parties");
  let y = doc.y;
  const cardWidth = (doc.page.width - 120) / 2;
  infoCard(doc, 50, y, cardWidth, 76, {
    caption: "Le bailleur",
    name: contract.bailleur_nom,
    lines: [contract.bailleur_email, contract.bailleur_tel],
    accent: true
  });
  infoCard(doc, 70 + cardWidth, y, cardWidth, 76, {
    caption: "Le locataire",
    name: contract.locataire_nom,
    lines: [contract.locataire_email, contract.locataire_tel]
  });
  doc.y = y + 88;

  // --- Bien ---
  section(doc, "Le bien loué");
  y = doc.y;
  const width = doc.page.width - 100;
  card(doc, 50, y, width, 54);
  label(doc, "Désignation", 66, y + 8, width - 32);
  value(doc, contract.property_titre, 66, y + 20, width - 32, { size: 10.5 });
  doc.font("Helvetica").fontSize(8).fillColor(COLORS.slate)
    .text(`${contract.property_adresse || "—"}${contract.property_ville ? " · " + contract.property_ville : ""}`, 66, y + 37, {
      width: width - 32, lineBreak: false, ellipsis: true
    });
  doc.y = y + 64;

  // --- Conditions financières ---
  section(doc, "Conditions financières");
  y = doc.y;
  const gap = 10;
  const metricWidth = (width - gap * 2) / 3;
  const total = (Number(contract.montant_loyer) || 0) + (Number(contract.property_charges) || 0);
  metric(doc, 50, y, metricWidth, { caption: "Loyer mensuel", value: money(contract.montant_loyer) });
  metric(doc, 50 + metricWidth + gap, y, metricWidth, { caption: "Charges", value: money(contract.property_charges || 0) });
  metric(doc, 50 + (metricWidth + gap) * 2, y, metricWidth, { caption: "Total mensuel", value: money(total), strong: true });
  doc.y = y + 62;

  label(doc, "Période d'engagement", 50, doc.y, 160);
  value(
    doc,
    `${formatDate(contract.date_debut)}   au   ${contract.date_fin ? formatDate(contract.date_fin) : "durée indéterminée"}`,
    50,
    doc.y + 10,
    width,
    { size: 9.2 }
  );
  doc.y += 30;

  // --- Clauses ---
  const clauses = contract.clauses_personnalisees || "Aucune clause particulière.";
  ensureSpace(doc, 90);
  section(doc, "Clauses particulières");
  clausesBox(doc, clauses);

  // --- Signatures ---
  ensureSpace(doc, 116);
  section(doc, "Signatures");
  y = doc.y;
  signatureCard(doc, 50, y, cardWidth, {
    caption: "Le bailleur",
    name: contract.bailleur_nom,
    signedAt: contract.signature_bailleur
  });
  signatureCard(doc, 70 + cardWidth, y, cardWidth, {
    caption: "Le locataire",
    name: contract.locataire_nom,
    signedAt: contract.signature_locataire
  });
  doc.y = y + 102;
}

exports.downloadContractPDF = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const role = req.user.role;

  const contract = await db.get(`
    SELECT c.*, p.titre AS property_titre, p.adresse AS property_adresse, p.ville AS property_ville,
           p.charges AS property_charges, p.bailleur_id,
           b.nom AS bailleur_nom, b.email AS bailleur_email, b.telephone AS bailleur_tel,
           l.nom AS locataire_nom, l.email AS locataire_email, l.telephone AS locataire_tel
    FROM contracts c
    JOIN properties p ON c.property_id = p.id
    JOIN users b ON p.bailleur_id = b.id
    JOIN users l ON c.locataire_id = l.id
    WHERE c.id = ?
  `, [id]);

  if (!contract) return res.status(404).json({ message: "Contrat introuvable" });
  if (role === "bailleur" && contract.bailleur_id !== userId) return res.status(403).json({ message: "Non autorisé" });
  if (role === "locataire" && contract.locataire_id !== userId) return res.status(403).json({ message: "Non autorisé" });

  const chunks = [];
  const doc = createDocument({
    title: `Contrat ${String(contract.id).padStart(6, "0")}`,
    subject: "Contrat de location"
  });

  doc.on("data", (chunk) => chunks.push(chunk));
  doc.on("error", (err) => {
    console.error("Erreur génération PDF contrat:", err);
    if (!res.headersSent) res.status(500).json({ message: "Erreur lors de la génération du PDF" });
  });
  doc.on("end", () => {
    if (res.headersSent || res.writableEnded) return;
    const pdf = Buffer.concat(chunks);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="contrat-${id}.pdf"`);
    res.setHeader("Content-Length", pdf.length);
    res.setHeader("Cache-Control", "no-store");
    res.end(pdf);
  });

  try {
    buildContractPDF(doc, contract);
    finalize(doc, { documentLabel: "Contrat de location" });
  } catch (err) {
    console.error("Erreur génération PDF contrat:", err);
    if (!res.headersSent) res.status(500).json({ message: "Erreur lors de la génération du PDF" });
  }
};
