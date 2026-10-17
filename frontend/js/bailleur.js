// ============================================
// bailleur.js — Espace bailleur COMPLET
// ============================================

const API_URL = "/api";
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "null");

if (!token || !user) window.location.href = "login.html";
if (user && user.role !== "bailleur") window.location.href = "locataire.html";

let globalData = {
  properties: [],
  tenants: [],
  contracts: [],
  payments: [],
  incidents: []
};

let currentFilter = "tous";
let currentPassword = "";

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
    document.getElementById("tab-" + cible).classList.add("active");
  });
});

// ============================================
// 1. FILTRES & RECHERCHES
// ============================================
function filterProperties(btn, filtre) {
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  currentFilter = filtre;
  rechercherProprietes();
}

function rechercherProprietes() {
  const q = document.getElementById("searchBiens").value.toLowerCase().trim();
  let filtered = globalData.properties;
  if (currentFilter !== "tous") filtered = filtered.filter(p => p.statut === currentFilter);
  if (q) {
    filtered = filtered.filter(p => 
      p.titre.toLowerCase().includes(q) || 
      p.adresse.toLowerCase().includes(q) || 
      (p.ville && p.ville.toLowerCase().includes(q))
    );
  }
  renderProperties(filtered);
}

function rechercherLocataires() {
  const q = document.getElementById("searchLocataires").value.toLowerCase().trim();
  let filtered = globalData.tenants;
  if (q) {
    filtered = filtered.filter(l => 
      l.nom.toLowerCase().includes(q) || 
      l.email.toLowerCase().includes(q) || 
      l.property_titre.toLowerCase().includes(q)
    );
  }
  renderTenants(filtered);
}

function rechercherContrats() {
  const q = document.getElementById("searchContrats").value.toLowerCase().trim();
  let filtered = globalData.contracts;
  if (q) {
    filtered = filtered.filter(c => 
      c.property_titre.toLowerCase().includes(q) || 
      c.locataire_nom.toLowerCase().includes(q) || 
      c.locataire_email.toLowerCase().includes(q)
    );
  }
  renderContracts(filtered);
}

function rechercherPaiements() {
  const q = document.getElementById("searchPaiements").value.toLowerCase().trim();
  let filtered = globalData.payments;
  if (q) {
    filtered = filtered.filter(p => 
      p.property_titre.toLowerCase().includes(q) || 
      p.locataire_nom.toLowerCase().includes(q) || 
      p.mois.toLowerCase().includes(q)
    );
  }
  renderPayments(filtered);
}

function rechercherIncidents() {
  const q = document.getElementById("searchIncidents").value.toLowerCase().trim();
  let filtered = globalData.incidents;
  if (q) {
    filtered = filtered.filter(i => 
      i.property_titre.toLowerCase().includes(q) || 
      i.locataire_nom.toLowerCase().includes(q) || 
      i.description.toLowerCase().includes(q)
    );
  }
  renderIncidents(filtered);
}

// ============================================
// 2. CHARGEMENT DES DONNÉES
// ============================================
async function loadProperties() {
  try {
    const response = await fetch(API_URL + "/properties/mes-logements/liste", {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await response.json();
    if (!response.ok) return;

    globalData.properties = data.properties;
    document.getElementById("statTotal").textContent = globalData.properties.length;
    document.getElementById("statDispo").textContent = globalData.properties.filter(p => p.statut === "disponible").length;
    document.getElementById("statLoues").textContent = globalData.properties.filter(p => p.statut === "loue").length;
    document.getElementById("statLoyer").textContent =
      globalData.properties.filter(p => p.statut === "loue").reduce((sum, p) => sum + (p.loyer || 0), 0) + " $";

    rechercherProprietes();
  } catch (err) { console.error(err); }
}

async function loadTenants() {
  try {
    const response = await fetch(API_URL + "/users/mes-locataires", {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await response.json();
    if (!response.ok) return;
    globalData.tenants = data.locataires;
    rechercherLocataires();
  } catch (err) { console.error(err); }
}

async function loadContracts() {
  try {
    const response = await fetch(API_URL + "/contracts/mes-contrats", {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await response.json();
    if (!response.ok) return;
    globalData.contracts = data.contracts;
    rechercherContrats();
  } catch (err) { console.error(err); }
}

async function loadPayments() {
  try {
    const response = await fetch(API_URL + "/payments/recus", {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await response.json();
    if (!response.ok) return;
    globalData.payments = data.payments;
    const total = globalData.payments.reduce((s, p) => s + p.montant, 0);
    document.getElementById("statEncaisse").textContent = total + " $";
    rechercherPaiements();
  } catch (err) { console.error(err); }
}

async function loadIncidents() {
  try {
    const response = await fetch(API_URL + "/incidents/recus", {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await response.json();
    if (!response.ok) return;
    globalData.incidents = data.incidents;
    rechercherIncidents();
  } catch (err) { console.error(err); }
}

async function loadDashboard() {
  const container = document.getElementById("dashboardPaiements");
  try {
    const response = await fetch(API_URL + "/payments/tableau-de-bord", {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await response.json();
    if (!response.ok) return;

    const enRetard = data.dashboard.filter(d => d.statut_paiement === "retard" || d.statut_paiement === "retard_grave").length;
    document.getElementById("statRetards").textContent = enRetard;

    if (data.dashboard.length === 0) { container.innerHTML = '<p class="empty-message">Aucun contrat actif.</p>'; return; }

    container.innerHTML = data.dashboard.map(d => {
      let badge, couleur, message;
      if (d.statut_paiement === "a_jour") {
        badge = "✅ À jour"; couleur = "actif"; message = "Paiement de " + data.mois_actuel + " reçu";
      } else if (d.statut_paiement === "en_attente") {
        badge = "⏳ En attente"; couleur = "en_attente"; message = "En attente du paiement de " + data.mois_actuel;
      } else if (d.statut_paiement === "retard") {
        badge = "⚠️ 1 mois de retard"; couleur = "en_attente"; message = d.mois_en_retard + " mois en retard";
      } else {
        badge = "🚨 Retard grave"; couleur = "en_attente"; message = d.mois_en_retard + " mois en retard";
      }

      const borderColor = d.statut_paiement.includes("retard") ? "var(--danger)" : (d.statut_paiement === "a_jour" ? "var(--success)" : "var(--warning)");

      return '<div class="property-card" style="border-left: 4px solid ' + borderColor + ';">' +
        '<span class="contract-status ' + couleur + '">' + badge + '</span>' +
        '<h3>👤 ' + d.locataire_nom + '</h3>' +
        '<p class="property-charges">✉️ ' + d.locataire_email + '</p>' +
        '<p class="property-address">🏠 ' + d.property_titre + '</p>' +
        '<p class="property-address">📍 ' + d.property_adresse + '</p>' +
        '<p class="property-price">' + d.montant_loyer + ' $ <small>/ mois</small></p>' +
        '<p class="property-charges">' + message + '</p>' +
        '<p class="property-charges">Total payé : ' + d.total_paye + ' $</p>' +
        (!d.paye_ce_mois ? '<button class="btn-secondary btn-block" style="margin-top:12px; color:#dc2626; border-color:#dc2626;" onclick="openRappelModal(' + d.contract_id + ', \'' + d.locataire_nom + '\')">🔔 Envoyer un rappel</button>' : '') +
        '</div>';
    }).join("");
  } catch (err) { console.error(err); }
}

// ============================================
// 3. RENDERERS
// ============================================
function renderProperties(properties) {
  const container = document.getElementById("propertiesList");
  if (properties.length === 0) { container.innerHTML = '<p class="empty-message">Aucun logement trouvé.</p>'; return; }

  container.innerHTML = properties.map(p => {
    const photos = p.photos ? JSON.parse(p.photos) : [];
    const photosHtml = photos.length > 0
      ? '<div class="property-photos">' + photos.map(ph => '<img src="' + ph + '" alt="photo">').join("") + '</div>'
      : '<div class="property-no-photo">📷 Aucune photo</div>';
    const statutLabel = p.statut === "disponible" ? "🟢 Disponible" : (p.statut === "loue" ? "🔴 Loué" : "⚫ Archivé");

    return '<div class="property-card">' +
      '<div class="property-status ' + p.statut + '">' + statutLabel + '</div>' +
      photosHtml +
      '<h3>' + p.titre + '</h3>' +
      '<p class="property-address">📍 ' + p.adresse + (p.ville ? ", " + p.ville : "") + '</p>' +
      '<p class="property-price">' + p.loyer + ' $ <small>/ mois</small></p>' +
      '<p class="property-charges">Charges : ' + p.charges + ' $</p>' +
      (p.description ? '<p class="property-desc">' + p.description + '</p>' : '') +
      '<label for="photos-' + p.id + '" class="btn-secondary" style="display:block;margin-top:12px;text-align:center;cursor:pointer;">📷 Ajouter des photos</label>' +
      '<input type="file" id="photos-' + p.id + '" accept="image/*" multiple style="display:none;" onchange="uploadPhotos(' + p.id + ', this.files)">' +
      '</div>';
  }).join("");
}

function renderTenants(tenants) {
  const container = document.getElementById("tenantsList");
  if (tenants.length === 0) { container.innerHTML = '<p class="empty-message">Aucun locataire trouvé.</p>'; return; }

  container.innerHTML = tenants.map(l => {
    const avatarHtml = l.photo_profil
      ? '<img src="' + l.photo_profil + '" style="width:60px;height:60px;border-radius:50%;object-fit:cover;margin-bottom:10px;">'
      : '<div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--secondary));display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:1.5rem;margin-bottom:10px;">' + l.nom.charAt(0).toUpperCase() + '</div>';

    return '<div class="property-card">' +
      '<span class="contract-status ' + l.contract_statut + '">' + l.contract_statut.replace("_", " ") + '</span>' +
      avatarHtml +
      '<h3>👤 ' + l.nom + '</h3>' +
      '<p class="property-charges">✉️ ' + l.email + '</p>' +
      '<p class="property-charges">📞 ' + (l.telephone || "—") + '</p>' +
      '<p class="property-address">🏠 ' + l.property_titre + '</p>' +
      '<p class="property-price">' + l.montant_loyer + ' $ <small>/ mois</small></p>' +
      '<p class="property-charges">Du ' + l.date_debut + (l.date_fin ? " au " + l.date_fin : "") + '</p>' +
      (l.doit_changer_mot_de_passe === 1 ? '<p class="contract-signature unsigned">⚠️ N\'a pas changé son mdp</p>' : '<p class="contract-signature signed">✅ Mdp personnalisé</p>') +
      '<button class="btn-secondary btn-block" style="margin-top:12px;" onclick="openDocsModal(' + l.id + ', \'' + l.nom + '\')">🪪 Documents</button>' +
      '<button class="btn-secondary btn-block" style="margin-top:8px; color:#dc2626; border-color:#dc2626;" onclick="deleteTenant(' + l.id + ', \'' + l.nom + '\')">🗑️ Supprimer</button>' +
      '</div>';
  }).join("");
}

function renderContracts(contracts) {
  const container = document.getElementById("contractsList");
  if (contracts.length === 0) { container.innerHTML = '<p class="empty-message">Aucun contrat trouvé.</p>'; return; }

  container.innerHTML = contracts.map(c => {
    const estTermine = c.statut === "termine";
    return '<div class="property-card">' +
      '<span class="contract-status ' + c.statut + '">' + c.statut.replace("_", " ") + '</span>' +
      '<h3>' + c.property_titre + '</h3>' +
      '<p class="property-address">📍 ' + c.property_adresse + '</p>' +
      '<p class="property-charges">👤 ' + c.locataire_nom + ' (' + c.locataire_email + ')</p>' +
      '<p class="property-price">' + c.montant_loyer + ' $ <small>/ mois</small></p>' +
      '<p class="property-charges">Du ' + c.date_debut + (c.date_fin ? " au " + c.date_fin : "") + '</p>' +
      (c.date_terminaison ? '<p class="property-charges">⚠️ Terminé le ' + new Date(c.date_terminaison).toLocaleDateString("fr-FR") + '</p>' : '') +
      (c.clauses_personnalisees ? '<p class="property-desc">📌 <strong>Clauses</strong> : ' + c.clauses_personnalisees.substring(0, 100) + (c.clauses_personnalisees.length > 100 ? "..." : "") + '</p>' : '') +
      '<p class="contract-signature ' + (c.signature_bailleur ? "signed" : "unsigned") + '">' +
        (c.signature_bailleur ? "✅ Signé par vous" : "⏳ En attente de votre signature") +
      '</p>' +
      '<p class="contract-signature ' + (c.signature_locataire ? "signed" : "unsigned") + '">' +
        (c.signature_locataire ? "✅ Signé par le locataire" : "⏳ En attente du locataire") +
      '</p>' +
      (!c.signature_bailleur && !estTermine ? '<button class="btn-primary btn-block" style="margin-top:12px;" onclick="signContract(' + c.id + ')">✍️ Signer</button>' : '') +
      (!estTermine && !c.signature_locataire ? '<button class="btn-secondary btn-block" style="margin-top:8px;" onclick="editClauses(' + c.id + ', \'' + (c.clauses_personnalisees || "").replace(/'/g, "\\'").replace(/\n/g, "\\n") + '\')">✏️ Modifier les clauses</button>' : '') +
      '<button class="btn-secondary btn-block" style="margin-top:8px;" onclick="downloadContractPDF(' + c.id + ')">📄 Contrat PDF</button>' +
      (!estTermine ? '<button class="btn-secondary btn-block" style="margin-top:8px; color:#dc2626; border-color:#dc2626;" onclick="terminerContrat(' + c.id + ')">🔚 Mettre fin</button>' : '') +
      '</div>';
  }).join("");
}

function renderPayments(payments) {
  const container = document.getElementById("paymentsList");
  if (payments.length === 0) { container.innerHTML = '<p class="empty-message">Aucun paiement trouvé.</p>'; return; }

  container.innerHTML = payments.map(p => {
    let statutBadge = "";
    let actions = "";
    
    if (p.statut_bailleur === 'valide') {
      statutBadge = '<span class="contract-status actif" style="background:#d1fae5;color:#065f46;">✅ Validé</span>';
    } else if (p.statut_bailleur === 'refuse') {
      statutBadge = '<span class="contract-status en_attente" style="background:#fee2e2;color:#991b1b;">❌ Refusé</span>';
    } else {
      statutBadge = '<span class="contract-status en_attente" style="background:#fef3c7;color:#92400e;">⏳ En attente de validation</span>';
      actions = '<div style="display:flex;gap:8px;margin-top:12px;">' +
        '<button class="btn-primary btn-block" style="background:var(--success);" onclick="validerPaiement(' + p.id + ', \'valide\')">✅ Valider</button>' +
        '<button class="btn-secondary btn-block" style="color:var(--danger);border-color:var(--danger);" onclick="validerPaiement(' + p.id + ', \'refuse\')">❌ Refuser</button>' +
        '</div>';
    }

    return '<div class="property-card">' +
      statutBadge +
      '<h3>' + p.property_titre + '</h3>' +
      '<p class="property-address">📍 ' + p.property_adresse + '</p>' +
      '<p class="property-charges">👤 ' + p.locataire_nom + '</p>' +
      '<p class="property-price">' + p.montant + ' $</p>' +
      '<p class="property-charges">Mois : ' + p.mois + '</p>' +
      '<p class="property-charges">Méthode : ' + p.methode + '</p>' +
      '<p class="property-charges">Déclaré le : ' + new Date(p.date_paiement).toLocaleDateString("fr-FR") + '</p>' +
      (p.preuve_paiement ? '<a href="' + p.preuve_paiement + '" target="_blank" class="btn-secondary btn-block" style="margin-top:12px;display:block;text-align:center;text-decoration:none;">👁️ Voir la preuve</a>' : '') +
      actions +
      '<button class="btn-secondary btn-block" style="margin-top:8px;" onclick="downloadReceiptPDF(' + p.id + ')">🧾 Quittance</button>' +
    '</div>';
  }).join("");
}

function validerPaiement(id, statut) {
  document.getElementById("validatePaymentId").value = id;
  document.getElementById("validatePaymentAction").value = statut;
  
  if (statut === "valide") {
    document.getElementById("validatePaymentTitle").textContent = "Valider le paiement";
    document.getElementById("validatePaymentText").textContent = "Confirmez-vous avoir bien reçu ce paiement sur votre compte ?";
    document.getElementById("validatePaymentBtn").style.background = "var(--success)";
    document.getElementById("validatePaymentBtn").textContent = "Oui, valider";
  } else {
    document.getElementById("validatePaymentTitle").textContent = "Refuser le paiement";
    document.getElementById("validatePaymentText").textContent = "Êtes-vous sûr de vouloir refuser cette preuve de paiement ? Le locataire sera notifié.";
    document.getElementById("validatePaymentBtn").style.background = "var(--danger)";
    document.getElementById("validatePaymentBtn").textContent = "Oui, refuser";
  }
  
  document.getElementById("validatePaymentModal").style.display = "flex";
}

function closeValidatePaymentModal() {
  document.getElementById("validatePaymentModal").style.display = "none";
}

async function confirmValidatePayment() {
  const id = document.getElementById("validatePaymentId").value;
  const statut = document.getElementById("validatePaymentAction").value;

  try {
    const r = await fetch(API_URL + "/payments/" + id + "/valider", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ statut_bailleur: statut })
    });
    
    if (r.ok) {
      showToast(statut === "valide" ? "Paiement validé !" : "Paiement refusé.", "success");
      closeValidatePaymentModal();
      loadPayments();
      loadDashboard();
      if (window.loadNotifications) window.loadNotifications();
    } else {
      const data = await r.json();
      showToast(data.message, "error");
    }
  } catch (err) { showToast("Erreur", "error"); }
}

function renderIncidents(incidents) {
  const container = document.getElementById("incidentsList");
  if (incidents.length === 0) { container.innerHTML = '<p class="empty-message">Aucun incident trouvé.</p>'; return; }

  container.innerHTML = incidents.map(i =>
    '<div class="property-card">' +
      '<div class="property-status ' + (i.statut === "resolu" ? "disponible" : "loue") + '">' + i.statut + '</div>' +
      '<h3>' + i.property_titre + '</h3>' +
      '<p class="property-address">👤 ' + i.locataire_nom + ' — ' + (i.locataire_tel || "—") + '</p>' +
      '<p class="property-desc">' + i.description + '</p>' +
      (i.photo ? '<img src="' + i.photo + '" alt="photo" style="width:100%;border-radius:8px;margin:12px 0;max-height:200px;object-fit:cover;">' : '') +
      '<p class="property-charges">Signalé le : ' + new Date(i.date_creation).toLocaleDateString("fr-FR") + '</p>' +
      '<select onchange="updateIncidentStatus(' + i.id + ', this.value)" class="search-input" style="width:100%;margin-top:10px;">' +
        '<option value="ouvert" ' + (i.statut === "ouvert" ? "selected" : "") + '>Ouvert</option>' +
        '<option value="en_cours" ' + (i.statut === "en_cours" ? "selected" : "") + '>En cours</option>' +
        '<option value="resolu" ' + (i.statut === "resolu" ? "selected" : "") + '>Résolu</option>' +
      '</select>' +
    '</div>'
  ).join("");
}

// ============================================
// 4. ACTIONS
// ============================================
function openPropertyModal() { document.getElementById("propertyModal").style.display = "flex"; }
function closePropertyModal() { document.getElementById("propertyModal").style.display = "none"; }

document.getElementById("propertyForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = {
    titre: document.getElementById("titre").value,
    adresse: document.getElementById("adresse").value,
    ville: document.getElementById("ville").value,
    loyer: parseFloat(document.getElementById("loyer").value),
    charges: parseFloat(document.getElementById("charges").value) || 0,
    description: document.getElementById("description").value
  };

  try {
    const response = await fetch(API_URL + "/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify(body)
    });
    const data = await response.json();

    if (response.ok) {
      const photoInput = document.getElementById("photos");
      if (photoInput && photoInput.files.length > 0) await uploadPhotos(data.propertyId, photoInput.files);
      showToast("Logement créé !", "success");
      document.getElementById("propertyForm").reset();
      closePropertyModal();
      loadProperties();
    } else showToast(data.message, "error");
  } catch (err) { showToast("Erreur serveur", "error"); }
});

async function uploadPhotos(propertyId, files) {
  if (!files || files.length === 0) return;
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) formData.append("photos", files[i]);

  try {
    const r = await fetch(API_URL + "/properties/" + propertyId + "/photos", {
      method: "POST",
      headers: { "Authorization": "Bearer " + token },
      body: formData
    });
    if (r.ok) loadProperties();
  } catch (err) { showToast("Erreur upload", "error"); }
}

function openContractModal() {
  const select = document.getElementById("contractProperty");
  select.innerHTML = '<option value="">-- Choisir --</option>';
  globalData.properties.filter(p => p.statut === "disponible").forEach(p => {
    select.innerHTML += '<option value="' + p.id + '" data-loyer="' + p.loyer + '">' + p.titre + ' — ' + p.adresse + '</option>';
  });
  select.onchange = () => {
    const opt = select.options[select.selectedIndex];
    if (opt && opt.dataset.loyer) document.getElementById("contractMontant").value = opt.dataset.loyer;
  };
  document.getElementById("contractModal").style.display = "flex";
}
function closeContractModal() { document.getElementById("contractModal").style.display = "none"; }

document.getElementById("contractForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = {
    property_id: parseInt(document.getElementById("contractProperty").value),
    locataire_email: document.getElementById("contractLocataire").value,
    locataire_nom: document.getElementById("contractLocataireNom").value || null,
    locataire_telephone: document.getElementById("contractLocataireTel").value || null,
    date_debut: document.getElementById("contractDebut").value,
    date_fin: document.getElementById("contractFin").value || null,
    montant_loyer: parseFloat(document.getElementById("contractMontant").value),
    clauses_personnalisees: document.getElementById("contractClauses").value || null
  };

  try {
    const response = await fetch(API_URL + "/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify(body)
    });
    const data = await response.json();

    if (response.ok) {
      showToast("Contrat créé !", "success");
      document.getElementById("contractForm").reset();
      closeContractModal();
      if (data.mot_de_passe_temporaire) {
        currentPassword = data.mot_de_passe_temporaire;
        document.getElementById("passwordDisplay").textContent = data.mot_de_passe_temporaire;
        document.getElementById("passwordModal").style.display = "flex";
      }
      loadProperties(); loadContracts(); loadTenants();
      if (window.loadNotifications) window.loadNotifications();
    } else showToast(data.message, "error");
  } catch (err) { showToast("Erreur serveur", "error"); }
});

function closePasswordModal() {
  document.getElementById("passwordModal").style.display = "none";
  currentPassword = "";
}

function copyPassword() {
  if (!currentPassword) return;
  navigator.clipboard.writeText(currentPassword).then(() => showToast("Copié", "success")).catch(() => {
    const el = document.createElement("textarea");
    el.value = currentPassword;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    el.remove();
    showToast("Copié", "success");
  });
}

async function signContract(id) {
  if (!confirm("Confirmez-vous accepter ce contrat ?")) return;
  try {
    const r = await fetch(API_URL + "/contracts/" + id + "/signer", {
      method: "PUT",
      headers: { "Authorization": "Bearer " + token }
    });
    if (r.ok) {
      showToast("Contrat signé", "success");
      loadContracts(); loadProperties();
      if (window.loadNotifications) window.loadNotifications();
    }
  } catch (err) { console.error(err); }
}

function terminerContrat(id) {
  document.getElementById("terminateContractId").value = id;
  document.getElementById("terminateMotif").value = "";
  document.getElementById("terminateContractModal").style.display = "flex";
}

function closeTerminateModal() {
  document.getElementById("terminateContractModal").style.display = "none";
}

document.getElementById("terminateForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("terminateContractId").value;
  const motif = document.getElementById("terminateMotif").value;

  try {
    const r = await fetch(API_URL + "/contracts/" + id + "/terminer", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ motif: motif || "Non precise" })
    });
    if (r.ok) {
      showToast("Contrat terminé", "success");
      closeTerminateModal();
      loadContracts(); loadProperties(); loadTenants();
      if (window.loadNotifications) window.loadNotifications();
    } else {
      const data = await r.json();
      showToast(data.message, "error");
    }
  } catch (err) { showToast("Erreur", "error"); }
});

async function editClauses(contractId, clausesActuelles) {
  const nouvelles = prompt("Modifier les clauses du contrat :", clausesActuelles);
  if (nouvelles === null) return;

  try {
    const r = await fetch(API_URL + "/contracts/" + contractId + "/clauses", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ clauses_personnalisees: nouvelles })
    });
    const data = await r.json();
    if (r.ok) {
      showToast("Clauses mises à jour", "success");
      loadContracts();
    } else showToast(data.message, "error");
  } catch (err) { showToast("Erreur serveur", "error"); }
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

async function deleteTenant(id, nom) {
  if (!confirm("Supprimer " + nom + " ?")) return;
  try {
    const r = await fetch(API_URL + "/users/" + id, {
      method: "DELETE",
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await r.json();
    if (r.ok) { showToast("Supprimé", "success"); loadTenants(); }
    else showToast(data.message, "error");
  } catch (err) { showToast("Erreur", "error"); }
}

async function openDocsModal(locataireId, nom) {
  document.getElementById("docsModalTitle").textContent = "Documents de " + nom;
  document.getElementById("docsModalContent").innerHTML = '<p class="empty-message">Chargement...</p>';
  document.getElementById("docsModal").style.display = "flex";

  try {
    const response = await fetch(API_URL + "/documents/locataire/" + locataireId, {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await response.json();
    const container = document.getElementById("docsModalContent");

    if (!response.ok) { container.innerHTML = '<p class="empty-message">Erreur.</p>'; return; }
    if (data.documents.length === 0) { container.innerHTML = '<p class="empty-message">Aucun document.</p>'; return; }

    const labels = { cni: "🪪 CNI", passeport: "📕 Passeport", fiche_paie: "💼 Fiche de paie", autre: "📎 Autre" };

    container.innerHTML = data.documents.map(d =>
      '<div class="property-card">' +
        '<span class="contract-status ' + (d.statut === "valide" ? "actif" : "en_attente") + '">' + d.statut.replace("_", " ") + '</span>' +
        '<h3>' + (labels[d.type] || d.type) + '</h3>' +
        '<p class="property-charges">📄 ' + d.nom_fichier + '</p>' +
        (d.commentaire ? '<p class="property-desc">💬 ' + d.commentaire + '</p>' : '') +
        '<a href="' + d.chemin + '" target="_blank" class="btn-secondary btn-block" style="margin-top:12px; display:block; text-align:center; text-decoration:none;">👁️ Voir</a>' +
        '<div style="display:flex; gap:8px; margin-top:8px;">' +
          '<button class="btn-secondary btn-block" style="color:var(--success); border-color:var(--success);" onclick="updateDocStatut(' + d.id + ', \'valide\', ' + locataireId + ', \'' + nom + '\')">✅ Valider</button>' +
          '<button class="btn-secondary btn-block" style="color:var(--danger); border-color:var(--danger);" onclick="updateDocStatut(' + d.id + ', \'refuse\', ' + locataireId + ', \'' + nom + '\')">❌ Refuser</button>' +
        '</div>' +
      '</div>'
    ).join("");
  } catch (err) { document.getElementById("docsModalContent").innerHTML = '<p class="empty-message">Erreur.</p>'; }
}

function closeDocsModal() { document.getElementById("docsModal").style.display = "none"; }

async function updateDocStatut(docId, statut, locataireId, nom) {
  let commentaire = null;
  if (statut === "refuse") commentaire = prompt("Raison du refus (optionnel) :");

  try {
    const r = await fetch(API_URL + "/documents/" + docId + "/statut", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ statut: statut, commentaire: commentaire })
    });
    if (r.ok) { showToast("Statut mis à jour", "success"); openDocsModal(locataireId, nom); }
  } catch (err) { showToast("Erreur", "error"); }
}

async function exportCSV() {
  try {
    const response = await fetch(API_URL + "/payments/export-csv", {
      headers: { "Authorization": "Bearer " + token }
    });

    if (!response.ok) {
      const data = await response.json();
      showToast(data.message || "Erreur d'export", "error");
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "paiements-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    showToast("Fichier CSV téléchargé !", "success");
  } catch (err) {
    showToast("Erreur lors de l'export", "error");
  }
}

async function updateIncidentStatus(id, statut) {
  try {
    const r = await fetch(API_URL + "/incidents/" + id + "/statut", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ statut: statut })
    });
    if (r.ok) {
      showToast("Statut mis à jour", "success");
      loadIncidents();
      if (window.loadNotifications) window.loadNotifications();
    }
  } catch (err) { console.error(err); }
}

function openRappelModal(contractId, nom) {
  document.getElementById("rappelContractId").value = contractId;
  document.getElementById("rappelMessage").value = "Cher(e) " + nom + ", nous vous rappelons que votre loyer est en retard.";
  document.getElementById("rappelModal").style.display = "flex";
}
function closeRappelModal() { document.getElementById("rappelModal").style.display = "none"; }

document.getElementById("rappelForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = {
    contract_id: parseInt(document.getElementById("rappelContractId").value),
    message: document.getElementById("rappelMessage").value
  };
  try {
    const r = await fetch(API_URL + "/payments/rappel", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify(body)
    });
    if (r.ok) {
      showToast("Rappel envoyé", "success");
      closeRappelModal();
      loadDashboard();
      if (window.loadNotifications) window.loadNotifications();
    }
  } catch (err) { showToast("Erreur", "error"); }
});

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "index.html";
}

// INITIALISATION
loadDashboard();
loadProperties();
loadContracts();
loadTenants();
loadPayments();
loadIncidents();

// LANCEMENT DES GRAPHIQUES
if (typeof window.loadChartRevenus === "function") {
  setTimeout(() => {
    window.loadChartRevenus();
    window.loadChartRepartition();
  }, 500);
}