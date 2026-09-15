---
title: Flow Canvas changelog
editLink: false
---

# Changelog

<AddonHeader slug="flow-canvas" />

Release notes for `goldnead/statamic-flow-canvas`, as published with the package.

Cross-version upgrade notes for the whole suite are in
[Upgrading](/guide/upgrading).

## 1.4.1 — 2026-09-07

### Changed: the developer address points to adriangoldner.dev

`extra.statamic.developer-url` in `composer.json` still read gldnr.studio. The sender that the
Control Panel shows on the addon, and Packagist on the package page, now reads
adriangoldner.dev, like the other addons in the suite. Nothing changes in the code; anyone who
does not look at where the addon comes from will notice nothing about this release.

## 1.4.0 — 2026-09-05

- **Levels follow the real card height, not a fixed row.** `computeLayout()` placed every level
  exactly `ROW_HEIGHT` below the previous one. A card that grows taller than those 200px through
  its content (four variable pills on a `send_email` are enough) reached into the level below,
  and the plus button between them half disappeared behind the next card (finding F19 of
  2026-09-03).

  New: `computeLayout(nodes, edges, { nodeHeights })` takes the measured card heights per
  `node_key` and gives every level the spacing its tallest card needs; all other levels stay
  where they were. Without that argument it computes bit-for-bit as before, three nodes still
  give y = 0, 200, 400. The canvas measures the cards itself and passes the heights through.

- **The package is a Statamic addon, not an anonymous `library`.** `composer.json` now carries
  `type: statamic-addon`, `extra.statamic` (name, description, slug, URL, developer) and a
  service provider. The provider is deliberately empty: it publishes nothing and registers
  nothing, because the hosts compile the canvas into their own bundles. It exists because
  Statamic only lists a package on the Addons page when `extra.statamic` **and** a provider are
  present; without it the entry drops out of the manifest without a word. `statamic/cms ^6.0` is
  now explicitly in `require`, where it was previously only implied by the hosts.

- **A test suite, on two levels.** PHPUnit through `Statamic\Testing\AddonTestCase` checks that
  the provider boots, what the manifest delivers to the Marketplace card, and that every path
  the hosts import from `@goldnead/flow-canvas` still exists. Vitest runs directly against the
  source files in `resources/js/composables` (no build needed): auto-layout, undo/redo with
  coalescing, output specifications, validation and key-value rows, 43 tests. Every test was held
  once against a deliberately broken function and turned red doing so. CI runs PHP 8.2 to 8.4
  against Laravel 12 and 13, plus the JS job, Pint and the studio's addon-lint.

- **`onStaleOutputSpec(handler)`.** When the canvas meets an output specification from a newer
  contract version, it falls back to a `default` output and reports that once per node type.
  Previously wired hard to `console.warn`; that stays the default, but a host can now redirect
  the message (toast, its own logger). The handler receives the text and
  `{ type, version, supported }`.

- There is still no empty `dist/`, `config/` or Vite setup, and that is now a test as well: the
  hosts are the place where this canvas becomes a bundle.

## 1.3.0 — 2026-09-02

- **A node may carry a `thumbnail`.** A URL on the node, and the card draws it as a 16:10 tile the
  full width of the card, above the title. Where the picture comes from is the host's business —
  a funnel screenshots its pages; this package only knows how to show one.

  The tile has a fixed height (`LAYOUT.THUMB_HEIGHT`, 150px on a 240px card) and the image loads
  lazily inside it, so a card is the same size before and after the picture arrives. The layout
  grows every row by that height as soon as any node on the canvas has a picture, and only then:
  a graph without thumbnails is laid out exactly as before, and a graph with them does not
  overlap. The tile's ground is the card's ground in both modes, so a slow image is never a white
  block on a dark canvas.

- `showThumbnails` on `<Canvas>` (default `true`) lets a host switch the tiles off without
  stripping the field from its nodes.
- `computeLayout()` takes an optional `{ rowHeight }`.

## 1.2.1 — 2026-08-26

### Removed — the VERSION constant

It stood at `1.0.0` while v1.2.0 was shipped. Nothing moved it along when a tag moved — a version
number that has to be copied by hand does not drift by accident, it drifts on its own. Anyone who
built a capability check on it got the wrong answer.

Removed rather than corrected: nobody in the family read it (grepped), and what this class exists
for — "is the package installed" — is answered by `class_exists()`, which cannot go stale.
Composer knows the version anyway, and there it is right.

## 1.2.0 — 2026-08-26

- **MIT, no longer proprietary.** A `LICENSE` file, which this package never had, and
  `"license": "MIT"` in the composer manifest.

  The reason is the dependency, not generosity. `statamic-funnels` **requires** this package, and
  both were listed as commercial — so buying Funnels left a second licence to sort out that nobody
  had decided the terms of. A shared editor that two of our own addons consume is infrastructure,
  and infrastructure that a customer has to buy twice is a bad seam. It also matches the rest of the
  foundation layer: Brand Context, Identity Contracts and Suppression are MIT for the same reason.

  Nothing about the code changes. Versions up to 1.1.0 were published under the old terms and stay
  that way; this applies from 1.2.0 on.

## 1.1.0 — 2026-08-25

- **The stats strip on a node card belongs to the host.** It accepts a list of
  `{key, icon, value, label, tone}`, so the host decides what the figures mean and what they are
  called. An automation's "completed" and a funnel step's "continued" are not the same sentence, and
  neither belongs in this package. A value may be a ready-made string, so a percentage is not
  rounded into thousands.
- The legacy `{reached, completed, failed}` object still renders exactly as before.

## 1.0.4 — 2026-08-25

- No code change. `1.0.3` carried a hard-coded `version` field in its `composer.json`, which
  Packagist reads instead of the tag, so the tag never appeared.

## 1.0.3 — 2026-08-25

- **Vue Flow's own stylesheets go into the `base` layer.** Unlayered CSS outranks every layer, so
  `@vue-flow/minimap`'s fixed light background beat any themed rule a host wrote — and not only in
  the addon that built the bundle, because the Control Panel loads every addon's stylesheet on every
  page. The minimap stayed a white box in dark mode.
- The minimap's node rectangles and viewport mask follow CP tokens.

## 1.0.2 — 2026-08-25

- The canvas's own styling moved into the package (`canvas.css`, `canvas-theme.css`), so two hosts
  cannot drift apart.

## 1.0.1 — 2026-08-25

- `setNodeOutputSpecs` reads the whole library rather than one group.

## 1.0.0 — 2026-08-25

- Extracted from `goldnead/statamic-automations`: canvas, node cards, config panel, auto-layout,
  history, output-spec grammar.
