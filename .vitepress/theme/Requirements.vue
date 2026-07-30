<script setup>
defineProps({
  php: { type: String, default: '8.2+' },
  statamic: { type: String, default: '6.0+' },
  laravel: { type: String, default: '11.x / 12.x / 13.x' },
  database: { type: String, default: 'MySQL, PostgreSQL or SQLite' },
  queue: { type: String, default: null },
})
</script>

<template>
  <div class="gn-req">
    <div class="gn-req__item">
      <span class="gn-req__label">PHP</span>
      <span class="gn-req__value">{{ php }}</span>
    </div>
    <div class="gn-req__item">
      <span class="gn-req__label">Statamic</span>
      <span class="gn-req__value">{{ statamic }}</span>
    </div>
    <div class="gn-req__item">
      <span class="gn-req__label">Laravel</span>
      <span class="gn-req__value">{{ laravel }}</span>
    </div>
    <div class="gn-req__item">
      <span class="gn-req__label">Database</span>
      <span class="gn-req__value">{{ database }}</span>
    </div>
    <div v-if="queue" class="gn-req__item">
      <span class="gn-req__label">Queue</span>
      <span class="gn-req__value">{{ queue }}</span>
    </div>
  </div>
</template>
