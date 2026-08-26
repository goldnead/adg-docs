# Configuration

<AddonHeader />

**There is no config file, and there is nothing to publish.** This package has no service
provider, no routes and no settings screen. Its one PHP class exists so Composer has
something to autoload.

Everything that would otherwise be configuration is passed in from the host, per canvas,
as data. That is the point: two addons run the same editor and it looks like their own,
because the parts that differ are arguments rather than forks.

## What stands in place of a config file

| Knob | Where it is set | |
| --- | --- | --- |
| **Kinds** | `:kinds` on `<Canvas>` and `<NodeLibrary>` | What a box can be, what it is called, what colour it wears, whether there may be only one. See [Kinds are data](/flow-canvas/kinds). |
| **The node library** | `:library` | Group name → node descriptors, as the server rendered them |
| **Output specs** | `setNodeOutputSpecs(library)` | How many handles a node draws, and what they are called |
| **Icons** | `:node-icon`, built with `createNodeIcon()` | Node handle → a real `@statamic/cms` icon name |
| **Adder wording** | `:adder-labels` | `{ root, step }`. An automation starts with a trigger, a funnel with an entry page. |
| **Picker wording** | `:pick-labels` on `<NodeLibrary>` | The banner while a pick is armed |
| **Card figures** | `:node-stats` | `node_key` → the figures to print on that card |
| **Validation marks** | `:validation` | `node_key` → `'error'` or `'warning'` |
| **Undo depth and coalescing** | `useHistory({ max, coalesceMs })` | 100 entries and a 600 ms window by default |
| **Autosave delay** | `useAutosave({ debounceMs, defaultEnabled })` | 2000 ms, off by default |
| **Look** | `canvas.css`, `canvas-theme.css` | Imported by the host, shipped by the package |

## Translate on the server, not in the browser

Every word on the canvas should arrive as a prop, already translated.

Statamic's JavaScript `__()` only knows core and application strings. An addon's language
file never reaches it, so a label written in JS renders as its raw key — a literal
`your-addon::nodes.kind_entry` in the middle of the canvas.

Both hosts therefore translate in PHP and hand the words over with the page. See
[Using it in your own addon](/flow-canvas/consuming#_2-every-word-comes-from-the-server).

## Nothing is stored

The package holds no state of its own between page loads: no local storage, no
preferences, no per-user layout. Node positions are **derived** from the graph on every
render, so there are no coordinates to persist and no stale layout to migrate.

What the host saves is what the host sent: nodes and edges.
