<script setup>
/**
 * Keeps `data-addon` on <html> in step with the route.
 *
 * `transformHtml` in config.mts stamps the attribute into the prerendered HTML,
 * so the first paint of any page is already in the addon's colour and there is
 * no flash. That covers the entry page and nothing else: VitePress routes on the
 * client after that, and the served HTML never changes again. This watcher is
 * the other half.
 */
import { watch } from 'vue'
import { useData } from 'vitepress'
import DefaultTheme from 'vitepress/theme'

import { entryBySlug } from '../addons.mjs'

const { page } = useData()

watch(
  () => page.value.relativePath,
  (path) => {
    if (typeof document === 'undefined') return

    const slug = path.split('/')[0]
    const el = document.documentElement

    if (entryBySlug(slug)) {
      el.dataset.addon = slug
    } else {
      delete el.dataset.addon
    }
  },
  { immediate: true },
)
</script>

<template>
  <DefaultTheme.Layout>
    <template #home-hero-image>
      <SuiteMosaic />
    </template>
  </DefaultTheme.Layout>
</template>
