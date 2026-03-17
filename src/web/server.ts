import express from 'express';
import type { Request } from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import { initDatabase, addUserToNotify, removeUserToNotify } from '../db.js';
import 'express-session';

// Extension du type Request pour inclure session
declare module 'express-session' {
    interface SessionData {
        user?: string;
        mp?: string;
    }
}

const app = express();
const PORT = process.env.WEB_PORT || 4000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'plexbotsecret', resave: false, saveUninitialized: true }));

// Middleware d'authentification simple (à remplacer par OAuth Discord pour production)
app.use((req, res, next) => {
    if (req.session && req.session.user) {
        next();
    } else if (req.path === '/login') {
        next();
    } else {
        res.redirect('/login');
    }
});

app.get('/login', (req, res) => {
    // Page de connexion avec champs user et mp
    res.send(`
        <form method="post" action="/login">
            <input name="user" placeholder="Nom utilisateur" required>
            <input name="mp" type="password" placeholder="Mot de passe" required>
            <button type="submit">Connexion</button>
        </form>
    `);
});

app.post('/login', (req, res) => {
    // Simule une connexion utilisateur avec mot de passe
    // Pour l'instant, accepte tout (à sécuriser)
    req.session.user = req.body.user || 'admin';
    req.session.mp = req.body.mp || '';
    res.redirect('/');
});

app.get('/', async (req, res) => {
    const db = await initDatabase();
    // Récupère tous les utilisateurs du serveur (exemple : premier serveur)
    const servers = await db.all('SELECT * FROM servers');
    const serverId = servers.length > 0 ? servers[0].id : '';
    const allUsers = await db.all('SELECT * FROM users WHERE server_id = ?', serverId);
    const notifyUsers = await db.all('SELECT * FROM list_users_a_notifier WHERE server_id = ?', serverId);
    res.send(`
        <h1>Gestion des notifications</h1>
        <p>Connecté en tant que ${req.session.user}</p>
        <div style="display:flex;gap:40px">
            <div style="flex:1">
                <h2>Utilisateurs du serveur</h2>
                <ul id="allUsers">
                    ${allUsers.map(u => `<li><span>${u.username} (${u.id})</span> <button onclick="notifier('${u.id}')">Notifier</button></li>`).join('')}
                </ul>
            </div>
            <div style="flex:1">
                <h2>À notifier</h2>
                <ul id="notifyUsers">
                    ${notifyUsers.map(u => {
        const user = allUsers.find(usr => usr.id === u.user_id);
        return `<li><span>${user ? user.username : u.user_id} (${u.user_id})</span> <button onclick="retirer('${u.user_id}')">Retirer</button></li>`;
    }).join('')}
                </ul>
            </div>
        </div>
        <script>
            function notifier(userId) {
                fetch('/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: 'server_id=${serverId}&user_id=' + userId
                }).then(() => location.reload());
            }
            function retirer(userId) {
                fetch('/remove', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: 'server_id=${serverId}&user_id=' + userId
                }).then(() => location.reload());
            }
        </script>
    `);
});

app.post('/add', async (req, res) => {
    const db = await initDatabase();
    await addUserToNotify(db, req.body.server_id, req.body.user_id);
    res.redirect('/');
});

app.post('/remove', async (req, res) => {
    const db = await initDatabase();
    await removeUserToNotify(db, req.body.server_id, req.body.user_id);
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`Interface web démarrée sur le port ${PORT}`);
});
