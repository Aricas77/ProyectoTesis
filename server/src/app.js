import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { authRouter } from './routes/auth.js';
import { sessionsRouter } from './routes/sessions.js';
import { HttpError } from './validation.js';

export function createApp({ db, config, rateLimit = true }) {
  const app = express();
  app.disable('x-powered-by');
  // En desarrollo (http://localhost) se omite 'upgrade-insecure-requests': Safari lo aplica
  // también a localhost y deja de cargar los recursos.
  app.use(
    helmet({
      contentSecurityPolicy: { useDefaults: true, directives: { 'upgrade-insecure-requests': config.isProd ? [] : null } },
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRouter({ db, config, useRateLimit: rateLimit }));
  app.use('/api/sessions', sessionsRouter({ db, config }));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: err.message, fields: err.fields });
    }
    if (err.status && err.status < 500) {
      return res.status(err.status).json({ error: 'La solicitud no es válida.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  });

  return app;
}
