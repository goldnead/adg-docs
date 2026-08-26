# Using it in your own addon

<AddonHeader />

What follows is the shape both hosts have, reduced to the parts that are actually
required. It assumes [installation](/flow-canvas/installation) is done: Composer, npm, and
the two lines of Vite config.

## 1. The server sends the library

Your registry describes what may be dropped on the canvas. The editor knows how to draw a
graph and nothing about your domain, so every label, icon, output and field comes from
here.

```php
return Inertia::render('your-addon::Flows/Edit', [
    'flow' => [
        'nodes' => $flow->nodes->map(fn ($n) => [
            'node_key' => $n->node_key,
            'type'     => $n->type,
            'label'    => $n->label,
            'config'   => $n->config ?? [],
            'disabled' => $n->disabled,
        ])->values()->all(),
        'edges' => $flow->edges->map(fn ($e) => [
            'from_node_key' => $e->from_node_key,
            'from_output'   => $e->from_output,
            'to_node_key'   => $e->to_node_key,
        ])->values()->all(),
    ],
    'library' => $registry->library(),
    'labels'  => $this->labels(),
    'saveUrl' => cp_route('utilities.your-addon.update', $flow->id),
]);
```

`library()` returns group name → node descriptors, each carrying `handle`, `label`,
`description`, `icon`, `schema` and `outputs`. See
[the library payload](/flow-canvas/kinds#the-node-library-payload).

## 2. Every word comes from the server

Statamic's JavaScript `__()` only knows core and application strings. Your addon's
language file never reaches it, so a label written in JS renders as its raw key across the
middle of the canvas.

So the kinds are declared in JS as **structure only**, and the words are merged in from
the page payload:

```js
// support/nodeKinds.js
import { createNodeIcon } from '@goldnead/flow-canvas';

const KIND_SHAPES = {
    entry:  { group: 'entrys',  color: 'blue',    unique: true, hasInput: false },
    page:   { group: 'pages',   color: 'emerald', fallback: true },
    offer:  { group: 'offers',  color: 'amber'   },
    finish: { group: 'finishs', color: 'purple'  },
};

export function withLabels(labels = {}) {
    const kinds = {};

    for (const [kind, shape] of Object.entries(KIND_SHAPES)) {
        kinds[kind] = { ...shape, ...(labels[kind] ?? {}) };
    }

    return kinds;
}

export const nodeIcon = createNodeIcon({
    entry: 'sign-post',
    page: 'file-content-list',
    offer: 'money-cashier-price-tag',
}, {
    // Per kind, when a handle has no icon of its own.
    page: 'file-content-list',
});
```

## 3. The page

```vue
<script setup>
import { computed, ref } from 'vue';
import { router } from '@statamic/cms/inertia';
import { Canvas, NodeLibrary, setNodeOutputSpecs, useHistory } from '@goldnead/flow-canvas';
import { nodeIcon, withLabels } from '../support/nodeKinds.js';

const props = defineProps({
    flow: { type: Object, required: true },
    library: { type: Object, required: true },
    labels: { type: Object, default: () => ({}) },
    saveUrl: { type: String, required: true },
});

const KINDS = computed(() => withLabels(props.labels.kinds));

// Once, with the library the server rendered. Without this every node draws a
// single `default` handle, including the ones that declared two.
setNodeOutputSpecs(props.library);

const graph = ref({
    nodes: JSON.parse(JSON.stringify(props.flow.nodes)),
    edges: JSON.parse(JSON.stringify(props.flow.edges)),
});

const selectedKey = ref(null);
const pendingTarget = ref(null);

// Both callbacks are required. Called without them, useHistory destructures
// `undefined` and the page dies at setup.
const history = useHistory({
    getState: () => ({ nodes: graph.value.nodes, edges: graph.value.edges }),
    setState: (state) => {
        graph.value.nodes = state.nodes;
        graph.value.edges = state.edges;
        selectedKey.value = null;
    },
});
</script>

<template>
    <div class="flex h-full">
        <NodeLibrary
            :library="library"
            :kinds="KINDS"
            :node-icon="nodeIcon"
            :pick-mode="pendingTarget !== null"
            :pick-kind="pickKind"
            :pick-labels="labels.pick ?? {}"
            @add="addNode"
            @cancel-pick="pendingTarget = null"
        />

        <Canvas
            :nodes="graph.nodes"
            :edges="graph.edges"
            :kinds="KINDS"
            :library="library"
            :node-icon="nodeIcon"
            :adder-labels="labels.adder ?? {}"
            :selected-key="selectedKey"
            :pending-target="pendingTarget"
            @select="selectedKey = $event"
            @toggle-pick="pendingTarget = $event"
            @remove-node="removeNode"
            @replace-unique="pendingTarget = { kind: 'replace-entry', fromNodeKey: $event }"
        />
    </div>
</template>
```

## 4. The host owns the mutations

The canvas says **where**, never **what**. When a `+` is clicked it emits `toggle-pick`
with a target; when a node is chosen in the library it emits `add` with a **handle**.

```js
function addNode(handle) {
    // A handle, not the descriptor. Treating it as an object produces nodes
    // typed `undefined`: a blank card that falls back to the ordinary kind and
    // then fails validation on save. It looks like it worked and stores nothing.
    const entry = Object.values(props.library).flat().find((m) => m.handle === handle);

    if (!entry) return;

    history.record();

    const key = `${entry.handle}_${Math.random().toString(36).slice(2, 10)}`;
    const config = {};
    (entry.schema ?? []).forEach((field) => { config[field.handle] = null; });

    graph.value.nodes.push({ node_key: key, type: entry.handle, label: entry.label, config, disabled: false });

    // Wire it up immediately, from whichever "+" was armed. A node that appears
    // unconnected and has to be wired afterwards turns a graph editor into a puzzle.
    const target = pendingTarget.value;

    if (target?.fromNodeKey) {
        graph.value.edges.push({
            from_node_key: target.fromNodeKey,
            to_node_key: key,
            from_output: target.output ?? 'default',
        });
    }

    if (target?.kind === 'replace-entry') removeNode(target.fromNodeKey, { silent: true });

    pendingTarget.value = null;
    selectedKey.value = key;
}
```

`pickKind` is what stops the library offering the wrong things:

```js
const pickKind = computed(() => {
    if (!pendingTarget.value) return 'step';

    return pendingTarget.value.kind === 'replace-entry'
        ? 'replace-entry'
        : (pendingTarget.value.fromNodeKey ? 'step' : 'entry');
});
```

## 5. Undo that is worth having

Call `history.record()` **before** a structural change, and `history.record(tag)` while
typing:

```js
<Input v-model="selected.label" @update:model-value="history.record(`label:${selected.node_key}`)" />
```

The tag identifies what is being edited, so one burst of typing on one field costs one
undo step, while every add and delete keeps its own. See
[history](/flow-canvas/concepts#history-is-snapshots-with-coalescing).

## 6. Saving

Send the whole graph. Both hosts do, and both write it as a replace inside a transaction:
a diff of a canvas somebody has been dragging around for ten minutes is a diff nobody can
reason about.

```js
router.patch(props.saveUrl, graph.value, { preserveScroll: true });
```

::: danger Validate every key the writer reads
Laravel's `validate()` returns **only** what it validated. Leave `label` and `config` out
of the rules and the graph saves with no labels and no configuration: the editor looks
like it worked and the flow is empty.
:::

## 7. Optional extras

| Want | Use |
| --- | --- |
| Figures on the cards | `:node-stats` — `node_key` → a list of `{ key, icon, value, label, tone }` |
| Red and amber cards | `:validation` — `node_key` → `'error'` or `'warning'`, reduced from `computeNodeIssues()` |
| Autosave | `useAutosave({ source: () => graph.value, saver: save })` |
| Collapsible groups in your config panel | `<PropertiesSection title="…">` |
| A `key_value` field's rows | `toRows()`, `rowsToObject()`, `duplicateKeyIndices()` |

## A checklist

- [ ] Composer runs before npm
- [ ] `preserveSymlinks` and `dedupe` in the Vite config
- [ ] Both stylesheets imported
- [ ] Exactly one kind declared `unique`, with `hasInput: false`
- [ ] `setNodeOutputSpecs(props.library)` called once, with the whole library
- [ ] Every icon name is a real `@statamic/cms` icon
- [ ] Every word arrives from PHP
- [ ] `useHistory` given both `getState` and `setState`
- [ ] The save request validates every key your writer reads
