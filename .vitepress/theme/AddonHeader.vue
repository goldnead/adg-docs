<script setup>
import { computed } from 'vue'
import { useData } from 'vitepress'
import { addonBySlug } from '../addons.mjs'

const props = defineProps({
  /** Addon slug. Defaults to the first path segment of the current page. */
  slug: { type: String, default: null },
})

const { page } = useData()

const addon = computed(() => {
  const slug = props.slug ?? page.value.relativePath.split('/')[0]
  return addonBySlug(slug)
})
</script>

<template>
  <div v-if="addon" class="gn-addon-header">
    <span class="gn-chip gn-chip--pkg">{{ addon.package }}</span>
    <span class="gn-chip gn-chip--accent">Statamic 6</span>
    <span class="gn-chip">PHP 8.2+</span>
    <span class="gn-chip">{{ addon.license }} licence</span>
  </div>
</template>
