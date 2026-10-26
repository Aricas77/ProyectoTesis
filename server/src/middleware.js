import jwt from 'jsonwebtoken';

export const COOKIE_NAME = 'gc_token';

const cookieOptions = (config) => ({ httpOnly: true, sameSite: 'lax', secure: config.isProd, path: '/' });

export function signToken(user, config) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

export function setAuthCookie(res, token, config) {
  res.cookie(COOKIE_NAME, token, { ...cookieOptions(config), maxAge: config.cookieMaxAgeMs });
}

export function clearAuthCookie(res, config) {
  res.clearCookie(COOKIE_NAME, cookieOptions(config));
}

export function authenticate({ db, config }) {
  return (req, res, next) => {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return res.status(401).json({ error: 'Inicia sesión para continuar.' });
    try {
      const payload = jwt.verify(token, config.jwtSecret);
      const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(payload.sub);
      if (!user) throw new Error('usuario inexistente');
      req.user = user;
      next();
    } catch {
      res.status(401).json({ error: 'Tu sesión expiró. Inicia sesión de nuevo.' });
    }
  };
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (roles.includes(req.user.role)) return next();
    res.status(403).json({ error: 'Tu cuenta no tiene permiso para esta acción.' });
  };
}
