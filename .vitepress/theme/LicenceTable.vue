<script setup>
import { withBase } from 'vitepress'
import { addons } from '../addons.mjs'

/**
 * The licence table, generated from the registry.
 *
 * It used to be typed out by hand in `guide/licensing.md`, and on 2026-08-29 six
 * commercial addons were sitting on the public site as MIT. A table nobody has
 * to remember to edit cannot drift; `scripts/sync-licenses.mjs` keeps the
 * registry itself honest against each package's composer.json.
 */
const rows = [...addons].sort((a, b) =>
  a.license === b.license ? a.name.localeCompare(b.name) : a.license === 'MIT' ? -1 : 1,
)

const counts = {
  mit: rows.filter((a) => a.license === 'MIT').length,
  commercial: rows.filter((a) => a.license !== 'MIT').length,
}
</script>

<template>
  <table class="gn-licences">
    <thead>
      <tr>
        <th>Addon</th>
        <th>Licence</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="addon in rows" :key="addon.slug">
        <td><a :href="withBase(`/${addon.slug}/`)">{{ addon.name }}</a></td>
        <td>
          <span class="gn-licence" :class="`gn-licence--${addon.license.toLowerCase()}`">
            {{ addon.license === 'MIT' ? 'MIT' : 'Commercial' }}
          </span>
        </td>
      </tr>
    </tbody>
  </table>

  <p class="gn-licences__count">
    {{ counts.mit }} MIT, {{ counts.commercial }} commercial.
  </p>
</template>

<style scoped>
.gn-licences {
  display: table;
  width: 100%;
  margin: 1rem 0 0.5rem;
}

.gn-licence {
  display: inline-block;
  padding: 0.05rem 0.5rem;
  border-radius: 999px;
  font-size: 0.8em;
  font-weight: 600;
  white-space: nowrap;
  border: 1px solid var(--vp-c-divider);
}

.gn-licence--mit {
  color: var(--vp-c-text-2);
}

/* Commercial is the row a reader must not misread, so it is the one that
   carries colour. MIT is the quiet default. */
.gn-licence--commercial {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.gn-licences__count {
  color: var(--vp-c-text-2);
  font-size: 0.9em;
}
</style>
