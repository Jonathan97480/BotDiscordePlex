import './webhook.js';
import settings from './settings.js';
import fs from 'fs';
import 'dotenv/config';
import { initDatabase } from './db.js';
import { Client, GatewayIntentBits } from 'discord.js';

// Redirige les logs vers un fichier bot.log
const logStream = fs.createWriteStream('bot.log', { flags: 'a' });
function logToFile(...args: any[]) {
    const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    logStream.write(`[${new Date().toISOString()}] ${msg}\n`);
}
console.log = (...args: any[]) => {
    logToFile(...args);
    process.stdout.write(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') + '\n');
};
console.error = (...args: any[]) => {
    logToFile('ERROR:', ...args);
    process.stderr.write(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') + '\n');
};
console.warn = (...args: any[]) => {
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

        client.once('clientReady', () => {
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
                // Stockage des infos serveur
                await db.run('INSERT OR IGNORE INTO servers (id, name) VALUES (?, ?)', guild.id, guild.name);
                // Stockage des utilisateurs
                for (const member of members.values()) {
                    if (!member.user.bot) {
                        await db.run('INSERT OR IGNORE INTO users (id, username, server_id) VALUES (?, ?, ?)', member.id, member.user.username, guild.id);
                    }
                }
                console.log('Infos serveur et utilisateurs enregistrées.');
            } catch (err) {
                console.error('Erreur lors de l’ajout à un serveur :', err);
            }
        });

        // Au démarrage, mémorise tous les serveurs et utilisateurs
        client.on('clientReady', async () => {
            try {
                for (const guild of client.guilds.cache.values()) {
                    console.log(`Synchronisation du serveur : ${guild.name}`);
                    const resServer = await db.run('INSERT OR IGNORE INTO servers (id, name) VALUES (?, ?)', guild.id, guild.name);
                    if (resServer.changes === 0) {
                        console.log(`Serveur déjà présent dans la base : ${guild.name}`);
                    } else {
                        console.log(`Serveur ajouté : ${guild.name}`);
                    }
                    let members;
                    try {
                        members = await guild.members.fetch();
                        if (!members || members.size === 0) {
                            console.warn(`Aucun membre récupéré pour le serveur : ${guild.name}. Raisons possibles :\n- Le bot n'a pas l'intent SERVER MEMBERS activé\n- Le bot n'a pas les permissions nécessaires\n- Le serveur est vide\n- Discord limite l'accès aux membres (essayer d'attendre quelques minutes ou relancer)`);
                        }
                    } catch (fetchErr) {
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
                            } else {
                                nbAjoutes++;
                            }
                        }
                    }
                    console.log(`Utilisateurs ajoutés : ${nbAjoutes}, doublons ignorés : ${nbDoublons}`);
                }
                console.log('Synchronisation des serveurs et utilisateurs terminée.');
            } catch (err) {
                console.error('Erreur lors de la synchronisation au démarrage :', err);
                console.warn(`Raisons possibles :\n- Intent SERVER MEMBERS non activé\n- Permissions insuffisantes\n- Problème Discord API\n- Serveur trop grand ou bot trop récent`);
            }
        });

        await client.login(process.env.DISCORD_TOKEN);

        // Après connexion, traite les notifications en attente
        const { processPendingNotifications, getLocalImagePath, insertImage, createImagesTable } = await import('./db.js');
        await createImagesTable(db);

        async function downloadImageIfNeeded(plexUrl: string): Promise<string | null> {
            if (!plexUrl) return null;
            if (!process.env.PLEX_TOKEN) {
                console.error('Impossible de télécharger l’image Plex : le token PLEX_TOKEN est manquant.');
                return null;
            }
            // Vérifie si déjà présente
            let localPath = await getLocalImagePath(db, plexUrl);
            if (localPath) return localPath;
            // Télécharge l'image depuis Plex (IP locale)
            const plexLocalUrl = plexUrl.replace('https://plex.jon-dev.fr', settings.PLEX_LOCAL_URL);
            // Extension : extraite depuis l'URL ou par défaut jpg
            let ext = 'jpg';
            const urlParts = plexUrl.split('.');
            if (urlParts.length > 1) {
                const extCandidate = urlParts[urlParts.length - 1]?.split('?')[0];
                if (extCandidate && extCandidate.length <= 5 && !extCandidate.includes('/')) {
                    ext = extCandidate;
                }
            }
            const fileName = `img_${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;
            const destPath = `images/${fileName}`;
            try {
                const res = await fetch(plexLocalUrl, { headers: { 'X-Plex-Token': process.env.PLEX_TOKEN || '' } });
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const arrayBuffer = await res.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                fs.writeFileSync(destPath, buffer);
                await insertImage(db, plexUrl, destPath);
                return destPath;
            } catch (e) {
                console.error('Erreur téléchargement image Plex', plexLocalUrl, e);
                return null;
            }
        }

        async function sendNotification(userId: string, notification: any) {
            try {
                console.log('Tentative d\'envoi de notification à', userId, notification?.Metadata?.title || notification?.event || 'Contenu');
                const user = await client.users.fetch(userId);
                if (user) {
                    // Détermination du type et couleur
                    const type = notification.Metadata?.librarySectionType || notification.Metadata?.type || '';
                    let color = 0x7289da; // bleu Discord par défaut
                    if (type === 'movie' || type === 'film') color = 0xe67e22; // orange pour films
                    if (type === 'show' || type === 'episode' || type === 'series') color = 0x1abc9c; // vert pour séries

                    // Image principale (show/poster/art)
                    let imageUrl = null;
                    if (notification.Metadata?.grandparentThumb) {
                        imageUrl = notification.Metadata.grandparentThumb;
                    } else if (notification.Metadata?.art) {
                        imageUrl = notification.Metadata.art;
                    } else if (notification.Metadata?.thumb) {
                        imageUrl = notification.Metadata.thumb;
                    }
                    if (imageUrl && imageUrl.startsWith('/')) imageUrl = `${settings.PLEX_LOCAL_URL}${imageUrl}`;

                    // Téléchargement/URL locale
                    let localImagePath = null;
                    if (imageUrl) {
                        localImagePath = await downloadImageIfNeeded(imageUrl);
                    }
                    let imageEmbedUrl = imageUrl;
                    if (localImagePath) {
                        imageEmbedUrl = `${settings.BOT_SERVER_URL}/${localImagePath.replace('images/', 'images/')}`;
                    }

                    // Embed Discord simplifié
                    const embed: any = {
                        title: notification.Metadata?.title || 'Nouveau contenu Plex',
                        description: notification.Metadata?.summary || '',
                        color: color,
                        fields: [
                            { name: 'Type', value: type.charAt(0).toUpperCase() + type.slice(1), inline: true }
                        ],
                        timestamp: new Date().toISOString(),
                        ...(imageEmbedUrl ? { image: { url: imageEmbedUrl } } : {})
                    };
                    await user.send({ embeds: [embed] });
                    console.log('Notification envoyée à', userId);
                } else {
                    console.warn('Utilisateur non trouvé pour l\'envoi de notification :', userId);
                }
            } catch (e) {
                console.error('Erreur lors de l\'envoi de la notification à', userId, e);
            }
        }
        // Lancer le traitement toutes les 60 secondes
        setInterval(() => processPendingNotifications(db, sendNotification), 60000);
        // Lancer une fois au démarrage
        processPendingNotifications(db, sendNotification);
    } catch (err) {
        console.error('Erreur lors du démarrage du bot :', err);
    }
}

startBot();
