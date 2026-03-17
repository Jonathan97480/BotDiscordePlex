# Interface web de gestion des notifications Plex

Cette interface permet aux administrateurs du bot de se connecter et de gérer la liste des utilisateurs à notifier.

## Fonctionnalités
- Connexion simple (à remplacer par OAuth Discord pour production)
- Ajout/suppression d'utilisateurs à notifier
- Affichage de la liste actuelle

## Démarrage

```sh
npm install express express-session body-parser
node src/web/server.ts
```

## Par défaut
- L'utilisateur connecté est considéré comme admin.
- Les admins peuvent ajouter ou retirer des utilisateurs à notifier.

## À améliorer
- Authentification Discord OAuth
- Affichage dynamique des serveurs et utilisateurs
- Gestion des rôles admin
