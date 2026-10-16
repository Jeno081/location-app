// ============================================
// locataire.js — Espace locataire COMPLET
// ============================================

const API_URL = "/api";
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "null");

if (!token || !user) window.location.href = "login.html";
if (user && user.role !== "locataire") window.location.href = "bailleur.html";

let myLocations = [];
let myContracts = [];

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

// ONGLETS
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

// MON LOGEMENT
async function loadMesLocations() {
  const container = document.getElementById("propertiesList");
  try {
    const response = await fetch(API_URL + "/properties/mes-locations", {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await response.json();

    if (!response.ok) { container.innerHTML = '<p class="empty-message">Erreur.</p>'; return; }

    myLocations = data.properties;

    if (myLocations.length === 0) {
      container.innerHTML = '<p class="empty-message">Aucun logement attribué.</p>';
      const banner = document.getElementById("infoVide");
      if (banner) banner.style.display = "flex";
      return;
    }

    const banner = document.getElementById("infoVide");
    if (banner) banner.style.display = "none";

    container.innerHTML = myLocations.map(p => {
      const photos = p.photos ? JSON.parse(p.photos) : [];
      const photosHtml = photos.length > 0
        ? '<div class="property-photos">' + photos.map(ph => '<img src="' + ph + '" alt="photo">').join("") + '</div>'
        : '<div class="property-no-photo">📷 Aucune photo</div>';

      return '<div class="property-card">' +
        '<div class="property-status loue">🔴 Loué</div>' +
        photosHtml +
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
  } catch (err) {
    container.innerHTML = '<p class="empty-message">Erreur serveur.</p>';
  }
}

// CONTRATS
async function loadContracts() {
  const container = document.getElementById("contractsList");
  try {
    const response = await fetch(API_URL + "/contracts/mes-locations", {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await response.json();

    if (!response.ok) { container.innerHTML = '<p class="empty-message">Erreur.</p>'; return; }
    if (data.contracts.length === 0) { container.innerHTML = '<p class="empty-message">Aucun contrat.</p>'; return; }

    myContracts = data.contracts;

    container.innerHTML = myContracts.map(c => {
      const estTermine = c.statut === "termine";
      return '<div class="property-card">' +
        '<span class="contract-status ' + c.statut + '">' + c.statut.replace("_", " ") + '</span>' +
        '<h3>' + c.property_titre + '</h3>' +
        '<p class="property-address">📍 ' + c.property_adresse + (c.property_ville ? ", " + c.property_ville : "") + '</p>' +
        '<p class="property-charges">👤 Bailleur : ' + c.bailleur_nom + '</p>' +
        '<p class="property-price">' + c.montant_loyer + ' $ <small>/ mois</small></p>' +
        '<p class="property-charges">Du ' + c.date_debut + (c.date_fin ? " au " + c.date_fin : " (durée indéterminée)") + '</p>' +
        (c.date_terminaison ? '<p class="property-charges">⚠️ Terminé le ' + new Date(c.date_terminaison).toLocaleDateString("fr-FR") + '</p>' : '') +
        (c.clauses_personnalisees ? '<p class="property-desc">📌 <strong>Clauses :</strong> ' + c.clauses_personnalisees.substring(0, 100) + (c.clauses_personnalisees.length > 100 ? "..." : "") + '</p>' : '') +
        '<p class="contract-signature ' + (c.signature_bailleur ? "signed" : "unsigned") + '">' +
          (c.signature_bailleur ? "✅ Signé par le bailleur" : "⏳ En attente du bailleur") +
        '</p>' +
        '<p class="contract-signature ' + (c.signature_locataire ? "signed" : "unsigned") + '">' +
          (c.signature_locataire ? "✅ Signé par vous" : "⏳ En attente de votre signature") +
        '</p>' +
        (!c.signature_locataire && !estTermine ? '<button class="btn-primary btn-block" style="margin-top:12px;" onclick="signContract(' + c.id + ')">✍️ Signer</button>' : '') +
        '<button class="btn-secondary btn-block" style="margin-top:8px;" onclick="downloadContractPDF(' + c.id + ')">📄 Contrat PDF</button>' +
        '</div>';
    }).join("");
  } catch (err) { container.innerHTML = '<p class="empty-message">Erreur.</p>'; }
}

async function signContract(id) {
  if (!confirm("Confirmez-vous accepter ce contrat ?")) return;
  try {
    const r = await fetch(API_URL + "/contracts/" + id + "/signer", {
      method: "PUT",
      headers: { "Authorization": "Bearer " + token }
    });
    if (r.ok) {
      showToast("Contrat signé !", "success");
      loadContracts(); loadMesLocations();
      if (window.loadNotifications) window.loadNotifications();
    }
  } catch (err) { console.error(err); }
}

async function downloadContractPDF(id) {
  try {
    const response = await fetch(API_URL + "/contracts/" + id + "/pdf", {
      headers: { "Authorization": "Bearer " + token }
    });
    if (!response.ok) { showToast("Erreur", "error"); return; }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contrat-" + id + ".pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) { showToast("Erreur", "error"); }
}

// PAIEMENTS
function openPaymentModal(contractId, montant) {
  const select = document.getElementById("paymentContract");
  select.innerHTML = '<option value="">-- Choisir --</option>';
  myLocations.forEach(p => {
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

  const body = {
    contract_id: parseInt(document.getElementById("paymentContract").value),
    mois: document.getElementById("paymentMois").value,
    montant: parseFloat(document.getElementById("paymentMontant").value),
    methode: methode
  };

  try {
    const response = await fetch(API_URL + "/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify(body)
    });
    const data = await response.json();

    if (response.ok) {
      showToast("Paiement enregistré !", "success");
      document.getElementById("paymentForm").reset();
      closePaymentModal();
      loadPayments();
      if (window.loadNotifications) window.loadNotifications();
    } else showToast(data.message, "error");
  } catch (err) { showToast("Erreur serveur", "error"); }
});

async function loadPayments() {
  const container = document.getElementById("paymentsList");
  try {
    const response = await fetch(API_URL + "/payments/mes-paiements", {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await response.json();

    if (!response.ok) { container.innerHTML = '<p class="empty-message">Erreur.</p>'; return; }
    if (data.payments.length === 0) { container.innerHTML = '<p class="empty-message">Aucun paiement.</p>'; return; }

    container.innerHTML = data.payments.map(p =>
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
  } catch (err) { container.innerHTML = '<p class="empty-message">Erreur.</p>'; }
}

async function downloadReceiptPDF(id) {
  try {
    const response = await fetch(API_URL + "/payments/" + id + "/quittance", {
      headers: { "Authorization": "Bearer " + token }
    });
    if (!response.ok) { showToast("Erreur", "error"); return; }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "quittance-" + id + ".pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) { showToast("Erreur", "error"); }
}

// RAPPELS
async function loadRappels() {
  const container = document.getElementById("rappelsList");
  try {
    const response = await fetch(API_URL + "/payments/mes-rappels", {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await response.json();

    if (!response.ok) { container.innerHTML = '<p class="empty-message">Erreur.</p>'; return; }
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
  } catch (err) { container.innerHTML = '<p class="empty-message">Erreur.</p>'; }
}

async function marquerRappelLu(id) {
  try {
    const r = await fetch(API_URL + "/payments/rappels/" + id + "/lu", {
      method: "PUT",
      headers: { "Authorization": "Bearer " + token }
    });
    if (r.ok) {
      showToast("Rappel lu", "success");
      loadRappels();
      if (window.loadNotifications) window.loadNotifications();
    }
  } catch (err) { console.error(err); }
}

// DOCUMENTS
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
    const response = await fetch(API_URL + "/documents", {
      method: "POST",
      headers: { "Authorization": "Bearer " + token },
      body: formData
    });
    const data = await response.json();

    if (response.ok) {
      showToast("Document uploadé !", "success");
      document.getElementById("uploadForm").reset();
      closeUploadModal();
      loadDocuments();
    } else showToast(data.message, "error");
  } catch (err) { showToast("Erreur serveur", "error"); }
});

async function loadDocuments() {
  const container = document.getElementById("documentsList");
  try {
    const response = await fetch(API_URL + "/documents/mes-documents", {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await response.json();

    if (!response.ok) { container.innerHTML = '<p class="empty-message">Erreur.</p>'; return; }
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
  } catch (err) { container.innerHTML = '<p class="empty-message">Erreur.</p>'; }
}

async function deleteDocument(id) {
  if (!confirm("Supprimer ce document ?")) return;
  try {
    const r = await fetch(API_URL + "/documents/" + id, {
      method: "DELETE",
      headers: { "Authorization": "Bearer " + token }
    });
    if (r.ok) { showToast("Document supprimé", "success"); loadDocuments(); }
  } catch (err) { showToast("Erreur", "error"); }
}

// SIGNALEMENTS (avec photos multiples)
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

  for (let i = 0; i < photos.length; i++) {
    formData.append("photos", photos[i]);
  }

  try {
    const response = await fetch(API_URL + "/incidents", {
      method: "POST",
      headers: { "Authorization": "Bearer " + token },
      body: formData
    });
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

async function loadMyIncidents() {
  const container = document.getElementById("incidentsList");
  try {
    const response = await fetch(API_URL + "/incidents/mes-incidents", {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await response.json();

    if (!response.ok) { container.innerHTML = '<p class="empty-message">Erreur.</p>'; return; }
    if (data.incidents.length === 0) { container.innerHTML = '<p class="empty-message">Aucun signalement.</p>'; return; }

    container.innerHTML = data.incidents.map(i =>
      '<div class="property-card">' +
        '<div class="property-status ' + (i.statut === "resolu" ? "disponible" : "loue") + '">' + i.statut + '</div>' +
        '<h3>' + i.property_titre + '</h3>' +
        '<p class="property-address">📍 ' + i.property_adresse + '</p>' +
        '<p class="property-desc">' + i.description + '</p>' +
        (i.photo ? '<img src="' + i.photo + '" alt="photo" style="width:100%;border-radius:8px;margin-top:12px;max-height:200px;object-fit:cover;">' : '') +
        '<p class="property-charges">Signalé le : ' + new Date(i.date_creation).toLocaleDateString("fr-FR") + '</p>' +
      '</div>'
    ).join("");
  } catch (err) { container.innerHTML = '<p class="empty-message">Erreur.</p>'; }
}

// HISTORIQUE COMPLET
async function loadHistory() {
  const statsContainer = document.getElementById("historyStats");
  const contentContainer = document.getElementById("historyContent");

  if (!statsContainer || !contentContainer) return;

  try {
    const response = await fetch(API_URL + "/history", {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await response.json();

    if (!response.ok) {
      statsContainer.innerHTML = '<p class="empty-message">Erreur.</p>';
      return;
    }

    statsContainer.innerHTML =
      '<div class="stat-card"><div class="stat-value">' + data.stats.nb_contrats + '</div><div class="stat-label">Contrats</div></div>' +
      '<div class="stat-card"><div class="stat-value">' + data.stats.nb_contrats_actifs + '</div><div class="stat-label">Actifs</div></div>' +
      '<div class="stat-card"><div class="stat-value">' + data.stats.total_paye + ' $</div><div class="stat-label">Total payé</div></div>' +
      '<div class="stat-card"><div class="stat-value">' + data.stats.nb_paiements + '</div><div class="stat-label">Paiements</div></div>' +
      '<div class="stat-card"><div class="stat-value">' + data.stats.nb_incidents + '</div><div class="stat-label">Signalements</div></div>' +
      '<div class="stat-card"><div class="stat-value">' + data.stats.nb_documents + '</div><div class="stat-label">Documents</div></div>';

    let html = "";

    // Contrats
    html += '<h2 class="section-title" style="margin-top:40px;">📄 Historique des contrats</h2>';
    if (data.contrats.length === 0) {
      html += '<p class="empty-message">Aucun contrat.</p>';
    } else {
      html += '<div class="properties-grid">';
      html += data.contrats.map(c =>
        '<div class="property-card">' +
          '<span class="contract-status ' + c.statut + '">' + c.statut.replace("_", " ") + '</span>' +
          '<h3>' + c.property_titre + '</h3>' +
          '<p class="property-address">📍 ' + c.property_adresse + '</p>' +
          '<p class="property-price">' + c.montant_loyer + ' $ <small>/ mois</small></p>' +
          '<p class="property-charges">Du ' + c.date_debut + (c.date_fin ? " au " + c.date_fin : "") + '</p>' +
          (c.date_terminaison ? '<p class="property-desc">🔚 Terminé le ' + new Date(c.date_terminaison).toLocaleDateString("fr-FR") + '</p>' : '') +
          '<button class="btn-secondary btn-block" style="margin-top:12px;" onclick="downloadContractPDF(' + c.id + ')">📄 Télécharger</button>' +
        '</div>'
      ).join("");
      html += '</div>';
    }

    // Paiements
    html += '<h2 class="section-title" style="margin-top:60px;">💳 Historique des paiements</h2>';
    if (data.paiements.length === 0) {
      html += '<p class="empty-message">Aucun paiement.</p>';
    } else {
      html += '<div class="properties-grid">';
      html += data.paiements.map(p =>
        '<div class="property-card">' +
          '<span class="contract-status actif">' + p.statut + '</span>' +
          '<h3>' + p.property_titre + '</h3>' +
          '<p class="property-price">' + p.montant + ' $</p>' +
          '<p class="property-charges">Mois : ' + p.mois + '</p>' +
          '<p class="property-charges">Payé le : ' + new Date(p.date_paiement).toLocaleDateString("fr-FR") + '</p>' +
          '<button class="btn-secondary btn-block" style="margin-top:12px;" onclick="downloadReceiptPDF(' + p.id + ')">🧾 Quittance</button>' +
        '</div>'
      ).join("");
      html += '</div>';
    }

    // Incidents
    html += '<h2 class="section-title" style="margin-top:60px;">🔧 Historique des signalements</h2>';
    if (data.incidents.length === 0) {
      html += '<p class="empty-message">Aucun signalement.</p>';
    } else {
      html += '<div class="properties-grid">';
      html += data.incidents.map(i =>
        '<div class="property-card">' +
          '<div class="property-status ' + (i.statut === "resolu" ? "disponible" : "loue") + '">' + i.statut + '</div>' +
          '<h3>' + i.property_titre + '</h3>' +
          '<p class="property-desc">' + i.description + '</p>' +
          (i.photo ? '<img src="' + i.photo + '" style="width:100%;border-radius:8px;margin-top:12px;max-height:150px;object-fit:cover;">' : '') +
          '<p class="property-charges">Signalé le : ' + new Date(i.date_creation).toLocaleDateString("fr-FR") + '</p>' +
        '</div>'
      ).join("");
      html += '</div>';
    }

    // Documents
    html += '<h2 class="section-title" style="margin-top:60px;">🪪 Historique des documents</h2>';
    if (data.documents.length === 0) {
      html += '<p class="empty-message">Aucun document.</p>';
    } else {
      html += '<div class="properties-grid">';
      html += data.documents.map(d =>
        '<div class="property-card">' +
          '<span class="contract-status ' + (d.statut === "valide" ? "actif" : "en_attente") + '">' + d.statut.replace("_", " ") + '</span>' +
          '<h3>' + d.type.toUpperCase() + '</h3>' +
          '<p class="property-charges">📄 ' + d.nom_fichier + '</p>' +
          '<p class="property-charges">Ajouté le : ' + new Date(d.date_upload).toLocaleDateString("fr-FR") + '</p>' +
          '<a href="' + d.chemin + '" target="_blank" class="btn-secondary btn-block" style="margin-top:12px;display:block;text-align:center;text-decoration:none;">👁️ Voir</a>' +
        '</div>'
      ).join("");
      html += '</div>';
    }

    contentContainer.innerHTML = html;

  } catch (err) {
    statsContainer.innerHTML = '<p class="empty-message">Erreur.</p>';
  }
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "index.html";
}

// CHARGEMENT
loadMesLocations();
loadContracts();
loadPayments();
loadRappels();
loadDocuments();
loadMyIncidents();
loadHistory();