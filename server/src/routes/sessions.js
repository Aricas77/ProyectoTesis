import { Router } from 'express';
import { randomInt } from 'node:crypto';
import { HttpError, parseSession } from '../validation.js';
import { authenticate, requireRole } from '../middleware.js';
import { inTransaction } from '../db.js';

// Sin caracteres ambiguos (0/O, 1/I) para que el código sea fácil de dictar.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TRANSITIONS = { borrador: ['abierta'], abierta: ['cerrada'], cerrada: ['abierta'] };

export function sessionsRouter({ db, config }) {
  const router = Router();
  router.use(authenticate({ db, config }));

  const generateCode = () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      let code = '';
      for (let i = 0; i < 6; i++) code += ALPHABET[randomInt(ALPHABET.length)];
      if (!db.prepare('SELECT 1 FROM game_sessions WHERE code = ?').get(code)) return code;
    }
    throw new HttpError(500, 'No se pudo generar un código único. Inténtalo de nuevo.');
  };

  const cardsOf = (sessionId) =>
    db.prepare('SELECT concept, definition FROM cards WHERE session_id = ? ORDER BY position').all(sessionId);

  const toApi = (row, extra = {}) => ({
    id: row.id,
    title: row.title,
    subject: row.subject,
    description: row.description,
    code: row.code,
    maxParticipants: row.max_participants,
    durationMinutes: row.duration_minutes,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...extra,
  });

  const findOwned = (req) => {
    const id = Number(req.params.id);
    const row = Number.isInteger(id)
      ? db.prepare('SELECT * FROM game_sessions WHERE id = ? AND owner_id = ?').get(id, req.user.id)
      : undefined;
    if (!row) throw new HttpError(404, 'No encontramos esa sesión.');
    return row;
  };

  const saveCards = (sessionId, cards) => {
    db.prepare('DELETE FROM cards WHERE session_id = ?').run(sessionId);
    const insert = db.prepare('INSERT INTO cards (session_id, concept, definition, position) VALUES (?, ?, ?, ?)');
    cards.forEach((c, i) => insert.run(sessionId, c.concept, c.definition, i));
  };

  // Estudiantes (y docentes) validan un código para entrar a una sala abierta.
  router.get('/join/:code', (req, res) => {
    const row = db
      .prepare(
        `SELECT s.*, u.name AS teacher_name, (SELECT COUNT(*) FROM cards c WHERE c.session_id = s.id) AS cards_count
         FROM game_sessions s JOIN users u ON u.id = s.owner_id
         WHERE s.code = ? AND s.status = 'abierta'`,
      )
      .get(String(req.params.code).trim().toUpperCase());
    if (!row) throw new HttpError(404, 'No encontramos una sala abierta con ese código. Confírmalo con tu docente.');
    res.json({
      session: {
        title: row.title,
        subject: row.subject,
        description: row.description,
        code: row.code,
        durationMinutes: row.duration_minutes,
        maxParticipants: row.max_participants,
        cardsCount: row.cards_count,
        teacher: row.teacher_name,
      },
    });
  });

  router.use(requireRole('docente'));

  router.get('/', (req, res) => {
    const rows = db
      .prepare(
        `SELECT s.*, (SELECT COUNT(*) FROM cards c WHERE c.session_id = s.id) AS cards_count
         FROM game_sessions s WHERE s.owner_id = ? ORDER BY s.created_at DESC, s.id DESC`,
      )
      .all(req.user.id);
    res.json({ sessions: rows.map((r) => toApi(r, { cardsCount: r.cards_count })) });
  });

  router.post('/', (req, res) => {
    const data = parseSession(req.body);
    const code = generateCode();
    const id = inTransaction(db, () => {
      const { lastInsertRowid } = db
        .prepare(
          `INSERT INTO game_sessions (owner_id, title, subject, description, code, max_participants, duration_minutes)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(req.user.id, data.title, data.subject, data.description, code, data.maxParticipants, data.durationMinutes);
      saveCards(lastInsertRowid, data.cards);
      return Number(lastInsertRowid);
    });
    const row = db.prepare('SELECT * FROM game_sessions WHERE id = ?').get(id);
    res.status(201).json({ session: toApi(row, { cards: cardsOf(id) }) });
  });

  router.get('/:id', (req, res) => {
    const row = findOwned(req);
    res.json({ session: toApi(row, { cards: cardsOf(row.id) }) });
  });

  router.put('/:id', (req, res) => {
    const row = findOwned(req);
    if (row.status === 'abierta') {
      throw new HttpError(409, 'Cierra la sala antes de editar la sesión.');
    }
    const data = parseSession(req.body);
    inTransaction(db, () => {
      db.prepare(
        `UPDATE game_sessions SET title = ?, subject = ?, description = ?, max_participants = ?,
         duration_minutes = ?, updated_at = datetime('now') WHERE id = ?`,
      ).run(data.title, data.subject, data.description, data.maxParticipants, data.durationMinutes, row.id);
      saveCards(row.id, data.cards);
    });
    const updated = db.prepare('SELECT * FROM game_sessions WHERE id = ?').get(row.id);
    res.json({ session: toApi(updated, { cards: cardsOf(row.id) }) });
  });

  router.patch('/:id/status', (req, res) => {
    const row = findOwned(req);
    const next = req.body?.status;
    if (!TRANSITIONS[row.status].includes(next)) {
      throw new HttpError(409, `No se puede pasar de "${row.status}" a "${next}".`);
    }
    db.prepare("UPDATE game_sessions SET status = ?, updated_at = datetime('now') WHERE id = ?").run(next, row.id);
    res.json({ session: toApi({ ...row, status: next }) });
  });

  router.delete('/:id', (req, res) => {
    const row = findOwned(req);
    db.prepare('DELETE FROM game_sessions WHERE id = ?').run(row.id);
    res.status(204).end();
  });

  return router;
}
