<script setup>
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import {
  entryBySlug,
  MATURITY,
  MATURITY_NOTES,
  maturityOf,
  SALES,
  salesOf,
  STATAMIC_DEFAULT,
  PHP_DEFAULT,
} from '../addons.mjs'
import { ART, coverPath, iconPath } from '../art.generated.mjs'

const props = defineProps({
  /** Addon slug. Defaults to the first path segment of the current page. */
  slug: { type: String, default: null },
})

const { page } = useData()

const addon = computed(() => {
  const slug = props.slug ?? page.value.relativePath.split('/')[0]
  return entryBySlug(slug)
})

/**
 * A tool is not a Statamic addon, and the three chips that identify one would
 * all be lies on its page: there is no Composer package to require, no Statamic
 * version to satisfy and no PHP to run. It gets its stack and its source
 * instead.
 */
const isTool = computed(() => addon.value?.kind === 'tool')

/**
 * An addon can be registered and documented before anyone has drawn its icon —
 * that is exactly what happens the day a new package joins the suite. Gate the
 * art on the generated table rather than on the registry, so a page without art
 * renders one chip short instead of two broken images.
 */
const hasArt = computed(() => Boolean(addon.value && ART[addon.value.slug]))

/**
 * The cover is the addon's front door, so it belongs on the front door only.
 * Repeating a 1200x630 banner above every one of the twelve pages inside an
 * addon would push the first line of documentation off the screen twelve times.
 *
 * `<slug>/index.md` is the overview page. The component is included by every
 * page, so this test is what keeps the markdown untouched.
 */
const isOverview = computed(
  () => page.value.relativePath === `${addon.value?.slug}/index.md`,
)

/**
 * How far along this addon is. A tool is not part of the suite and carries no
 * level, so the chip disappears rather than claiming one.
 */
const level = computed(() => (addon.value ? maturityOf(addon.value.slug) : null))
const maturity = computed(() => (level.value ? MATURITY[level.value] : null))

/**
 * The chip fits three words. Anything an installer actually has to weigh —
 * "no tests of its own", "no real booking has ever run through it" — needs a
 * sentence, and a sentence belongs on the front door, not on page nine.
 */
const maturityNote = computed(() =>
  addon.value && isOverview.value ? MATURITY_NOTES[addon.value.slug] : null,
)

/**
 * How this addon is sold.
 *
 * A chip on every page rather than a line on the overview, because the question
 * it answers arrives wherever the reader arrives. Somebody who lands on
 * `payments/checkout` from a search result has never seen the overview and has
 * no reason to guess that the package carries no individual price.
 *
 * Not shown for the MIT packages: the licence chip beside it already says MIT,
 * and a second chip saying the same thing is noise.
 */
const sale = computed(() => {
  const key = addon.value ? salesOf(addon.value.slug) : null

  return key && key !== 'free' ? { key, ...SALES[key] } : null
})

/**
 * The sentence under the chips, on the front door only.
 *
 * Only where the chip would leave the reader with the wrong plan. "Marketplace"
 * needs no sentence: the listing is coming, and the licensing page covers the
 * wait. "Suite only" and "Not sold" both mean there is nothing to wait for, and
 * that is the thing this site failed to say until now.
 */
const saleNote = computed(() =>
  isOverview.value && sale.value && sale.value.key !== 'marketplace' ? sale.value : null,
)
</script>

<template>
  <template v-if="addon">
    <figure v-if="hasArt && isOverview" class="gn-cover">
      <img
        :src="withBase(coverPath(addon.slug))"
        :alt="`${addon.name}: ${addon.tagline}`"
        width="1200"
        height="630"
      />
    </figure>

    <div class="gn-addon-header">
      <img
        v-if="hasArt && !isOverview"
        class="gn-addon-header__icon"
        :src="withBase(iconPath(addon.slug))"
        width="20"
        height="20"
        alt=""
      />
      <template v-if="isTool">
        <a class="gn-chip gn-chip--pkg" :href="addon.source">{{
          addon.source.replace('https://github.com/', '')
        }}</a>
        <span class="gn-chip gn-chip--accent">{{ addon.stack }}</span>
      </template>
      <template v-else>
        <span class="gn-chip gn-chip--pkg">{{ addon.package }}</span>
        <span class="gn-chip gn-chip--accent">{{ addon.statamic ?? STATAMIC_DEFAULT }}</span>
        <span class="gn-chip">{{ addon.php ?? PHP_DEFAULT }}</span>
      </template>
      <span class="gn-chip">{{ addon.license }} licence</span>
      <a
        v-if="sale"
        class="gn-chip"
        :class="`gn-chip--sale-${sale.key}`"
        :href="withBase('/guide/licensing')"
        :title="sale.short"
        >{{ sale.label }}</a
      >
      <a
        v-if="maturity"
        class="gn-chip"
        :class="`gn-chip--maturity-${level}`"
        :href="withBase('/guide/maturity')"
        :title="maturity.short"
        >{{ maturity.label }}</a
      >
      <span v-if="addon.unreleased" class="gn-chip gn-chip--unreleased">Unreleased</span>
    </div>

    <p v-if="saleNote" class="gn-sale-note">
      <strong>{{ saleNote.label }}.</strong> {{ saleNote.short }}
      <a :href="withBase('/guide/licensing')">How the packages are licensed</a>
    </p>

    <p v-if="maturityNote" class="gn-maturity-note" :class="`gn-maturity-note--${level}`">
      <strong>{{ maturity.label }}.</strong> {{ maturityNote }}
      <a :href="withBase('/guide/maturity')">What the levels mean</a>
    </p>
  </template>
</template>
