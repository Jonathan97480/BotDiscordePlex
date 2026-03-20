import express from 'express';
import bodyParser from 'body-parser';
import multer from 'multer';
import { initDatabase, insertPendingNotification, insertShowIfNotExists, shouldNotifyUser } from './db.js';
import { parsePlexPayload, isDuplicateNotification, buildNotificationData } from './tools/webhookUtils.js';

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
    let data = parsePlexPayload(req.body);
    console.log('Webhook Plex reçu :', data);


    try {
        const db = await initDatabase();

        // Gestion des ajouts multiples d'épisodes
        if (data.Metadata && (Array.isArray(data.Metadata.children) || Array.isArray(data.Metadata.leaves))) {
            const episodes = data.Metadata.children || data.Metadata.leaves;
            if (Array.isArray(episodes)) {
                for (const ep of episodes) {
                    const notifData = buildNotificationData(data, ep);
                    await insertPendingNotification(db, notifData);
                }
                console.log(`[DEBUG webhook] Ajout multiple : ${episodes.length} épisodes insérés dans la file de notifications.`);
            }
        } else if (data.event === 'library.new' && data.Metadata && data.Metadata.type === 'show') {
            // Cas spécial : ajout d'une série, on notifie avec un titre spécial
            const notifData = buildNotificationData(data, { title: `${data.Metadata.title} — Nouveaux épisodes disponibles !` });
            await insertPendingNotification(db, notifData);
            console.log(`[DEBUG webhook] Notification ajout série : ${notifData.Metadata.title}`);
        } else {
            await insertPendingNotification(db, data);
        }

        // Nouvelle logique : on ne vérifie que l'utilisateur dans la liste à notifier, plus de UUID
        let notify = true;
        let userId = data.Account?.id ? String(data.Account.id) : null;
        let serverId = data.Server?.id ? String(data.Server.id) : null;
        console.log('[DEBUG webhook] Vérification userId:', userId, 'serverId:', serverId);
        if (userId && serverId) {
            notify = await shouldNotifyUser(db, serverId, userId);
        }
        if (!notify) {
            console.log('Utilisateur non inscrit pour recevoir les notifications, rien envoyé.');
            res.status(200).send('Utilisateur non inscrit, notification ignorée');
            return;
        }

        // Si c'est une série, on vérifie le doublon
        if (data.Metadata && data.Metadata.type === 'show') {
            await insertShowIfNotExists(db, data.Metadata);
        } else if (data.Metadata) {
            // Pour tout autre type (épisode, film, etc.), on sauvegarde sans filtre mais on évite les doublons sur id_media
            const id_media = data.Metadata.ratingKey ? String(data.Metadata.ratingKey) : '';
            const exists = await isDuplicateNotification(db, id_media);
            if (!exists) {
                await db.run(
                    'INSERT INTO notifications (title, synopsis, cover_url, trailer_url, type, guid, id_media) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    data.Metadata.title,
                    data.Metadata.summary || '',
                    data.Metadata.thumb || '',
                    data.Metadata.trailer_url || '',
                    data.Metadata.type,
                    data.Metadata.guid || null,
                    id_media
                );
            }
        }
        console.log('Notification traitée dans notifications');
    } catch (err) {
        console.error('Erreur lors du stockage du webhook :', err);
    }

    res.status(200).send('OK');
});

app.listen(PORT, () => {
    console.log(`Serveur webhook Plex démarré sur le port ${PORT}`);
});
