import './webhook.js';
// @ts-ignore
import settings from './settings.js';
import fs from 'fs';
import 'dotenv/config';
import { initDatabase } from './db.js';
import { Client, GatewayIntentBits } from 'discord.js';
// Redirige les logs vers un fichier bot.log
const logStream = fs.createWriteStream('bot.log', { flags: 'a' });
function logToFile(...args) {
    const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    logStream.write(`[${new Date().toISOString()}] ${msg}\n`);
}
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
        // Migration des guid et id_media manquants
        const { migratePendingNotificationsGuidAndIdMedia } = await import('./db.js');
        await migratePendingNotificationsGuidAndIdMedia(db);
        console.log('Migration des guid et id_media terminée.');
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
        // Quand le bot est ajouté à un serveur
        client.on('guildCreate', async (guild) => {
            try {
                console.log(`Ajouté au serveur : ${guild.name}`);
                // Récupération des membres
                const members = await guild.members.fetch();
                // Stockage des infos serveur (uuid inconnu à ce stade)
                await db.run('INSERT OR IGNORE INTO servers (id, name, uuid) VALUES (?, ?, ?)', guild.id, guild.name, null);
                // Stockage des utilisateurs
                for (const member of members.values()) {
                    if (!member.user.bot) {
                        await db.run('INSERT OR IGNORE INTO users (id, username, server_id) VALUES (?, ?, ?)', member.id, member.user.username, guild.id);
                    }
                }
                console.log('Infos serveur et utilisateurs enregistrées.');
            }
            catch (err) {
                console.error('Erreur lors de l’ajout à un serveur :', err);
            }
        });
        // Au démarrage, mémorise tous les serveurs et utilisateurs
        client.on('ready', async () => {
            try {
                for (const guild of client.guilds.cache.values()) {
                    console.log(`Synchronisation du serveur : ${guild.name}`);
                    const resServer = await db.run('INSERT OR IGNORE INTO servers (id, name) VALUES (?, ?)', guild.id, guild.name);
                    if (resServer.changes === 0) {
                        console.log(`Serveur déjà présent dans la base : ${guild.name}`);
                    }
                    else {
                        console.log(`Serveur ajouté : ${guild.name}`);
                    }
                    let members;
                    try {
                        members = await guild.members.fetch();
                        if (!members || members.size === 0) {
                            console.warn(`Aucun membre récupéré pour le serveur : ${guild.name}. Raisons possibles :\n- Le bot n'a pas l'intent SERVER MEMBERS activé\n- Le bot n'a pas les permissions nécessaires\n- Le serveur est vide\n- Discord limite l'accès aux membres (essayer d'attendre quelques minutes ou relancer)`);
                        }
                    }
                    catch (fetchErr) {
                        console.error(`Erreur lors de la récupération des membres pour ${guild.name} :`, fetchErr);
                        console.warn(`Raisons possibles :\n- Intent SERVER MEMBERS non activé\n- Permissions insuffisantes\n- Problème Discord API\n- Serveur trop grand ou bot trop récent`);
                        continue;
                    }
                    let nbAjoutes = 0;
                    let nbDoublons = 0;
                    for (const member of (members?.values() || [])) {
                        if (!member.user.bot) {
                            const resUser = await db.run('INSERT OR IGNORE INTO users (id, username, server_id) VALUES (?, ?, ?)', member.id, member.user.username, guild.id);
                            if (resUser.changes === 0) {
                                nbDoublons++;
                            }
                            else {
                                nbAjoutes++;
                            }
                        }
                    }
                    console.log(`Utilisateurs ajoutés : ${nbAjoutes}, doublons ignorés : ${nbDoublons}`);
                }
                console.log('Synchronisation des serveurs et utilisateurs terminée.');
            }
            catch (err) {
                console.error('Erreur lors de la synchronisation au démarrage :', err);
                console.warn(`Raisons possibles :\n- Intent SERVER MEMBERS non activé\n- Permissions insuffisantes\n- Problème Discord API\n- Serveur trop grand ou bot trop récent`);
            }
        }); // <-- fermeture correcte du listener 'ready'
        // Connexion du bot Discord
        await client.login(process.env.DISCORD_TOKEN || process.env.BOT_TOKEN);
        // Fonction utilitaire pour télécharger une image si besoin (stockage local)
        async function downloadImageIfNeeded(imageUrl) {
            // Remplacement des require par import ES
            const path = await import('path');
            const fs = await import('fs');
            const axiosModule = await import('axios');
            const axios = axiosModule.default || axiosModule;
            const crypto = await import('crypto');
            if (!imageUrl)
                return null;
            // Génère un nom de fichier unique basé sur l'URL
            const hash = crypto.createHash('md5').update(imageUrl).digest('hex');
            const urlPart = typeof imageUrl === 'string' ? imageUrl.split('?')[0] : '';
            let ext = typeof urlPart === 'string' ? path.extname(urlPart) : '.jpg';
            if (!ext || ext === '')
                ext = '.jpg';
            const localPath = `images/${hash}${ext}`;
            console.log('[DEBUG] Chemin local image généré :', localPath);
            if (fs.existsSync(localPath))
                return localPath;
            try {
                const response = await axios.get(imageUrl, { responseType: 'arraybuffer', headers: process.env.PLEX_TOKEN ? { 'X-Plex-Token': process.env.PLEX_TOKEN } : {} });
                fs.writeFileSync(localPath, response.data);
                return localPath;
            }
            catch (err) {
                console.error('Erreur lors du téléchargement de l\'image Plex :', imageUrl, err);
                return null;
            }
        }
        // Fonction d'envoi de notification Discord
        async function sendNotification(userId, notification) {
            try {
                console.log('[DEBUG] Tentative d\'envoi de notification à', userId, notification?.Metadata?.title || notification?.event || 'Contenu');
                const user = await client.users.fetch(userId).catch(err => {
                    console.error(`[DEBUG] Impossible de fetch l'utilisateur Discord ${userId} :`, err);
                    return null;
                });
                if (user) {
                    // Détermination du type et couleur
                    const type = notification.Metadata?.librarySectionType || notification.Metadata?.type || '';
                    let color = 0x7289da; // bleu Discord par défaut
                    if (type === 'movie' || type === 'film')
                        color = 0xe67e22; // orange pour films
                    if (type === 'show' || type === 'episode' || type === 'series')
                        color = 0x1abc9c; // vert pour séries
                    // Image principale (show/poster/art)
                    let imageUrl = null;
                    if (notification.Metadata?.grandparentThumb) {
                        imageUrl = notification.Metadata.grandparentThumb;
                    }
                    else if (notification.Metadata?.art) {
                        imageUrl = notification.Metadata.art;
                    }
                    else if (notification.Metadata?.thumb) {
                        imageUrl = notification.Metadata.thumb;
                    }
                    if (imageUrl && imageUrl.startsWith('/'))
                        imageUrl = `${settings.PLEX_LOCAL_URL}${imageUrl}`;
                    // Téléchargement/URL locale
                    let localImagePath = null;
                    if (imageUrl) {
                        localImagePath = await downloadImageIfNeeded(imageUrl);
                    }
                    let imageEmbedUrl = imageUrl;
                    if (localImagePath) {
                        imageEmbedUrl = `${settings.BOT_SERVER_URL}/${localImagePath.replace('images/', 'images/')}`;
                    }
                    console.log('[DEBUG] URL d\'image utilisée dans l\'embed :', imageEmbedUrl);
                    // Embed Discord simplifié
                    // Construction du titre
                    let embedTitle = 'QUOI DE NEUF SUR PLEX - ';
                    if (type === 'show' || type === 'episode' || type === 'series') {
                        // Nom du show + titre de l'épisode
                        const showName = notification.Metadata?.grandparentTitle || notification.Metadata?.parentTitle || '';
                        const episodeTitle = notification.Metadata?.title || '';
                        embedTitle += showName ? `${showName} - ` : '';
                        embedTitle += episodeTitle;
                    }
                    else {
                        embedTitle += notification.Metadata?.title || 'Nouveau contenu Plex';
                    }
                    const embed = {
                        title: embedTitle,
                        description: notification.Metadata?.summary || '',
                        color: color,
                        fields: [
                            { name: 'Type', value: type.charAt(0).toUpperCase() + type.slice(1), inline: true }
                        ],
                        timestamp: new Date().toISOString(),
                        ...(imageEmbedUrl ? { image: { url: imageEmbedUrl } } : {})
                    };
                    try {
                        await user.send({ embeds: [embed] });
                        console.log('[DEBUG] Notification envoyée à', userId);
                    }
                    catch (sendErr) {
                        console.error(`[DEBUG] Erreur lors de l'envoi du DM à l'utilisateur ${userId} :`, sendErr);
                    }
                }
                else {
                    console.warn('[DEBUG] Utilisateur non trouvé pour l\'envoi de notification :', userId);
                }
            }
            catch (e) {
                let errMsg = '';
                if (e && typeof e.toString === 'function') {
                    errMsg += '[toString] ' + e.toString() + ' ';
                }
                errMsg += '[typeof] ' + typeof e + ' ';
                errMsg += '[json] ' + JSON.stringify(e);
                console.error('[DEBUG] Erreur inattendue lors de l\'envoi de la notification à', userId, errMsg);
            }
        }
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