import { createApp } from 'vue';
import { createPinia } from 'pinia';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import './assets/main.css';
import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth';
import { setUnauthorizedHandler } from './services/api';

async function bootstrap() {
  const pinia = createPinia();
  const app = createApp(App).use(pinia);

  // Se consulta la sesión ANTES de activar el router para que los guards
  // conozcan al usuario desde la primera navegación (evita parpadeos al recargar).
  const auth = useAuthStore(pinia);
  await auth.fetchMe();

  setUnauthorizedHandler(() => {
    auth.clear();
    router.push({ name: 'login', query: { expired: '1' } });
  });

  app.use(router).mount('#app');
}

bootstrap();
