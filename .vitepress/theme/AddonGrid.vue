<script setup>
import { withBase } from 'vitepress'
import { addonsByLayer } from '../addons.mjs'

const LAYER_NOTES = {
  foundation: 'Install-once packages the others build on. Inert on their own.',
  integration: 'Getting data in and out, and reacting to it.',
  crm: 'People, consent and the mail you send them.',
  platform: 'Shared services any domain addon can record into.',
  content: 'Front-end helpers for editorial work.',
}

const layers = addonsByLayer()
</script>

<template>
  <div class="gn-layers">
    <section v-for="layer in layers" :key="layer.key">
      <header class="gn-layer__head">
        <h2 class="gn-layer__title">{{ layer.text }}</h2>
        <p class="gn-layer__note">{{ LAYER_NOTES[layer.key] }}</p>
      </header>

      <div class="gn-grid">
        <a
          v-for="addon in layer.addons"
          :key="addon.slug"
          class="gn-card"
          :href="withBase(`/${addon.slug}/`)"
        >
          <div class="gn-card__top">
            <span class="gn-card__icon" aria-hidden="true">{{ addon.icon }}</span>
            <span class="gn-card__name">{{ addon.name }}</span>
          </div>
          <p class="gn-card__tagline">{{ addon.tagline }}</p>
          <code class="gn-card__pkg">{{ addon.package }}</code>
        </a>
      </div>
    </section>
  </div>
</template>

<style scoped>
.gn-layer__head h2 {
  margin: 0;
  border: 0;
  padding: 0;
}
</style>
