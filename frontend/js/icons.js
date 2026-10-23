// ============================================
// icons.js — Traducteur automatique emoji → Lucide
// ============================================

// Correspondance emoji → nom d'icône Lucide
const EMOJI_TO_LUCIDE = {
  "🏠": "home",
  "🔑": "key",
  "📄": "file-text",
  "💳": "credit-card",
  "🔧": "wrench",
  "👤": "user",
  "🕓": "history",
  "🏘️": "building-2",
  "🪪": "id-card",
  "🚪": "log-out",
  "🔔": "bell",
  "📊": "bar-chart-3",
  "📅": "calendar",
  "👥": "users",
  "✅": "check-circle",
  "⚠️": "alert-triangle",
  "❌": "x-circle",
  "💰": "wallet",
  "⏰": "clock",
  "📷": "camera",
  "🗑️": "trash-2",
  "👁️": "eye",
  "✏️": "edit-3",
  "🔚": "log-out",
  "🎓": "graduation-cap",
  "⭐": "star",
  "💬": "message-circle",
  "📌": "pin",
  "📝": "file-edit",
  "➕": "plus",
  "🔍": "search",
  "☰": "menu",
  "→": "arrow-right",
  "←": "arrow-left",
  "🚀": "rocket",
  "🎉": "party-popper",
  "ℹ️": "info",
  "🖼️": "image",
  "🔒": "lock",
  "🚨": "alert-octagon",
  "🕵️": "search",
  "🥧": "pie-chart",
  "📈": "trending-up",
  "📉": "trending-down",
  "🏦": "building-2",
  "📍": "map-pin",
  "✉️": "mail",
  "📞": "phone",
  "🌙": "moon",
  "☀️": "sun",
  "🔗": "link",
  "🔐": "shield-check",
  "⏳": "hourglass",
  "⚡": "zap",
  "🎯": "target",
  "💡": "lightbulb",
  "🎨": "palette",
  "🔨": "hammer",
  "📦": "package",
  "🧾": "receipt",
  "💼": "briefcase",
  "📕": "book",
  "📎": "paperclip",
  "👋": "hand",
  "🏷️": "tag",
  "🎁": "gift",
  "💵": "banknote",
  "🚧": "construction",
  "🚗": "car",
  "❓": "help-circle",
  "🔄": "refresh-cw"
};

// ============================================
// Remplacer les emojis dans un conteneur
// ============================================
function replaceEmojisWithIcons(container) {
  if (!container || !container.childNodes) return;

  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  const textNodes = [];
  let node;
  while (node = walker.nextNode()) {
    const parent = node.parentElement;
    if (parent && (parent.tagName === "SCRIPT" || parent.tagName === "STYLE" || parent.tagName === "TEXTAREA" || parent.tagName === "CODE")) {
      continue;
    }
    textNodes.push(node);
  }

  textNodes.forEach(textNode => {
    const text = textNode.textContent;
    let newHTML = text;
    let changed = false;

    Object.keys(EMOJI_TO_LUCIDE).forEach(emoji => {
      if (newHTML.includes(emoji)) {
        const icon = `<i data-lucide="${EMOJI_TO_LUCIDE[emoji]}" style="display:inline-block;vertical-align:middle;margin:0 3px;"></i>`;
        newHTML = newHTML.split(emoji).join(icon);
        changed = true;
      }
    });

    if (changed) {
      const span = document.createElement("span");
      span.innerHTML = newHTML;
      textNode.parentNode.replaceChild(span, textNode);
    }
  });

  // Créer les icônes Lucide dans tout le conteneur
  if (typeof lucide !== "undefined") {
    try {
      lucide.createIcons();
    } catch (e) {}
  }
}

// ============================================
// MUTATION OBSERVER — Surveille les changements
// ============================================
function startIconObserver() {
  if (typeof lucide === "undefined") {
    setTimeout(startIconObserver, 300);
    return;
  }

  // Observer tout le body
  const observer = new MutationObserver((mutations) => {
    let needsUpdate = false;

    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) { // Element
          // Vérifier si le nœud contient un emoji
          const html = node.outerHTML || "";
          const hasEmoji = Object.keys(EMOJI_TO_LUCIDE).some(emoji => html.includes(emoji));
          if (hasEmoji) {
            needsUpdate = true;
            // Remplacer dans ce nœud précis
            replaceEmojisWithIcons(node);
          }
        }
      });
    });

    // Re-créer les icônes Lucide dans tout le document si nécessaire
    if (needsUpdate && typeof lucide !== "undefined") {
      try {
        lucide.createIcons();
      } catch (e) {}
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Première passe sur tout le contenu existant
  setTimeout(() => {
    replaceEmojisWithIcons(document.body);
    if (typeof lucide !== "undefined") {
      try { lucide.createIcons(); } catch (e) {}
    }
  }, 500);
}

// ============================================
// INITIALISATION
// ============================================
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(startIconObserver, 300);
});

// Exposer globalement
window.replaceEmojisWithIcons = replaceEmojisWithIcons;
window.refreshIcons = function() {
  if (typeof lucide !== "undefined") {
    try { lucide.createIcons(); } catch (e) {}
  }
};
