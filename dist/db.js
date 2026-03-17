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
//# sourceMappingURL=db.js.map