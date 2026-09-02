<script setup>
defineProps({
  php: { type: String, default: '8.2+' },
  statamic: { type: String, default: '6.0+' },
  // Laravel 11 is supported by no package in the suite: every one of them
  // requires ^12.0|^13.0 or narrower, or inherits that floor from statamic/cms.
  // Brand Context, a dependency of thirteen of the twenty-six, requires
  // ^12.40|^13.0, and Assessments declares that same range itself.
  laravel: { type: String, default: '12.x / 13.x' },
  // PostgreSQL is deliberately absent: it is untested, so it is not promised.
  database: { type: String, default: 'MySQL or SQLite' },
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
