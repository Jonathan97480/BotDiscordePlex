import 'dotenv/config';
import { initDatabase } from './db.js';
import { Client, GatewayIntentBits } from 'discord.js';
async function startBot() {
    try {
        // Initialisation de la base de données
        const db = await initDatabase();
        console.log('Base de données prête.');
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
            }
            catch (err) {
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
        });
        await client.login(process.env.DISCORD_TOKEN);
    }
    catch (err) {
        console.error('Erreur lors du démarrage du bot :', err);
    }
}
startBot();
//# sourceMappingURL=index.js.map