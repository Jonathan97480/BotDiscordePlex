import './webhook.js';
// @ts-ignore
import settings from './settings.js';
import { logToFile } from './tools/logRedirection.js';
import 'dotenv/config';
import { initDatabase } from './db.js';
import { Client, GatewayIntentBits } from 'discord.js';
import { GetServeurAndUserTheGuildAndFirstAddedBot, GetServeurAndUserBotClientReady } from './tools/guildManager.js';
import { downloadImageIfNeeded } from './tools/imageDownloader.js';
import { sendNotification, setClient } from './tools/notificationsManager.js';
console.log = (...args) => {
    logToFile(...args);
    process.stdout.write(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') + '\n');
};
console.error = (...args) => {
    logToFile('ERROR:', ...args);
    process.stderr.write(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') + '\n');
};
console.warn = (...args) => {
    logToFile('WARN:', ...args);
    process.stderr.write(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') + '\n');
};
async function startBot() {
    // Vérification du token Plex
    if (!process.env.PLEX_TOKEN) {
        console.error('⚠️  Le token Plex (PLEX_TOKEN) est manquant dans le fichier .env. Les téléchargements d’images échoueront.');
    }
    try {
        // Initialisation de la base de données
        const db = await initDatabase();
        console.log('Base de données prête.');
        // Initialisation du bot Discord
        const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
        client.once('ready', () => {
            console.log(`Bot connecté en tant que ${client.user?.tag}`);
        });
        // Gestion des erreurs Discord
        client.on('error', (error) => {
            console.error('Erreur Discord :', error);
        });
        client.on('warn', (info) => {
            console.warn('Avertissement Discord :', info);
        });
        // Quand le bot est ajouté à un serveur pour la première fois, on enregistre le serveur et ses membres
        client.on('guildCreate', async (guild) => {
            await GetServeurAndUserTheGuildAndFirstAddedBot(guild, db);
        });
        // Au démarrage, mémorise tous les serveurs et utilisateurs
        client.on('ready', async () => {
            await GetServeurAndUserBotClientReady(client, db);
        }); // <-- fermeture correcte du listener 'ready'
        // Connexion du bot Discord
        await client.login(process.env.DISCORD_TOKEN || process.env.BOT_TOKEN);
        setClient(client);
        // Import de processPendingNotifications depuis db.js
        const { processPendingNotifications } = await import('./db.js');
        // Lancer le traitement toutes les 60 secondes
        setInterval(() => processPendingNotifications(db, sendNotification), 60000);
        // Lancer une fois au démarrage
        processPendingNotifications(db, sendNotification);
    }
    catch (err) {
        console.error('Erreur lors de la synchronisation au démarrage :', err);
        console.warn(`Raisons possibles :\n- Intent SERVER MEMBERS non activé\n- Permissions insuffisantes\n- Problème Discord API\n- Serveur trop grand ou bot trop récent`);
    }
}
startBot();
//# sourceMappingURL=index.js.map