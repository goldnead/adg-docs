<script setup>
import { computed } from 'vue'
import { addons, SALES, salesOf } from '../addons.mjs'

/**
 * The names of the addons sold one particular way, read from the registry.
 *
 * The two warning boxes on the licensing page used to type these lists out by
 * hand. Nothing checked them, which is the drift the licence table itself was
 * built to stop: for a stretch of August 2026 this page listed six commercial
 * addons as MIT because a value was maintained by hand. A list that names eight
 * packages in prose is the same trap one paragraph further down.
 *
 * `except` exists for the one sentence that has to leave a package out. Table
 * of Contents is the only member of `marketplace` that already has a listing,
 * so the box about waiting for one is about the other seven.
 */
const props = defineProps({
  /** A key of SALES: marketplace, suite-only, free, not-sold. */
  kind: {
    type: String,
    required: true,
    // A misspelt kind rendered nothing and left "The eight are ." standing in
    // a warning box. Renaming a key in the registry has to fail loudly here,
    // because the page that uses it is prose and nothing else checks it.
    validator: (v) => v in SALES,
  },
  /** Slugs to leave out, comma separated. */
  except: { type: String, default: '' },
})

const names = computed(() => {
  const skip = props.except.split(',').map((s) => s.trim()).filter(Boolean)

  return addons
    .filter((a) => salesOf(a.slug) === props.kind && ! skip.includes(a.slug))
    .map((a) => a.name)
})

/** "A, B and C", because a comma before "and" is not this site's house style. */
const sentence = computed(() => {
  if (names.value.length === 0) {
    // An empty group means the registry and this page disagree about what the
    // group is called. Say so where somebody will see it rather than rendering
    // a sentence with a hole in it.
    console.warn(`SalesGroup: no addon sells as "${props.kind}" (except: "${props.except}")`)

    return `[no addon sells as ${props.kind}]`
  }

  return names.value.length < 2
    ? names.value.join('')
    : `${names.value.slice(0, -1).join(', ')} and ${names.value[names.value.length - 1]}`
})
</script>

<!--
  A `<span>` and not a bare `{{ }}`.

  A component whose root is a text node gives Vue nothing to anchor hydration
  to. Inline in a paragraph that also holds links, the client render lined up
  one node out from the server's, and the two links in the box below rendered
  under each other's labels: "licensed as one package at Suite EULA, under the
  Suite EULA". The markup was right the whole time and the console said
  "Hydration completed but contains mismatches", so only the picture showed it.
-->
<template><span>{{ sentence }}</span></template>
