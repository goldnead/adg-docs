---
title: Flow Canvas changelog
editLink: false
---

# Changelog

<AddonHeader slug="flow-canvas" />

Release notes for `goldnead/statamic-flow-canvas`, as published with the package.

Cross-version upgrade notes for the whole suite are in
[Upgrading](/guide/upgrading).

## 1.2.1 — 2026-08-26

### Removed — die VERSION-Konstante log

Sie stand auf `1.0.0`, ausgeliefert war v1.2.0. Nichts liess sie mitwandern, wenn ein Tag wanderte —
eine Versionsnummer, die von Hand kopiert werden muss, driftet nicht aus Versehen, sondern von
selbst. Wer darauf eine Faehigkeitspruefung baute, bekam die falsche Antwort.

Entfernt statt nachgezogen: niemand in der Familie las sie (gegrept), und wofuer diese Klasse
existiert — „ist das Paket installiert" — beantwortet `class_exists()`, das nicht veralten kann.
Composer kennt die Version ohnehin, und dort stimmt sie.

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
