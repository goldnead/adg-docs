# What is in here, and what is not

<AddonHeader />

## The seam

**In:** drawing a graph, and letting somebody rearrange it.

**Out:** what a node means.

| In this package | In the host addon |
| --- | --- |
| The canvas, the cards, the library, the config panel section, the control bar | What a node is, and what it does |
| Auto-layout, undo/redo, autosave, the output-spec evaluator | The node classes, their schemas, their outputs |
| Which handles a node draws, given its spec and its config | Every word on the screen, translated in PHP |
| Marking a node invalid | Deciding that it is |
| — | Loading and saving the graph |

Nothing in here knows the word "trigger", and nothing in here knows the word "step". The
package was extracted from `statamic-automations` in 1.0.0, and the extraction was only
worth doing if the automations vocabulary did not come with it.

## Positions are derived, never stored

The builder stores no hand-placed coordinates. Node positions are computed from the graph
structure on every render, top to bottom, so the canvas is always a clean readable flow
and the insert model is unambiguous: there is exactly one correct slot for each node.

The algorithm is a classic tidy-tree pass — children packed left to right at a fixed
column span, each parent centred over its children — and it assumes what the editing
model produces: every node has a single incoming edge, so the live graph is a tree, or a
small forest of disconnected roots.

Cycles and re-convergence are only reachable through imported or hand-wired data. They are
guarded against rather than supported: first placement wins, and the layout degrades
instead of hanging.

Anything unreachable is laid out too. An orphaned node is exactly what somebody opens the
canvas to notice.

The layout pass is pure and framework-free, so it can be unit-tested on its own.

## Adders are synthetic

The `+` buttons are not part of the saved graph. The canvas generates one under every
**open output** — an output the layout found with no edge on it — and one more on an
empty canvas, as the single entry slot.

Clicking one does not open a dropdown. It arms *pick mode* on the node library, and the
next node clicked there lands at exactly that position. Clicking an armed `+` again
disarms it.

A real edge gets the same treatment from the other side: `InsertableEdge` hangs a `+` at
its midpoint, for inserting a node **between** two existing ones.

Both report the armed target back to the host through `toggle-pick`:

```js
{ kind: 'append', fromNodeKey, output }
{ kind: 'insert', edge: { from_node_key, from_output, to_node_key } }
```

The host owns the mutation. The canvas says where, never what.

## One kind may be unique

A graph has exactly one entry point, whatever the host calls it. A kind declared `unique`:

- may exist at most once
- cannot be duplicated
- offers **Replace** in its menu instead of **Delete**, because deleting the only entry
  point leaves a graph nothing can walk into
- is filtered out of the library while a mid-flow `+` is armed, and is the *only* thing
  offered while an entry slot is armed

That last rule is why `pickKind` exists: `entry`, `replace-entry` or `step`.

## Which handles a node has is declared by the node

A node's outputs come from its own declaration on the server, travel to the browser inside
the node-library payload, and are evaluated here against the node's live config. See
[Kinds are data](/flow-canvas/kinds#the-output-spec).

Before that contract existed the canvas held its own copy of the rule — a chain of
`if (type === 'switch')` — which was accurate for one addon's built-ins and empty for
everybody else. A third-party node got one `default` handle whatever it declared in PHP.

The evaluation has to be synchronous: outputs are read during layout, during render, and
again while somebody is typing into a switch's cases. So what travels is a spec the
browser evaluates, not a resolved list fetched per keystroke.

## History is snapshots, with coalescing

`useHistory` is snapshot-based. The host mutates its own graph and calls `record()` after
each discrete operation; each record pushes the *previous* snapshot onto the undo stack.

The interesting part is the coalescing, and the cut is deliberate:

- **Structural steps are never coalesced.** Add, delete, duplicate, connect, replace,
  enable/disable — each gets its own entry. Those are the steps somebody means when they
  reach for undo.
- **Text is coalesced per field, per burst.** `record('label:abc123')` folds consecutive
  records carrying the same tag within 600 ms into one entry. Moving to another field ends
  the run, and so does a pause.

A snapshot per keystroke makes the stack useless: a hundred typed characters evict every
structural step from a hundred-entry stack, and the delete somebody wants back is no
longer in it.

Selection and other UI state are deliberately not tracked.

## Validation here mirrors, it does not decide

`useNodeValidation` mirrors the **required-field** check against the same schema the
server exposed through the node library, so a card can go red as somebody types.

The host's own server-side validator remains the source of truth for the full picture —
entry count, edges, cycles, everything. This is a live echo of one part of it, not a
second opinion.

## The card's figures belong to the host

Since 1.1.0 the strip on a node card takes a **list** of
`{ key, icon, value, label, tone }`. An automation's node "completed" and a funnel step's
visitor "carried on" are not the same sentence, and neither belongs in this package.

A value may be a ready-made string, so a percentage is printed as given rather than
rounded into thousands. The legacy `{ reached, completed, failed }` object still renders
exactly as before.
