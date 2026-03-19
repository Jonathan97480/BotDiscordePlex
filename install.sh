#!/bin/sh

# Crée .env si absent
if [ ! -f .env ]; then
  echo "DISCORD_TOKEN=VotreTokenDiscord" > .env
  echo "PLEX_TOKEN=VotreTokenPlex" >> .env
  echo "Fichier .env créé (à compléter)."
fi

# Crée settings.js si absent
if [ ! -f src/settings.js ]; then
  mkdir -p src
  echo "module.exports = {\n  botServerUrl: 'http://localhost:3000',\n  plexLocalUrl: 'http://localhost:32400'\n};" > src/settings.js
  echo "Fichier settings.js créé (à adapter)."
fi

npm install
npm run start-all