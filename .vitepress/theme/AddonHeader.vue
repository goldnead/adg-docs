<script setup>
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import { entryBySlug, STATAMIC_DEFAULT, PHP_DEFAULT } from '../addons.mjs'
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
      <span v-if="addon.unreleased" class="gn-chip gn-chip--unreleased">Unreleased</span>
    </div>
  </template>
</template>
