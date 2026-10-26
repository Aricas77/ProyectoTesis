import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { APP_NAME } from '../config';

const routes = [
  {
    path: '/',
    name: 'home',
    redirect: () => {
      const auth = useAuthStore();
      return auth.isAuthenticated ? auth.homeRoute : { name: 'login' };
    },
  },
  { path: '/login', name: 'login', component: () => import('../views/LoginView.vue'), meta: { guest: true, bare: true, title: 'Iniciar sesión' } },
  { path: '/registro', name: 'register', component: () => import('../views/RegisterView.vue'), meta: { guest: true, bare: true, title: 'Crear cuenta' } },
  { path: '/docente', name: 'dashboard', component: () => import('../views/DashboardView.vue'), meta: { requiresAuth: true, role: 'docente', title: 'Mis sesiones' } },
  { path: '/docente/sesiones/nueva', name: 'session-new', component: () => import('../views/SessionFormView.vue'), meta: { requiresAuth: true, role: 'docente', title: 'Nueva sesión' } },
  { path: '/docente/sesiones/:id/editar', name: 'session-edit', component: () => import('../views/SessionFormView.vue'), meta: { requiresAuth: true, role: 'docente', title: 'Editar sesión' } },
  { path: '/unirse', name: 'join', component: () => import('../views/JoinView.vue'), meta: { requiresAuth: true, role: 'estudiante', title: 'Unirse a una sala' } },
  { path: '/sala/:code', name: 'lobby', component: () => import('../views/LobbyView.vue'), meta: { requiresAuth: true, role: 'estudiante', title: 'Sala de espera' } },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../views/NotFoundView.vue'), meta: { title: 'No encontrada' } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.guest && auth.isAuthenticated) return auth.homeRoute;
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  if (to.meta.role && auth.user?.role !== to.meta.role) return auth.homeRoute;
});

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} | ${APP_NAME}` : APP_NAME;
});

export default router;
