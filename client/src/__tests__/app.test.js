import { describe, it, expect, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createApp, nextTick } from 'vue';

// --- Servidor simulado: responde como lo haría la API real -------------------
const users = {
  'ana@uv.mx': { id: 1, name: 'Ana Docente', email: 'ana@uv.mx', role: 'docente', password: 'Clave1234' },
};
let loggedIn = null;
let sessions = [];

function fakeFetch(url, { method = 'GET', body } = {}) {
  const json = (status, data) => Promise.resolve({ ok: status < 400, status, json: async () => data ?? {} });
  const data = body ? JSON.parse(body) : {};
  const path = url.replace('/api', '');
  if (path === '/auth/me') return loggedIn ? json(200, { user: loggedIn }) : json(401, { error: 'No autenticado' });
  if (path === '/auth/login') {
    const u = users[data.email];
    if (!u || u.password !== data.password) return json(401, { error: 'Correo o contraseña incorrectos.' });
    const { password, ...user } = u;
    loggedIn = user;
    return json(200, { user });
  }
  if (path === '/auth/logout') {
    loggedIn = null;
    return Promise.resolve({ ok: true, status: 204 });
  }
  if (path === '/sessions' && method === 'GET') return json(200, { sessions });
  if (path === '/sessions' && method === 'POST') {
    sessions = [{ id: 9, code: 'ABC234', status: 'borrador', cardsCount: data.cards.length, ...data }];
    return json(201, { session: sessions[0] });
  }
  return json(404, { error: 'Ruta no encontrada.' });
}

async function bootApp(path = '/') {
  const [{ default: App }, { default: router }, { useAuthStore }] = await Promise.all([
    import('../App.vue'),
    import('../router'),
    import('../stores/auth'),
  ]);
  const pinia = createPinia();
  setActivePinia(pinia);
  await useAuthStore().fetchMe();
  document.body.innerHTML = '<div id="root"></div>';
  const app = createApp(App).use(pinia).use(router);
  await router.push(path);
  await router.isReady();
  app.mount('#root');
  await flushPromises();
  return { router, auth: useAuthStore() };
}

const text = () => document.body.textContent.replace(/\s+/g, ' ');
const setInput = async (selector, value) => {
  const el = document.querySelector(selector);
  el.value = value;
  el.dispatchEvent(new Event('input'));
  await nextTick();
};

beforeEach(() => {
  loggedIn = null;
  sessions = [];
  vi.stubGlobal('fetch', vi.fn(fakeFetch));
  window.scrollTo = vi.fn();
  vi.resetModules();
});

describe('acceso', () => {
  it('redirige al login cuando no hay sesión y protege las rutas', async () => {
    const { router } = await bootApp('/docente');
    expect(router.currentRoute.value.name).toBe('login');
    expect(router.currentRoute.value.query.redirect).toBe('/docente');
    expect(text()).toContain('Inicia sesión');
  });

  it('muestra errores accesibles si el formulario está vacío y no llama al servidor', async () => {
    await bootApp('/login');
    document.querySelector('form').dispatchEvent(new Event('submit'));
    await flushPromises();
    expect(text()).toContain('Escribe un correo válido');
    expect(text()).toContain('Escribe tu contraseña');
    expect(document.querySelector('#email').getAttribute('aria-invalid')).toBe('true');
    expect(fetch).not.toHaveBeenCalledWith('/api/auth/login', expect.anything());
  });

  it('muestra el mensaje del servidor con credenciales incorrectas', async () => {
    await bootApp('/login');
    await setInput('#email', 'ana@uv.mx');
    await setInput('#password', 'Equivocada1');
    document.querySelector('form').dispatchEvent(new Event('submit'));
    await flushPromises();
    expect(text()).toContain('Correo o contraseña incorrectos.');
  });

  it('inicia sesión como docente, llega a su panel y puede cerrar sesión', async () => {
    const { router, auth } = await bootApp('/login');
    await setInput('#email', 'ana@uv.mx');
    await setInput('#password', 'Clave1234');
    document.querySelector('form').dispatchEvent(new Event('submit'));
    // Las vistas se cargan de forma diferida: se espera a que termine la navegación.
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('dashboard'));
    await vi.waitFor(() => expect(text()).toContain('Aún no tienes sesiones'));
    expect(auth.user.name).toBe('Ana Docente');
    expect(text()).toContain('Mis sesiones');

    [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Cerrar sesión')).click();
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('login'));
    expect(auth.user).toBeNull();
  });

  it('un docente con sesión activa no puede entrar al login ni a rutas de estudiante', async () => {
    loggedIn = { id: 1, name: 'Ana Docente', email: 'ana@uv.mx', role: 'docente' };
    const { router } = await bootApp('/login');
    expect(router.currentRoute.value.name).toBe('dashboard');
    await router.push('/unirse');
    expect(router.currentRoute.value.name).toBe('dashboard');
  });
});

describe('registro', () => {
  it('valida contraseña y confirmación antes de enviar', async () => {
    await bootApp('/registro');
    await setInput('#name', 'Beto');
    await setInput('#email', 'beto@uv.mx');
    await setInput('#password', 'corta');
    await setInput('#confirm', 'otra');
    document.querySelector('form').dispatchEvent(new Event('submit'));
    await flushPromises();
    expect(text()).toContain('Usa al menos 8 caracteres');
    expect(text()).toContain('Las contraseñas no coinciden.');
  });
});

describe('configuración de sesiones', () => {
  beforeEach(() => {
    loggedIn = { id: 1, name: 'Ana Docente', email: 'ana@uv.mx', role: 'docente' };
  });

  it('valida el formulario, permite agregar y quitar pares y guarda la sesión', async () => {
    const { router } = await bootApp('/docente/sesiones/nueva');
    expect(document.querySelectorAll('.pair-edit').length).toBe(2);

    // Vacío: marca campos y no envía
    document.querySelector('form').dispatchEvent(new Event('submit'));
    await flushPromises();
    expect(text()).toContain('El nombre debe tener al menos 3 caracteres.');
    expect(text()).toContain('Escribe el concepto.');
    expect(fetch).not.toHaveBeenCalledWith('/api/sessions', expect.objectContaining({ method: 'POST' }));

    // Agregar un tercer par y volver a quitarlo
    [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Agregar par')).click();
    await flushPromises();
    expect(document.querySelectorAll('.pair-edit').length).toBe(3);
    document.querySelector('.pair-remove').click();
    await flushPromises();
    expect(document.querySelectorAll('.pair-edit').length).toBe(2);
    expect(document.querySelector('.pair-remove').disabled).toBe(true);

    // Completar y guardar
    await setInput('#title', 'Repaso de Scrum');
    await setInput('#subject', 'Ingeniería de Software');
    await setInput('#concept-0', 'Sprint');
    await setInput('#definition-0', 'Periodo fijo para construir un incremento.');
    await setInput('#concept-1', 'Backlog');
    await setInput('#definition-1', 'Lista ordenada de lo que necesita el producto.');
    document.querySelector('form').dispatchEvent(new Event('submit'));
    await flushPromises();

    const post = fetch.mock.calls.find(([u, o]) => u === '/api/sessions' && o?.method === 'POST');
    expect(post).toBeTruthy();
    const payload = JSON.parse(post[1].body);
    expect(payload.maxParticipants).toBe(30);
    expect(payload.cards).toHaveLength(2);
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('dashboard'));
    await vi.waitFor(() => expect(text()).toContain('ABC234'));
    expect(text()).toContain('Repaso de Scrum');
  });
});
