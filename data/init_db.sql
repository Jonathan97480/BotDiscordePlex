-- Table pour gérer la liste des utilisateurs à notifier
CREATE TABLE IF NOT EXISTS list_users_a_notifier (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    FOREIGN KEY (server_id) REFERENCES servers(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
-- Création des tables pour le bot Discord Plex

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    server_id TEXT NOT NULL,
    date_added DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS servers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    date_added DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    synopsis TEXT,
    cover_url TEXT,
    trailer_url TEXT,
    type TEXT NOT NULL,
    guid TEXT,
    id_media TEXT
);

CREATE TABLE IF NOT EXISTS notifications_sent (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    notification_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    date_sent DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (notification_id) REFERENCES notifications(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS admin_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL,
    value TEXT
);

CREATE TABLE IF NOT EXISTS list_users_a_notifier (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    FOREIGN KEY (server_id) REFERENCES servers(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Table pour stocker les webhooks Plex en attente de notification
CREATE TABLE IF NOT EXISTS pending_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT NOT NULL,
    is_send BOOLEAN NOT NULL DEFAULT 0,
    guid TEXT,
    id_media TEXT
-- Ajout du champ id_media à la table notifications
ALTER TABLE notifications ADD COLUMN id_media TEXT;

-- Ajout du champ id_media à la table pending_notifications
ALTER TABLE pending_notifications ADD COLUMN id_media TEXT;
);

-- Ajout du champ guid à la table notifications
ALTER TABLE notifications ADD COLUMN guid TEXT;

-- Ajout du champ guid à la table pending_notifications
ALTER TABLE pending_notifications ADD COLUMN guid TEXT;
