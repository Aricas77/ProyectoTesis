<script setup>
import FormField from './FormField.vue';

const MAX_PAIRS = 50;
const MIN_PAIRS = 2;

const cards = defineModel({ type: Array, required: true });
defineProps({
  /** Errores por campo, con claves como "0.concept" o "1.definition". */
  errors: { type: Object, default: () => ({}) },
  generalError: { type: String, default: '' },
});

function add() {
  if (cards.value.length < MAX_PAIRS) cards.value = [...cards.value, { concept: '', definition: '' }];
}

function remove(index) {
  if (cards.value.length > MIN_PAIRS) cards.value = cards.value.filter((_, i) => i !== index);
}
</script>

<template>
  <fieldset class="pairs">
    <legend>Tarjetas de la dinámica</legend>
    <p class="field-hint">
      Cada par se reparte en dos mitades: una persona recibe el concepto y otra la definición. Agrega al menos {{ MIN_PAIRS }} pares.
    </p>
    <p v-if="generalError" class="field-error" role="alert">{{ generalError }}</p>

    <ol class="pair-list">
      <li v-for="(card, i) in cards" :key="i" class="pair-edit">
        <FormField :id="`concept-${i}`" :label="`Concepto ${i + 1}`" :error="errors[`${i}.concept`]" class="pair-concept">
          <template #default="{ attrs }">
            <input v-bind="attrs" v-model="card.concept" type="text" maxlength="120" autocomplete="off" />
          </template>
        </FormField>
        <FormField :id="`definition-${i}`" :label="`Definición ${i + 1}`" :error="errors[`${i}.definition`]" class="pair-definition">
          <template #default="{ attrs }">
            <textarea v-bind="attrs" v-model="card.definition" rows="2" maxlength="400"></textarea>
          </template>
        </FormField>
        <button
          type="button"
          class="btn btn-ghost btn-sm pair-remove"
          :disabled="cards.length <= MIN_PAIRS"
          :aria-label="`Quitar el par ${i + 1}`"
          @click="remove(i)"
        >
          Quitar
        </button>
      </li>
    </ol>

    <button type="button" class="btn btn-ghost" :disabled="cards.length >= MAX_PAIRS" @click="add">Agregar par</button>
  </fieldset>
</template>
