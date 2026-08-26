# Reference

<AddonHeader />

```js
import { Canvas, NodeLibrary, setNodeOutputSpecs, useHistory } from '@goldnead/flow-canvas';
```

## Components

| Export | |
| --- | --- |
| `Canvas` | The whole editing surface: cards, edges, adders, background, minimap, controls |
| `NodeCard` | One node. Rendered by `Canvas` through Vue Flow's slots; exported for completeness. |
| `NodeLibrary` | The sidebar of node types, with tabs per kind, search and pick mode |
| `ControlBar` | Zoom out, zoom percentage, zoom in, fit to view |
| `AdderNode` | The synthetic `+`. Rendered by `Canvas`. |
| `InsertableEdge` | A real edge with a `+` at its midpoint. Rendered by `Canvas`. |
| `PropertiesSection` | A collapsible section for a host's own config panel |

### `<Canvas>` props

| Prop | Type | Default | |
| --- | --- | --- | --- |
| `nodes` | Array | *required* | `{ node_key, type, label, config, disabled }` |
| `edges` | Array | *required* | `{ from_node_key, from_output, to_node_key }` |
| `kinds` | Object | *required* | [The kind map](/flow-canvas/kinds#the-descriptor) |
| `library` | Object | `{}` | Group name → node descriptors |
| `selectedKey` | String | `null` | |
| `validation` | Object | `{}` | `node_key` → `'error'` \| `'warning'` |
| `nodeIcon` | Function | `null` | `(handle, kind) => iconName`, from `createNodeIcon()` |
| `adderLabels` | Object | `{}` | `{ root, step }` |
| `pendingTarget` | Object | `null` | The armed `+`, or null |
| `nodeStats` | Object | `{}` | `node_key` → the figures for that card |

### `<Canvas>` events

| Event | Payload |
| --- | --- |
| `select` | `node_key`, or null |
| `toggle-pick` | `{ kind: 'append', fromNodeKey, output }` or `{ kind: 'insert', edge }`, or null to disarm |
| `remove-node` | `node_key` |
| `rename-node` | `node_key` |
| `duplicate-node` | `node_key` |
| `toggle-node-disabled` | `node_key` |
| `replace-unique` | `node_key` |

The canvas never mutates the graph. Every one of these is a request for the host to do it.

### `<NodeLibrary>` props and events

| Prop | Type | Default | |
| --- | --- | --- | --- |
| `library` | Object | *required* | |
| `kinds` | Object | *required* | The same map the canvas gets |
| `nodeIcon` | Function | `null` | |
| `pickMode` | Boolean | `false` | |
| `pickKind` | String | `'step'` | `'entry'`, `'replace-entry'` or `'step'` |
| `pickLabels` | Object | `{}` | The banner wording while a pick is armed |

Events: `add` (a node **handle**), `toggle`, `cancel-pick`.

### `<NodeCard>` props

`kind`, `data`, `status` (`'error'` \| `'warning'` \| null), `selected`, `stats`.

`stats` takes either shape:

```js
[{ key: 'visits', icon: 'eye', value: 128, label: 'Visitors here', tone: 'done' }]
{ reached: 128, completed: 96, failed: 2 }   // legacy, still rendered
```

A value that is already a string is printed as given, so a percentage is not rounded into
thousands. `null` is not the same as zeroes: a fresh graph whose every card reads
`0 / 0 / 0` looks broken rather than new.

Events: `rename`, `duplicate`, `toggle-disabled`, `delete`, `replace-unique`.

### `<PropertiesSection>` props

`title` (required), `collapsible` (default `true`), `defaultOpen` (default `true`).

## Icons

```js
createNodeIcon(handleIcons = {}, kindFallbacks = {}) // → (handle, kind) => iconName
```

Falls back handle → kind → `'node-connect'`. Every name must be a real icon shipped by
`@statamic/cms`; an invented one renders as nothing.

`NODE_ICON` and `NODE_KINDS` are the injection keys the canvas provides its resolver and
its kind map under, because the cards are rendered through Vue Flow's slots where props
cannot reach them.

## Output specs

| Export | |
| --- | --- |
| `OUTPUT_SPEC_VERSION` | The grammar version this canvas understands. `1`. |
| `setNodeOutputSpecs(library)` | Register the specs a library payload carries. Returns how many were found. |
| `clearNodeOutputSpecs()` | Drop them all — for tests, and for tearing a page down |
| `outputSpecFor(type)` | The registered spec for a node type, or null |
| `resolveOutputSpec(spec, config)` | Evaluate a spec against a config |
| `outputsFor(node)` | The ordered outputs a node exposes, left to right |
| `continuationOutput(node)` | The handle a node continues on: its `primary`, else its first, else null |
| `keyValueEntries(raw)` | Normalise a `key_value` config field into `[key, value]` pairs |

`outputsFor()` is the single function every consumer goes through — the layout's column
order, the card's handle dots, the canvas's adders, the host's edge wiring — so a node's
handles cannot mean one thing in one place and something else in another.

The grammar is described under [The output spec](/flow-canvas/kinds#the-output-spec).

## Layout

| Export | |
| --- | --- |
| `computeLayout(nodes, edges)` | `{ positions, openOutputs, roots }` |
| `LAYOUT` | `NODE_WIDTH: 240`, `COLUMN_SPAN: 320`, `ROW_HEIGHT: 200`, `ORIGIN_X: 0`, `ORIGIN_Y: 0` |
| `handleY(index, total)` | The 0..1 fraction for one handle of `total` |
| `fractionForOutput(node, output)` | The same math the card uses to place the dot itself |

`positions` is `node_key → { x, y }`; `openOutputs` is the list of
`{ from_node_key, from_output }` with no edge on them, which is where the adders go;
`roots` is the node keys with no incoming edge.

Pure and framework-free, so it can be unit-tested on its own.

## History

```js
const { record, undo, redo, reset, canUndo, canRedo } = useHistory({
    getState,          // () => ({ nodes, edges })   — required
    setState,          // (state) => void            — required
    max: 100,
    coalesceMs: 600,
    now: () => Date.now(),
});
```

`record()` with no tag is a structural step and always gets its own entry. `record(tag)`
folds consecutive records with the same tag inside `coalesceMs` into one. Undo, redo and
reset all end an open run.

## Autosave

```js
const { status, lastSavedAt, lastError, enabled, flush, toggle } = useAutosave({
    source,            // () => the reactive object to watch
    saver,             // async () => persist
    debounceMs: 2000,
    defaultEnabled: false,
});
```

`status` is `idle`, `pending`, `saving`, `saved` or `error`.

## Validation

| Export | |
| --- | --- |
| `schemaFor(node, library)` | The field descriptors for a node's type |
| `defaultConfigForSchema(schema)` | The starting config: every field that declares a `default` |
| `isEmptyValue(value)` | |
| `missingRequiredHandles(node, library)` | The handles of required fields that are empty |
| `computeNodeIssues(nodes, library)` | A list of `{ node_key, field, code, level, message }` |

`defaultConfigForSchema()` is not optional politeness. A config panel *renders*
`field.default` as a display fallback, and a rendered fallback is not a model value:
without seeding, a required field with a default shows its option on screen while the
config stays undefined, and the node stays red until somebody re-picks the very option
already displayed.

## Key-value rows

`makeRow(key, value)` · `toRows(raw)` · `rowsToObject(list)` · `duplicateKeyIndices(list)`

## Stylesheets

```js
import '@goldnead/flow-canvas/canvas.css';
import '@goldnead/flow-canvas/canvas-theme.css';
```

## PHP

```php
use Goldnead\FlowCanvas\FlowCanvas;

FlowCanvas::VERSION;
```

One `final` class with one constant, so Composer has something to autoload and a host can
assert the package is installed without reaching into a vendor path.

::: warning Do not gate on `VERSION`
It reads `1.0.0` in the 1.1.0 release. Use it to check that the package is *there*, and
Composer constraints for anything else.
:::

## Package

| | |
| --- | --- |
| Composer | `goldnead/statamic-flow-canvas`, type `library` |
| npm | `@goldnead/flow-canvas`, ES modules, private |
| PHP | `^8.2` |
| Peer dependencies | `vue ^3.4`, `@vue-flow/core ^1.41`, `@vue-flow/background ^1.3`, `@vue-flow/controls ^1.1.2`, `@vue-flow/minimap ^1.5` |

## Not included

- **No Statamic addon surface.** No service provider, no routes, no migrations, no config,
  no Control Panel screen.
- **No persistence.** Nothing is stored, in the database or in the browser.
- **No node types.** Not one. Every box on the canvas comes from a host.
- **No server-side validator.** The required-field mirror here is live feedback; the
  host's own validator remains the source of truth.
