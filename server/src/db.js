import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

export function openDb(file = ':memory:') {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL CHECK (role IN ('docente', 'estudiante')),
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS game_sessions (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title            TEXT NOT NULL,
      subject          TEXT NOT NULL,
      description      TEXT NOT NULL DEFAULT '',
      code             TEXT NOT NULL UNIQUE,
      max_participants INTEGER NOT NULL,
      duration_minutes INTEGER NOT NULL,
      status           TEXT NOT NULL DEFAULT 'borrador' CHECK (status IN ('borrador', 'abierta', 'cerrada')),
      created_at       TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cards (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
      concept    TEXT NOT NULL,
      definition TEXT NOT NULL,
      position   INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_game_sessions_owner ON game_sessions(owner_id);
    CREATE INDEX IF NOT EXISTS idx_cards_session ON cards(session_id);
  `);
  return db;
}

/** Ejecuta `fn` dentro de una transacción: si lanza un error, se revierte todo. */
export function inTransaction(db, fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
