<script setup>
import { APP_NAME } from '../config';
import BrandMark from './BrandMark.vue';
</script>

<template>
  <div class="auth">
    <section class="auth-hero" aria-label="Qué es esta plataforma">
      <div class="brand brand-light">
        <BrandMark :size="34" />
        <span>{{ APP_NAME }}</span>
      </div>

      <div class="hero-body">
        <p class="hero-title">Cada quien tiene la mitad del concepto.</p>
        <div class="pair" aria-hidden="true">
          <div class="half half-concept">
            <span class="half-label">Concepto</span>
            <p class="half-text">Interdependencia positiva</p>
          </div>
          <div class="half half-definition">
            <span class="half-label">Definición</span>
            <p class="half-text half-text-body">Cuando el avance de cada persona depende de lo que aportan las demás.</p>
          </div>
        </div>
        <p class="hero-copy">
          Para avanzar, encuentra a la persona que tiene la otra mitad y completen juntos la tarjeta.
        </p>
      </div>

      <p class="hero-foot">Facultad de Estadística e Informática, Universidad Veracruzana</p>
    </section>

    <section class="auth-panel">
      <div class="auth-panel-inner">
        <slot />
      </div>
    </section>
  </div>
</template>
