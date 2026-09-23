// ============================================
// receiptPDFController.js — Quittance de loyer PDF
// ============================================

const PDFDocument = require("pdfkit");
const db = require("../database/db");

exports.downloadReceiptPDF = (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const role = req.user.role;

  const payment = db.prepare(`
    SELECT pay.*,
           c.locataire_id,
           c.montant_loyer,
           c.date_debut,
           p.titre AS property_titre,
           p.adresse AS property_adresse,
           p.ville AS property_ville,
           p.charges AS property_charges,
           p.bailleur_id,
           b.nom AS bailleur_nom,
           b.email AS bailleur_email,
           b.telephone AS bailleur_tel,
           l.nom AS locataire_nom,
           l.email AS locataire_email
    FROM payments pay
    JOIN contracts c ON pay.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    JOIN users b ON p.bailleur_id = b.id
    JOIN users l ON c.locataire_id = l.id
    WHERE pay.id = ?
  `).get(id);

  if (!payment) {
    return res.status(404).json({ message: "Paiement introuvable" });
  }

  const autorise = (role === "bailleur" && payment.bailleur_id === userId)
                || (role === "locataire" && payment.locataire_id === userId);

  if (!autorise) {
    return res.status(403).json({ message: "Non autorise" });
  }

  // ---- Génération PDF ----
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="quittance-${id}.pdf"`);

  doc.pipe(res);

  // En-tête
  doc.fontSize(22).fillColor("#6366f1").text("QUITTANCE DE LOYER", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor("#64748b")
     .text(`Reference : QUI-${String(payment.id).padStart(6, "0")}`, { align: "center" });
  doc.moveDown(2);

  // Bailleur
  doc.fontSize(12).fillColor("#0f172a").font("Helvetica-Bold").text("Bailleur :");
  doc.font("Helvetica").fontSize(11).fillColor("#334155");
  doc.text(`Nom : ${payment.bailleur_nom}`);
  doc.text(`Email : ${payment.bailleur_email}`);
  doc.text(`Telephone : ${payment.bailleur_tel || "—"}`);
  doc.moveDown(1);

  // Locataire
  doc.fontSize(12).fillColor("#0f172a").font("Helvetica-Bold").text("Locataire :");
  doc.font("Helvetica").fontSize(11).fillColor("#334155");
  doc.text(`Nom : ${payment.locataire_nom}`);
  doc.text(`Email : ${payment.locataire_email}`);
  doc.moveDown(1);

  // Logement
  doc.fontSize(12).fillColor("#0f172a").font("Helvetica-Bold").text("Logement concerne :");
  doc.font("Helvetica").fontSize(11).fillColor("#334155");
  doc.text(`${payment.property_titre}`);
  doc.text(`${payment.property_adresse}${payment.property_ville ? ', ' + payment.property_ville : ''}`);
  doc.moveDown(1);

  // Détail du paiement
  doc.fontSize(12).fillColor("#0f172a").font("Helvetica-Bold").text("Detail du paiement :");
  doc.font("Helvetica").fontSize(11).fillColor("#334155");
  doc.text(`Mois concerne : ${payment.mois}`);
  doc.text(`Montant du loyer : ${payment.montant_loyer} $`);
  if (payment.property_charges) doc.text(`Charges : ${payment.property_charges} $`);
  doc.moveDown(0.5);

  // Montant payé (encadré)
  doc.rect(50, doc.y, 500, 40).fill("#f0fdf4");
  doc.fillColor("#065f46").fontSize(14).font("Helvetica-Bold")
     .text(`MONTANT PAYE : ${payment.montant} $`, 60, doc.y - 30, { width: 480 });

  doc.moveDown(2);

  // Méthode + date
  doc.font("Helvetica").fontSize(11).fillColor("#334155");
  doc.text(`Methode de paiement : ${payment.methode || "—"}`);
  doc.text(`Date du paiement : ${new Date(payment.date_paiement).toLocaleDateString("fr-FR")}`);
  doc.text(`Statut : ${payment.statut.toUpperCase()}`);
  doc.moveDown(2);

  // Mention
  doc.fontSize(10).fillColor("#64748b")
     .text(
       "La presente quittance atteste que le locataire est a jour du paiement de son loyer pour le mois indique ci-dessus.",
       { align: "justify" }
     );

  doc.moveDown(3);
  doc.fontSize(11).fillColor("#0f172a").font("Helvetica-Bold").text("Signature du bailleur", { align: "right" });
  doc.font("Helvetica").fontSize(10).fillColor("#64748b").text(payment.bailleur_nom, { align: "right" });

  // Pied de page
  doc.fontSize(8).fillColor("#94a3b8")
     .text(
       "Document genere automatiquement par Location App.",
       50, 780, { align: "center", width: 500 }
     );

  doc.end();
};