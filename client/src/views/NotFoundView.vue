<script setup>
import { useAuthStore } from '../stores/auth';
const auth = useAuthStore();
</script>

<template>
  <div class="shell shell-narrow">
    <h1>No encontramos esa página</h1>
    <p class="lead">La dirección no existe o cambió de lugar.</p>
    <RouterLink :to="auth.isAuthenticated ? auth.homeRoute : { name: 'login' }" class="btn btn-primary">
      {{ auth.isAuthenticated ? 'Ir a mi inicio' : 'Ir a iniciar sesión' }}
    </RouterLink>
  </div>
</template>
