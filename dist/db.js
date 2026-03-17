// Table pour stocker les images téléchargées localement
export async function createImagesTable(db) {
    await db.run(`CREATE TABLE IF NOT EXISTS images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plex_url TEXT UNIQUE,
        local_path TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
}
// Vérifie si une image existe déjà en base
export async function getLocalImagePath(db, plexUrl) {
    const row = await db.get('SELECT local_path FROM images WHERE plex_url = ?', plexUrl);
    return row ? row.local_path : null;
}
// Ajoute une image téléchargée
export async function insertImage(db, plexUrl, localPath) {
    await db.run('INSERT OR IGNORE INTO images (plex_url, local_path) VALUES (?, ?)', plexUrl, localPath);
}
// Traitement des notifications en attente
export async function processPendingNotifications(db, sendNotification) {
    // Récupère toutes les notifications non envoyées
    const pendings = await db.all('SELECT * FROM pending_notifications WHERE is_send = 0');
    console.log(`[processPendingNotifications] ${pendings.length} notifications en attente.`);
    for (const pending of pendings) {
        let data;
        try {
            data = JSON.parse(pending.data);
        }
        catch (e) {
            console.error('[processPendingNotifications] Erreur de parsing JSON pour la notification id', pending.id, e);
            continue;
        }
        const plexUuid = data.Server && data.Server.uuid ? data.Server.uuid : null;
        if (!plexUuid) {
            console.warn('[processPendingNotifications] Notification id', pending.id, 'sans serverId (UUID Plex), ignorée.');
            continue;
        }
        // Trouver l'id Discord du serveur correspondant à l'UUID Plex
        const serverRow = await db.get('SELECT id FROM servers WHERE uuid = ? OR id = ?', plexUuid, plexUuid);
        const discordServerId = serverRow ? serverRow.id : null;
        if (!discordServerId) {
            console.warn(`[processPendingNotifications] Notification id ${pending.id} : aucun serveur Discord trouvé pour l'UUID Plex ${plexUuid}`);
            continue;
        }
        const users = await db.all('SELECT user_id FROM list_users_a_notifier WHERE server_id = ?', discordServerId);
        console.log(`[processPendingNotifications] Notification id ${pending.id} pour serveur Discord ${discordServerId} (UUID Plex ${plexUuid}) : ${users.length} utilisateur(s) à notifier.`);
        for (const u of users) {
            console.log(`[processPendingNotifications] Envoi à user_id ${u.user_id}`);
            await sendNotification(u.user_id, data);
        }
        await db.run('UPDATE pending_notifications SET is_send = 1 WHERE id = ?', pending.id);
        console.log(`[processPendingNotifications] Notification id ${pending.id} marquée comme envoyée.`);
    }
}
// Gestion de la liste des utilisateurs à notifier
export async function addUserToNotify(db, serverId, userId) {
    await db.run('INSERT OR IGNORE INTO list_users_a_notifier (server_id, user_id) VALUES (?, ?)', serverId, userId);
}
export async function removeUserToNotify(db, serverId, userId) {
    await db.run('DELETE FROM list_users_a_notifier WHERE server_id = ? AND user_id = ?', serverId, userId);
}
export async function shouldNotifyUser(db, serverId, userId) {
    const row = await db.get('SELECT id FROM list_users_a_notifier WHERE server_id = ? AND user_id = ?', serverId, userId);
    return !!row;
}
// Migration des guid et id_media manquants dans pending_notifications
export async function migratePendingNotificationsGuidAndIdMedia(db) {
    const rows = await db.all('SELECT id, data FROM pending_notifications WHERE guid IS NULL OR id_media IS NULL');
    for (const row of rows) {
        let guid = null;
        let id_media = null;
        try {
            const parsed = JSON.parse(row.data);
            if (parsed && parsed.Metadata) {
                if (parsed.Metadata.guid)
                    guid = parsed.Metadata.guid;
                if (parsed.Metadata.ratingKey)
                    id_media = String(parsed.Metadata.ratingKey);
            }
        }
        catch (e) {
            // ignore
        }
        if (guid) {
            await db.run('UPDATE pending_notifications SET guid = ? WHERE id = ?', guid, row.id);
        }
        if (id_media) {
            await db.run('UPDATE pending_notifications SET id_media = ? WHERE id = ?', id_media, row.id);
        }
    }
}
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../data/bot_plex.db');
const INIT_SQL_PATH = path.join(__dirname, '../data/init_db.sql');
export async function initDatabase() {
    // Vérifie si la base existe
    if (!fs.existsSync(DB_PATH)) {
        // Crée la base et exécute le script SQL
        const db = await open({
            filename: DB_PATH,
            driver: sqlite3.Database,
        });
        const sql = fs.readFileSync(INIT_SQL_PATH, 'utf-8');
        await db.exec(sql);
        return db;
    }
    else {
        // Ouvre simplement la base
        return open({
            filename: DB_PATH,
            driver: sqlite3.Database,
        });
    }
}
// Ajout du champ guid dans insertPendingNotification
export async function insertPendingNotification(db, data) {
    if (data?.event !== 'library.new') {
        // On ignore tous les autres événements
        return;
    }
    const jsonData = JSON.stringify(data);
    let guid = null;
    let id_media = null;
    if (data && data.Metadata) {
        if (data.Metadata.guid)
            guid = data.Metadata.guid;
        if (data.Metadata.ratingKey)
            id_media = String(data.Metadata.ratingKey);
    }
    // Vérifie la présence de l'id_media
    if (id_media) {
        const exists = await db.get('SELECT id FROM pending_notifications WHERE id_media = ?', id_media);
        if (exists)
            return; // Ne pas insérer de doublon
    }
    await db.run('INSERT INTO pending_notifications (data, is_send, guid, id_media) VALUES (?, ?, ?, ?)', jsonData, 0, guid, id_media);
}
// Vérifie si un show existe déjà dans la table notifications
export async function showExists(db, guid, id_media) {
    let row;
    if (id_media) {
        row = await db.get('SELECT id FROM notifications WHERE type = ? AND id_media = ?', 'show', id_media);
    }
    else {
        row = await db.get('SELECT id FROM notifications WHERE type = ? AND guid = ?', 'show', guid);
    }
    return !!row;
}
// Ajoute un show uniquement s'il n'existe pas déjà
export async function insertShowIfNotExists(db, metadata) {
    const guid = metadata.guid;
    const id_media = metadata.ratingKey ? String(metadata.ratingKey) : undefined;
    if (!guid && !id_media)
        return;
    const exists = await showExists(db, guid, id_media);
    if (!exists) {
        await db.run('INSERT INTO notifications (title, synopsis, cover_url, trailer_url, type, guid, id_media) VALUES (?, ?, ?, ?, ?, ?, ?)', metadata.title, metadata.summary || '', metadata.thumb || '', metadata.trailer_url || '', 'show', guid, id_media);
    }
}
//# sourceMappingURL=db.js.map