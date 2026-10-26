<script setup>
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { APP_NAME } from '../config';
import BrandMark from './BrandMark.vue';

const auth = useAuthStore();
const router = useRouter();

async function logout() {
  await auth.logout();
  router.push({ name: 'login' });
}
</script>

<template>
  <header class="app-header">
    <div class="app-header-inner">
      <RouterLink :to="auth.isAuthenticated ? auth.homeRoute : { name: 'login' }" class="brand">
        <BrandMark :size="30" />
        <span>{{ APP_NAME }}</span>
      </RouterLink>
      <div v-if="auth.user" class="app-header-user">
        <span class="user-name">{{ auth.user.name }}</span>
        <span class="role-chip">{{ auth.user.role === 'docente' ? 'Docente' : 'Estudiante' }}</span>
        <button type="button" class="btn btn-ghost btn-sm" @click="logout">Cerrar sesión</button>
      </div>
    </div>
  </header>
</template>
