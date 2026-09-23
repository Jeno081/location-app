// ============================================
// contractPDFController.js — Génération PDF du contrat
// ============================================

const PDFDocument = require("pdfkit");
const db = require("../database/db");
const path = require("path");

exports.downloadContractPDF = (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const role = req.user.role;

  // Récupérer le contrat avec toutes les infos
  const contract = db.prepare(`
    SELECT c.*,
           p.titre AS property_titre,
           p.adresse AS property_adresse,
           p.ville AS property_ville,
           p.charges AS property_charges,
           p.bailleur_id AS bailleur_id,
           b.nom AS bailleur_nom,
           b.email AS bailleur_email,
           b.telephone AS bailleur_tel,
           l.nom AS locataire_nom,
           l.email AS locataire_email,
           l.telephone AS locataire_tel
    FROM contracts c
    JOIN properties p ON c.property_id = p.id
    JOIN users b ON p.bailleur_id = b.id
    JOIN users l ON c.locataire_id = l.id
    WHERE c.id = ?
  `).get(id);

  if (!contract) {
    return res.status(404).json({ message: "Contrat introuvable" });
  }

  // Vérifier que l'utilisateur a le droit de voir ce contrat
  const isBailleur = role === "bailleur" && contract.bailleur_id === userId;
  const isLocataire = role === "locataire" && contract.locataire_id === userId;

  if (!isBailleur && !isLocataire) {
    return res.status(403).json({ message: "Non autorise" });
  }

  // ---- Créer le PDF ----
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  // En-têtes HTTP pour téléchargement
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="contrat-${id}.pdf"`);

  doc.pipe(res);

  // =====================
  // EN-TÊTE
  // =====================
  doc.fontSize(22).fillColor("#6366f1").text("CONTRAT DE LOCATION", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor("#64748b")
     .text(`Reference : CTR-${String(contract.id).padStart(6, "0")}`, { align: "center" });
  doc.moveDown(0.3);
  doc.text(`Etabli le : ${new Date(contract.date_creation).toLocaleDateString("fr-FR")}`, { align: "center" });

  doc.moveDown(2);

  // =====================
  // PARTIES
  // =====================
  doc.fontSize(13).fillColor("#0f172a").text("ENTRE LES SOUSSIGNES", { underline: true });
  doc.moveDown(0.8);

  doc.fontSize(11).fillColor("#334155");
  doc.font("Helvetica-Bold").text("LE BAILLEUR :");
  doc.font("Helvetica").text(`Nom : ${contract.bailleur_nom}`);
  doc.text(`Email : ${contract.bailleur_email}`);
  doc.text(`Telephone : ${contract.bailleur_tel || "Non renseigne"}`);
  doc.moveDown(0.8);

  doc.font("Helvetica-Bold").text("LE LOCATAIRE :");
  doc.font("Helvetica").text(`Nom : ${contract.locataire_nom}`);
  doc.text(`Email : ${contract.locataire_email}`);
  doc.text(`Telephone : ${contract.locataire_tel || "Non renseigne"}`);

  doc.moveDown(1.5);

  // =====================
  // LOGEMENT
  // =====================
  doc.fontSize(13).fillColor("#0f172a").font("Helvetica-Bold").text("BIEN LOUE", { underline: true });
  doc.moveDown(0.5);

  doc.fontSize(11).fillColor("#334155").font("Helvetica");
  doc.text(`Designation : ${contract.property_titre}`);
  doc.text(`Adresse : ${contract.property_adresse}`);
  if (contract.property_ville) doc.text(`Ville : ${contract.property_ville}`);

  doc.moveDown(1.5);

  // =====================
  // CONDITIONS
  // =====================
  doc.fontSize(13).fillColor("#0f172a").font("Helvetica-Bold").text("CONDITIONS DU CONTRAT", { underline: true });
  doc.moveDown(0.5);

  doc.fontSize(11).fillColor("#334155").font("Helvetica");
  doc.text(`Date de debut : ${contract.date_debut}`);
  doc.text(`Date de fin : ${contract.date_fin || "Duree indeterminee"}`);
  doc.text(`Loyer mensuel : ${contract.montant_loyer} $`);
  if (contract.property_charges) {
    doc.text(`Charges mensuelles : ${contract.property_charges} $`);
  }
  doc.text(`Statut du contrat : ${contract.statut.replace("_", " ").toUpperCase()}`);

  doc.moveDown(1.5);

  // =====================
  // SIGNATURES
  // =====================
  doc.fontSize(13).fillColor("#0f172a").font("Helvetica-Bold").text("SIGNATURES", { underline: true });
  doc.moveDown(0.8);

  const leftX = 60;
  const rightX = 320;
  const sigY = doc.y;

  doc.fontSize(11).fillColor("#334155").font("Helvetica");

  // Bailleur
  doc.text("Le Bailleur", leftX, sigY);
  doc.text(contract.bailleur_nom, leftX, sigY + 18);
  doc.fontSize(9).fillColor("#64748b");
  if (contract.signature_bailleur) {
    doc.text(`Signe le ${new Date(contract.signature_bailleur).toLocaleDateString("fr-FR")}`, leftX, sigY + 40);
    doc.fillColor("#10b981").font("Helvetica-Bold").text("SIGNE ELECTRONIQUEMENT", leftX, sigY + 55);
  } else {
    doc.fillColor("#ef4444").text("En attente de signature", leftX, sigY + 40);
  }

  // Locataire
  doc.fontSize(11).fillColor("#334155").font("Helvetica");
  doc.text("Le Locataire", rightX, sigY);
  doc.text(contract.locataire_nom, rightX, sigY + 18);
  doc.fontSize(9).fillColor("#64748b");
  if (contract.signature_locataire) {
    doc.text(`Signe le ${new Date(contract.signature_locataire).toLocaleDateString("fr-FR")}`, rightX, sigY + 40);
    doc.fillColor("#10b981").font("Helvetica-Bold").text("SIGNE ELECTRONIQUEMENT", rightX, sigY + 55);
  } else {
    doc.fillColor("#ef4444").text("En attente de signature", rightX, sigY + 40);
  }

  // =====================
  // PIED DE PAGE
  // =====================
  doc.fontSize(8).fillColor("#94a3b8").font("Helvetica")
     .text(
       "Ce document a ete genere automatiquement par Location App. Toute reproduction sans autorisation est interdite.",
       50, 780, { align: "center", width: 500 }
     );

  doc.end();
};