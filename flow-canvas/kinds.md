# Kinds are data

<AddonHeader />

This is the seam. Nothing in the package knows the word "trigger" or the word "step",
because a host hands over a **map of kinds** and every word, colour and rule comes with
it.

```js
const KINDS = {
    trigger: { label: __('Trigger'), plural: __('Triggers'), color: 'blue',    group: 'triggers', unique: true, hasInput: false },
    logic:   { label: __('Logic'),   plural: __('Logic'),    color: 'amber',   group: 'logic',    fallback: true },
    action:  { label: __('Action'),  plural: __('Actions'),  color: 'emerald', group: 'actions' },
};
```

The same shape, in the other host:

```js
const KINDS = {
    entry:  { label: 'Entry',  color: 'blue',    group: 'entrys',  unique: true, hasInput: false },
    page:   { label: 'Page',   color: 'emerald', group: 'pages',   fallback: true },
    offer:  { label: 'Offer',  color: 'amber',   group: 'offers'  },
    finish: { label: 'Finish', color: 'purple',  group: 'finishs' },
};
```

## The descriptor

| Field | Default | What it decides |
| --- | --- | --- |
| `label` | the kind's own key | The badge on a card |
| `plural` | `label` | The tab in the node library |
| `color` | `default` | The badge colour |
| `group` | the kind's own key | Which group of the library payload belongs to this kind |
| `unique` | `false` | At most one may exist. See below. |
| `hasInput` | `true` | `false` draws no incoming handle: this is where a graph starts. |
| `replaceLabel` | `Replace` | The wording of a unique kind's menu item |
| `fallback` | — | The kind a node type found in no declared group falls back to |

The order of the map decides nothing except one thing: with no `fallback: true` anywhere,
the **last declared kind** catches unrecognised node types.

### `unique`

A graph has exactly one entry point, whatever the host calls it. A unique kind:

- cannot be duplicated
- offers **Replace** instead of **Delete**
- is the only group offered while an entry slot is armed, and is hidden entirely while a
  mid-flow `+` is armed

Offering entry nodes mid-flow would build a second entry point; offering anything else in
the entry slot would build a graph nothing can walk into.

## The node library payload

The kinds say what a *kind* is. The library says what nodes exist, grouped by the `group`
each kind declares:

```php
// The host's registry, rendered with the page.
[
    'pages' => [
        [
            'handle'      => 'capture',
            'label'       => 'Form',
            'description' => 'A page with a real Statamic form on it.',
            'icon'        => 'forms',
            'kind'        => 'page',
            'schema'      => [ /* field descriptors */ ],
            'outputs'     => [ /* the output spec, below */ ],
        ],
    ],
    'offers' => [ /* … */ ],
]
```

| Key | Used for |
| --- | --- |
| `handle` | The node's type. Everything else is keyed by it. |
| `label` | The library item, and a card's title when a node has no label of its own |
| `description` | The second line of the library item |
| `icon` | Resolved through the host's `createNodeIcon()` map, not read directly |
| `schema` | The config panel's fields, and the live required-field check |
| `outputs` | The output spec |

The library search matches on `label` and `handle`.

::: warning Every icon name must be real
`createNodeIcon()` builds a `(handle, kind) => iconName` lookup, and every name it returns
must be an icon shipped by `@statamic/cms`. An invented one renders as nothing at all,
which looks like a broken build rather than a wrong string.
:::

## The output spec

How many handles a node draws, and what they are called, is declared **by the node**, on
the server, and evaluated in the browser against that node's live config.

The minimum, and the shape most nodes have:

```php
[
    'version' => 1,
    'clauses' => [
        ['outputs' => [
            ['handle' => 'accepted', 'label' => 'accepted'],
            ['handle' => 'declined', 'label' => 'declined'],
        ]],
    ],
]
```

A node with no spec at all gets a single `default` continuation. That is the one
assumption which cannot make a stored graph unreadable: an edge on a handle the node does
not offer still lays out and is still saved untouched.

### The grammar

| Key | |
| --- | --- |
| `version` | The grammar version. `1` today. |
| `primary` | The handle that means "and then". Marked `primary: true` in the result. |
| `clauses` | Evaluated in order. **The first one that applies wins.** |

Within a clause:

| Key | |
| --- | --- |
| `when` | `{ field, is: [...] }` or `{ field, not: [...] }`, with an optional `default` used when the config value is empty. No `when`, or no `field`, always applies. |
| `outputs` | A fixed list. Each entry is `{ handle, label }`, or a bare string. |
| `from` | Handles read out of a `key_value` config field — a switch's cases, a parallel's branches. |
| `append` | A fixed list added after the generated ones: the `done` of a loop, the fallthrough of a switch. |

`from` takes `{ field, handle, label, handle_fallback, label_fallback }`. `handle` and
`label` each name a side of the pair, `'key'` or `'value'`, defaulting to key and value
respectively. `label_fallback: 'handle'` reuses the handle when the label side is empty.

The rows from `outputs`, `from` and `append` are concatenated in that order, empty handles
are dropped, and duplicates are dropped keeping the first.

### `primary` is why it is not simply "the first one"

A loop's outputs are `loop` then `done`. The copy Duplicate makes belongs *after* the
loop, not inside its body. Until a node could say which output means "and then", the
canvas had no way to know that.

### A newer spec than the canvas understands

The published assets live in the host's `public/vendor/`, so a stale copy meeting a newer
server is a real shape, not a hypothetical one.

A spec numbered **higher** than the canvas's `OUTPUT_SPEC_VERSION` is therefore not
guessed at. It resolves to the single `default` output — what a canvas that had never
heard of output specs did with the same node — and logs one console warning per node type
telling you to re-publish.

Lower numbers stay readable: every field this version understands is one an older payload
simply does not use.

### Registering the specs

Once, by the page that owns the canvas, with the same `library` prop the server rendered:

```js
setNodeOutputSpecs(props.library);
```

It accepts a flat array *or* any map of group name → descriptors. Group-agnostic on
purpose: an addon whose groups are called `pages` and `offers` would otherwise register no
specs at all and silently get one handle on every node, including the ones that declared
two.

That is not hypothetical either. It is exactly what happened to the second host before
1.0.1, and an offer drew one way out with both branches already wired underneath, going
nowhere.
