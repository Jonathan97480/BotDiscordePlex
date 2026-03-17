# Bot Discord Plex

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
Pour démarrer le bot :
```bash
npm run start
```

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