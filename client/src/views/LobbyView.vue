<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../services/api';

const route = useRoute();
const router = useRouter();
const session = ref(null);
const error = ref('');

onMounted(async () => {
  try {
    session.value = (await api.get(`/sessions/join/${encodeURIComponent(route.params.code)}`)).session;
  } catch (e) {
    error.value = e.message;
  }
});
</script>

<template>
  <div class="shell shell-narrow">
    <template v-if="session">
      <h1>{{ session.title }}</h1>
      <p class="lead">{{ session.subject }}, con {{ session.teacher }}</p>
      <p v-if="session.description">{{ session.description }}</p>

      <div class="lobby" role="status">
        <div class="lobby-pair" aria-hidden="true"><span></span><span></span></div>
        <div>
          <strong>Esperando a que tu docente inicie la dinámica.</strong>
          <p>Cuando empiece, aquí aparecerá tu tarjeta con la mitad de un concepto.</p>
        </div>
      </div>

      <ul class="ticket-meta">
        <li>{{ session.cardsCount }} pares de tarjetas</li>
        <li>{{ session.durationMinutes }} min</li>
        <li>Hasta {{ session.maxParticipants }} participantes</li>
      </ul>

      <button type="button" class="btn btn-ghost" @click="router.push({ name: 'join' })">Salir de la sala</button>
    </template>

    <template v-else-if="error">
      <h1>No pudimos abrir la sala</h1>
      <p class="alert alert-error" role="alert">{{ error }}</p>
      <RouterLink :to="{ name: 'join' }" class="btn btn-primary">Probar con otro código</RouterLink>
    </template>

    <p v-else class="muted" role="status">Entrando a la sala…</p>
  </div>
</template>
