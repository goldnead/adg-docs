# Flow Canvas

<AddonHeader />

The node-graph editor that [Automations](/automations/) and [Funnels](/funnels/) share.

**It exists so there is one editor, not two that drift.** Every look-and-feel incident in
this addon family has traced back to a copy, so the pieces that are not about a particular
domain live here and both addons consume them.

::: warning This is infrastructure, not a product
There is nothing to install this for on its own. It has no Control Panel screen, no
routes, no configuration file, no migrations and no user-facing feature. It arrives as a
dependency of an addon that draws graphs, and these pages are for developers who want to
draw graphs in their own.
:::

## What is in here

The canvas, the node card, the node library, the config panel section, the control bar,
the adder node, the insertable edge — and the composables for auto-layout, history,
autosave, validation, output specs and key-value rows.

## What is not

**What a node *means*.** An automation node is an event and an action; a funnel node is a
page somebody walks onto. This package knows how to draw a graph and let someone rearrange
it. The host addon says what the boxes are.

Nothing in here knows the word "trigger", and nothing in here knows the word "step". A
host passes a map of **kinds**, as data, and every word on the screen comes with it — see
[Kinds are data](/flow-canvas/kinds).

## Two consumers, one editor

| | Automations | Funnels |
| --- | --- | --- |
| Kinds | trigger, logic, action | entry, page, offer, finish |
| Unique kind | the trigger | the entry step |
| A node with two outputs | a branch: `true`, `false` | an offer: `accepted`, `declined` |
| The figures on a card | reached, completed, failed | visitors, carried on, share |

Neither of those columns is in this package. Both are the host's, handed over as props.

## Licence

MIT, unlike most of its siblings. It is a shared foundation rather than a product, and a
foundation that cannot be read and vendored is a foundation nobody builds on.

## Next

- [Installation](/flow-canvas/installation) — Composer, then npm, then Vite
- [Configuration](/flow-canvas/configuration) — there is no config file, and what stands
  in its place
- [What is in here, and what is not](/flow-canvas/concepts) — the seam, and why it is
  where it is
- [Kinds are data](/flow-canvas/kinds) — the descriptor map, and the output-spec grammar
- [Using it in your own addon](/flow-canvas/consuming) — a working page, end to end
- [Reference](/flow-canvas/reference) — every export, prop and event
- [Troubleshooting](/flow-canvas/troubleshooting)
