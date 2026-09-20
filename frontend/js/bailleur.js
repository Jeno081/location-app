// ============================================
// bailleur.js — Logique de l'espace bailleur
// ============================================

const API_URL = "/api";

// --- 1. Vérifier que l'utilisateur est bien connecté et bailleur ---
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "null");

if (!token || !user) {
  window.location.href = "login.html";
}

if (user && user.role !== "bailleur") {
  window.location.href = "locataire.html";
}

// Afficher le nom de l'utilisateur
document.getElementById("userName").textContent = `👤 ${user.nom}`;

// ============================================
// 2. Charger les logements du bailleur
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

    // Mise à jour des statistiques
    const props = data.properties;
    document.getElementById("statTotal").textContent = props.length;
    document.getElementById("statDispo").textContent = props.filter(p => p.statut === "disponible").length;
    document.getElementById("statLoyer").textContent =
      props.reduce((sum, p) => sum + (p.loyer || 0), 0) + " $";

    // Affichage
    if (props.length === 0) {
      container.innerHTML = `<p class="empty-message">Vous n'avez encore aucun logement. Cliquez sur "+ Ajouter un logement" pour commencer.</p>`;
      return;
    }

    container.innerHTML = props.map(p => `
      <div class="property-card">
        <div class="property-status ${p.statut}">${p.statut}</div>
        <h3>${p.titre}</h3>
        <p class="property-address">📍 ${p.adresse}${p.ville ? ", " + p.ville : ""}</p>
        <p class="property-price">${p.loyer} $ <small>/ mois</small></p>
        <p class="property-charges">Charges : ${p.charges} $</p>
        ${p.description ? `<p class="property-desc">${p.description}</p>` : ""}
      </div>
    `).join("");

  } catch (err) {
    container.innerHTML = `<p class="empty-message">Impossible de contacter le serveur.</p>`;
    console.error(err);
  }
}

// ============================================
// 3. Ouvrir / fermer la modale
// ============================================
function openPropertyModal() {
  document.getElementById("propertyModal").style.display = "flex";
}

function closePropertyModal() {
  document.getElementById("propertyModal").style.display = "none";
}

// ============================================
// 4. Créer un nouveau logement
// ============================================
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
      messageDiv.textContent = "✅ Logement créé avec succès !";
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
// 5. Déconnexion
// ============================================
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "index.html";
}

// --- Chargement initial ---
loadProperties();

// ============================================
// 6. Charger les incidents reçus
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
      container.innerHTML = `<p class="empty-message">Aucun incident signalé pour l'instant.</p>`;
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
    container.innerHTML = `<p class="empty-message">Erreur de chargement.</p>`;
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

    if (response.ok) {
      loadIncidents();
    }
  } catch (err) {
    console.error(err);
  }
}

// --- Charger les incidents au démarrage ---
loadIncidents();