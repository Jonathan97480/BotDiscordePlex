// Fonction utilitaire pour télécharger une image si besoin (stockage local)
async function downloadImageIfNeeded(imageUrl: string): Promise<string | null> {
    // Remplacement des require par import ES
    const path = await import('path');
    const fs = await import('fs');
    const axiosModule = await import('axios');
    const axios = axiosModule.default || axiosModule;
    const crypto = await import('crypto');
    if (!imageUrl) return null;
    // Génère un nom de fichier unique basé sur l'URL
    const hash = crypto.createHash('md5').update(imageUrl).digest('hex');
    const urlPart = typeof imageUrl === 'string' ? imageUrl.split('?')[0] : '';
    let ext = typeof urlPart === 'string' ? path.extname(urlPart) : '.jpg';
    if (!ext || ext === '') ext = '.jpg';
    const localPath = `images/${hash}${ext}`;
    console.log('[DEBUG] Chemin local image généré :', localPath);
    if (fs.existsSync(localPath)) return localPath;
    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer', headers: process.env.PLEX_TOKEN ? { 'X-Plex-Token': process.env.PLEX_TOKEN } : {} });
        fs.writeFileSync(localPath, response.data);
        return localPath;
    } catch (err) {
        console.error('Erreur lors du téléchargement de l\'image Plex :', imageUrl, err);
        return null;
    }
}

export { downloadImageIfNeeded };