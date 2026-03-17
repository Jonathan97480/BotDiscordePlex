import express from 'express';
import bodyParser from 'body-parser';
import multer from 'multer';
import { initDatabase, insertPendingNotification, insertShowIfNotExists, shouldNotifyUser } from './db.js';
const app = express();
// Sert les images locales en HTTP
app.use('/images', express.static('images'));
const PORT = process.env.WEBHOOK_PORT || 3000;
// Support JSON
app.use(bodyParser.json());
// Support x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));
// Support multipart/form-data
const upload = multer();
// Route pour recevoir les webhooks Plex
app.post('/plex', upload.any(), async (req, res) => {
    let data = req.body;
    if (data && typeof data.payload === 'string') {
        try {
            data = JSON.parse(data.payload);
        }
        catch (e) {
            // ignore
        }
    }
    console.log('Webhook Plex reçu :', data);
    try {
        const db = await initDatabase();
        await insertPendingNotification(db, data);
        // Vérification utilisateur à notifier
        let notify = true;
        if (data.Account && data.Server) {
            notify = await shouldNotifyUser(db, data.Server.uuid, String(data.Account.id));
        }
        if (!notify) {
            console.log('Utilisateur non inscrit pour recevoir les notifications, rien envoyé.');
            res.status(200).send('Utilisateur non inscrit, notification ignorée');
            return;
        }
        // Si c'est une série, on vérifie le doublon
        if (data.Metadata && data.Metadata.type === 'show') {
            await insertShowIfNotExists(db, data.Metadata);
        }
        else if (data.Metadata) {
            // Pour tout autre type (épisode, film, etc.), on sauvegarde sans filtre mais on évite les doublons sur id_media
            const id_media = data.Metadata.ratingKey ? String(data.Metadata.ratingKey) : null;
            let exists = false;
            if (id_media) {
                const row = await db.get('SELECT id FROM notifications WHERE id_media = ?', id_media);
                exists = !!row;
            }
            if (!exists) {
                await db.run('INSERT INTO notifications (title, synopsis, cover_url, trailer_url, type, guid, id_media) VALUES (?, ?, ?, ?, ?, ?, ?)', data.Metadata.title, data.Metadata.summary || '', data.Metadata.thumb || '', data.Metadata.trailer_url || '', data.Metadata.type, data.Metadata.guid || null, id_media);
            }
        }
        console.log('Notification traitée dans notifications');
    }
    catch (err) {
        console.error('Erreur lors du stockage du webhook :', err);
    }
    res.status(200).send('OK');
});
app.listen(PORT, () => {
    console.log(`Serveur webhook Plex démarré sur le port ${PORT}`);
});
//# sourceMappingURL=webhook.js.map