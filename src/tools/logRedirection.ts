import fs from 'fs';

// Redirige les logs vers un fichier bot.log
const logStream = fs.createWriteStream('bot.log', { flags: 'a' });
function logToFile(...args: any[]) {
    const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    logStream.write(`[${new Date().toISOString()}] ${msg}\n`);
}


export {
    logToFile,
};