// ============================================
// pdfTheme.js — Langage visuel commun des PDF
// ============================================

const PDFDocument = require("pdfkit");

const COLORS = {
  ink: "#0f172a",
  slate: "#334155",
  muted: "#64748b",
  soft: "#94a3b8",
  line: "#e2e8f0",
  paper: "#ffffff",
  wash: "#f8fafc",
  accent: "#4f46e5",
  accentSoft: "#eef2ff",
  gold: "#b08a57",
  success: "#047857",
  successSoft: "#d1fae5",
  warning: "#b45309",
  warningSoft: "#fef3c7",
  danger: "#b91c1c",
  dangerSoft: "#fee2e2"
};

const MOIS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

function formatDate(value) {
  if (!value) return "—";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [annee, mois, jour] = value.split("-");
    return `${jour}/${mois}/${annee}`;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("fr-FR");
}

function formatMonth(value) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return value || "—";
  const [annee, mois] = value.split("-").map(Number);
  return `${MOIS_FR[mois - 1]} ${annee}`;
}

function money(value) {
  const n = Number(value) || 0;
  return `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
}

function createDocument(meta = {}) {
  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
    bufferPages: true,
    info: {
      Title: meta.title || "Location App",
      Author: "Location App",
      Subject: meta.subject || "Gestion locative",
      Creator: "Location App",
      Producer: "Location App"
    }
  });

  doc.on("pageAdded", () => {
    const width = doc.page.width;
    doc.save();
    doc.rect(0, 0, width, 5).fill(COLORS.accent);
    doc.font("Helvetica").fontSize(7).fillColor(COLORS.soft);
    doc.text("LOCATION APP", 50, 24, { lineBreak: false, characterSpacing: 1.2 });
    doc.restore();
    doc.y = 64;
  });

  return doc;
}

function drawHeader(doc, { title, reference, date, status }) {
  const width = doc.page.width;
  const height = 110;

  doc.save();
  doc.rect(0, 0, width, height).fill(COLORS.ink);
  doc.rect(0, height - 4, width, 4).fill(COLORS.gold);

  // Marque
  doc.roundedRect(50, 22, 32, 32, 9).fill(COLORS.gold);
  doc.font("Helvetica-Bold").fontSize(15).fillColor(COLORS.ink).text("L", 50, 29, { width: 32, align: "center", lineBreak: false });
  doc.font("Helvetica").fontSize(7.5).fillColor(COLORS.ink).text(".", 66, 37, { lineBreak: false });

  doc.font("Helvetica-Bold").fontSize(11).fillColor("#ffffff").text("LOCATION APP", 94, 26, { lineBreak: false, characterSpacing: 0.8 });
  doc.font("Helvetica").fontSize(7).fillColor("#94a3b8").text("Gestion locative privée", 94, 42, { lineBreak: false });

  // Titre à droite
  doc.font("Helvetica").fontSize(6.6).fillColor("#94a3b8")
    .text("DOCUMENT OFFICIEL", 0, 23, { width: width - 50, align: "right", lineBreak: false, characterSpacing: 1.1 });
  doc.font("Helvetica-Bold").fontSize(14.5).fillColor("#ffffff")
    .text(title, 0, 34, { width: width - 50, align: "right", lineBreak: false });
  doc.font("Helvetica").fontSize(7.8).fillColor("#cbd5e1")
    .text(`${reference}  ·  ${date}`, 0, 53, { width: width - 50, align: "right", lineBreak: false });

  if (status) {
    const labelText = status.label || "";
    const palette = status.tone === "success"
      ? { bg: COLORS.successSoft, fg: COLORS.success }
      : status.tone === "warning"
        ? { bg: COLORS.warningSoft, fg: COLORS.warning }
        : status.tone === "danger"
          ? { bg: COLORS.dangerSoft, fg: COLORS.danger }
          : { bg: "#e2e8f0", fg: COLORS.slate };
    doc.font("Helvetica-Bold").fontSize(6.6);
    const pillWidth = doc.widthOfString(labelText.toUpperCase()) + 18;
    const pillX = width - 50 - pillWidth;
    doc.roundedRect(pillX, 70, pillWidth, 17, 8.5).fill(palette.bg);
    doc.fillColor(palette.fg).text(labelText.toUpperCase(), pillX, 75, { width: pillWidth, align: "center", lineBreak: false, characterSpacing: 0.4 });
  }

  doc.restore();
  doc.y = height + 18;
}

function ensureSpace(doc, needed = 80) {
  if (doc.y + needed > doc.page.height - 96) {
    doc.addPage();
    doc.y = 92;
  }
}

function section(doc, title) {
  ensureSpace(doc, 58);
  doc.moveDown(0.25);
  doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.accent)
    .text(title.toUpperCase(), 50, doc.y, { characterSpacing: 0.8, lineBreak: false });
  const lineY = doc.y + 9;
  doc.save();
  doc.moveTo(50, lineY).lineTo(78, lineY).lineWidth(2).strokeColor(COLORS.gold).stroke();
  doc.moveTo(82, lineY).lineTo(doc.page.width - 50, lineY).lineWidth(0.6).strokeColor(COLORS.line).stroke();
  doc.restore();
  doc.y = lineY + 9;
}

function label(doc, text, x, y, width = 200, color = COLORS.muted) {
  doc.font("Helvetica").fontSize(6.8).fillColor(color)
    .text(text.toUpperCase(), x, y, { width, characterSpacing: 0.45, lineBreak: false });
}

function value(doc, text, x, y, width = 200, opts = {}) {
  doc.font(opts.bold === false ? "Helvetica" : "Helvetica-Bold")
    .fontSize(opts.size || 10)
    .fillColor(opts.color || COLORS.ink)
    .text(text || "—", x, y, { width, lineBreak: false, ellipsis: true });
}

function card(doc, x, y, w, h) {
  doc.save();
  doc.roundedRect(x, y, w, h, 10).fillAndStroke(COLORS.wash, COLORS.line);
  doc.restore();
}

function infoCard(doc, x, y, w, h, { caption, name, lines = [], accent = false }) {
  card(doc, x, y, w, h);
  if (accent) {
    doc.save();
    doc.roundedRect(x, y, 4, h, 2).fill(COLORS.accent);
    doc.restore();
  }
  label(doc, caption, x + 16, y + 13, w - 32);
  value(doc, name, x + 16, y + 28, w - 32, { size: 11 });
  let lineY = y + 47;
  for (const line of lines) {
    doc.font("Helvetica").fontSize(8.2).fillColor(COLORS.slate)
      .text(line || "—", x + 16, lineY, { width: w - 32, lineBreak: false, ellipsis: true });
    lineY += 13;
  }
}

function metric(doc, x, y, w, { caption, value: val, strong = false }) {
  doc.save();
  doc.roundedRect(x, y, w, 54, 9).fillAndStroke(strong ? COLORS.accentSoft : COLORS.wash, strong ? "#c7d2fe" : COLORS.line);
  doc.restore();
  label(doc, caption, x + 13, y + 9, w - 26);
  doc.font("Helvetica-Bold").fontSize(strong ? 14 : 12).fillColor(strong ? COLORS.accent : COLORS.ink)
    .text(val, x + 13, y + 24, { width: w - 26, lineBreak: false, ellipsis: true });
}

function paragraph(doc, text, opts = {}) {
  doc.font(opts.bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(opts.size || 9)
    .fillColor(opts.color || COLORS.slate)
    .text(text || "—", opts.x || 50, opts.y || doc.y, {
      width: opts.width || doc.page.width - 100,
      align: opts.align || "left",
      lineGap: opts.lineGap === undefined ? 3 : opts.lineGap
    });
}

function clausesBox(doc, text) {
  const width = doc.page.width - 100;
  const content = text || "Aucune clause particulière.";
  doc.font("Helvetica").fontSize(8.7);
  const textHeight = doc.heightOfString(content, { width: width - 28, lineGap: 2.5 });
  const height = Math.max(46, textHeight + 22);
  const available = doc.page.height - 96 - doc.y;

  // Bloc encadré lorsque les clauses tiennent sur la page courante. Sinon elles
  // sont composées en texte courant et s'écoulent sur les pages suivantes, ce
  // qui évite une page à moitié vide avant la section des signatures.
  if (height <= available) {
    const startY = doc.y;
    doc.save();
    doc.roundedRect(50, startY, width, height, 10).fillAndStroke("#fffdf8", "#f2e8d8");
    doc.roundedRect(50, startY, 4, height, 2).fill(COLORS.gold);
    doc.restore();
    doc.font("Helvetica").fontSize(8.7).fillColor(COLORS.slate)
      .text(content, 64, startY + 11, { width: width - 28, lineGap: 2.5 });
    // Les appels texte positionnés en absolu déplacent doc.y : on le recale sur le bas du cadre.
    doc.y = startY + height + 9;
    return;
  }

  ensureSpace(doc, 80);
  doc.font("Helvetica").fontSize(8.7).fillColor(COLORS.slate)
    .text(content, 50, doc.y, { width, lineGap: 3, align: "justify" });
  doc.y += 10;
}

function signatureCard(doc, x, y, w, { caption, name, signedAt }) {
  const h = 96;
  card(doc, x, y, w, h);
  label(doc, caption, x + 16, y + 9, w - 32);
  doc.font("Helvetica-Oblique").fontSize(13.5).fillColor(COLORS.ink)
    .text(name || "—", x + 16, y + 25, { width: w - 32, lineBreak: false, ellipsis: true });
  doc.save();
  doc.moveTo(x + 16, y + 55).lineTo(x + w - 16, y + 55).lineWidth(0.7).strokeColor(COLORS.line).stroke();
  doc.restore();

  if (signedAt) {
    doc.roundedRect(x + 16, y + 65, 46, 16, 8).fill(COLORS.successSoft);
    doc.font("Helvetica-Bold").fontSize(6.2).fillColor(COLORS.success)
      .text("SIGNÉ", x + 16, y + 70, { width: 46, align: "center", lineBreak: false, characterSpacing: 0.3 });
    doc.font("Helvetica").fontSize(7.2).fillColor(COLORS.muted)
      .text(`le ${formatDate(signedAt)}`, x + 70, y + 70, { width: w - 86, lineBreak: false });
  } else {
    doc.roundedRect(x + 16, y + 65, 58, 16, 8).fill(COLORS.warningSoft);
    doc.font("Helvetica-Bold").fontSize(6.2).fillColor(COLORS.warning)
      .text("EN ATTENTE", x + 16, y + 70, { width: 58, align: "center", lineBreak: false, characterSpacing: 0.3 });
    doc.font("Helvetica").fontSize(7.2).fillColor(COLORS.muted)
      .text("Signature requise", x + 82, y + 70, { width: w - 98, lineBreak: false });
  }
}

function drawFooters(doc, { documentLabel }) {
  const range = doc.bufferedPageRange();
  const total = range.count;
  for (let i = 0; i < total; i++) {
    const pageIndex = range.start + i;
    doc.switchToPage(pageIndex);
    const width = doc.page.width;
    doc.save();
    doc.moveTo(50, 760).lineTo(width - 50, 760).lineWidth(0.6).strokeColor(COLORS.line).stroke();
    doc.font("Helvetica").fontSize(7).fillColor(COLORS.soft)
      .text(`LOCATION APP  ·  ${documentLabel}`, 50, 769, { width: 300, lineBreak: false, characterSpacing: 0.6 });
    doc.font("Helvetica").fontSize(7).fillColor(COLORS.soft)
      .text(`Page ${i + 1} / ${total}`, width - 150, 769, { width: 100, align: "right", lineBreak: false });
    doc.restore();
  }
}

function finalize(doc, opts = {}) {
  drawFooters(doc, { documentLabel: opts.documentLabel || "Document" });
  doc.end();
}

module.exports = {
  COLORS,
  createDocument,
  drawHeader,
  ensureSpace,
  section,
  label,
  value,
  card,
  infoCard,
  metric,
  paragraph,
  clausesBox,
  signatureCard,
  finalize,
  formatDate,
  formatMonth,
  money
};
