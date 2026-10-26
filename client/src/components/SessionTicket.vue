<script setup>
import { computed, ref } from 'vue';

const props = defineProps({ session: { type: Object, required: true } });
const emit = defineEmits(['change-status', 'remove']);

const STATUS = {
  borrador: { label: 'Borrador', action: 'Abrir sala', next: 'abierta' },
  abierta: { label: 'Abierta', action: 'Cerrar sala', next: 'cerrada' },
  cerrada: { label: 'Cerrada', action: 'Reabrir sala', next: 'abierta' },
};
const info = computed(() => STATUS[props.session.status]);
const copied = ref(false);

async function copyCode() {
  try {
    await navigator.clipboard.writeText(props.session.code);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1800);
  } catch {
    /* Sin permiso de portapapeles: el código sigue visible para dictarlo. */
  }
}
</script>

<template>
  <li class="ticket">
    <div class="ticket-stub">
      <span class="stub-label">Código de sala</span>
      <span class="stub-code" aria-label="Código de sala">{{ session.code }}</span>
      <button type="button" class="stub-copy" @click="copyCode">
        <span aria-live="polite">{{ copied ? 'Copiado' : 'Copiar código' }}</span>
      </button>
    </div>

    <div class="ticket-body">
      <div class="ticket-head">
        <h2>{{ session.title }}</h2>
        <span class="badge" :class="`badge-${session.status}`">{{ info.label }}</span>
      </div>
      <p class="ticket-subject">{{ session.subject }}</p>
      <ul class="ticket-meta">
        <li>{{ session.cardsCount }} {{ session.cardsCount === 1 ? 'par de tarjetas' : 'pares de tarjetas' }}</li>
        <li>Hasta {{ session.maxParticipants }} participantes</li>
        <li>{{ session.durationMinutes }} min</li>
      </ul>
      <div class="ticket-actions">
        <button type="button" class="btn btn-primary btn-sm" @click="emit('change-status', info.next)">{{ info.action }}</button>
        <RouterLink
          v-if="session.status !== 'abierta'"
          :to="{ name: 'session-edit', params: { id: session.id } }"
          class="btn btn-ghost btn-sm"
        >
          Editar
        </RouterLink>
        <span v-else class="ticket-note">Cierra la sala para editar</span>
        <button type="button" class="btn btn-quiet btn-sm" @click="emit('remove')">Eliminar</button>
      </div>
    </div>
  </li>
</template>
