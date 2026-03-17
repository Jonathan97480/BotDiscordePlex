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
        await client.login(process.env.DISCORD_TOKEN);
    }
    catch (err) {
        console.error('Erreur lors du démarrage du bot :', err);
    }
}
startBot();
//# sourceMappingURL=index.js.map