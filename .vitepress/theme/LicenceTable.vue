<script setup>
import { withBase } from 'vitepress'
import { addons, SALES, salesOf } from '../addons.mjs'

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
  marketplace: rows.filter((a) => salesOf(a.slug) === 'marketplace').length,
  suiteOnly: rows.filter((a) => salesOf(a.slug) === 'suite-only').length,
  notSold: rows.filter((a) => salesOf(a.slug) === 'not-sold').length,
}

/**
 * The second column: how it is sold, not what it costs.
 *
 * A missing value renders as an em space rather than as an empty cell, so an
 * addon that was added to the registry without a sales entry is visible on the
 * page instead of looking like a deliberate blank. `sync-licenses.mjs` refuses
 * the build for the same case; this is only the belt.
 */
const saleOf = (slug) => SALES[salesOf(slug)] ?? null
</script>

<template>
  <table class="gn-licences">
    <thead>
      <tr>
        <th>Addon</th>
        <th>Licence</th>
        <th>How it is sold</th>
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
        <td>
          <span v-if="saleOf(addon.slug)" class="gn-sale" :title="saleOf(addon.slug).short">
            {{ saleOf(addon.slug).label }}
          </span>
          <span v-else>&emsp;</span>
        </td>
      </tr>
    </tbody>
  </table>

  <p class="gn-licences__count">
    {{ counts.mit }} MIT, {{ counts.commercial }} commercial. Of the commercial ones,
    {{ counts.marketplace }} are intended for the Statamic Marketplace,
    {{ counts.suiteOnly }} are licensed only as part of the Suite, and
    {{ counts.notSold }} are not sold yet.
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

/* Quieter than the licence pill on purpose. "Commercial" is the word a reader
   must not misread; how it is sold is the follow-up question, not the alarm. */
.gn-sale {
  color: var(--vp-c-text-2);
  font-size: 0.9em;
  white-space: nowrap;
}

.gn-licences__count {
  color: var(--vp-c-text-2);
  font-size: 0.9em;
}
</style>
