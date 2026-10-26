<script setup>
import { computed } from 'vue';

const props = defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
});

// Atributos de accesibilidad que el <input> del slot debe enlazar con v-bind.
const attrs = computed(() => ({
  id: props.id,
  'aria-invalid': props.error ? 'true' : undefined,
  'aria-describedby': props.error ? `${props.id}-error` : props.hint ? `${props.id}-hint` : undefined,
}));
</script>

<template>
  <div class="field" :class="{ 'has-error': error }">
    <label :for="id">{{ label }}</label>
    <slot :attrs="attrs" />
    <p v-if="error" :id="`${id}-error`" class="field-error" role="alert">{{ error }}</p>
    <p v-else-if="hint" :id="`${id}-hint`" class="field-hint">{{ hint }}</p>
  </div>
</template>
