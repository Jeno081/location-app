# Notifications push — Firebase Cloud Messaging

Location App envoie des notifications Web Push via Firebase Cloud Messaging (FCM) :

- nouveau message ou nouvelle demande ;
- nouvelle annonce ;
- nouveau signalement ;
- paiement déclaré, validé ou refusé ;
- document envoyé par un locataire, validé ou refusé ;
- contrat signé ;
- demande de réinitialisation de mot de passe.

Le Service Worker reçoit les messages même lorsque l'application est fermée. Sur iPhone, l'application doit être installée sur l'écran d'accueil (iOS 16.4+).

## 1. Créer le projet Firebase

1. Ouvrir <https://console.firebase.google.com>.
2. **Ajouter un projet** (ex. `location-app`), désactiver Analytics si inutile.
3. Dans le projet : **Ajouter une application → Web**.
4. Copier les valeurs de `firebaseConfig`.
5. **Paramètres du projet → Cloud Messaging → Certificats Web Push** :
   - générer une paire de clés ;
   - copier la **clé publique VAPID**.
6. **Paramètres du projet → Comptes de service → Générer une nouvelle clé privée** :
   - télécharger le fichier JSON ;
   - ne jamais le commit dans Git.

## 2. Configurer le client

Éditer `frontend/js/firebase-config.js` :

```js
self.FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "....firebaseapp.com",
  projectId: "...",
  storageBucket: "....appspot.com",
  messagingSenderId: "...",
  appId: "..."
};

self.FIREBASE_VAPID_KEY = "...";
```

Ces valeurs sont publiques. Le fichier est lu par la page et par `sw.js`.

## 3. Configurer le serveur (Render)

Ajouter ces variables d'environnement dans Render :

| Variable | Valeur |
|---|---|
| `FIREBASE_PROJECT_ID` | `project_id` du fichier JSON |
| `FIREBASE_CLIENT_EMAIL` | `client_email` |
| `FIREBASE_PRIVATE_KEY` | `private_key` avec les `\n` échappés |
| `APP_URL` | `https://location-app-dx4m.onrender.com` |

Alternative : `FIREBASE_SERVICE_ACCOUNT_JSON` = JSON complet encodé en base64.

En local, ces variables vont dans `.env`.

## 4. Base de données

La table `push_subscriptions` est créée automatiquement au démarrage :

```sql
CREATE TABLE push_subscriptions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  token VARCHAR(512) NOT NULL UNIQUE,
  platform VARCHAR(30) NOT NULL DEFAULT 'web',
  user_agent VARCHAR(255),
  date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
  date_maj DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## 5. Activer sur un appareil

1. Se connecter.
2. Aller dans **Profil → Notifications**.
3. Cliquer **Activer les notifications**.
4. Accepter la demande du navigateur.
5. Cliquer **Tester** : une notification doit apparaître.

Le jeton FCM est enregistré dans `push_subscriptions` et lié à l'utilisateur.

## 6. Tester depuis un autre compte

- Se connecter comme locataire sur un appareil, activer les notifications.
- Depuis le compte bailleur, envoyer un message ou une annonce : le téléphone du locataire reçoit la notification.
- Inversement, un signalement ou un paiement déclaré notifie le bailleur.

## 7. Dépannage

- **« Non configuré »** : les clés Firebase ne sont pas renseignées ou le Service Worker n'a pas été mis à jour.
- **Aucune notification** :
  - vérifier l'autorisation du navigateur ;
  - vérifier la ligne `push_subscriptions` ;
  - vérifier les logs Render (`[push] ...`) ;
  - vérifier que le compte de service est bien autorisé pour FCM.
- **iPhone** : installer l'app, iOS 16.4+, ouvrir l'app installée (pas l'onglet Safari), autoriser les notifications.
- Après modification des clés Firebase, augmenter la version du cache dans `sw.js` et réinstaller l'app si nécessaire.

## Sécurité

- `firebase-config.js` contient uniquement des clés publiques.
- Le fichier JSON du compte de service et `FIREBASE_PRIVATE_KEY` restent exclusivement dans les variables d'environnement Render.
- Ne pas committer `.env`.
