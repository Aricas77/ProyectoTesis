import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { api } from '../services/api';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);

  const isAuthenticated = computed(() => user.value !== null);
  const isTeacher = computed(() => user.value?.role === 'docente');
  /** Pantalla de inicio según el rol. */
  const homeRoute = computed(() => ({ name: isTeacher.value ? 'dashboard' : 'join' }));

  async function fetchMe() {
    try {
      user.value = (await api.get('/auth/me', { silent: true })).user;
    } catch {
      user.value = null;
    }
  }

  async function login(credentials) {
    user.value = (await api.post('/auth/login', credentials)).user;
  }

  async function register(data) {
    user.value = (await api.post('/auth/register', data)).user;
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      user.value = null;
    }
  }

  function clear() {
    user.value = null;
  }

  return { user, isAuthenticated, isTeacher, homeRoute, fetchMe, login, register, logout, clear };
});
