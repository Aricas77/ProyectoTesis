import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { HttpError, parseLogin, parseRegister } from '../validation.js';
import { authenticate, clearAuthCookie, setAuthCookie, signToken } from '../middleware.js';

export function authRouter({ db, config, useRateLimit }) {
  const router = Router();

  const limiter = useRateLimit
    ? rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 30,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: { error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' },
      })
    : (req, res, next) => next();

  // Hash de relleno: evita que el tiempo de respuesta revele si un correo existe.
  const dummyHash = bcrypt.hashSync('contraseña-de-relleno-1', config.bcryptRounds);

  router.post('/register', limiter, async (req, res) => {
    const data = parseRegister(req.body);
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(data.email)) {
      throw new HttpError(409, 'Ya existe una cuenta con ese correo.', { email: 'Ya existe una cuenta con ese correo.' });
    }
    const hash = await bcrypt.hash(data.password, config.bcryptRounds);
    const { lastInsertRowid } = db
      .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
      .run(data.name, data.email, hash, data.role);
    const user = { id: Number(lastInsertRowid), name: data.name, email: data.email, role: data.role };
    setAuthCookie(res, signToken(user, config), config);
    res.status(201).json({ user });
  });

  router.post('/login', limiter, async (req, res) => {
    const { email, password } = parseLogin(req.body);
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    const ok = await bcrypt.compare(password, row?.password_hash ?? dummyHash);
    if (!row || !ok) throw new HttpError(401, 'Correo o contraseña incorrectos.');
    const user = { id: row.id, name: row.name, email: row.email, role: row.role };
    setAuthCookie(res, signToken(user, config), config);
    res.json({ user });
  });

  router.post('/logout', (req, res) => {
    clearAuthCookie(res, config);
    res.status(204).end();
  });

  router.get('/me', authenticate({ db, config }), (req, res) => {
    res.json({ user: req.user });
  });

  return router;
}
