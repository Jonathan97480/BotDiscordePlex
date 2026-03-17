# Projet : Bot Discord Plex
# Lien du dépôt GitHub
[BotDiscordePlex sur GitHub](https://github.com/Jonathan97480/BotDiscordePlex.git)

## Description
Ce projet est un bot Discord écrit en TypeScript. Il a pour but d'envoyer des notifications à des utilisateurs d'un serveur Discord, ou à des utilisateurs précis, concernant les nouveautés disponibles sur un serveur Plex.

## Fonctionnalités principales
- Envoyer des notifications sur Discord lorsqu'un nouveau contenu est ajouté sur Plex.
- Notifier des utilisateurs spécifiques ou des salons Discord.
- Utiliser une base de données SQLite simple pour stocker les informations nécessaires (utilisateurs à notifier, logs, etc).

### Fonctionnalités de notification avancées
- Chaque notification contiendra :
	- Le titre du contenu
	- Le synopsis
	- Une jaquette (affiche/cover)
	- Un lien (sous forme d'icône) vers une bande-annonce
- Une notification est envoyée pour chaque nouveauté ajoutée sur Plex (films, documentaires, etc).
	- Si une série entière est ajoutée, une seule notification est envoyée pour toute la série.
	- Si un épisode est ajouté, une notification standard est envoyée pour cet épisode uniquement.

## Spécifications de la base de données SQLite
- Lorsqu'un bot est ajouté à un serveur Discord, il récupère automatiquement la liste des utilisateurs et la stocke dans la base de données.
- Les utilisateurs sont enregistrés avec :
	- leur ID Discord
	- leur nom d'utilisateur
	- l'ID du serveur auquel ils sont liés
- Si un nouvel utilisateur rejoint le serveur, il est ajouté automatiquement à la base de données.

### Structure des tables
- **users** : informations sur les utilisateurs à notifier
	- id (Discord)
	- username
	- server_id
	- date_added

- **notifications** : informations sur chaque notification à envoyer
  - id
  - title (nom du film, série ou épisode)
  - synopsis
  - cover_url (jaquette)
  - trailer_url (lien vers la bande-annonce)
  - type (film, série, épisode)
- Relation : la table notifications_sent référence l'id de la table notifications (notification_id) pour lier chaque envoi à une notification précise.

- **notifications_sent** : historique des notifications envoyées
  - id
  - notification_id (lien vers la table notifications)
  - user_id (lien vers la table users)
  - date_sent
-Relation : la table notifications_sent référence l'id de la table notifications (notification_id) pour lier chaque envoi à une notification précise.

- **servers** : informations sur les serveurs Discord
    - id (Discord)
    - name
    - date_added
- **list_users_a_notifier** : liste des utilisateurs à notifier pour chaque serveur
    - id
    - server_id (lien vers la table servers)
    - user_id (lien vers la table users)

-- **plex_api_config** : configuration pour l'API Plex
    - id
    - server_id (lien vers la table servers)
    - plex_url
    - plex_token
    
- Node.js

## Règles et bonnes pratiques
- Respecter la structure du projet (séparation du code, configuration, base de données, etc).
- Utiliser des variables d'environnement pour les informations sensibles (token Discord, etc).
- Documenter le code et les fonctions principales.
- Gérer les erreurs et les logs proprement.

## Structure suggérée du projet
- src/ : code source du bot
- data/ : base de données SQLite
- .env : variables d'environnement
- README.md : documentation du projet

## Étapes de développement
1. Initialisation du projet et configuration de TypeScript
2. Mise en place de la connexion à Discord
3. Intégration de la base de données SQLite
4. Détection des nouveautés sur Plex (à définir selon l'API ou le mode de surveillance)
5. Envoi des notifications sur Discord
6. Gestion des utilisateurs à notifier
7. Tests et documentation

---

> Ce fichier contient les informations et règles principales du projet. À compléter au fur et à mesure de l'avancement.
