<script setup>
defineProps({ size: { type: Number, default: 32 } });
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
    <path d="M3 6a3 3 0 0 1 3-3h10v26H6a3 3 0 0 1-3-3z" fill="#4A5A78" />
    <circle cx="16" cy="16" r="4" fill="#4A5A78" />
    <path d="M16 3h10a3 3 0 0 1 3 3v20a3 3 0 0 1-3 3H16V20a4 4 0 0 1 0-8z" fill="#D9B866" />
  </svg>
</template>
