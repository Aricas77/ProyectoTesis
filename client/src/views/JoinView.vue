<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../services/api';
import FormField from '../components/FormField.vue';

const router = useRouter();
const code = ref('');
const error = ref('');
const loading = ref(false);

async function submit() {
  error.value = '';
  const value = code.value.trim().toUpperCase();
  if (value.length < 6) {
    error.value = 'El código tiene 6 caracteres. Pídelo a tu docente.';
    return;
  }
  loading.value = true;
  try {
    await api.get(`/sessions/join/${encodeURIComponent(value)}`);
    router.push({ name: 'lobby', params: { code: value } });
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="shell shell-narrow">
    <h1>Únete a una sala</h1>
    <p class="lead">Escribe el código que tu docente compartió en clase.</p>

    <form novalidate class="join-form" @submit.prevent="submit">
      <FormField id="code" label="Código de sala" :error="error">
        <template #default="{ attrs }">
          <input
            v-bind="attrs"
            v-model="code"
            class="code-input"
            type="text"
            maxlength="6"
            autocomplete="off"
            autocapitalize="characters"
            spellcheck="false"
            placeholder="ABC123"
            autofocus
          />
        </template>
      </FormField>
      <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
        {{ loading ? 'Buscando sala…' : 'Entrar a la sala' }}
      </button>
    </form>
  </div>
</template>
