// Datos de demostración: npm run seed --prefix server
import bcrypt from 'bcryptjs';
import { config } from '../src/config.js';
import { openDb } from '../src/db.js';

const db = openDb(config.dbFile);
const hash = bcrypt.hashSync('Demo1234', config.bcryptRounds);

const addUser = db.prepare('INSERT OR IGNORE INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)');
addUser.run('Docente de Prueba', 'docente@demo.mx', hash, 'docente');
addUser.run('Estudiante de Prueba', 'estudiante@demo.mx', hash, 'estudiante');

const teacher = db.prepare('SELECT id FROM users WHERE email = ?').get('docente@demo.mx');
if (!db.prepare('SELECT 1 FROM game_sessions WHERE code = ?').get('SCRUM26')) {
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO game_sessions (owner_id, title, subject, description, code, max_participants, duration_minutes, status)
       VALUES (?, 'Fundamentos de Scrum', 'Ingeniería de Software', 'Repaso de eventos y artefactos de Scrum.', 'SCRUM26', 30, 20, 'abierta')`,
    )
    .run(teacher.id);
  const cards = [
    ['Sprint', 'Periodo de duración fija en el que se construye un incremento de software utilizable.'],
    ['Product Backlog', 'Lista ordenada de todo lo que el producto necesita; la gestiona el Product Owner.'],
    ['Incremento', 'Resultado utilizable de un sprint que se suma a los incrementos anteriores.'],
    ['Retrospectiva', 'Evento al final del sprint para identificar cómo mejorar la forma de trabajar.'],
  ];
  const insert = db.prepare('INSERT INTO cards (session_id, concept, definition, position) VALUES (?, ?, ?, ?)');
  cards.forEach(([c, d], i) => insert.run(lastInsertRowid, c, d, i));
}
console.log('Listo. Docente: docente@demo.mx / Demo1234 · Estudiante: estudiante@demo.mx / Demo1234 · Sala demo: SCRUM26');
