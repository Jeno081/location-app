// ============================================
// api.test.js — Parcours complet de l'API
// ============================================

const { test, before, after } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "location-app-test-"));
process.env.NODE_ENV = "test";
process.env.DB_PATH = path.join(tmpDir, "location.sqlite");
process.env.UPLOAD_DIR = path.join(tmpDir, "uploads");
process.env.JWT_SECRET = "test-secret-0123456789-abcdefghijklmnopqrstuvwxyz";
process.env.PORT = "0";

const app = require("../app");

let server;
let baseUrl;

function auth(token) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function asJson(response) {
  return { status: response.status, body: await response.json() };
}

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  try { require("../database/db").close(); } catch (err) { /* déjà fermée */ }
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (err) { /* ignoré */ }
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

  r = await asJson(await fetch(`${baseUrl}/api/contracts`, {
    method: "POST",
    headers: auth(bailleurToken),
    body: JSON.stringify({
      property_id: propertyId,
      locataire_email: "Locataire@Test.com",
      locataire_nom: "Locataire Test",
      locataire_telephone: "0811111111",
      date_debut: "2026-10-01",
      date_fin: "2027-10-01",
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
      date_debut: "2026-10-01",
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
