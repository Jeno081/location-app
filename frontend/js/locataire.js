// ============================================
// locataire.js — Espace locataire COMPLET
// ============================================

const API_URL = "/api";
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "null");

if (!token || !user) window.location.href = "login.html";
if (user && user.role !== "locataire") window.location.href = "bailleur.html";

document.getElementById("userName").textContent = `👤 ${user.nom}`;

let allProperties = [];
let myContracts = [];

// ============================================
// 1. Logements disponibles
// ============================================
async function loadProperties() {
  const container = document.getElementById("propertiesList");
  try {
    const response = await fetch(`${API_URL}/properties`);
    const data = await response.json();
    if (!response.ok) {
      container.innerHTML = `<p class="empty-message">Erreur : ${data.message}</p>`;
      return;
    }
    allProperties = data.properties;
    renderProperties(allProperties);
  } catch (err) {
    container.innerHTML = `<p class="empty-message">Impossible de contacter le serveur.</p>`;
  }
}

function renderProperties(properties) {
  const container = document.getElementById("propertiesList");
  if (properties.length === 0) {
    container.innerHTML = `<p class="empty-message">Aucun logement trouvé.</p>`;
    return;
  }
  container.innerHTML = properties.map(p => {
    const photos = p.photos ? JSON.parse(p.photos) : [];
    const photosHtml = photos.length > 0
      ? `<div class="property-photos">${photos.map(ph => `<img src="${ph}" alt="photo">`).join("")}</div>`
      : "";
    return `
      <div class="property-card">
        <div class="property-status ${p.statut}">${p.statut}</div>
        ${photosHtml}
        <h3>${p.titre}</h3>
        <p class="property-address">📍 ${p.adresse}${p.ville ? ", " + p.ville : ""}</p>
        <p class="property-price">${p.loyer} $ <small>/ mois</small></p>
        <p class="property-charges">Charges : ${p.charges} $</p>
        ${p.description ? `<p class="property-desc">${p.description}</p>` : ""}
        <p class="property-bailleur">👤 Bailleur : ${p.bailleur_nom || "—"}</p>
        <button class="btn-secondary btn-block" onclick="openIncidentModal(${p.id})">🔧 Signaler un problème</button>
      </div>
    `;
  }).join("");
}

// ============================================
// 2. Recherche
// ============================================
document.getElementById("searchInput").addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase().trim();
  const filtered = allProperties.filter(p =>
    p.titre.toLowerCase().includes(q) ||
    (p.ville || "").toLowerCase().includes(q) ||
    (p.adresse || "").toLowerCase().includes(q)
  );
  renderProperties(filtered);
});

// ============================================
// 3. Contrats
// ============================================
async function loadContracts() {
  const container = document.getElementById("contractsList");
  try {
    const response = await fetch(`${API_URL}/contracts/mes-locations`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await response.json();

    if (!response.ok) {
      container.innerHTML = `<p class="empty-message">Erreur : ${data.message}</p>`;
      return;
    }
    if (data.contracts.length === 0) {
      container.innerHTML = `<p class="empty-message">Vous n'avez aucun contrat pour l'instant.</p>`;
      return;
    }

    myContracts = data.contracts;

    container.innerHTML = myContracts.map(c => `
      <div class="property-card">
        <span class="contract-status ${c.statut}">${c.statut.replace('_', ' ')}</span>
        <h3>${c.property_titre}</h3>
        <p class="property-address">📍 ${c.property_adresse}${c.property_ville ? ', ' + c.property_ville : ''}</p>
        <p class="property-charges">👤 Bailleur : ${c.bailleur_nom} (${c.bailleur_email})</p>
        <p class="property-price">${c.montant_loyer} $ <small>/ mois</small></p>
        <p class="property-charges">Du ${c.date_debut} ${c.date_fin ? 'au ' + c.date_fin : '(durée indéterminée)'}</p>
        <p class="contract-signature ${c.signature_bailleur ? 'signed' : 'unsigned'}">
          ${c.signature_bailleur ? '✅ Signé par le bailleur' : '⏳ En attente du bailleur'}
        </p>
        <p class="contract-signature ${c.signature_locataire ? 'signed' : 'unsigned'}">
          ${c.signature_locataire ? '✅ Signé par vous' : '⏳ En attente de votre signature'}
        </p>
        ${!c.signature_locataire ? `<button class="btn-primary btn-block" style="margin-top:12px;" onclick="signContract(${c.id})">✍️ Signer</button>` : ''}
        <button class="btn-secondary btn-block" style="margin-top:8px;" onclick="downloadContractPDF(${c.id})">📄 Contrat PDF</button>
        ${c.statut === 'actif' ? `<button class="btn-primary btn-block" style="margin-top:8px;" onclick="openPaymentModal(${c.id}, ${c.montant_loyer})">💳 Payer le loyer</button>` : ''}
      </div>
    `).join("");
  } catch (err) {
    container.innerHTML = `<p class="empty-message">Erreur de chargement.</p>`;
  }
}

async function signContract(id) {
  if (!confirm("Confirmez-vous avoir lu et accepter ce contrat ?")) return;
  try {
    const response = await fetch(`${API_URL}/contracts/${id}/signer`, {
      method: "PUT",
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await response.json();
    if (response.ok) loadContracts();
    else alert(data.message);
  } catch (err) { console.error(err); }
}

async function downloadContractPDF(id) {
  try {
    const response = await fetch(`${API_URL}/contracts/${id}/pdf`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!response.ok) { alert("Erreur"); return; }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contrat-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) { alert("Erreur"); }
}

// ============================================
// 4. Paiements
// ============================================
function openPaymentModal(contractId, montant) {
  const select = document.getElementById("paymentContract");
  select.innerHTML = '<option value="">-- Choisir un contrat --</option>';
  myContracts.filter(c => c.statut === 'actif').forEach(c => {
    select.innerHTML += `<option value="${c.id}">${c.property_titre} — ${c.montant_loyer} $</option>`;
  });
  select.value = contractId;
  document.getElementById("paymentMontant").value = montant;
  document.getElementById("paymentModal").style.display = "flex";
}

function closePaymentModal() { document.getElementById("paymentModal").style.display = "none"; }

document.getElementById("paymentForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const messageDiv = document.getElementById("paymentMessage");

  const methode = document.querySelector('input[name="methode"]:checked').value;

  const body = {
    contract_id: parseInt(document.getElementById("paymentContract").value),
    mois: document.getElementById("paymentMois").value,
    montant: parseFloat(document.getElementById("paymentMontant").value),
    methode
  };

  try {
    const response = await fetch(`${API_URL}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });
    const data = await response.json();

    if (response.ok) {
      messageDiv.textContent = "✅ Paiement enregistré avec succès !";
      messageDiv.className = "message success";
      document.getElementById("paymentForm").reset();
      setTimeout(() => {
        closePaymentModal();
        messageDiv.className = "message";
        loadPayments();
      }, 1500);
    } else {
      messageDiv.textContent = "❌ " + data.message;
      messageDiv.className = "message error";
    }
  } catch (err) {
    messageDiv.textContent = "❌ Erreur serveur.";
    messageDiv.className = "message error";
  }
});

async function loadPayments() {
  const container = document.getElementById("paymentsList");
  try {
    const response = await fetch(`${API_URL}/payments/mes-paiements`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await response.json();

    if (!response.ok) {
      container.innerHTML = `<p class="empty-message">Erreur : ${data.message}</p>`;
      return;
    }
    if (data.payments.length === 0) {
      container.innerHTML = `<p class="empty-message">Aucun paiement pour l'instant.</p>`;
      return;
    }

    container.innerHTML = data.payments.map(p => `
      <div class="property-card">
        <span class="contract-status actif">${p.statut}</span>
        <h3>${p.property_titre}</h3>
        <p class="property-address">📍 ${p.property_adresse}</p>
        <p class="property-price">${p.montant} $</p>
        <p class="property-charges">Mois : ${p.mois}</p>
        <p class="property-charges">Méthode : ${p.methode}</p>
        <p class="property-charges">Payé le : ${new Date(p.date_paiement).toLocaleDateString('fr-FR')}</p>
        <button class="btn-secondary btn-block" style="margin-top:12px;" onclick="downloadReceiptPDF(${p.id})">🧾 Télécharger la quittance</button>
      </div>
    `).join("");
  } catch (err) {
    container.innerHTML = `<p class="empty-message">Erreur de chargement.</p>`;
  }
}

async function downloadReceiptPDF(id) {
  try {
    const response = await fetch(`${API_URL}/payments/${id}/quittance`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!response.ok) { alert("Erreur"); return; }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quittance-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) { alert("Erreur"); }
}

// ============================================
// 5. Incidents
// ============================================
function openIncidentModal(propertyId) {
  document.getElementById("incidentPropertyId").value = propertyId;
  document.getElementById("incidentModal").style.display = "flex";
}
function closeIncidentModal() { document.getElementById("incidentModal").style.display = "none"; }

document.getElementById("incidentForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const messageDiv = document.getElementById("incidentMessage");

  const body = {
    property_id: parseInt(document.getElementById("incidentPropertyId").value),
    description: document.getElementById("incidentDescription").value
  };

  try {
    const response = await fetch(`${API_URL}/incidents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });
    const data = await response.json();

    if (response.ok) {
      messageDiv.textContent = "✅ Signalement envoyé !";
      messageDiv.className = "message success";
      document.getElementById("incidentForm").reset();
      setTimeout(() => {
        closeIncidentModal();
        messageDiv.className = "message";
        loadMyIncidents();
      }, 1200);
    } else {
      messageDiv.textContent = "❌ " + data.message;
      messageDiv.className = "message error";
    }
  } catch (err) {
    messageDiv.textContent = "❌ Erreur serveur.";
    messageDiv.className = "message error";
  }
});

async function loadMyIncidents() {
  const container = document.getElementById("incidentsList");
  try {
    const response = await fetch(`${API_URL}/incidents/mes-incidents`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await response.json();

    if (!response.ok) {
      container.innerHTML = `<p class="empty-message">Erreur : ${data.message}</p>`;
      return;
    }
    if (data.incidents.length === 0) {
      container.innerHTML = `<p class="empty-message">Aucun signalement.</p>`;
      return;
    }

    container.innerHTML = data.incidents.map(i => `
      <div class="property-card">
        <div class="property-status ${i.statut === 'resolu' ? 'disponible' : 'loue'}">${i.statut}</div>
        <h3>${i.property_titre}</h3>
        <p class="property-address">📍 ${i.property_adresse}</p>
        <p class="property-desc">${i.description}</p>
        <p class="property-charges">Signalé le : ${new Date(i.date_creation).toLocaleDateString('fr-FR')}</p>
      </div>
    `).join("");
  } catch (err) {
    container.innerHTML = `<p class="empty-message">Erreur.</p>`;
  }
}

// ============================================
// 6. Déconnexion
// ============================================
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "index.html";
}

// --- Chargement ---
loadProperties();
loadContracts();
loadPayments();
loadMyIncidents();