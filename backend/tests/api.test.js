// ============================================
// api.test.js — Parcours complet de l'API
// ============================================

const { test, before, after } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const mysql = require("mysql2/promise");

const TODAY = new Date();
const DATE_DEBUT_TEST = TODAY.toISOString().slice(0, 10);
const DATE_FIN_TEST = new Date(TODAY.getFullYear() + 1, TODAY.getMonth(), TODAY.getDate())
  .toISOString().slice(0, 10);

const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), "location-app-uploads-"));
process.env.NODE_ENV = "test";
process.env.UPLOAD_DIR = uploadDir;
process.env.JWT_SECRET = "test-secret-0123456789-abcdefghijklmnopqrstuvwxyz";
process.env.PORT = "0";
process.env.DB_HOST = process.env.TEST_DB_HOST || process.env.DB_HOST || "127.0.0.1";
process.env.DB_PORT = process.env.TEST_DB_PORT || process.env.DB_PORT || "3306";
process.env.DB_USER = process.env.TEST_DB_USER || process.env.DB_USER || "root";
process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD !== undefined
  ? process.env.TEST_DB_PASSWORD
  : (process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : "");

const testDatabase = `location_app_test_${Date.now()}`;
process.env.DB_NAME = testDatabase;

const app = require("../app");
const db = require("../database/db");
const { runMigrations } = require("../database/migrate");

let server;
let baseUrl;

function adminConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: false
  });
}

async function dropTestDatabase() {
  const admin = await adminConnection();
  try {
    await admin.query(`DROP DATABASE IF EXISTS \`${testDatabase}\``);
  } finally {
    await admin.end();
  }
}

function auth(token) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function asJson(response) {
  return { status: response.status, body: await response.json() };
}

before(async () => {
  const admin = await adminConnection();
  await admin.query(`CREATE DATABASE \`${testDatabase}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await admin.end();

  await runMigrations();

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  try { await db.close(); } catch (err) { /* déjà fermée */ }
  try { await dropTestDatabase(); } catch (err) { /* ignoré */ }
  try { fs.rmSync(uploadDir, { recursive: true, force: true }); } catch (err) { /* ignoré */ }
});

test("healthcheck et compte bailleur", async () => {
  let r = await asJson(await fetch(`${baseUrl}/api/health`));
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.status, "ok");

  r = await asJson(await fetch(`${baseUrl}/api/auth/bailleur-existe`));
  assert.strictEqual(r.body.existe, false);

  r = await asJson(await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nom: "Bailleur Test",
      email: "Bailleur@Test.com",
      mot_de_passe: "Secret123",
      telephone: "0999000000",
      role: "bailleur"
    })
  }));
  assert.strictEqual(r.status, 201, JSON.stringify(r.body));

  r = await asJson(await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "bailleur@test.com", mot_de_passe: "Secret123" })
  }));
  assert.strictEqual(r.status, 200);
  assert.ok(r.body.token);
  assert.strictEqual(r.body.user.role, "bailleur");
});

test("parcours complet : contrat, signature, PDF, paiement, terminaison", async () => {
  let r = await asJson(await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "bailleur@test.com", mot_de_passe: "Secret123" })
  }));
  const bailleurToken = r.body.token;

  r = await asJson(await fetch(`${baseUrl}/api/properties`, {
    method: "POST",
    headers: auth(bailleurToken),
    body: JSON.stringify({
      titre: "Appartement Test",
      adresse: "12, rue de Test",
      ville: "Kinshasa",
      loyer: 650,
      charges: 20,
      description: "Un logement de test"
    })
  }));
  assert.strictEqual(r.status, 201, JSON.stringify(r.body));
  const propertyId = r.body.propertyId;

  // Photo de logement : stockée en base et servie publiquement.
  const photoForm = new FormData();
  photoForm.append("photos", new Blob(["photo-test"], { type: "image/png" }), "logement.png");
  r = await asJson(await fetch(`${baseUrl}/api/properties/${propertyId}/photos`, {
    method: "POST",
    headers: { Authorization: `Bearer ${bailleurToken}` },
    body: photoForm
  }));
  assert.strictEqual(r.status, 200, JSON.stringify(r.body));
  const photoUrl = r.body.photos[0];
  const photoResponse = await fetch(`${baseUrl}${photoUrl}`);
  assert.strictEqual(photoResponse.status, 200);
  assert.match(photoResponse.headers.get("content-type"), /^image\//);

  // Les chemins de photos disparues sont retirés des réponses API.
  await db.run("UPDATE properties SET photos = ? WHERE id = ?", [
    JSON.stringify([photoUrl, "/uploads/fichier-absent.jpg"]), propertyId
  ]);
  r = await asJson(await fetch(`${baseUrl}/api/properties/mes-logements/liste`, { headers: auth(bailleurToken) }));
  const proprieteListee = r.body.properties.find((p) => p.id === propertyId);
  const photosListees = JSON.parse(proprieteListee.photos);
  assert.ok(photosListees.includes(photoUrl));
  assert.ok(!photosListees.includes("/uploads/fichier-absent.jpg"));

  // Une date de début passée est refusée avant toute création.
  r = await asJson(await fetch(`${baseUrl}/api/contracts`, {
    method: "POST",
    headers: auth(bailleurToken),
    body: JSON.stringify({
      property_id: propertyId,
      locataire_email: "passe@test.com",
      locataire_nom: "Date Passée",
      date_debut: "2020-01-01",
      montant_loyer: 650
    })
  }));
  assert.strictEqual(r.status, 400);
  assert.match(r.body.message, /passé/);

  r = await asJson(await fetch(`${baseUrl}/api/contracts`, {
    method: "POST",
    headers: auth(bailleurToken),
    body: JSON.stringify({
      property_id: propertyId,
      locataire_email: "Locataire@Test.com",
      locataire_nom: "Locataire Test",
      locataire_telephone: "0811111111",
      date_debut: DATE_DEBUT_TEST,
      date_fin: DATE_FIN_TEST,
      montant_loyer: 650,
      clauses_personnalisees: "Le loyer est payable le 5 de chaque mois."
    })
  }));
  assert.strictEqual(r.status, 201, JSON.stringify(r.body));
  const contractId = r.body.contractId;
  const tempPassword = r.body.mot_de_passe_temporaire;
  assert.ok(tempPassword && tempPassword.length >= 8);

  r = await asJson(await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "locataire@test.com", mot_de_passe: tempPassword })
  }));
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.user.doit_changer_mot_de_passe, 1);
  let tenantToken = r.body.token;

  // Le changement de mot de passe est obligatoire côté serveur.
  r = await asJson(await fetch(`${baseUrl}/api/contracts/mes-locations`, { headers: auth(tenantToken) }));
  assert.strictEqual(r.status, 403);
  assert.strictEqual(r.body.code, "PASSWORD_CHANGE_REQUIRED");

  r = await asJson(await fetch(`${baseUrl}/api/users/changer-mot-de-passe`, {
    method: "PUT",
    headers: auth(tenantToken),
    body: JSON.stringify({ ancien_mot_de_passe: tempPassword, nouveau_mot_de_passe: "Nouveau123" })
  }));
  assert.strictEqual(r.status, 200, JSON.stringify(r.body));
  assert.ok(r.body.token);
  tenantToken = r.body.token;

  // Signature des deux parties.
  r = await asJson(await fetch(`${baseUrl}/api/contracts/${contractId}/signer`, { method: "PUT", headers: auth(tenantToken) }));
  assert.strictEqual(r.status, 200, JSON.stringify(r.body));
  r = await asJson(await fetch(`${baseUrl}/api/contracts/${contractId}/signer`, { method: "PUT", headers: auth(bailleurToken) }));
  assert.strictEqual(r.status, 200, JSON.stringify(r.body));

  r = await asJson(await fetch(`${baseUrl}/api/contracts/mes-contrats`, { headers: auth(bailleurToken) }));
  assert.strictEqual(r.body.contracts[0].statut, "actif");

  // Signalement avec plusieurs photos et une vidéo (5 médias maximum).
  const incidentForm = new FormData();
  incidentForm.append("property_id", String(propertyId));
  incidentForm.append("description", "Fuite sous l'évier avec dégât visible.");
  incidentForm.append("photos", new Blob(["photo1"], { type: "image/png" }), "photo1.png");
  incidentForm.append("photos", new Blob(["photo2"], { type: "image/jpeg" }), "photo2.jpg");
  incidentForm.append("photos", new Blob(["video"], { type: "video/mp4" }), "video.mp4");
  r = await asJson(await fetch(`${baseUrl}/api/incidents`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tenantToken}` },
    body: incidentForm
  }));
  assert.strictEqual(r.status, 201, JSON.stringify(r.body));
  assert.strictEqual(r.body.medias_count, 3);
  const incidentId = r.body.incidentId;

  r = await asJson(await fetch(`${baseUrl}/api/incidents/mes-incidents`, { headers: auth(tenantToken) }));
  const incidentCree = r.body.incidents.find((i) => i.id === incidentId);
  assert.strictEqual(incidentCree.medias.length, 3);
  assert.strictEqual(incidentCree.medias.filter((m) => m.type === "video").length, 1);

  const mediaImage = incidentCree.medias.find((m) => m.type === "image");
  const mediaResponse = await fetch(`${baseUrl}${mediaImage.url}`, { headers: { Authorization: `Bearer ${tenantToken}` } });
  assert.strictEqual(mediaResponse.status, 200);
  assert.match(mediaResponse.headers.get("content-type"), /^image\//);

  // Annonces : à tous puis à une sélection.
  r = await asJson(await fetch(`${baseUrl}/api/users/mes-locataires`, { headers: auth(bailleurToken) }));
  const locataireId = r.body.locataires[0].id;

  r = await asJson(await fetch(`${baseUrl}/api/announcements`, {
    method: "POST",
    headers: auth(bailleurToken),
    body: JSON.stringify({ titre: "Information générale", message: "L'eau sera coupée samedi.", audience: "tous" })
  }));
  assert.strictEqual(r.status, 201, JSON.stringify(r.body));

  r = await asJson(await fetch(`${baseUrl}/api/announcements`, {
    method: "POST",
    headers: auth(bailleurToken),
    body: JSON.stringify({ titre: "Information ciblée", message: "Merci de vérifier votre compteur.", audience: "selection", locataire_ids: [locataireId] })
  }));
  assert.strictEqual(r.status, 201, JSON.stringify(r.body));

  r = await asJson(await fetch(`${baseUrl}/api/announcements`, { headers: auth(tenantToken) }));
  const titresAnnonces = r.body.announcements.map((a) => a.titre);
  assert.ok(titresAnnonces.includes("Information générale"));
  assert.ok(titresAnnonces.includes("Information ciblée"));

  // Messagerie : demande du locataire, réponse et statut du bailleur.
  r = await asJson(await fetch(`${baseUrl}/api/conversations`, {
    method: "POST",
    headers: auth(tenantToken),
    body: JSON.stringify({ sujet: "Préavis de départ", message: "Je souhaite quitter le logement en décembre." })
  }));
  assert.strictEqual(r.status, 201, JSON.stringify(r.body));
  const conversationId = r.body.conversationId;

  r = await asJson(await fetch(`${baseUrl}/api/conversations`, { headers: auth(bailleurToken) }));
  const conversationListe = r.body.conversations.find((c) => c.id === conversationId);
  assert.ok(conversationListe);
  assert.strictEqual(Number(conversationListe.non_lus), 1);

  r = await asJson(await fetch(`${baseUrl}/api/conversations/${conversationId}`, { headers: auth(bailleurToken) }));
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.messages.length, 1);

  r = await asJson(await fetch(`${baseUrl}/api/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: auth(bailleurToken),
    body: JSON.stringify({ contenu: "Bien reçu, nous en reparlons." })
  }));
  assert.strictEqual(r.status, 201, JSON.stringify(r.body));

  r = await asJson(await fetch(`${baseUrl}/api/conversations/${conversationId}`, { headers: auth(tenantToken) }));
  assert.strictEqual(r.body.messages.length, 2);

  r = await asJson(await fetch(`${baseUrl}/api/conversations/${conversationId}/statut`, {
    method: "PUT",
    headers: auth(bailleurToken),
    body: JSON.stringify({ statut: "traite" })
  }));
  assert.strictEqual(r.status, 200, JSON.stringify(r.body));

  // Renouvellement du contrat : nouvelle date de fin.
  r = await asJson(await fetch(`${baseUrl}/api/contracts/${contractId}/renouveler`, {
    method: "PUT",
    headers: auth(bailleurToken),
    body: JSON.stringify({ nouvelle_date_fin: "2028-10-01" })
  }));
  assert.strictEqual(r.status, 200, JSON.stringify(r.body));
  assert.strictEqual(r.body.date_fin, "2028-10-01");
  r = await asJson(await fetch(`${baseUrl}/api/contracts/mes-contrats`, { headers: auth(bailleurToken) }));
  assert.strictEqual(String(r.body.contracts[0].date_fin).slice(0, 10), "2028-10-01");

  // PDF du contrat.
  const pdf = await fetch(`${baseUrl}/api/contracts/${contractId}/pdf`, { headers: { Authorization: `Bearer ${tenantToken}` } });
  assert.strictEqual(pdf.status, 200);
  assert.strictEqual(pdf.headers.get("content-type"), "application/pdf");
  const pdfBuffer = Buffer.from(await pdf.arrayBuffer());
  assert.ok(pdfBuffer.length > 1000);
  assert.ok(pdfBuffer.subarray(0, 5).toString() === "%PDF-");

  // Paiement avec preuve.
  const form = new FormData();
  form.append("contract_id", String(contractId));
  form.append("mois", "2026-10");
  form.append("montant", "650");
  form.append("methode", "mobile_money");
  form.append("preuve", new Blob(["preuve"], { type: "image/png" }), "preuve.png");

  r = await asJson(await fetch(`${baseUrl}/api/payments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tenantToken}` },
    body: form
  }));
  assert.strictEqual(r.status, 201, JSON.stringify(r.body));
  assert.strictEqual(r.body.mois, "2026-10");
  assert.strictEqual(r.body.mois_label, "Octobre 2026");
  const paymentId = r.body.paymentId;

  // Duplicata refusé.
  const duplicate = new FormData();
  duplicate.append("contract_id", String(contractId));
  duplicate.append("mois", "2026-10");
  duplicate.append("montant", "650");
  duplicate.append("preuve", new Blob(["preuve"], { type: "image/png" }), "preuve.png");
  r = await asJson(await fetch(`${baseUrl}/api/payments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tenantToken}` },
    body: duplicate
  }));
  assert.strictEqual(r.status, 409);

  // Preuve protégée : accessible au bailleur, pas en statique.
  const proof = await fetch(`${baseUrl}/api/payments/${paymentId}/preuve`, {
    headers: { Authorization: `Bearer ${bailleurToken}` }
  });
  assert.strictEqual(proof.status, 200);

  // Validation par le bailleur.
  r = await asJson(await fetch(`${baseUrl}/api/payments/${paymentId}/valider`, {
    method: "PUT",
    headers: auth(bailleurToken),
    body: JSON.stringify({ statut_bailleur: "valide" })
  }));
  assert.strictEqual(r.status, 200);

  r = await asJson(await fetch(`${baseUrl}/api/payments/tableau-de-bord`, { headers: auth(bailleurToken) }));
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.dashboard[0].paye_ce_mois, true);
  assert.strictEqual(Number(r.body.dashboard[0].total_paye), 650);

  // Le calendrier utilise la clé de mois canonique et les paiements validés.
  r = await asJson(await fetch(`${baseUrl}/api/calendar?mois=10&annee=2026`, { headers: auth(bailleurToken) }));
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.stats.loyers_attendus, 1);
  assert.strictEqual(r.body.stats.loyers_payes, 1);
  assert.strictEqual(Number(r.body.stats.montant_attendu), 650);

  // Paiement groupé sur plusieurs mois + validation du lot par le bailleur.
  const multiForm = () => {
    const form = new FormData();
    form.append("contract_id", String(contractId));
    form.append("mois", JSON.stringify(["2026-12", "2027-01"]));
    form.append("montant", "1300");
    form.append("methode", "mobile_money");
    form.append("preuve", new Blob(["preuve"], { type: "image/png" }), "preuve.png");
    return form;
  };

  r = await asJson(await fetch(`${baseUrl}/api/payments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tenantToken}` },
    body: multiForm()
  }));
  assert.strictEqual(r.status, 201, JSON.stringify(r.body));
  assert.strictEqual(r.body.paymentIds.length, 2);
  assert.ok(r.body.lot_id);
  const lotId = r.body.lot_id;

  // Un deuxième paiement sur les mêmes mois est refusé.
  r = await asJson(await fetch(`${baseUrl}/api/payments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tenantToken}` },
    body: multiForm()
  }));
  assert.strictEqual(r.status, 409, JSON.stringify(r.body));

  // Le bailleur valide tout le lot en une action.
  r = await asJson(await fetch(`${baseUrl}/api/payments/lots/${lotId}/valider`, {
    method: "PUT",
    headers: auth(bailleurToken),
    body: JSON.stringify({ statut_bailleur: "valide" })
  }));
  assert.strictEqual(r.status, 200, JSON.stringify(r.body));
  assert.strictEqual(r.body.count, 2);

  r = await asJson(await fetch(`${baseUrl}/api/payments/mes-paiements`, { headers: auth(tenantToken) }));
  const paiementsLot = r.body.payments.filter((p) => p.lot_id === lotId);
  assert.strictEqual(paiementsLot.length, 2);
  assert.ok(paiementsLot.every((p) => p.statut_bailleur === "valide"));
  assert.strictEqual(paiementsLot.reduce((s, p) => s + Number(p.montant), 0), 1300);

  // Refus motivé d'un paiement, puis nouveau paiement pour le même mois.
  const paymentForm = (mois) => {
    const form = new FormData();
    form.append("contract_id", String(contractId));
    form.append("mois", mois);
    form.append("montant", "650");
    form.append("methode", "mobile_money");
    form.append("preuve", new Blob(["preuve"], { type: "image/png" }), "preuve.png");
    return form;
  };

  r = await asJson(await fetch(`${baseUrl}/api/payments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tenantToken}` },
    body: paymentForm("2026-11")
  }));
  assert.strictEqual(r.status, 201, JSON.stringify(r.body));
  const refusedPaymentId = r.body.paymentId;

  // Refus sans motif : refusé par le serveur.
  r = await asJson(await fetch(`${baseUrl}/api/payments/${refusedPaymentId}/valider`, {
    method: "PUT",
    headers: auth(bailleurToken),
    body: JSON.stringify({ statut_bailleur: "refuse" })
  }));
  assert.strictEqual(r.status, 400);

  r = await asJson(await fetch(`${baseUrl}/api/payments/${refusedPaymentId}/valider`, {
    method: "PUT",
    headers: auth(bailleurToken),
    body: JSON.stringify({ statut_bailleur: "refuse", motif_refus: "La preuve ne correspond pas au montant reçu." })
  }));
  assert.strictEqual(r.status, 200, JSON.stringify(r.body));
  assert.strictEqual(r.body.motif_refus, "La preuve ne correspond pas au montant reçu.");

  // Le locataire voit le motif du refus.
  r = await asJson(await fetch(`${baseUrl}/api/payments/mes-paiements`, { headers: auth(tenantToken) }));
  let refuse = r.body.payments.find((p) => p.id === refusedPaymentId);
  assert.strictEqual(refuse.statut_bailleur, "refuse");
  assert.match(refuse.motif_refus, /preuve/);
  assert.ok(refuse.date_decision);

  r = await asJson(await fetch(`${baseUrl}/api/notifications/locataire`, { headers: auth(tenantToken) }));
  assert.strictEqual(r.body.paiements_refuses, 1);

  // Un nouveau paiement pour le même mois est désormais autorisé.
  r = await asJson(await fetch(`${baseUrl}/api/payments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tenantToken}` },
    body: paymentForm("2026-11")
  }));
  assert.strictEqual(r.status, 201, JSON.stringify(r.body));
  const retryPaymentId = r.body.paymentId;
  assert.notStrictEqual(retryPaymentId, refusedPaymentId);

  // Un deuxième paiement en attente pour le même mois reste refusé.
  r = await asJson(await fetch(`${baseUrl}/api/payments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tenantToken}` },
    body: paymentForm("2026-11")
  }));
  assert.strictEqual(r.status, 409);

  // Le bailleur valide le nouveau paiement.
  r = await asJson(await fetch(`${baseUrl}/api/payments/${retryPaymentId}/valider`, {
    method: "PUT",
    headers: auth(bailleurToken),
    body: JSON.stringify({ statut_bailleur: "valide" })
  }));
  assert.strictEqual(r.status, 200, JSON.stringify(r.body));

  // Un paiement validé ne peut plus être modifié.
  r = await asJson(await fetch(`${baseUrl}/api/payments/${retryPaymentId}/valider`, {
    method: "PUT",
    headers: auth(bailleurToken),
    body: JSON.stringify({ statut_bailleur: "refuse", motif_refus: "Test de garde-fou." })
  }));
  assert.strictEqual(r.status, 409);

  // Le refus n'est plus signalé une fois le mois remplacé par un paiement valide.
  r = await asJson(await fetch(`${baseUrl}/api/notifications/locataire`, { headers: auth(tenantToken) }));
  assert.strictEqual(r.body.paiements_refuses, 0);

  // Rappel de loyer : envoi par le bailleur, réception et accusé du locataire.
  r = await asJson(await fetch(`${baseUrl}/api/payments/rappel`, {
    method: "POST",
    headers: auth(bailleurToken),
    body: JSON.stringify({ contract_id: contractId, message: "Merci de régulariser votre loyer." })
  }));
  assert.strictEqual(r.status, 201, JSON.stringify(r.body));
  assert.strictEqual(r.body.rappel.confirme, false);
  const rappelId = r.body.rappel.id;

  r = await asJson(await fetch(`${baseUrl}/api/payments/tableau-de-bord`, { headers: auth(bailleurToken) }));
  assert.strictEqual(r.body.dashboard[0].dernier_rappel.id, rappelId);
  assert.strictEqual(r.body.dashboard[0].dernier_rappel.confirme, false);

  r = await asJson(await fetch(`${baseUrl}/api/payments/mes-rappels`, { headers: auth(tenantToken) }));
  assert.strictEqual(r.body.rappels.length, 1);
  assert.strictEqual(r.body.rappels[0].confirme, false);

  // Le locataire confirme la réception.
  r = await asJson(await fetch(`${baseUrl}/api/payments/rappels/${rappelId}/confirmer`, {
    method: "PUT",
    headers: auth(tenantToken)
  }));
  assert.strictEqual(r.status, 200, JSON.stringify(r.body));
  assert.ok(r.body.date_confirmation);

  r = await asJson(await fetch(`${baseUrl}/api/payments/mes-rappels`, { headers: auth(tenantToken) }));
  assert.strictEqual(r.body.rappels[0].confirme, true);

  // Le bailleur voit la confirmation sur son tableau de bord.
  r = await asJson(await fetch(`${baseUrl}/api/payments/tableau-de-bord`, { headers: auth(bailleurToken) }));
  assert.strictEqual(r.body.dashboard[0].dernier_rappel.confirme, true);
  assert.ok(r.body.dashboard[0].dernier_rappel.date_confirmation);

  r = await asJson(await fetch(`${baseUrl}/api/payments/rappels`, { headers: auth(bailleurToken) }));
  assert.strictEqual(r.body.rappels.length, 1);
  assert.strictEqual(r.body.rappels[0].confirme, true);

  // Plus de badge « rappel » côté locataire une fois la réception confirmée.
  r = await asJson(await fetch(`${baseUrl}/api/notifications/locataire`, { headers: auth(tenantToken) }));
  assert.strictEqual(r.body.rappels, 0);

  // Terminaison : le compte locataire et toutes ses données sont supprimés.
  r = await asJson(await fetch(`${baseUrl}/api/contracts/${contractId}/terminer`, {
    method: "PUT",
    headers: auth(bailleurToken),
    body: JSON.stringify({ motif: "Fin de test" })
  }));
  assert.strictEqual(r.status, 200, JSON.stringify(r.body));
  assert.match(r.body.message, /compte locataire supprimé/);

  r = await asJson(await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "locataire@test.com", mot_de_passe: "Nouveau123" })
  }));
  assert.strictEqual(r.status, 401);

  r = await asJson(await fetch(`${baseUrl}/api/properties/${propertyId}`, { headers: auth(bailleurToken) }));
  assert.strictEqual(r.body.property.statut, "disponible");
});

test("autorisations : incidents et documents protégés", async () => {
  let r = await asJson(await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "bailleur@test.com", mot_de_passe: "Secret123" })
  }));
  const bailleurToken = r.body.token;

  // Deuxième logement sans contrat.
  r = await asJson(await fetch(`${baseUrl}/api/properties`, {
    method: "POST",
    headers: auth(bailleurToken),
    body: JSON.stringify({ titre: "Logement vide", adresse: "Rue Vide", loyer: 300 })
  }));
  const emptyProperty = r.body.propertyId;

  // Un locataire ne peut pas y signaler un incident sans contrat actif.
  // On recrée un locataire pour ce test via un contrat, puis on le supprime.
  r = await asJson(await fetch(`${baseUrl}/api/contracts`, {
    method: "POST",
    headers: auth(bailleurToken),
    body: JSON.stringify({
      property_id: emptyProperty,
      locataire_email: "incident@test.com",
      locataire_nom: "Incident Test",
      date_debut: DATE_DEBUT_TEST,
      montant_loyer: 300
    })
  }));
  const contractId = r.body.contractId;
  const tempPassword = r.body.mot_de_passe_temporaire;

  r = await asJson(await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "incident@test.com", mot_de_passe: tempPassword })
  }));
  let tenantToken = r.body.token;

  r = await asJson(await fetch(`${baseUrl}/api/users/changer-mot-de-passe`, {
    method: "PUT",
    headers: auth(tenantToken),
    body: JSON.stringify({ ancien_mot_de_passe: tempPassword, nouveau_mot_de_passe: "Incident123" })
  }));
  tenantToken = r.body.token;

  // Document : refus motivé obligatoire, visible par le locataire.
  const docForm = new FormData();
  docForm.append("type", "cni");
  docForm.append("fichier", new Blob(["document"], { type: "image/png" }), "cni.png");
  r = await asJson(await fetch(`${baseUrl}/api/documents`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tenantToken}` },
    body: docForm
  }));
  assert.strictEqual(r.status, 201, JSON.stringify(r.body));
  const documentId = r.body.documentId;

  r = await asJson(await fetch(`${baseUrl}/api/documents/${documentId}/statut`, {
    method: "PUT",
    headers: auth(bailleurToken),
    body: JSON.stringify({ statut: "refuse" })
  }));
  assert.strictEqual(r.status, 400);

  r = await asJson(await fetch(`${baseUrl}/api/documents/${documentId}/statut`, {
    method: "PUT",
    headers: auth(bailleurToken),
    body: JSON.stringify({ statut: "refuse", commentaire: "La photo est illisible, merci de renvoyer un scan." })
  }));
  assert.strictEqual(r.status, 200, JSON.stringify(r.body));

  r = await asJson(await fetch(`${baseUrl}/api/documents/mes-documents`, { headers: auth(tenantToken) }));
  const documentRefuse = r.body.documents.find((d) => d.id === documentId);
  assert.strictEqual(documentRefuse.statut, "refuse");
  assert.match(documentRefuse.commentaire, /illisible/);

  // Mot de passe oublié (locataire) : demande visible par le bailleur puis génération.
  r = await asJson(await fetch(`${baseUrl}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "incident@test.com" })
  }));
  assert.strictEqual(r.status, 201, JSON.stringify(r.body));
  assert.strictEqual(r.body.type, "locataire");

  r = await asJson(await fetch(`${baseUrl}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "incident@test.com" })
  }));
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.dejaEnAttente, true);

  r = await asJson(await fetch(`${baseUrl}/api/users/demandes-reinitialisation`, { headers: auth(bailleurToken) }));
  const demandeReset = r.body.demandes.find((d) => d.locataire_email === "incident@test.com" && d.statut === "en_attente");
  assert.ok(demandeReset);

  r = await asJson(await fetch(`${baseUrl}/api/users/demandes-reinitialisation/${demandeReset.id}/generer`, {
    method: "POST",
    headers: auth(bailleurToken)
  }));
  assert.strictEqual(r.status, 200, JSON.stringify(r.body));
  const tenantTempPassword = r.body.temporaryPassword;
  assert.ok(tenantTempPassword);

  r = await asJson(await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "incident@test.com", mot_de_passe: tenantTempPassword })
  }));
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.user.doit_changer_mot_de_passe, 1);

  r = await asJson(await fetch(`${baseUrl}/api/users/changer-mot-de-passe`, {
    method: "PUT",
    headers: auth(r.body.token),
    body: JSON.stringify({ ancien_mot_de_passe: tenantTempPassword, nouveau_mot_de_passe: "Incident123" })
  }));
  assert.strictEqual(r.status, 200, JSON.stringify(r.body));
  tenantToken = r.body.token;

  // Le contrat n'est pas encore actif : le signalement est refusé.
  const incidentForm = new FormData();
  incidentForm.append("property_id", String(emptyProperty));
  incidentForm.append("description", "Test sans contrat actif");
  r = await asJson(await fetch(`${baseUrl}/api/incidents`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tenantToken}` },
    body: incidentForm
  }));
  assert.strictEqual(r.status, 403, JSON.stringify(r.body));

  // Le bailleur ne peut pas supprimer un logement qui a un historique de contrat.
  r = await asJson(await fetch(`${baseUrl}/api/properties/${emptyProperty}`, {
    method: "DELETE",
    headers: auth(bailleurToken)
  }));
  assert.strictEqual(r.status, 409);

  // Nettoyage.
  await fetch(`${baseUrl}/api/contracts/${contractId}/terminer`, {
    method: "PUT",
    headers: auth(bailleurToken),
    body: JSON.stringify({ motif: "Nettoyage test" })
  });
});

test("reinitialisation du mot de passe bailleur", async () => {
  let r = await asJson(await fetch(`${baseUrl}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "bailleur@test.com" })
  }));
  assert.strictEqual(r.status, 200, JSON.stringify(r.body));
  assert.strictEqual(r.body.type, "bailleur");
  const tempPassword = r.body.temporaryPassword;
  assert.ok(tempPassword);

  r = await asJson(await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "bailleur@test.com", mot_de_passe: tempPassword })
  }));
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.user.doit_changer_mot_de_passe, 1);

  r = await asJson(await fetch(`${baseUrl}/api/users/changer-mot-de-passe`, {
    method: "PUT",
    headers: auth(r.body.token),
    body: JSON.stringify({ ancien_mot_de_passe: tempPassword, nouveau_mot_de_passe: "Secret123" })
  }));
  assert.strictEqual(r.status, 200, JSON.stringify(r.body));

  r = await asJson(await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "bailleur@test.com", mot_de_passe: "Secret123" })
  }));
  assert.strictEqual(r.status, 200);

  r = await asJson(await fetch(`${baseUrl}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "inconnu@test.com" })
  }));
  assert.strictEqual(r.status, 404);
});
