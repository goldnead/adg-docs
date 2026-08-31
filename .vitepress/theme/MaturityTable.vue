<script setup>
import { withBase } from 'vitepress'
import { addons, MATURITY, MATURITY_BY_SLUG, MATURITY_NOTES } from '../addons.mjs'

/**
 * The maturity table, generated from the registry.
 *
 * Same reasoning as LicenceTable: a table somebody has to remember to edit
 * drifts, and this one drifts in the direction that costs a reader money. The
 * registry is the one place a level is written down, so an addon that changes
 * level changes here, in its page header and on its card in the same commit.
 */
const ORDER = ['proven', 'new', 'experimental']

const groups = ORDER.map((key) => ({
  key,
  ...MATURITY[key],
  addons: addons
    .filter((a) => MATURITY_BY_SLUG[a.slug] === key)
    .sort((a, b) => a.name.localeCompare(b.name)),
}))

const note = (slug) => MATURITY_NOTES[slug] ?? null

/**
 * Anything in the registry with no level is a gap, not a fourth category. Say
 * so, rather than letting it vanish from the one page whose job is completeness.
 */
const unlevelled = addons.filter((a) => !MATURITY_BY_SLUG[a.slug])
</script>

<template>
  <div class="gn-maturity-groups">
    <section v-for="group in groups" :key="group.key">
      <h3>
        <span class="gn-maturity" :class="`gn-maturity--${group.key}`">{{ group.label }}</span>
        <span class="gn-maturity-groups__count">{{ group.addons.length }} addons</span>
      </h3>
      <p class="gn-maturity-groups__short">{{ group.short }}</p>

      <ul class="gn-maturity-groups__list">
        <li v-for="addon in group.addons" :key="addon.slug">
          <a :href="withBase(`/${addon.slug}/`)">{{ addon.name }}</a>
          <span v-if="note(addon.slug)"> — {{ note(addon.slug) }}</span>
        </li>
      </ul>
    </section>

    <p v-if="unlevelled.length" class="gn-maturity-groups__gap">
      No level recorded yet:
      <span v-for="(addon, i) in unlevelled" :key="addon.slug">
        <a :href="withBase(`/${addon.slug}/`)">{{ addon.name }}</a
        ><span v-if="i < unlevelled.length - 1">, </span> </span
      >. Treat these as experimental until the registry says otherwise.
    </p>
  </div>
</template>

<style scoped>
.gn-maturity-groups section {
  margin: 1.75rem 0;
}

.gn-maturity-groups h3 {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin: 0;
  border: 0;
  padding: 0;
}

/* The badge earns its `margin-left: auto` on a card, where it belongs at the far
   edge. In a heading it is the heading, so it starts where the text would. */
.gn-maturity-groups h3 .gn-maturity {
  margin-left: 0;
  font-size: 0.8125rem;
  padding: 0.125rem 0.625rem;
}

.gn-maturity-groups__count {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--vp-c-text-3);
}

.gn-maturity-groups__short {
  margin: 0.375rem 0 0.625rem;
  color: var(--vp-c-text-2);
}

.gn-maturity-groups__list {
  margin: 0;
  padding-left: 1.25rem;
  line-height: 1.7;
}

.gn-maturity-groups__list span {
  color: var(--vp-c-text-2);
}

.gn-maturity-groups__gap {
  color: var(--vp-c-text-2);
}
</style>
