# Troubleshooting

<AddonHeader />

## `Cannot destructure property 'getState' of undefined`

The page dies at setup. Two causes, and it is worth checking both:

1. **`useHistory()` was called with no argument.** Both `getState` and `setState` are
   required.
2. **There are two copies of the flow library on the page.** The store one instance
   registers is invisible to the other. Add `dedupe` to the Vite config — see
   [Installation](/flow-canvas/installation#two-lines-of-vite-config).

## Every node draws one handle, and one of them declared two

`setNodeOutputSpecs(library)` was never called, or was called with something other than
the whole library payload.

It accepts a flat array **or** a map of group name → descriptors, and it is group-agnostic
on purpose. Before 1.0.1 it understood one addon's group names only, so a host whose
groups were called `pages` and `offers` registered no specs at all and silently got one
`default` handle everywhere — with the branches already wired underneath, going nowhere.

Check the return value: it is the number of specs found.

```js
console.log(setNodeOutputSpecs(props.library)); // 0 means nothing registered
```

## `[flow-canvas] Node 'x' declares output spec version 2, this canvas understands 1`

The published Control Panel assets are older than the addon that ships them. The bundle
lives in the host's `public/vendor/`, so this is a real shape rather than a hypothetical
one.

Re-publish the host addon's assets. Until then the node falls back to a single `default`
output, which is what a canvas that had never heard of output specs did with it.

## Labels render as `your-addon::nodes.kind_entry`

The words were written in JavaScript. Statamic's JS `__()` only knows core and application
strings, so an addon's language file never reaches it.

Translate in PHP, pass the words to the page, and merge them into the kind map in the
browser. See [Every word comes from the server](/flow-canvas/consuming#_2-every-word-comes-from-the-server).

## A node's icon is blank

The name is not a real icon shipped by `@statamic/cms` (`resources/svg/icons/*.svg`). An
invented name renders as nothing at all, which looks like a broken build rather than a
wrong string.

`createNodeIcon()` falls back handle → kind → `node-connect`, so a blank icon means the
name resolved to something that does not exist rather than to nothing.

## Adding a node produces a blank card

The library emits a **handle**, not the descriptor. Treating it as an object produces nodes
typed `undefined`, which fall back to the ordinary kind, show a blank card, and then fail
validation on save. It looks like it worked and stores nothing.

```js
function addNode(handle) {
    const entry = Object.values(props.library).flat().find((m) => m.handle === handle);
    // …
}
```

## A node lands in the wrong kind

A node's kind is worked out from the library group it was offered in, and a kind declares
its group with `group` (defaulting to the kind's own key).

Anything found in no declared group falls back to the kind marked `fallback: true`, or —
if none is — to the **last declared kind**. Check that the group names in the payload and
the group names in the kind map are the same strings.

## The card stays red although the field is filled in

The field has a `default` that was never written into the model. A config panel *renders*
`field.default` as a display fallback, and a rendered fallback is not a model value.

Seed the config when the node is created:

```js
Object.assign(config, defaultConfigForSchema(entry.schema));
```

Otherwise the node stays flagged until somebody re-picks the very option already on screen.

## The minimap is a white box in dark mode

`goldnead/statamic-flow-canvas` older than **1.0.3**. Vue Flow's own stylesheets were
unlayered, and unlayered CSS outranks every layer, so `@vue-flow/minimap`'s fixed light
background beat any themed rule a host wrote.

Note that this was never confined to the addon that built the bundle: the Control Panel
loads **every** addon's stylesheet on **every** page.

## Nodes cannot be dragged

By design. Positions are derived from the graph on every render, so there is exactly one
correct slot for each node and nothing to store. See
[Positions are derived](/flow-canvas/concepts#positions-are-derived-never-stored).

## The layout goes strange on an imported graph

The layout assumes what the editing model produces: one incoming edge per node, so the
graph is a tree or a small forest. Cycles and re-convergence are only reachable through
imported or hand-wired data. They are guarded rather than supported — first placement wins
— so the result is readable but not meaningful.

## An undo step is missing

`record()` is called by the host, before the change, and an untagged `record()` always gets
its own entry. A missing step means the mutation did not call it.

Tagged records are different on purpose: consecutive `record('label:abc')` calls inside 600
ms fold into one, so a burst of typing costs one undo step instead of a hundred.

## Composer says the tag does not exist

Versions up to **1.0.3** carried a hard-coded `version` field in `composer.json`, which
Packagist reads instead of the tag — so the tag never appeared. 1.0.4 removed it and
contains no other change.

## `Cannot resolve 'vue' from …/vendor/goldnead/statamic-flow-canvas`

`preserveSymlinks` is missing from the Vite config, or npm ran before Composer. The package
is installed from a Composer path and linked by npm, so its files sit outside the project
and its imports must resolve *there*.
