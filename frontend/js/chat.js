// ============================================
// chat.js — Annonces et messagerie (bailleur + locataire)
// ============================================

let activeConversationId = null;

/* ---------- Annonces ---------- */

function preparerSelectionAnnonce() {
  const conteneur = document.getElementById("annSelection");
  if (!conteneur) return;

  const uniques = new Map();
  (globalData.tenants || []).forEach((t) => {
    if (t && t.id && !uniques.has(Number(t.id))) uniques.set(Number(t.id), t.nom);
  });

  if (uniques.size === 0) {
    conteneur.innerHTML = '<p class="form-hint">Aucun locataire lié à un contrat pour le moment.</p>';
    return;
  }

  conteneur.innerHTML = [...uniques.entries()].map(([id, nom]) => `
    <label class="month-option">
      <input type="checkbox" value="${id}">
      <span>${escapeHtml(nom)}</span>
    </label>`).join("");
}

async function loadAnnouncements() {
  const conteneur = document.getElementById("announcementsList");
  if (!conteneur) return;

  try {
    const response = await fetch(`${API_URL}/announcements`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (!response.ok) return;

    if (!data.announcements || data.announcements.length === 0) {
      conteneur.innerHTML = `<div class="empty-state"><i data-lucide="megaphone"></i><h3>Aucune annonce</h3><p>${user.role === "bailleur" ? "Envoyez votre première information." : "Votre bailleur n'a rien publié pour l'instant."}</p></div>`;
      if (typeof lucide !== "undefined") lucide.createIcons();
      return;
    }

    conteneur.innerHTML = data.announcements.map((a) => {
      const destinataires = Array.isArray(a.destinataires) ? a.destinataires.join(", ") : "";
      return `<article class="property-card card">
        <div class="card-top">
          <span class="badge badge-info">Annonce</span>
          <span class="card-id">${formatDate(a.date_creation)}</span>
        </div>
        <h3 class="card-title">${escapeHtml(a.titre)}</h3>
        <p class="card-desc" data-no-i18n>${escapeHtml(a.message)}</p>
        <p class="card-note">${user.role === "bailleur"
          ? `Destinataires : ${escapeHtml(destinataires || "Tous les locataires")}`
          : `Par ${escapeHtml(a.bailleur_nom || "votre bailleur")}`}</p>
      </article>`;
    }).join("");
    if (typeof lucide !== "undefined") lucide.createIcons();
  } catch (err) {
    conteneur.innerHTML = '<p class="empty-message">Impossible de charger les annonces.</p>';
  }
}

async function envoyerAnnonce(event) {
  event.preventDefault();
  const titre = document.getElementById("annTitre").value.trim();
  const message = document.getElementById("annMessage").value.trim();
  const audience = document.getElementById("annAudience").value;
  const locataire_ids = [...document.querySelectorAll("#annSelection input:checked")].map((input) => Number(input.value));

  if (!titre || !message) { showToast("Titre et message obligatoires.", "error"); return; }
  if (audience === "selection" && locataire_ids.length === 0) {
    showToast("Sélectionnez au moins un locataire.", "error");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/announcements`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ titre, message, audience, locataire_ids })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { showToast(data.message || "Envoi impossible", "error"); return; }

    showToast(data.message || "Annonce envoyée", "success");
    document.getElementById("announcementForm").reset();
    document.getElementById("annSelection").style.display = "none";
    loadAnnouncements();
  } catch (err) { showToast("Erreur serveur", "error"); }
}

/* ---------- Messagerie ---------- */

function heureCourte(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString(typeof localeCourante === "function" ? localeCourante() : "fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function libelleStatut(statut) {
  if (statut === "traite") return "Traitée";
  if (statut === "refuse") return "Refusée";
  return "Ouverte";
}

async function loadConversations() {
  const conteneur = document.getElementById("conversationsList");
  if (!conteneur) return;

  try {
    const response = await fetch(`${API_URL}/conversations`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (!response.ok) return;

    globalData.conversations = data.conversations || [];
    if (globalData.conversations.length === 0) {
      conteneur.innerHTML = `<div class="chat-empty">${user.role === "bailleur"
        ? "Aucune demande reçue pour l'instant."
        : "Aucune demande. Utilisez « Nouvelle demande »."}</div>`;
      return;
    }

    conteneur.innerHTML = globalData.conversations.map((c) => {
      const autre = user.role === "bailleur" ? c.locataire_nom : c.bailleur_nom;
      const nonLus = Number(c.non_lus) || 0;
      return `<button type="button" class="chat-item ${Number(activeConversationId) === Number(c.id) ? "active" : ""}" onclick="openConversation(${c.id})">
        <div class="chat-item-head">
          <span class="chat-item-title">${escapeHtml(c.sujet)}</span>
          ${nonLus > 0 ? `<span class="chat-unread">${nonLus}</span>` : ""}
        </div>
        <div class="chat-item-meta">${escapeHtml(autre || "")} · ${formatDate(c.date_maj)}</div>
        <div class="chat-item-meta">${escapeHtml((c.dernier_message || "").slice(0, 70))}</div>
      </button>`;
    }).join("");
  } catch (err) {
    conteneur.innerHTML = '<div class="chat-empty">Impossible de charger les conversations.</div>';
  }
}

async function openConversation(id) {
  const panel = document.getElementById("chatPanel");
  if (!panel) return;
  activeConversationId = Number(id);

  try {
    const response = await fetch(`${API_URL}/conversations/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (!response.ok) { showToast(data.message || "Conversation introuvable", "error"); return; }

    const conversation = data.conversation;
    const messages = data.messages || [];
    const peutGerer = user.role === "bailleur";

    panel.innerHTML = `
      <div class="chat-head">
        <div style="min-width:0;">
          <h3>${escapeHtml(conversation.sujet)}</h3>
          <small>
            ${escapeHtml(user.role === "bailleur" ? conversation.locataire_nom : conversation.bailleur_nom)}
            · <span class="badge badge-${conversation.statut === "traite" ? "success" : conversation.statut === "refuse" ? "danger" : "warning"}">${libelleStatut(conversation.statut)}</span>
          </small>
        </div>
        ${peutGerer ? `<div class="chat-status-actions">
          ${conversation.statut !== "traite" ? `<button class="btn-secondary btn-sm" onclick="changerStatutConversation('traite')"><i data-lucide="check"></i> Traitée</button>` : ""}
          ${conversation.statut !== "refuse" ? `<button class="btn-ghost btn-sm danger-text" onclick="changerStatutConversation('refuse')"><i data-lucide="x"></i> Refuser</button>` : ""}
          ${conversation.statut !== "ouvert" ? `<button class="btn-ghost btn-sm" onclick="changerStatutConversation('ouvert')">Rouvrir</button>` : ""}
        </div>` : ""}
      </div>
      <div class="chat-bubbles" id="chatBubbles"></div>
      <form class="chat-form" onsubmit="envoyerMessageChat(event)">
        <textarea id="chatInput" rows="1" maxlength="5000" placeholder="Écrire un message…" required></textarea>
        <button class="btn-primary btn-sm" type="submit" aria-label="Envoyer"><i data-lucide="send"></i></button>
      </form>
    `;

    const bulles = document.getElementById("chatBubbles");
    bulles.innerHTML = messages.map((m) => {
      const moi = Number(m.sender_id) === Number(user.id);
      return `<div class="chat-bubble ${moi ? "me" : "them"}" data-no-i18n>
        ${escapeHtml(m.contenu)}
        <div class="chat-time">${escapeHtml(m.sender_nom || "")} · ${formatDate(m.date_envoi)} ${heureCourte(m.date_envoi)}</div>
      </div>`;
    }).join("");
    bulles.scrollTop = bulles.scrollHeight;

    if (typeof lucide !== "undefined") lucide.createIcons();
    loadConversations();
    if (window.loadNotifications) window.loadNotifications();
  } catch (err) {
    showToast("Erreur serveur", "error");
  }
}

async function envoyerMessageChat(event) {
  event.preventDefault();
  const input = document.getElementById("chatInput");
  const contenu = input ? input.value.trim() : "";
  if (!contenu || !activeConversationId) return;

  try {
    const response = await fetch(`${API_URL}/conversations/${activeConversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ contenu })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { showToast(data.message || "Message non envoyé", "error"); return; }
    input.value = "";
    openConversation(activeConversationId);
  } catch (err) { showToast("Erreur serveur", "error"); }
}

async function changerStatutConversation(statut) {
  if (!activeConversationId) return;
  try {
    const response = await fetch(`${API_URL}/conversations/${activeConversationId}/statut`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ statut })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { showToast(data.message || "Impossible de changer le statut", "error"); return; }
    showToast(`Demande marquée : ${libelleStatut(statut)}`, "success");
    openConversation(activeConversationId);
  } catch (err) { showToast("Erreur serveur", "error"); }
}

/* ---------- Nouvelle demande (locataire) ---------- */

function openNewRequestModal() {
  const form = document.getElementById("newRequestForm");
  if (form) form.reset();
  const erreur = document.getElementById("requestFormError");
  if (erreur) { erreur.textContent = ""; erreur.style.display = "none"; }
  const modal = document.getElementById("newRequestModal");
  if (modal) modal.style.display = "flex";
}

function closeNewRequestModal() {
  const modal = document.getElementById("newRequestModal");
  if (modal) modal.style.display = "none";
}

async function envoyerNouvelleDemande(event) {
  event.preventDefault();
  const sujet = document.getElementById("requestSujet").value.trim();
  const message = document.getElementById("requestMessage").value.trim();
  const erreur = document.getElementById("requestFormError");

  if (!sujet || !message) {
    erreur.textContent = "Le sujet et le message sont obligatoires.";
    erreur.style.display = "block";
    return;
  }
  erreur.style.display = "none";

  try {
    const response = await fetch(`${API_URL}/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ sujet, message })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      erreur.textContent = data.message || "Envoi impossible.";
      erreur.style.display = "block";
      return;
    }
    closeNewRequestModal();
    showToast("Demande envoyée", "success");
    await loadConversations();
    if (data.conversationId) openConversation(data.conversationId);
  } catch (err) {
    erreur.textContent = "Erreur serveur. Réessayez.";
    erreur.style.display = "block";
  }
}

/* ---------- Initialisation ---------- */

document.addEventListener("DOMContentLoaded", () => {
  const formAnnonce = document.getElementById("announcementForm");
  if (formAnnonce) formAnnonce.addEventListener("submit", envoyerAnnonce);

  const audience = document.getElementById("annAudience");
  if (audience) {
    audience.addEventListener("change", () => {
      const selection = document.getElementById("annSelection");
      if (selection) selection.style.display = audience.value === "selection" ? "grid" : "none";
    });
  }

  const formDemande = document.getElementById("newRequestForm");
  if (formDemande) formDemande.addEventListener("submit", envoyerNouvelleDemande);
});
