import 'dotenv/config';

const isProd = process.env.NODE_ENV === 'production';
const jwtSecret = process.env.JWT_SECRET || (isProd ? '' : 'secreto-solo-para-desarrollo');

if (!jwtSecret) {
  throw new Error('Falta JWT_SECRET. Defínelo en el entorno antes de iniciar en producción.');
}
if (!process.env.JWT_SECRET) {
  console.warn('[aviso] Usando un JWT_SECRET de desarrollo. Define JWT_SECRET en server/.env antes de desplegar.');
}

export const config = {
  port: Number(process.env.PORT) || 3001,
  isProd,
  jwtSecret,
  jwtExpiresIn: '8h',
  cookieMaxAgeMs: 8 * 60 * 60 * 1000,
  bcryptRounds: 10,
  dbFile: process.env.DB_FILE || 'data/app.db',
};
