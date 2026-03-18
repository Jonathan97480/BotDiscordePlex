async function GetServeurAndUserTheGuildAndFirstAddedBot(guild, db) {
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
}
async function GetServeurAndUserBotClientReady(client, db) {
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
}
export { GetServeurAndUserTheGuildAndFirstAddedBot, GetServeurAndUserBotClientReady };
//# sourceMappingURL=guildManager.js.map