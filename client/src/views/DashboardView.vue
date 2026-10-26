<script setup>
import { onMounted, ref } from 'vue';
import { api } from '../services/api';
import SessionTicket from '../components/SessionTicket.vue';

const sessions = ref([]);
const loading = ref(true);
const error = ref('');

async function load() {
  loading.value = true;
  error.value = '';
  try {
    sessions.value = (await api.get('/sessions')).sessions;
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function changeStatus(session, status) {
  error.value = '';
  try {
    const { session: updated } = await api.patch(`/sessions/${session.id}/status`, { status });
    session.status = updated.status;
  } catch (e) {
    error.value = e.message;
  }
}

async function remove(session) {
  if (!window.confirm(`¿Eliminar la sesión "${session.title}"? Esta acción no se puede deshacer.`)) return;
  error.value = '';
  try {
    await api.delete(`/sessions/${session.id}`);
    sessions.value = sessions.value.filter((s) => s.id !== session.id);
  } catch (e) {
    error.value = e.message;
  }
}

onMounted(load);
</script>

<template>
  <div class="shell">
    <div class="page-head">
      <div>
        <h1>Mis sesiones</h1>
        <p class="lead">Configura la dinámica, abre la sala y comparte el código con tu grupo.</p>
      </div>
      <RouterLink :to="{ name: 'session-new' }" class="btn btn-primary">Nueva sesión</RouterLink>
    </div>

    <p v-if="error" class="alert alert-error" role="alert">
      {{ error }} <button type="button" class="link-button" @click="load">Reintentar</button>
    </p>

    <p v-if="loading" class="muted" role="status">Cargando tus sesiones…</p>

    <div v-else-if="!sessions.length && !error" class="empty">
      <div class="empty-pair" aria-hidden="true"><span></span><span></span></div>
      <h2>Aún no tienes sesiones</h2>
      <p>Crea una con los conceptos y definiciones que quieres trabajar. Tu grupo se une con un código de seis caracteres.</p>
      <RouterLink :to="{ name: 'session-new' }" class="btn btn-primary">Crear mi primera sesión</RouterLink>
    </div>

    <ul v-else class="ticket-list">
      <SessionTicket
        v-for="s in sessions"
        :key="s.id"
        :session="s"
        @change-status="(status) => changeStatus(s, status)"
        @remove="remove(s)"
      />
    </ul>
  </div>
</template>
