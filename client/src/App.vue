<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AppHeader from './components/AppHeader.vue';

const route = useRoute();
const showHeader = computed(() => !route.meta.bare);
</script>

<template>
  <a class="skip-link" href="#main">Saltar al contenido</a>
  <AppHeader v-if="showHeader" />
  <main id="main" tabindex="-1">
    <RouterView />
  </main>
</template>
