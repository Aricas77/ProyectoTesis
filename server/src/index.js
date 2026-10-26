import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { config } from './config.js';
import { openDb } from './db.js';
import { createApp } from './app.js';

const db = openDb(config.dbFile);
const app = createApp({ db, config });

// Si el cliente ya fue compilado (npm run build), el mismo servidor lo sirve.
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.use((req, res, next) => (req.method === 'GET' ? res.sendFile(path.join(dist, 'index.html')) : next()));
}

app.listen(config.port, () => {
  console.log(`API lista en http://localhost:${config.port}`);
});
