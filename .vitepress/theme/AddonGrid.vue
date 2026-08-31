<script setup>
import { withBase } from 'vitepress'
import { addonsByLayer, MATURITY, maturityOf } from '../addons.mjs'
import { ART, iconPath } from '../art.generated.mjs'

const LAYER_NOTES = {
  foundation: 'Install-once packages the others build on. Inert on their own.',
  integration: 'Getting data in and out, and reacting to it.',
  crm: 'People, consent and the mail you send them.',
  platform: 'Shared services any domain addon can record into.',
  content: 'Front-end helpers for editorial work.',
}

const layers = addonsByLayer()

/**
 * The card borrows the addon's own colour for its hover state. The raw gradient
 * stop is fine here: it is a 1px rule and a glow, never text.
 */
const accent = (slug) => ({
  '--gn-card-accent': ART[slug]?.from ?? 'var(--vp-c-brand-1)',
})

/**
 * A new addon is registered and documented before anyone draws its icon. Until
 * `sync-art.mjs` has one to copy, the card falls back to the registry's glyph
 * rather than to a broken image.
 */
const hasArt = (slug) => Boolean(ART[slug])

/**
 * The card is where somebody decides which addon to open, so it is where the
 * level has to be. Twenty-four cards that all look equally finished is the
 * misleading part of this page, not the wording of any one tagline.
 */
const maturity = (slug) => MATURITY[maturityOf(slug)] ?? null
const level = (slug) => maturityOf(slug)
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
          :style="accent(addon.slug)"
          :href="withBase(`/${addon.slug}/`)"
        >
          <div class="gn-card__top">
            <img
              v-if="hasArt(addon.slug)"
              class="gn-card__icon"
              :src="withBase(iconPath(addon.slug))"
              width="32"
              height="32"
              loading="lazy"
              alt=""
            />
            <span v-else class="gn-card__icon gn-card__icon--glyph" aria-hidden="true">{{
              addon.icon
            }}</span>
            <span class="gn-card__name">{{ addon.name }}</span>
            <span
              v-if="maturity(addon.slug)"
              class="gn-maturity"
              :class="`gn-maturity--${level(addon.slug)}`"
              :title="maturity(addon.slug).short"
              >{{ maturity(addon.slug).label }}</span
            >
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
