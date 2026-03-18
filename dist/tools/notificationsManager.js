// Fonction d'envoi de notification Discord
import e from 'express';
import settings from '../settings.js';
import { downloadImageIfNeeded } from './imageDownloader.js';
var client = null;
function setClient(newClient) {
    client = newClient;
}
async function sendNotification(userId, notification) {
    try {
        console.log('[DEBUG] Tentative d\'envoi de notification à', userId, notification?.Metadata?.title || notification?.event || 'Contenu');
        const user = await client.users.fetch(userId).catch((err) => {
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
export { sendNotification, setClient };
//# sourceMappingURL=notificationsManager.js.map