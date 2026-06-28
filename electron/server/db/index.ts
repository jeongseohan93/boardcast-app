import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'

let db: Database.Database

export function getDB(): Database.Database {
  return db
}

function migrateAlter() {
  const cols = (db.prepare('PRAGMA table_info(follows)').all() as { name: string }[]).map((c) => c.name)

  if (!cols.includes('nickname')) {
    db.exec('ALTER TABLE follows ADD COLUMN nickname TEXT')
    console.log('[DB] Migrated: follows.nickname column added')
  }

  if (!cols.includes('event_type')) {
    db.exec("ALTER TABLE follows ADD COLUMN event_type TEXT NOT NULL DEFAULT 'FOLLOW'")
    console.log('[DB] Migrated: follows.event_type column added')
  }

  if (!cols.includes('target_channel_id')) {
    db.exec('ALTER TABLE follows ADD COLUMN target_channel_id TEXT')
    console.log('[DB] Migrated: follows.target_channel_id column added')
  }
}

export function initDB() {
  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'events.db')

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  migrate()
  migrateAlter()
  console.log('[DB] Initialized at', dbPath)
}

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS donations (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id  TEXT    NOT NULL,
      user_id     TEXT    NOT NULL,
      nickname    TEXT    NOT NULL,
      amount      INTEGER NOT NULL,
      type        TEXT    NOT NULL,
      message     TEXT,
      created_at  TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id  TEXT    NOT NULL,
      user_id     TEXT    NOT NULL,
      nickname    TEXT    NOT NULL,
      month       INTEGER,
      message     TEXT,
      created_at  TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS follows (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id     TEXT    NOT NULL,
      event_type     TEXT    NOT NULL DEFAULT 'FOLLOW',
      target_channel_id TEXT,
      nickname       TEXT,
      follower_count INTEGER NOT NULL,
      created_at     TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS follower_list (
      channel_id          TEXT NOT NULL,
      follower_channel_id TEXT NOT NULL,
      nickname            TEXT NOT NULL,
      followed_at         TEXT NOT NULL,
      PRIMARY KEY (channel_id, follower_channel_id)
    );

    CREATE TABLE IF NOT EXISTS follower_list_staging (
      channel_id          TEXT NOT NULL,
      follower_channel_id TEXT NOT NULL,
      nickname            TEXT NOT NULL,
      followed_at         TEXT NOT NULL,
      PRIMARY KEY (channel_id, follower_channel_id)
    );

    CREATE TABLE IF NOT EXISTS missions (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id           TEXT    NOT NULL,
      mission_donation_id  TEXT    NOT NULL UNIQUE,
      mission_text         TEXT    NOT NULL,
      status               TEXT    NOT NULL DEFAULT 'PENDING',
      success              INTEGER NOT NULL DEFAULT 0,
      pay_amount           INTEGER NOT NULL DEFAULT 0,
      donator_nickname     TEXT    NOT NULL,
      donator_channel_id   TEXT    NOT NULL,
      duration_time        INTEGER,
      mission_created_time TEXT,
      mission_end_time     TEXT,
      created_at           TEXT    NOT NULL,
      updated_at           TEXT    NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_donations_channel_created ON donations(channel_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_channel_created ON subscriptions(channel_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_follows_channel_created ON follows(channel_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_follower_list_staging_channel ON follower_list_staging(channel_id);
    CREATE INDEX IF NOT EXISTS idx_missions_channel_created ON missions(channel_id, created_at);

    CREATE TABLE IF NOT EXISTS attendance (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id         TEXT    NOT NULL,
      nickname           TEXT    NOT NULL,
      user_id            TEXT    NOT NULL DEFAULT '',
      total_count        INTEGER NOT NULL DEFAULT 1,
      last_attended_date TEXT    NOT NULL,
      first_attended_at  TEXT    NOT NULL,
      last_attended_at   TEXT    NOT NULL,
      UNIQUE(channel_id, nickname)
    );
    CREATE INDEX IF NOT EXISTS idx_attendance_channel ON attendance(channel_id, last_attended_date);
  `)
}
