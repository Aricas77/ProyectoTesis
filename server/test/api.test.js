import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';

const config = {
  isProd: false,
  jwtSecret: 'secreto-de-pruebas',
  jwtExpiresIn: '1h',
  cookieMaxAgeMs: 3600_000,
  bcryptRounds: 4,
};

let server;
let base;

before(async () => {
  const app = createApp({ db: openDb(':memory:'), config, rateLimit: false });
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(() => server.close());

// Cliente mínimo que conserva la cookie de sesión, como lo haría el navegador.
function client() {
  let cookie = '';
  return {
    async call(method, path, body) {
      const res = await fetch(base + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(cookie && { Cookie: cookie }) },
        body: body ? JSON.stringify(body) : undefined,
      });
      for (const header of res.headers.getSetCookie()) {
        const pair = header.split(';')[0];
        cookie = pair.endsWith('=') ? '' : pair;
      }
      const data = res.status === 204 ? null : await res.json();
      return { status: res.status, data, setCookie: res.headers.getSetCookie() };
    },
  };
}

const teacher = { name: 'Ana Docente', email: 'ana@uv.mx', password: 'Clave1234', role: 'docente' };
const student = { name: 'Beto Estudiante', email: 'beto@uv.mx', password: 'Clave1234', role: 'estudiante' };
const sessionBody = (over = {}) => ({
  title: 'Repaso de Scrum',
  subject: 'Ingeniería de Software',
  description: '',
  maxParticipants: 20,
  durationMinutes: 15,
  cards: [
    { concept: 'Sprint', definition: 'Periodo fijo para construir un incremento.' },
    { concept: 'Backlog', definition: 'Lista ordenada de lo que necesita el producto.' },
  ],
  ...over,
});

test('registro: crea la cuenta, no expone el hash y emite cookie httpOnly', async () => {
  const c = client();
  const { status, data, setCookie } = await c.call('POST', '/auth/register', teacher);
  assert.equal(status, 201);
  assert.equal(data.user.email, 'ana@uv.mx');
  assert.equal(data.user.password_hash, undefined);
  assert.match(setCookie[0], /HttpOnly/i);
});

test('registro: rechaza correo duplicado y contraseñas débiles', async () => {
  const c = client();
  assert.equal((await c.call('POST', '/auth/register', teacher)).status, 409);
  const weak = await c.call('POST', '/auth/register', { ...student, password: 'corta' });
  assert.equal(weak.status, 400);
  assert.ok(weak.data.fields.password);
});

test('login: acepta credenciales válidas y da el mismo error para correo o contraseña incorrectos', async () => {
  const c = client();
  assert.equal((await c.call('POST', '/auth/login', { email: teacher.email, password: teacher.password })).status, 200);
  const badPass = await client().call('POST', '/auth/login', { email: teacher.email, password: 'Otra12345' });
  const badMail = await client().call('POST', '/auth/login', { email: 'nadie@uv.mx', password: 'Otra12345' });
  assert.equal(badPass.status, 401);
  assert.equal(badMail.status, 401);
  assert.equal(badPass.data.error, badMail.data.error);
});

test('sesión: /me exige cookie, funciona tras login y se invalida al cerrar sesión', async () => {
  const c = client();
  assert.equal((await c.call('GET', '/auth/me')).status, 401);
  await c.call('POST', '/auth/login', { email: teacher.email, password: teacher.password });
  const me = await c.call('GET', '/auth/me');
  assert.equal(me.status, 200);
  assert.equal(me.data.user.role, 'docente');
  await c.call('POST', '/auth/logout');
  assert.equal((await c.call('GET', '/auth/me')).status, 401);
});

test('sesiones de juego: el docente crea, lista y consulta con su código', async () => {
  const t = client();
  await t.call('POST', '/auth/login', { email: teacher.email, password: teacher.password });
  const created = await t.call('POST', '/sessions', sessionBody());
  assert.equal(created.status, 201);
  assert.match(created.data.session.code, /^[A-HJ-NP-Z2-9]{6}$/);
  assert.equal(created.data.session.status, 'borrador');
  const list = await t.call('GET', '/sessions');
  assert.equal(list.data.sessions.length, 1);
  assert.equal(list.data.sessions[0].cardsCount, 2);
  const one = await t.call('GET', `/sessions/${created.data.session.id}`);
  assert.equal(one.data.session.cards.length, 2);
});

test('sesiones de juego: valida tarjetas y bloquea a estudiantes', async () => {
  const t = client();
  await t.call('POST', '/auth/login', { email: teacher.email, password: teacher.password });
  const few = await t.call('POST', '/sessions', sessionBody({ cards: [{ concept: 'A', definition: 'B' }] }));
  assert.equal(few.status, 400);
  const dup = await t.call(
    'POST',
    '/sessions',
    sessionBody({ cards: [{ concept: 'Sprint', definition: 'x' }, { concept: 'sprint', definition: 'y' }] }),
  );
  assert.ok(dup.data.fields['cards.1.concept']);

  const s = client();
  await s.call('POST', '/auth/register', student);
  assert.equal((await s.call('POST', '/sessions', sessionBody())).status, 403);
  assert.equal((await s.call('GET', '/sessions')).status, 403);
});

test('sesiones de juego: un docente no ve las sesiones de otro', async () => {
  const t = client();
  await t.call('POST', '/auth/login', { email: teacher.email, password: teacher.password });
  const { data } = await t.call('POST', '/sessions', sessionBody({ title: 'Privada de Ana' }));

  const other = client();
  await other.call('POST', '/auth/register', { ...teacher, name: 'Otro Docente', email: 'otro@uv.mx' });
  assert.equal((await other.call('GET', `/sessions/${data.session.id}`)).status, 404);
  assert.equal((await other.call('DELETE', `/sessions/${data.session.id}`)).status, 404);
});

test('ciclo de la sala: abrir, unirse con código, bloquear edición, cerrar y eliminar', async () => {
  const t = client();
  await t.call('POST', '/auth/login', { email: teacher.email, password: teacher.password });
  const { data } = await t.call('POST', '/sessions', sessionBody({ title: 'Ciclo completo' }));
  const { id, code } = data.session;

  const s = client();
  await s.call('POST', '/auth/login', { email: student.email, password: student.password });
  assert.equal((await s.call('GET', `/sessions/join/${code}`)).status, 404, 'en borrador no se puede entrar');

  assert.equal((await t.call('PATCH', `/sessions/${id}/status`, { status: 'abierta' })).status, 200);
  const join = await s.call('GET', `/sessions/join/${code.toLowerCase()}`);
  assert.equal(join.status, 200);
  assert.equal(join.data.session.teacher, 'Ana Docente');
  assert.equal(join.data.session.cardsCount, 2);

  assert.equal((await t.call('PUT', `/sessions/${id}`, sessionBody())).status, 409, 'no se edita con la sala abierta');
  assert.equal((await t.call('PATCH', `/sessions/${id}/status`, { status: 'borrador' })).status, 409);

  assert.equal((await t.call('PATCH', `/sessions/${id}/status`, { status: 'cerrada' })).status, 200);
  const edit = await t.call('PUT', `/sessions/${id}`, sessionBody({ title: 'Título nuevo' }));
  assert.equal(edit.status, 200);
  assert.equal(edit.data.session.title, 'Título nuevo');

  assert.equal((await t.call('DELETE', `/sessions/${id}`)).status, 204);
  assert.equal((await t.call('GET', `/sessions/${id}`)).status, 404);
});
