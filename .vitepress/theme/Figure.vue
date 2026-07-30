<script setup>
import { withBase } from 'vitepress'

defineProps({
  /** File name in public/screenshots, without the extension. */
  src: { type: String, required: true },
  alt: { type: String, required: true },
  caption: { type: String, default: null },
})
</script>

<template>
  <figure class="gn-figure">
    <img :src="withBase(`/screenshots/${src}.png`)" :alt="alt" loading="lazy" />
    <figcaption v-if="caption">{{ caption }}</figcaption>
  </figure>
</template>
