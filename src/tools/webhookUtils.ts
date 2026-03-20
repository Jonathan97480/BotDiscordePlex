// Fonctions utilitaires pour le traitement des webhooks Plex

/**
 * Parse le payload Plex (body ou payload JSON)
 */
export function parsePlexPayload(data: any): any {
    if (data && typeof data.payload === 'string') {
        try {
            return JSON.parse(data.payload);
        } catch (e) {
            // ignore
        }
    }
    return data;
}

/**
 * Vérifie si une notification existe déjà pour un id_media
 */
export async function isDuplicateNotification(db: any, id_media: string): Promise<boolean> {
    if (!id_media) return false;
    const row = await db.get('SELECT id FROM notifications WHERE id_media = ?', id_media);
    return !!row;
}

/**
 * Prépare les données de notification à partir du payload Plex
 */
export function buildNotificationData(data: any, override?: any): any {
    return {
        ...data,
        Metadata: {
            ...data.Metadata,
            ...(override || {})
        }
    };
}
