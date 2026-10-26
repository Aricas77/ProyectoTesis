<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import AuthLayout from '../components/AuthLayout.vue';
import FormField from '../components/FormField.vue';

const auth = useAuthStore();
const router = useRouter();

const form = reactive({ name: '', email: '', role: 'estudiante', password: '', confirm: '' });
const errors = reactive({ name: '', email: '', role: '', password: '', confirm: '' });
const formError = ref('');
const loading = ref(false);

function validate() {
  errors.name = form.name.trim().length >= 2 ? '' : 'Escribe tu nombre completo.';
  errors.email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ? '' : 'Escribe un correo válido, por ejemplo nombre@uv.mx.';
  errors.password =
    form.password.length >= 8 && /[A-Za-z]/.test(form.password) && /\d/.test(form.password)
      ? ''
      : 'Usa al menos 8 caracteres, con una letra y un número.';
  errors.confirm = form.confirm === form.password ? '' : 'Las contraseñas no coinciden.';
  return !errors.name && !errors.email && !errors.password && !errors.confirm;
}

async function submit() {
  formError.value = '';
  if (!validate()) return;
  loading.value = true;
  try {
    await auth.register({ name: form.name, email: form.email, password: form.password, role: form.role });
    router.push(auth.homeRoute);
  } catch (e) {
    // El servidor devuelve errores por campo (por ejemplo, correo ya registrado).
    Object.keys(errors).forEach((key) => {
      if (e.fields?.[key]) errors[key] = e.fields[key];
    });
    formError.value = e.fields && Object.keys(e.fields).length ? 'Revisa los campos marcados.' : e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthLayout>
    <h1>Crea tu cuenta</h1>
    <p class="lead">Elige tu rol: define lo que verás al entrar.</p>

    <p v-if="formError" class="alert alert-error" role="alert">{{ formError }}</p>

    <form novalidate @submit.prevent="submit">
      <fieldset class="role-group">
        <legend>Soy</legend>
        <label class="choice">
          <input v-model="form.role" type="radio" name="role" value="estudiante" />
          <span class="choice-body"><strong>Estudiante</strong><small>Me uno a salas con un código</small></span>
        </label>
        <label class="choice">
          <input v-model="form.role" type="radio" name="role" value="docente" />
          <span class="choice-body"><strong>Docente</strong><small>Creo y configuro sesiones</small></span>
        </label>
      </fieldset>

      <FormField id="name" label="Nombre completo" :error="errors.name">
        <template #default="{ attrs }">
          <input v-bind="attrs" v-model="form.name" type="text" autocomplete="name" />
        </template>
      </FormField>

      <FormField id="email" label="Correo" :error="errors.email">
        <template #default="{ attrs }">
          <input v-bind="attrs" v-model="form.email" type="email" autocomplete="username" inputmode="email" />
        </template>
      </FormField>

      <FormField id="password" label="Contraseña" :error="errors.password" hint="Mínimo 8 caracteres, con al menos una letra y un número.">
        <template #default="{ attrs }">
          <input v-bind="attrs" v-model="form.password" type="password" autocomplete="new-password" />
        </template>
      </FormField>

      <FormField id="confirm" label="Confirma tu contraseña" :error="errors.confirm">
        <template #default="{ attrs }">
          <input v-bind="attrs" v-model="form.confirm" type="password" autocomplete="new-password" />
        </template>
      </FormField>

      <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
        {{ loading ? 'Creando cuenta…' : 'Crear cuenta' }}
      </button>
    </form>

    <p class="switch">¿Ya tienes cuenta? <RouterLink :to="{ name: 'login' }">Inicia sesión</RouterLink></p>
  </AuthLayout>
</template>
