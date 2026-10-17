// ============================================
// locataire.js — Espace locataire (avec recherche)
// ============================================

const API_URL = "/api";
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "null");

if (!token || !user) window.location.href = "login.html";
if (user && user.role !== "locataire") window.location.href = "bailleur.html";

let globalData = {
  locations: [],
  contracts: [],
  payments: [],
  incidents: []
};

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = "toast toast-" + type;
  const icon = type === "success" ? "✅" : "❌";
  toast.innerHTML = '<span class="toast-icon">' + icon + '</span><span>' + message + '</span>';
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    const cible = btn.dataset.tab;
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    const content = document.getElementById("tab-" + cible);
    if (content) content.classList.add("active");
  });
});

// RECHERCHES
function rechercherContrats() {
  const q = document.getElementById("searchContrats").value.toLowerCase().trim();
  let filtered = globalData.contracts;
  if (q) filtered = filtered.filter(c => c.property_titre.toLowerCase().includes(q));
  renderContracts(filtered);
}

function rechercherPaiements() {
  const q = document.getElementById("searchPaiements").value.toLowerCase().trim();
  let filtered = globalData.payments;
  if (q) filtered = filtered.filter(p => p.property_titre.toLowerCase().includes(q) || p.mois.toLowerCase().includes(q));
  renderPayments(filtered);
}

function rechercherIncidents() {
  const q = document.getElementById("searchIncidents").value.toLowerCase().trim();
  let filtered = globalData.incidents;
  if (q) filtered = filtered.filter(i => i.property_titre.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
  renderIncidents(filtered);
}

// CHARGEMENT
async function loadMesLocations() {
  const container = document.getElementById("propertiesList");
  try {
    const response = await fetch(API_URL + "/properties/mes-locations", { headers: { "Authorization": "Bearer " + token } });
    const data = await response.json();
    if (!response.ok) return;
    globalData.locations = data.properties;
    if (globalData.locations.length === 0) {
      container.innerHTML = '<p class="empty-message">Aucun logement attribué.</p>';
      const banner = document.getElementById("infoVide");
      if (banner) banner.style.display = "flex";
      return;
    }
    const banner = document.getElementById("infoVide");
    if (banner) banner.style.display = "none";
    
    container.innerHTML = globalData.locations.map(p => {
      const photos = p.photos ? JSON.parse(p.photos) : [];
      const photosHtml = photos.length > 0 ? '<div class="property-photos">' + photos.map(ph => '<img src="' + ph + '" alt="photo">').join("") + '</div>' : '<div class="property-no-photo">📷 Aucune photo</div>';
      return '<div class="property-card">' +
        '<div class="property-status loue">🔴 Loué</div>' + photosHtml +
        '<h3>' + p.titre + '</h3>' +
        '<p class="property-address">📍 ' + p.adresse + (p.ville ? ", " + p.ville : "") + '</p>' +
        '<p class="property-price">' + p.loyer + ' $ <small>/ mois</small></p>' +
        '<p class="property-charges">Charges : ' + p.charges + ' $</p>' +
        (p.description ? '<p class="property-desc">' + p.description + '</p>' : '') +
        '<div style="border-top:1px solid var(--gray-100); padding-top:14px; margin-top:14px;">' +
          '<p class="property-charges"><strong>👤 Bailleur :</strong> ' + p.bailleur_nom + '</p>' +
          '<p class="property-charges">✉️ ' + p.bailleur_email + '</p>' +
          '<p class="property-charges">📞 ' + (p.bailleur_telephone || "—") + '</p>' +
        '</div>' +
        '<button class="btn-secondary btn-block" style="margin-top:12px;" onclick="downloadContractPDF(' + p.contract_id + ')">📄 Télécharger mon contrat</button>' +
        '<button class="btn-secondary btn-block" style="margin-top:8px;" onclick="openIncidentModal(' + p.id + ')">🔧 Signaler un problème</button>' +
        '<button class="btn-primary btn-block" style="margin-top:8px;" onclick="openPaymentModal(' + p.contract_id + ', ' + p.montant_loyer + ')">💳 Payer le loyer</button>' +
        '</div>';
    }).join("");
  } catch (err) { container.innerHTML = '<p class="empty-message">Erreur serveur.</p>'; }
}

async function loadContracts() {
  try {
    const response = await fetch(API_URL + "/contracts/mes-locations", { headers: { "Authorization": "Bearer " + token } });
    const data = await response.json();
    if (!response.ok) return;
    globalData.contracts = data.contracts;
    rechercherContrats();
  } catch (err) { console.error(err); }
}

async function loadPayments() {
  try {
    const response = await fetch(API_URL + "/payments/mes-paiements", { headers: { "Authorization": "Bearer " + token } });
    const data = await response.json();
    if (!response.ok) return;
    globalData.payments = data.payments;
    rechercherPaiements();
  } catch (err) { console.error(err); }
}

async function loadMyIncidents() {
  try {
    const response = await fetch(API_URL + "/incidents/mes-incidents", { headers: { "Authorization": "Bearer " + token } });
    const data = await response.json();
    if (!response.ok) return;
    globalData.incidents = data.incidents;
    rechercherIncidents();
  } catch (err) { console.error(err); }
}

// RENDERERS
function renderContracts(contracts) {
  const container = document.getElementById("contractsList");
  if (contracts.length === 0) { container.innerHTML = '<p class="empty-message">Aucun contrat trouvé.</p>'; return; }
  container.innerHTML = contracts.map(c => {
    const estTermine = c.statut === "termine";
    return '<div class="property-card">' +
      '<span class="contract-status ' + c.statut + '">' + c.statut.replace("_", " ") + '</span>' +
      '<h3>' + c.property_titre + '</h3>' +
      '<p class="property-address">📍 ' + c.property_adresse + (c.property_ville ? ", " + c.property_ville : "") + '</p>' +
      '<p class="property-charges">👤 Bailleur : ' + c.bailleur_nom + '</p>' +
      '<p class="property-price">' + c.montant_loyer + ' $ <small>/ mois</small></p>' +
      '<p class="property-charges">Du ' + c.date_debut + (c.date_fin ? " au " + c.date_fin : " (durée indéterminée)") + '</p>' +
      (c.date_terminaison ? '<p class="property-charges">⚠️ Terminé le ' + new Date(c.date_terminaison).toLocaleDateString("fr-FR") + '</p>' : '') +
      '<p class="contract-signature ' + (c.signature_bailleur ? "signed" : "unsigned") + '">' + (c.signature_bailleur ? "✅ Signé par le bailleur" : "⏳ En attente du bailleur") + '</p>' +
      '<p class="contract-signature ' + (c.signature_locataire ? "signed" : "unsigned") + '">' + (c.signature_locataire ? "✅ Signé par vous" : "⏳ En attente de votre signature") + '</p>' +
      (!c.signature_locataire && !estTermine ? '<button class="btn-primary btn-block" style="margin-top:12px;" onclick="signContract(' + c.id + ')">✍️ Signer</button>' : '') +
      '<button class="btn-secondary btn-block" style="margin-top:8px;" onclick="downloadContractPDF(' + c.id + ')">📄 Contrat PDF</button>' +
      '</div>';
  }).join("");
}

function renderPayments(payments) {
  const container = document.getElementById("paymentsList");
  if (payments.length === 0) { container.innerHTML = '<p class="empty-message">Aucun paiement trouvé.</p>'; return; }
  container.innerHTML = payments.map(p =>
    '<div class="property-card">' +
      '<span class="contract-status actif">' + p.statut + '</span>' +
      '<h3>' + p.property_titre + '</h3>' +
      '<p class="property-address">📍 ' + p.property_adresse + '</p>' +
      '<p class="property-price">' + p.montant + ' $</p>' +
      '<p class="property-charges">Mois : ' + p.mois + '</p>' +
      '<p class="property-charges">Méthode : ' + p.methode + '</p>' +
      '<p class="property-charges">Payé le : ' + new Date(p.date_paiement).toLocaleDateString("fr-FR") + '</p>' +
      '<button class="btn-secondary btn-block" style="margin-top:12px;" onclick="downloadReceiptPDF(' + p.id + ')">🧾 Quittance</button>' +
    '</div>'
  ).join("");
}

function renderIncidents(incidents) {
  const container = document.getElementById("incidentsList");
  if (incidents.length === 0) { container.innerHTML = '<p class="empty-message">Aucun signalement trouvé.</p>'; return; }
  container.innerHTML = incidents.map(i =>
    '<div class="property-card">' +
      '<div class="property-status ' + (i.statut === "resolu" ? "disponible" : "loue") + '">' + i.statut + '</div>' +
      '<h3>' + i.property_titre + '</h3>' +
      '<p class="property-address">📍 ' + i.property_adresse + '</p>' +
      '<p class="property-desc">' + i.description + '</p>' +
      (i.photo ? '<img src="' + i.photo + '" alt="photo" style="width:100%;border-radius:8px;margin-top:12px;max-height:200px;object-fit:cover;">' : '') +
      '<p class="property-charges">Signalé le : ' + new Date(i.date_creation).toLocaleDateString("fr-FR") + '</p>' +
    '</div>'
  ).join("");
}

// ACTIONS
function openPaymentModal(contractId, montant) {
  const select = document.getElementById("paymentContract");
  select.innerHTML = '<option value="">-- Choisir --</option>';
  globalData.locations.forEach(p => {
    select.innerHTML += '<option value="' + p.contract_id + '">' + p.titre + ' — ' + p.montant_loyer + ' $</option>';
  });
  select.value = contractId;
  document.getElementById("paymentMontant").value = montant;
  document.getElementById("paymentModal").style.display = "flex";
}
function closePaymentModal() { document.getElementById("paymentModal").style.display = "none"; }

document.getElementById("paymentForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const methode = document.querySelector('input[name="methode"]:checked').value;
  const preuve = document.getElementById("paymentPreuve").files[0];
  
  if (!preuve) {
    showToast("Veuillez ajouter une preuve de paiement", "error");
    return;
  }

  const formData = new FormData();
  formData.append("contract_id", document.getElementById("paymentContract").value);
  formData.append("mois", document.getElementById("paymentMois").value);
  formData.append("montant", document.getElementById("paymentMontant").value);
  formData.append("methode", methode);
  formData.append("preuve", preuve);

  try {
    const response = await fetch(API_URL + "/payments", {
      method: "POST",
      headers: { "Authorization": "Bearer " + token },
      body: formData
    });
    const data = await response.json();
    if (response.ok) {
      showToast("Paiement déclaré ! En attente de validation.", "success");
      document.getElementById("paymentForm").reset();
      closePaymentModal();
      loadPayments();
      if (window.loadNotifications) window.loadNotifications();
    } else showToast(data.message, "error");
  } catch (err) { showToast("Erreur serveur", "error"); }
});

// Autres fonctions (identiques à avant pour ne pas casser l'existant)
function openUploadModal() { document.getElementById("uploadModal").style.display = "flex"; }
function closeUploadModal() { document.getElementById("uploadModal").style.display = "none"; }

document.getElementById("uploadForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const type = document.getElementById("docType").value;
  const fichier = document.getElementById("docFichier").files[0];
  if (!fichier) { showToast("Sélectionnez un fichier", "error"); return; }
  const formData = new FormData();
  formData.append("type", type);
  formData.append("fichier", fichier);
  try {
    const response = await fetch(API_URL + "/documents", { method: "POST", headers: { "Authorization": "Bearer " + token }, body: formData });
    if (response.ok) {
      showToast("Document uploadé !", "success");
      document.getElementById("uploadForm").reset();
      closeUploadModal();
      loadDocuments();
    } else { const data = await response.json(); showToast(data.message, "error"); }
  } catch (err) { showToast("Erreur serveur", "error"); }
});

async function loadDocuments() {
  const container = document.getElementById("documentsList");
  try {
    const response = await fetch(API_URL + "/documents/mes-documents", { headers: { "Authorization": "Bearer " + token } });
    const data = await response.json();
    if (!response.ok) return;
    if (data.documents.length === 0) { container.innerHTML = '<p class="empty-message">Aucun document.</p>'; return; }
    const labels = { cni: "🪪 CNI", passeport: "📕 Passeport", fiche_paie: "💼 Fiche de paie", autre: "📎 Autre" };
    container.innerHTML = data.documents.map(d =>
      '<div class="property-card">' +
        '<span class="contract-status ' + (d.statut === "valide" ? "actif" : "en_attente") + '">' + d.statut.replace("_", " ") + '</span>' +
        '<h3>' + (labels[d.type] || d.type) + '</h3>' +
        '<p class="property-charges">📄 ' + d.nom_fichier + '</p>' +
        '<p class="property-charges">Ajouté le : ' + new Date(d.date_upload).toLocaleDateString("fr-FR") + '</p>' +
        (d.commentaire ? '<p class="property-desc">💬 ' + d.commentaire + '</p>' : '') +
        '<a href="' + d.chemin + '" target="_blank" class="btn-secondary btn-block" style="margin-top:12px; display:block; text-align:center; text-decoration:none;">👁️ Voir</a>' +
        '<button class="btn-secondary btn-block" style="margin-top:8px; color:#dc2626; border-color:#dc2626;" onclick="deleteDocument(' + d.id + ')">🗑️ Supprimer</button>' +
      '</div>'
    ).join("");
  } catch (err) { console.error(err); }
}

async function deleteDocument(id) {
  if (!confirm("Supprimer ce document ?")) return;
  try {
    const r = await fetch(API_URL + "/documents/" + id, { method: "DELETE", headers: { "Authorization": "Bearer " + token } });
    if (r.ok) { showToast("Document supprimé", "success"); loadDocuments(); }
  } catch (err) { showToast("Erreur", "error"); }
}

function openIncidentModal(propertyId) {
  document.getElementById("incidentPropertyId").value = propertyId;
  document.getElementById("incidentModal").style.display = "flex";
}
function closeIncidentModal() { document.getElementById("incidentModal").style.display = "none"; }

document.getElementById("incidentForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const description = document.getElementById("incidentDescription").value;
  const propertyId = document.getElementById("incidentPropertyId").value;
  const photos = document.getElementById("incidentPhotos").files;
  const formData = new FormData();
  formData.append("property_id", propertyId);
  formData.append("description", description);
  for (let i = 0; i < photos.length; i++) formData.append("photos", photos[i]);
  try {
    const response = await fetch(API_URL + "/incidents", { method: "POST", headers: { "Authorization": "Bearer " + token }, body: formData });
    const data = await response.json();
    if (response.ok) {
      showToast(data.count + " incident(s) signalé(s) !", "success");
      document.getElementById("incidentForm").reset();
      closeIncidentModal();
      loadMyIncidents();
      if (window.loadNotifications) window.loadNotifications();
    } else showToast(data.message || "Erreur", "error");
  } catch (err) { showToast("Erreur serveur", "error"); }
});

async function signContract(id) {
  if (!confirm("Confirmez-vous accepter ce contrat ?")) return;
  try {
    const r = await fetch(API_URL + "/contracts/" + id + "/signer", { method: "PUT", headers: { "Authorization": "Bearer " + token } });
    if (r.ok) { showToast("Contrat signé !", "success"); loadContracts(); loadMesLocations(); if (window.loadNotifications) window.loadNotifications(); }
  } catch (err) { console.error(err); }
}

async function downloadContractPDF(id) {
  try {
    const response = await fetch(API_URL + "/contracts/" + id + "/pdf", { headers: { "Authorization": "Bearer " + token } });
    if (!response.ok) { showToast("Erreur", "error"); return; }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "contrat-" + id + ".pdf";
    document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
  } catch (err) { showToast("Erreur", "error"); }
}

async function downloadReceiptPDF(id) {
  try {
    const response = await fetch(API_URL + "/payments/" + id + "/quittance", { headers: { "Authorization": "Bearer " + token } });
    if (!response.ok) { showToast("Erreur", "error"); return; }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "quittance-" + id + ".pdf";
    document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
  } catch (err) { showToast("Erreur", "error"); }
}

async function loadRappels() {
  const container = document.getElementById("rappelsList");
  try {
    const response = await fetch(API_URL + "/payments/mes-rappels", { headers: { "Authorization": "Bearer " + token } });
    const data = await response.json();
    if (!response.ok) return;
    if (data.rappels.length === 0) { container.innerHTML = '<p class="empty-message">Aucun rappel.</p>'; return; }
    container.innerHTML = data.rappels.map(r => {
      const style = r.statut === "envoye" ? 'style="border-left: 4px solid var(--danger);"' : '';
      return '<div class="property-card" ' + style + '>' +
        '<span class="contract-status ' + (r.statut === "lu" ? "actif" : "en_attente") + '">' + (r.statut === "lu" ? "✓ Lu" : "🔔 Nouveau") + '</span>' +
        '<h3>' + r.property_titre + '</h3>' +
        '<p class="property-desc">' + r.message + '</p>' +
        '<p class="property-charges">Reçu le : ' + new Date(r.date_envoi).toLocaleDateString("fr-FR") + '</p>' +
        (r.statut === "envoye" ? '<button class="btn-secondary btn-block" style="margin-top:12px;" onclick="marquerRappelLu(' + r.id + ')">✓ Marquer comme lu</button>' : '') +
        '</div>';
    }).join("");
  } catch (err) { console.error(err); }
}

async function marquerRappelLu(id) {
  try {
    const r = await fetch(API_URL + "/payments/rappels/" + id + "/lu", { method: "PUT", headers: { "Authorization": "Bearer " + token } });
    if (r.ok) { showToast("Rappel lu", "success"); loadRappels(); if (window.loadNotifications) window.loadNotifications(); }
  } catch (err) { console.error(err); }
}

async function loadHistory() {
  const statsContainer = document.getElementById("historyStats");
  const contentContainer = document.getElementById("historyContent");
  if (!statsContainer || !contentContainer) return;
  try {
    const response = await fetch(API_URL + "/history", { headers: { "Authorization": "Bearer " + token } });
    const data = await response.json();
    if (!response.ok) return;
    statsContainer.innerHTML =
      '<div class="stat-card"><div class="stat-value">' + data.stats.nb_contrats + '</div><div class="stat-label">Contrats</div></div>' +
      '<div class="stat-card"><div class="stat-value">' + data.stats.total_paye + ' $</div><div class="stat-label">Total payé</div></div>' +
      '<div class="stat-card"><div class="stat-value">' + data.stats.nb_paiements + '</div><div class="stat-label">Paiements</div></div>' +
      '<div class="stat-card"><div class="stat-value">' + data.stats.nb_incidents + '</div><div class="stat-label">Signalements</div></div>';
    let html = '<h2 class="section-title" style="margin-top:40px;">📄 Historique des contrats</h2>';
    html += '<div class="properties-grid">' + data.contrats.map(c => '<div class="property-card"><span class="contract-status ' + c.statut + '">' + c.statut.replace("_", " ") + '</span><h3>' + c.property_titre + '</h3><p class="property-address">📍 ' + c.property_adresse + '</p><p class="property-price">' + c.montant_loyer + ' $ <small>/ mois</small></p><button class="btn-secondary btn-block" style="margin-top:12px;" onclick="downloadContractPDF(' + c.id + ')">📄 Télécharger</button></div>').join("") + '</div>';
    html += '<h2 class="section-title" style="margin-top:60px;">💳 Historique des paiements</h2>';
    html += '<div class="properties-grid">' + data.paiements.map(p => '<div class="property-card"><span class="contract-status actif">' + p.statut + '</span><h3>' + p.property_titre + '</h3><p class="property-price">' + p.montant + ' $</p><p class="property-charges">Mois : ' + p.mois + '</p><button class="btn-secondary btn-block" style="margin-top:12px;" onclick="downloadReceiptPDF(' + p.id + ')">🧾 Quittance</button></div>').join("") + '</div>';
    contentContainer.innerHTML = html;
  } catch (err) { console.error(err); }
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "index.html";
}

// INITIALISATION
loadMesLocations();
loadContracts();
loadPayments();
loadRappels();
loadDocuments();
loadMyIncidents();
loadHistory();