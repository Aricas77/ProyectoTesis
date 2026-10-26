<script setup>
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import AuthLayout from '../components/AuthLayout.vue';
import FormField from '../components/FormField.vue';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const form = reactive({ email: '', password: '' });
const errors = reactive({ email: '', password: '' });
const formError = ref(route.query.expired ? 'Tu sesión expiró. Inicia sesión de nuevo.' : '');
const loading = ref(false);
const showPassword = ref(false);

function validate() {
  errors.email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ? '' : 'Escribe un correo válido, por ejemplo nombre@uv.mx.';
  errors.password = form.password ? '' : 'Escribe tu contraseña.';
  return !errors.email && !errors.password;
}

async function submit() {
  formError.value = '';
  if (!validate()) return;
  loading.value = true;
  try {
    await auth.login({ email: form.email.trim(), password: form.password });
    // Solo se aceptan rutas internas como destino de redirección.
    const redirect = typeof route.query.redirect === 'string' && /^\/(?!\/)/.test(route.query.redirect) ? route.query.redirect : null;
    router.push(redirect ?? auth.homeRoute);
  } catch (e) {
    formError.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthLayout>
    <h1>Inicia sesión</h1>
    <p class="lead">Entra para crear sesiones o unirte a una sala.</p>

    <p v-if="formError" class="alert alert-error" role="alert">{{ formError }}</p>

    <form novalidate @submit.prevent="submit">
      <FormField id="email" label="Correo" :error="errors.email">
        <template #default="{ attrs }">
          <input v-bind="attrs" v-model="form.email" type="email" autocomplete="username" inputmode="email" autofocus />
        </template>
      </FormField>

      <FormField id="password" label="Contraseña" :error="errors.password">
        <template #default="{ attrs }">
          <div class="input-group">
            <input v-bind="attrs" v-model="form.password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" />
            <button type="button" class="input-toggle" :aria-pressed="showPassword" @click="showPassword = !showPassword">
              {{ showPassword ? 'Ocultar' : 'Mostrar' }}
            </button>
          </div>
        </template>
      </FormField>

      <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
        {{ loading ? 'Entrando…' : 'Iniciar sesión' }}
      </button>
    </form>

    <p class="switch">¿Aún no tienes cuenta? <RouterLink :to="{ name: 'register' }">Crear cuenta</RouterLink></p>
  </AuthLayout>
</template>
