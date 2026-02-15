import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(path.join(DATA_DIR, 'jarvis.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS domains (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    color TEXT,
    bg TEXT,
    icon TEXT,
    win TEXT,
    status TEXT,
    urgency TEXT,
    days INTEGER,
    progress INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS daily_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    domain_id TEXT,
    minutes_spent INTEGER DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (domain_id) REFERENCES domains(id)
  );
`);

// Domain operations
export function getDomains() {
    return db.prepare('SELECT * FROM domains ORDER BY rowid').all();
}

export function upsertDomain(domain) {
    const stmt = db.prepare(`
    INSERT INTO domains (id, label, color, bg, icon, win, status, urgency, days, progress, updated_at)
    VALUES (@id, @label, @color, @bg, @icon, @win, @status, @urgency, @days, @progress, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      progress = @progress,
      status = @status,
      days = @days,
      urgency = @urgency,
      updated_at = CURRENT_TIMESTAMP
  `);
    return stmt.run(domain);
}

export function updateDomainProgress(id, progress) {
    return db.prepare('UPDATE domains SET progress = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(progress, id);
}

export function seedDomains(domains) {
    const existing = getDomains();
    if (existing.length === 0) {
        const insert = db.prepare(`
      INSERT INTO domains (id, label, color, bg, icon, win, status, urgency, days, progress)
      VALUES (@id, @label, @color, @bg, @icon, @win, @status, @urgency, @days, @progress)
    `);
        const tx = db.transaction((items) => {
            for (const item of items) insert.run(item);
        });
        tx(domains);
        console.log(`  📦 Seeded ${domains.length} domains into database`);
    }
}

// Chat operations
export function getChatHistory(limit = 50) {
    return db.prepare('SELECT * FROM chat_history ORDER BY created_at DESC LIMIT ?').all(limit).reverse();
}

export function addChatMessage(role, content) {
    return db.prepare('INSERT INTO chat_history (role, content) VALUES (?, ?)').run(role, content);
}

// Daily log operations
export function addDailyLog(date, domainId, minutesSpent, notes) {
    return db.prepare('INSERT INTO daily_logs (date, domain_id, minutes_spent, notes) VALUES (?, ?, ?, ?)').run(date, domainId, minutesSpent, notes);
}

export function getDailyLogs(date) {
    return db.prepare('SELECT * FROM daily_logs WHERE date = ?').all(date);
}

export default db;
