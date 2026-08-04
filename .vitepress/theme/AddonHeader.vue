<script setup>
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import { addonBySlug, STATAMIC_DEFAULT, PHP_DEFAULT } from '../addons.mjs'
import { coverPath, iconPath } from '../art.generated.mjs'

const props = defineProps({
  /** Addon slug. Defaults to the first path segment of the current page. */
  slug: { type: String, default: null },
})

const { page } = useData()

const addon = computed(() => {
  const slug = props.slug ?? page.value.relativePath.split('/')[0]
  return addonBySlug(slug)
})

/**
 * The cover is the addon's front door, so it belongs on the front door only.
 * Repeating a 1200x630 banner above every one of the twelve pages inside an
 * addon would push the first line of documentation off the screen twelve times.
 *
 * `<slug>/index.md` is the overview page. The component is included by all 143
 * pages, so this test is what keeps the markdown untouched.
 */
const isOverview = computed(
  () => page.value.relativePath === `${addon.value?.slug}/index.md`,
)
</script>

<template>
  <template v-if="addon">
    <figure v-if="isOverview" class="gn-cover">
      <img
        :src="withBase(coverPath(addon.slug))"
        :alt="`${addon.name}: ${addon.tagline}`"
        width="1200"
        height="630"
      />
    </figure>

    <div class="gn-addon-header">
      <img
        v-if="!isOverview"
        class="gn-addon-header__icon"
        :src="withBase(iconPath(addon.slug))"
        width="20"
        height="20"
        alt=""
      />
      <span class="gn-chip gn-chip--pkg">{{ addon.package }}</span>
      <span class="gn-chip gn-chip--accent">{{ addon.statamic ?? STATAMIC_DEFAULT }}</span>
      <span class="gn-chip">{{ addon.php ?? PHP_DEFAULT }}</span>
      <span class="gn-chip">{{ addon.license }} licence</span>
    </div>
  </template>
</template>
