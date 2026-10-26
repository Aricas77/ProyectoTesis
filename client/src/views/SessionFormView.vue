<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../services/api';
import FormField from '../components/FormField.vue';
import CardPairEditor from '../components/CardPairEditor.vue';

const route = useRoute();
const router = useRouter();
const editingId = computed(() => route.params.id ?? null);

const form = reactive({
  title: '',
  subject: '',
  description: '',
  maxParticipants: 30,
  durationMinutes: 20,
  cards: [
    { concept: '', definition: '' },
    { concept: '', definition: '' },
  ],
});
const errors = ref({});
const formError = ref('');
const loading = ref(false);
const saving = ref(false);

function validate() {
  const e = {};
  if (form.title.trim().length < 3) e.title = 'El nombre debe tener al menos 3 caracteres.';
  if (form.subject.trim().length < 2) e.subject = 'Indica la materia o experiencia educativa.';
  if (!Number.isInteger(form.maxParticipants) || form.maxParticipants < 2 || form.maxParticipants > 500) {
    e.maxParticipants = 'Escribe un número entero entre 2 y 500.';
  }
  if (!Number.isInteger(form.durationMinutes) || form.durationMinutes < 5 || form.durationMinutes > 180) {
    e.durationMinutes = 'Escribe una duración entre 5 y 180 minutos.';
  }
  const seen = new Set();
  form.cards.forEach((c, i) => {
    const concept = c.concept.trim();
    if (!concept) e[`cards.${i}.concept`] = 'Escribe el concepto.';
    else if (seen.has(concept.toLowerCase())) e[`cards.${i}.concept`] = 'Este concepto ya está en otra tarjeta.';
    else seen.add(concept.toLowerCase());
    if (!c.definition.trim()) e[`cards.${i}.definition`] = 'Escribe la definición.';
  });
  errors.value = e;
  return Object.keys(e).length === 0;
}

// Convierte "cards.0.concept" en "0.concept" para el editor de tarjetas.
const cardErrors = computed(() =>
  Object.fromEntries(Object.entries(errors.value).filter(([k]) => k.startsWith('cards.')).map(([k, v]) => [k.slice(6), v])),
);

async function submit() {
  formError.value = '';
  if (!validate()) {
    formError.value = 'Revisa los campos marcados.';
    return;
  }
  saving.value = true;
  const payload = {
    title: form.title,
    subject: form.subject,
    description: form.description,
    maxParticipants: form.maxParticipants,
    durationMinutes: form.durationMinutes,
    cards: form.cards,
  };
  try {
    if (editingId.value) await api.put(`/sessions/${editingId.value}`, payload);
    else await api.post('/sessions', payload);
    router.push({ name: 'dashboard' });
  } catch (e) {
    errors.value = e.fields ?? {};
    formError.value = e.message;
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  if (!editingId.value) return;
  loading.value = true;
  try {
    const { session } = await api.get(`/sessions/${editingId.value}`);
    Object.assign(form, {
      title: session.title,
      subject: session.subject,
      description: session.description,
      maxParticipants: session.maxParticipants,
      durationMinutes: session.durationMinutes,
      cards: session.cards,
    });
  } catch (e) {
    formError.value = e.message;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="shell shell-narrow">
    <RouterLink :to="{ name: 'dashboard' }" class="back-link">Volver a mis sesiones</RouterLink>
    <h1>{{ editingId ? 'Editar sesión' : 'Nueva sesión' }}</h1>

    <p v-if="formError" class="alert alert-error" role="alert">{{ formError }}</p>
    <p v-if="loading" class="muted" role="status">Cargando la sesión…</p>

    <form v-else novalidate class="form-sheet" @submit.prevent="submit">
      <FormField id="title" label="Nombre de la sesión" :error="errors.title">
        <template #default="{ attrs }">
          <input v-bind="attrs" v-model="form.title" type="text" maxlength="100" />
        </template>
      </FormField>

      <FormField id="subject" label="Materia o experiencia educativa" :error="errors.subject">
        <template #default="{ attrs }">
          <input v-bind="attrs" v-model="form.subject" type="text" maxlength="100" />
        </template>
      </FormField>

      <FormField id="description" label="Descripción (opcional)" :error="errors.description" hint="Se muestra a los estudiantes en la sala de espera.">
        <template #default="{ attrs }">
          <textarea v-bind="attrs" v-model="form.description" rows="3" maxlength="500"></textarea>
        </template>
      </FormField>

      <div class="field-row">
        <FormField id="maxParticipants" label="Máximo de participantes" :error="errors.maxParticipants">
          <template #default="{ attrs }">
            <input v-bind="attrs" v-model.number="form.maxParticipants" type="number" min="2" max="500" inputmode="numeric" />
          </template>
        </FormField>
        <FormField id="durationMinutes" label="Duración (minutos)" :error="errors.durationMinutes">
          <template #default="{ attrs }">
            <input v-bind="attrs" v-model.number="form.durationMinutes" type="number" min="5" max="180" inputmode="numeric" />
          </template>
        </FormField>
      </div>

      <CardPairEditor v-model="form.cards" :errors="cardErrors" :general-error="errors.cards" />

      <div class="form-actions">
        <button type="submit" class="btn btn-primary" :disabled="saving">
          {{ saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Guardar sesión' }}
        </button>
        <RouterLink :to="{ name: 'dashboard' }" class="btn btn-ghost">Cancelar</RouterLink>
      </div>
      <p v-if="!editingId" class="field-hint">La sesión se guarda como borrador. Ábrela desde tu lista cuando quieras que el grupo entre.</p>
    </form>
  </div>
</template>
