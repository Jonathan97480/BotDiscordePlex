# Bot Discord Plex

## Guide de déploiement Docker (FR)

### Prérequis
- Docker installé
- Un fichier `.env` avec vos tokens Discord et Plex
- Un fichier `src/settings.js` adapté à votre configuration

### Construction de l'image
```bash
docker build -t bot-discorde-plex .
```

### Lancement du conteneur (redémarrage automatique)
```bash
docker run -d --restart unless-stopped \
  -p 3000:3000 -p 4000:4000 \
  --env-file /chemin/vers/.env \
  -v /chemin/vers/settings.js:/app/src/settings.js \
  bot-discorde-plex
```

- Le port 3000 sert le webhook Plex et les images.
- Le port 4000 sert l’interface web.
- Modifiez `.env` et `settings.js` sur l’hôte pour adapter la configuration.

### Conseils
- Ne jamais commiter vos clés dans le dépôt.
- Utilisez l’option `--restart unless-stopped` pour la résilience.
- Vérifiez l’accessibilité du port 3000 pour les images Discord.

---

## Variables d’environnement (.env)
```
DISCORD_TOKEN=VotreTokenDiscord
PLEX_TOKEN=VotreTokenPlex
```

## settings.js
```
module.exports = {
  botServerUrl: 'http://localhost:3000',
  plexLocalUrl: 'http://localhost:32400'
};
```

---

## Docker deployment guide (EN)

### Prerequisites
- Docker installed
- A `.env` file with your Discord and Plex tokens
- A `src/settings.js` file adapted to your configuration

### Build the image
```bash
docker build -t bot-discorde-plex .
```

### Run the container (auto-restart)
```bash
docker run -d --restart unless-stopped \
  -p 3000:3000 -p 4000:4000 \
  --env-file /path/to/.env \
  -v /path/to/settings.js:/app/src/settings.js \
  bot-discorde-plex
```

- Port 3000 serves the Plex webhook and images.
- Port 4000 serves the web interface.
- Edit `.env` and `settings.js` on the host to adapt the configuration.

### Tips
- Never commit your keys to the repository.
- Use `--restart unless-stopped` for resilience.
- Check port 3000 accessibility for Discord images.

---

## Environment variables (.env)
```
DISCORD_TOKEN=YourDiscordToken
PLEX_TOKEN=YourPlexToken
```

## settings.js
```
module.exports = {
  botServerUrl: 'http://localhost:3000',
  plexLocalUrl: 'http://localhost:32400'
};
```

---

## Description
Bot Discord Plex est un bot écrit en TypeScript permettant d'envoyer des notifications sur Discord concernant les nouveautés ajoutées sur un serveur Plex. Il peut notifier des utilisateurs spécifiques ou des salons, et gère une base de données SQLite pour stocker les informations nécessaires.

## Fonctionnalités
- Envoi de notifications sur Discord lors de l'ajout de nouveaux contenus sur Plex (films, séries, épisodes, documentaires).
- Chaque notification contient :
  - Le titre
  - Le synopsis
  - Une jaquette (cover)
  - Un lien vers la bande-annonce (icône)
- Gestion spécifique pour les séries :
  - Notification unique si une série entière est ajoutée
  - Notification standard pour chaque épisode ajouté
- Base de données SQLite pour :
  - Stocker les utilisateurs à notifier
  - Historique des notifications envoyées
  - Informations sur les serveurs Discord
  - Administration du bot
- Ajout automatique des nouveaux utilisateurs du serveur Discord dans la base de données
- Empêche l'envoi multiple d'une même notification à un utilisateur
- Notifications non envoyées si elles datent de plus de deux jours

## Structure du projet
- `src/` : code source TypeScript du bot
- `data/` : scripts SQL et base SQLite
- `.env` : variables d'environnement (token Discord, etc.)
- `README.md` : documentation du projet
- `INFORMATIONS_PROJET.md` : spécifications détaillées

## Installation
1. Cloner le dépôt :
   ```bash
   git clone https://github.com/Jonathan97480/BotDiscordePlex.git
   ```
2. Installer les dépendances :
   ```bash
   npm install
   ```
3. Configurer le fichier `.env` avec votre token Discord et autres variables nécessaires.
4. Initialiser la base SQLite avec le script `data/init_db.sql`.


## Lancement
Pour démarrer le bot et le serveur webhook (mode développement) :
```bash
npm run build
npm run start-all
```

---

## Tests unitaires
Des tests Jest sont présents dans le dossier `tests/`.

Pour lancer les tests :
```bash
npm test
```

---

## Contribution
1. Forkez le dépôt et créez une branche dédiée (`update`, `feature/xxx`, etc.).
2. Vérifiez que les tests passent (`npm test`).
3. Proposez une pull request claire et documentée.

## Technologies utilisées
- TypeScript
- Node.js
- Discord.js
- sqlite3
- dotenv

## Auteur
Jonathan97480

---
Pour plus d'informations, voir le fichier INFORMATIONS_PROJET.md.