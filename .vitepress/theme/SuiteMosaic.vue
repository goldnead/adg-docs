<script setup>
/**
 * The suite's twelve icons as the home hero image.
 *
 * Decorative: every addon it shows is named, linked and described in the
 * AddonGrid a screen further down, so it is hidden from assistive technology
 * rather than repeating that list badly.
 *
 * Registry order, which means layer order — foundation first. That reads as an
 * arrangement rather than a pile.
 */
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { addons } from '../addons.mjs'
import { ART, iconPath } from '../art.generated.mjs'

/** Only addons whose icon has actually been drawn. A gap is better than a hole. */
const drawn = computed(() => addons.filter((a) => ART[a.slug]))
</script>

<template>
  <div class="gn-mosaic" aria-hidden="true">
    <img
      v-for="(addon, i) in drawn"
      :key="addon.slug"
      class="gn-mosaic__tile"
      :src="withBase(iconPath(addon.slug))"
      :style="{ '--i': i }"
      width="64"
      height="64"
      alt=""
    />
  </div>
</template>

<style scoped>
.gn-mosaic {
  display: grid;
  grid-template-columns: repeat(4, 64px);
  gap: 14px;
  justify-content: center;
}

.gn-mosaic__tile {
  width: 64px;
  height: 64px;
  border-radius: 15px;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.08),
    0 10px 24px rgba(0, 0, 0, 0.14);
  animation: gn-mosaic-in 0.5s ease-out backwards;
  animation-delay: calc(var(--i) * 40ms);
}

.dark .gn-mosaic__tile {
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.3),
    0 10px 24px rgba(0, 0, 0, 0.4);
}

@keyframes gn-mosaic-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .gn-mosaic__tile {
    animation: none;
  }
}

/* Below the hero's two-column breakpoint the image sits above the copy, where
   a 298px block is still comfortable. Only the smallest phones need it tighter. */
@media (max-width: 420px) {
  .gn-mosaic {
    grid-template-columns: repeat(4, 52px);
    gap: 10px;
  }

  .gn-mosaic__tile {
    width: 52px;
    height: 52px;
    border-radius: 12px;
  }
}
</style>
