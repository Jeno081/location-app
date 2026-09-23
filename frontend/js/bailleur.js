// ============================================
// bailleur.js — Espace bailleur COMPLET
// ============================================

const API_URL = "/api";
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "null");

if (!token || !user) window.location.href = "login.html";
if (user && user.role !== "bailleur") window.location.href = "locataire.html";

document.getElementById("userName").textContent = `👤 ${user.nom}`;

let myProperties = [];

// ============================================
// 1. Logements
// ============================================
async function loadProperties() {
  const container = document.getElementById("propertiesList");
  try {
    const response = await fetch(`${API_URL}/properties/mes-logements/liste`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await response.json();

    if (!response.ok) {
      container.innerHTML = `<p class="empty-message">Erreur : ${data.message}</p>`;
      return;
    }

    myProperties = data.properties;
    document.getElementById("statTotal").textContent = myProperties.length;
    document.getElementById("statDispo").textContent = myProperties.filter(p => p.statut === "disponible").length;
    document.getElementById("statLoyer").textContent =
      myProperties.reduce((sum, p) => sum + (p.loyer || 0), 0) + " $";

    if (myProperties.length === 0) {
      container.innerHTML = `<p class="empty-message">Aucun logement pour l'instant.</p>`;
      return;
    }

    container.innerHTML = myProperties.map(p => {
      const photos = p.photos ? JSON.parse(p.photos) : [];
      const photosHtml = photos.length > 0
        ? `<div class="property-photos">${photos.map(ph => `<img src="${ph}" alt="photo">`).join("")}</div>`
        : `<div class="property-no-photo">📷 Aucune photo</div>`;

      return `
        <div class="property-card">
          <div class="property-status ${p.statut}">${p.statut}</div>
          ${photosHtml}
          <h3>${p.titre}</h3>
          <p class="property-address">📍 ${p.adresse}${p.ville ? ", " + p.ville : ""}</p>
          <p class="property-price">${p.loyer} $ <small>/ mois</small></p>
          <p class="property-charges">Charges : ${p.charges} $</p>
          ${p.description ? `<p class="property-desc">${p.description}</p>` : ""}
          <label for="photos-${p.id}" class="btn-secondary" style="display:block;margin-top:12px;text-align:center;cursor:pointer;">
            📷 Ajouter des photos
          </label>
          <input type="file" id="photos-${p.id}" accept="image/*" multiple style="display:none;"
                 onchange="uploadPhotos(${p.id}, this.files)">
        </div>
      `;
    }).join("");
  } catch (err) {
    container.innerHTML = `<p class="empty-message">Erreur serveur.</p>`;
  }
}

// ============================================
// 2. Modale logement
// ============================================
function openPropertyModal() { document.getElementById("propertyModal").style.display = "flex"; }
function closePropertyModal() { document.getElementById("propertyModal").style.display = "none"; }

document.getElementById("propertyForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const messageDiv = document.getElementById("propertyMessage");

  const body = {
    titre: document.getElementById("titre").value,
    adresse: document.getElementById("adresse").value,
    ville: document.getElementById("ville").value,
    loyer: parseFloat(document.getElementById("loyer").value),
    charges: parseFloat(document.getElementById("charges").value) || 0,
    description: document.getElementById("description").value
  };

  try {
    const response = await fetch(`${API_URL}/properties`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });
    const data = await response.json();

    if (response.ok) {
      const photoInput = document.getElementById("photos");
      if (photoInput && photoInput.files.length > 0) {
        await uploadPhotos(data.propertyId, photoInput.files);
      }
      messageDiv.textContent = "✅ Logement créé !";
      messageDiv.className = "message success";
      document.getElementById("propertyForm").reset();
      setTimeout(() => {
        closePropertyModal();
        messageDiv.className = "message";
        loadProperties();
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

// ============================================
// 3. Upload photos
// ============================================
async function uploadPhotos(propertyId, files) {
  if (!files || files.length === 0) return;
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) formData.append("photos", files[i]);

  try {
    const response = await fetch(`${API_URL}/properties/${propertyId}/photos`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
      body: formData
    });
    if (response.ok) loadProperties();
  } catch (err) { alert("Erreur upload"); }
}

// ============================================
// 4. Contrats
// ============================================
function openContractModal() {
  const select = document.getElementById("contractProperty");
  select.innerHTML = '<option value="">-- Choisir --</option>';
  myProperties.forEach(p => {
    select.innerHTML += `<option value="${p.id}" data-loyer="${p.loyer}">${p.titre} — ${p.adresse}</option>`;
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
  const messageDiv = document.getElementById("contractMessage");

  const body = {
    property_id: parseInt(document.getElementById("contractProperty").value),
    locataire_email: document.getElementById("contractLocataire").value,
    date_debut: document.getElementById("contractDebut").value,
    date_fin: document.getElementById("contractFin").value || null,
    montant_loyer: parseFloat(document.getElementById("contractMontant").value)
  };

  try {
    const response = await fetch(`${API_URL}/contracts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });
    const data = await response.json();

    if (response.ok) {
      messageDiv.textContent = "✅ Contrat créé !";
      messageDiv.className = "message success";
      document.getElementById("contractForm").reset();
      setTimeout(() => {
        closeContractModal();
        messageDiv.className = "message";
        loadContracts();
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

async function loadContracts() {
  const container = document.getElementById("contractsList");
  try {
    const response = await fetch(`${API_URL}/contracts/mes-contrats`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await response.json();

    if (!response.ok) {
      container.innerHTML = `<p class="empty-message">Erreur : ${data.message}</p>`;
      return;
    }
    if (data.contracts.length === 0) {
      container.innerHTML = `<p class="empty-message">Aucun contrat.</p>`;
      return;
    }

    container.innerHTML = data.contracts.map(c => `
      <div class="property-card">
        <span class="contract-status ${c.statut}">${c.statut.replace('_', ' ')}</span>
        <h3>${c.property_titre}</h3>
        <p class="property-address">📍 ${c.property_adresse}</p>
        <p class="property-charges">👤 ${c.locataire_nom} (${c.locataire_email})</p>
        <p class="property-price">${c.montant_loyer} $ <small>/ mois</small></p>
        <p class="property-charges">Du ${c.date_debut} ${c.date_fin ? 'au ' + c.date_fin : ''}</p>
        <p class="contract-signature ${c.signature_bailleur ? 'signed' : 'unsigned'}">
          ${c.signature_bailleur ? '✅ Signé par vous' : '⏳ En attente de votre signature'}
        </p>
        <p class="contract-signature ${c.signature_locataire ? 'signed' : 'unsigned'}">
          ${c.signature_locataire ? '✅ Signé par le locataire' : '⏳ En attente du locataire'}
        </p>
        ${!c.signature_bailleur ? `<button class="btn-primary btn-block" style="margin-top:12px;" onclick="signContract(${c.id})">✍️ Signer</button>` : ''}
        <button class="btn-secondary btn-block" style="margin-top:8px;" onclick="downloadContractPDF(${c.id})">📄 Contrat PDF</button>
      </div>
    `).join("");
  } catch (err) {
    container.innerHTML = `<p class="empty-message">Erreur.</p>`;
  }
}

async function signContract(id) {
  if (!confirm("Confirmez-vous accepter ce contrat ?")) return;
  try {
    const response = await fetch(`${API_URL}/contracts/${id}/signer`, {
      method: "PUT",
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (response.ok) loadContracts();
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
// 5. Paiements reçus
// ============================================
async function loadPayments() {
  const container = document.getElementById("paymentsList");
  try {
    const response = await fetch(`${API_URL}/payments/recus`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await response.json();

    if (!response.ok) {
      container.innerHTML = `<p class="empty-message">Erreur : ${data.message}</p>`;
      return;
    }
    if (data.payments.length === 0) {
      container.innerHTML = `<p class="empty-message">Aucun paiement reçu.</p>`;
      return;
    }

    // Calcul du total encaissé
    const total = data.payments.reduce((s, p) => s + p.montant, 0);
    document.getElementById("statEncaisse").textContent = total + " $";

    container.innerHTML = data.payments.map(p => `
      <div class="property-card">
        <span class="contract-status actif">${p.statut}</span>
        <h3>${p.property_titre}</h3>
        <p class="property-address">📍 ${p.property_adresse}</p>
        <p class="property-charges">👤 ${p.locataire_nom} (${p.locataire_email})</p>
        <p class="property-price">${p.montant} $</p>
        <p class="property-charges">Mois : ${p.mois}</p>
        <p class="property-charges">Méthode : ${p.methode}</p>
        <p class="property-charges">Payé le : ${new Date(p.date_paiement).toLocaleDateString('fr-FR')}</p>
        <button class="btn-secondary btn-block" style="margin-top:12px;" onclick="downloadReceiptPDF(${p.id})">🧾 Quittance PDF</button>
      </div>
    `).join("");
  } catch (err) {
    container.innerHTML = `<p class="empty-message">Erreur.</p>`;
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
// 6. Incidents
// ============================================
async function loadIncidents() {
  const container = document.getElementById("incidentsList");
  try {
    const response = await fetch(`${API_URL}/incidents/recus`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await response.json();

    if (!response.ok) {
      container.innerHTML = `<p class="empty-message">Erreur : ${data.message}</p>`;
      return;
    }
    if (data.incidents.length === 0) {
      container.innerHTML = `<p class="empty-message">Aucun incident.</p>`;
      return;
    }

    container.innerHTML = data.incidents.map(i => `
      <div class="property-card">
        <div class="property-status ${i.statut === 'resolu' ? 'disponible' : 'loue'}">${i.statut}</div>
        <h3>${i.property_titre}</h3>
        <p class="property-address">👤 ${i.locataire_nom} — ${i.locataire_tel || "—"}</p>
        <p class="property-desc">${i.description}</p>
        <p class="property-charges">Signalé le : ${new Date(i.date_creation).toLocaleDateString('fr-FR')}</p>
        <select onchange="updateIncidentStatus(${i.id}, this.value)" class="search-input" style="width:100%;margin-top:10px;">
          <option value="ouvert" ${i.statut === 'ouvert' ? 'selected' : ''}>Ouvert</option>
          <option value="en_cours" ${i.statut === 'en_cours' ? 'selected' : ''}>En cours</option>
          <option value="resolu" ${i.statut === 'resolu' ? 'selected' : ''}>Résolu</option>
        </select>
      </div>
    `).join("");
  } catch (err) {
    container.innerHTML = `<p class="empty-message">Erreur.</p>`;
  }
}

async function updateIncidentStatus(id, statut) {
  try {
    const response = await fetch(`${API_URL}/incidents/${id}/statut`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ statut })
    });
    if (response.ok) loadIncidents();
  } catch (err) { console.error(err); }
}

// ============================================
// 7. Déconnexion
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
loadIncidents();