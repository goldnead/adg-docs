<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'

const props = defineProps({
  /** Path under public/playground, without slashes. */
  slug: { type: String, required: true },
  /** Iframe height in pixels. The embedded page scrolls internally. */
  height: { type: Number, default: 620 },
  title: { type: String, default: 'Playground' },
})

const src = withBase(`/playground/${props.slug}/`)

const root = ref(null)
const load = ref(false)
let observer = null

/**
 * The bundle behind this is two thirds of a megabyte, which is a poor thing to
 * hand every reader of the page whether or not they scroll this far. The iframe
 * is created when the frame is about to come into view, so a reader who wants
 * the demo gets it without asking and a reader who does not never pays for it.
 *
 * `rootMargin` starts the fetch a screen early, so in practice it has loaded by
 * the time the frame is actually on screen.
 */
onMounted(() => {
  if (typeof IntersectionObserver === 'undefined') {
    load.value = true
    return
  }

  observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      load.value = true
      observer?.disconnect()
      observer = null
    },
    { rootMargin: '800px 0px' },
  )

  if (root.value) observer.observe(root.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})
</script>

<template>
  <div class="gn-playground" ref="root">
    <div class="gn-playground__frame" :style="{ height: `${height}px` }">
      <iframe
        v-if="load"
        :src="src"
        :title="title"
        loading="lazy"
        referrerpolicy="no-referrer"
      />
      <div v-else class="gn-playground__idle">
        Loading the editor…
        <noscript>
          The playground needs JavaScript.
          <a :href="src">Open it directly</a>.
        </noscript>
      </div>
    </div>

    <p class="gn-playground__note">
      <span
        >Running in an iframe, mounted exactly the way
        <a :href="withBase('/block-editor/embedding')">Embedding</a> describes.</span
      >
      <a :href="src" target="_blank" rel="noopener">Open in a new tab ↗</a>
    </p>
  </div>
</template>
