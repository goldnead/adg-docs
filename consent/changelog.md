---
title: Consent changelog
editLink: false
---

# Changelog

<AddonHeader slug="consent" />

Release notes for `goldnead/statamic-consent`, as published with the package.

Cross-version upgrade notes for the whole suite are in
[Upgrading](/guide/upgrading).

## 1.8.0

### Added: eight of the banner's values in the Control Panel

**Settings → Addon Settings** now carries a section for this addon, with four groups:

- **Decision:** the consent version (raising it invalidates every stored decision and shows the
  banner to every visitor again, which is exactly what is due as soon as a non-essential service
  is added), the validity in days, and whether Global Privacy Control is honoured.
- **Shipped assets:** whether `&#123;&#123; consent:head }}` outputs the addon's stylesheet and script.
  Without that script and without one of your own, no banner is shown and no decision is
  stored.
- **Proof of consent:** after how many days `php please consent:prune` deletes a record.
- **Google Consent Mode v2:** whether the signals are reported and how long Google waits for the
  update.

Only the deviation is stored; everything else keeps following
`config/statamic-consent.php`.

**Where this ends and the global set begins.** Everything that is content and has to be
translated — banner and dialog texts, the addresses of the privacy policy and the legal notice
(Impressum), the lists of services and categories — stays in the `consent` global set. A global
is the right instrument for localisable content, and two places for the same value would be
worse than one missing place. The settings page only carries what the global set does not cover.

Not on the page, and the group descriptions say so: `cookie.name` and `cookie.same_site`,
because a change of name makes every stored decision unfindable without that looking like a
reset, and because the name goes to `EncryptCookies::except()` as early as `bootAddon()`.
`record.enabled`, because switching it on needs a migration. `record.rate_limit`, because it is
read while the route is being registered. And `google_consent_mode.signals`, a mapping of four
Google signals onto lists of service handles, for which this layer has no type; a text field
that writes a mapping out and back through an invented separator is a worse editor than none.

**New permission `manage consent settings`.** Nobody holds it at first, and until it is assigned
to a role the section stays invisible. Existing permissions are unchanged.

**Requires `goldnead/statamic-brand-context` 1.13 or newer.** Older versions show the page but
do not apply its values reliably: on an installation with a single brand, the settings of the
addons that registered last never reached the config, and up to 1.12 a second save of the same
section deleted the first save's override, without a message. Anyone who set values before the
update should check afterwards that they are still there.

## 1.7.0

### Added: this addon's figures appear in Insights

From 1.1.0 `statamic-insights` is no longer a revenue report but the family's reporting layer: an
addon registers what it can count and gets the period, the comparison against the period before,
the chart, the breakdowns and two finished screens in return.

The coupling is optional in **both** directions. Without Insights nothing here is missing; without
this addon only its own group is missing over there. `suggest`, never `require`.

Every figure follows the contract's house rules: **null is not zero** (a rate with no denominator
has no answer and does not print 0 %), `available()` decides existence and never the data, gaps in
a series are filled by Insights rather than by the metric, and a filter a metric does not
understand is ignored rather than fatal.

One figure: decisions recorded, splittable by purpose and by outcome.

`consent_records` carries no brand column — checked against the migration rather than assumed — so
there is nothing to narrow here.

## 1.6.0

### Removed

- **`reject_on_dismiss` is gone, because it never did anything.** The key was read from the config,
  handed to the browser on every page as `rejectOnDismiss`, and the script never looked at it once.
  The behaviour was hard-wired all along — and to the strict reading: closing the dialog without
  deciding brings the banner back, stores nothing and unlocks nothing.

  In effect nothing changes. What changes is the promise: the config file and the README both
  described a switch, so a site that set it to `false` believed it had changed something. Under the
  GDPR no decision is not consent, so the only value that setting could legitimately have had was
  the one that was already hard-wired. Removing it is the honest version, and
  `tests/Feature/DismissIsNotConsentTest.php` now pins the behaviour that actually exists.

## 1.5.0

### What's changed

- **The banner no longer arrives wearing someone else's brand.** The stylesheet's defaults were,
  literally, one particular website's identity: a warm yellow (`#E8B931`), a cream ground
  (`#FAF8F4`), a 40px corner radius, pill-shaped buttons and tiny wide-spaced capitals. Every site
  that installed this addon got that look on its own pages until it overrode it. The defaults are
  now neutral — near-black on near-white, a 16px radius, ordinary sentence-case buttons — so an
  un-themed banner reads as *plain*, not as *foreign*.

  This is a **visual breaking change** for anyone who relied on the old look. Restore it by setting
  the tokens yourself; the README's "Making it yours" section starts with exactly this.

### What's new

- **The shape and the label style are tokens now**, not hard-coded values. Previously only colour
  and type family were yours; the round buttons and the spaced capitals were the addon's opinion and
  could only be undone with `!important`. New custom properties:
  `--csnt-radius-button`, `--csnt-radius-pill`, `--csnt-btn-size`, `--csnt-btn-weight`,
  `--csnt-btn-tracking`, `--csnt-btn-transform`, `--csnt-label-tracking`, `--csnt-label-transform`,
  `--csnt-title-weight`, `--csnt-title-tracking`, `--csnt-shadow-knob`.

- **Your tokens now survive dark mode.** The three token blocks moved into a `@layer`, and unlayered
  CSS beats every layer regardless of specificity. Before this, `:root[data-consent-theme="dark"]`
  (0,1,1) outranked a host's plain `:root` (0,1,0), so a site that had themed the banner watched its
  brand disappear the moment dark mode was switched on — visible in light, gone in dark. The
  component rules are deliberately **not** layered; those are the widget's mechanics.

### What's fixed

- **The secondary button became unreadable on hover.** `.csnt-btn--secondary:hover` set its
  background to `--csnt-brand` while leaving the label at `--csnt-ink`. In the new neutral defaults
  those two are the same value, so the label vanished into the button. It now lifts to
  `--csnt-surface-muted-line`, which is what the equivalent rule in the panel footer already did.

- **A hard-coded `border-radius: 2rem` under 30rem** overrode `--csnt-radius-card` on phones, so a
  site with square corners still got the old rounded card on mobile and could not fix it with a
  token. Removed.

- **`--csnt-radius-inner` was documented and defined but never used.** It now styles the blocked-embed
  placeholder, which is what its name promised.

- **The switch knob's shadow was the only hard-coded colour left**, and it was the old warm palette's
  (`rgba(20, 18, 16, …)`). It is `--csnt-shadow-knob` now, with a value per theme.

- Three defaults were quoted wrongly in the README. A new test compares every documented token
  against the stylesheet, so the table cannot drift again.

## 1.4.1

### What's fixed

- **The proof-of-consent endpoint answered 419 on every real delivery.** The route excluded
  `VerifyCsrfToken`, but Laravel 12 and 13 register `PreventRequestForgery` in the `web` group and
  `VerifyCsrfToken` is its *subclass* — and `Router::resolveMiddleware()` removes only what is a
  subclass of the excluded class, never the parent. So the check stayed on, the browser's `fetch`
  carries no token, and nothing was ever recorded. Invisible to the suite because
  `PreventRequestForgery::handle()` returns early under `runningUnitTests()`; the new test therefore
  asserts the route's gathered middleware list rather than making a request. **Anyone running 1.4.0
  with `record.enabled` has an empty log and should update.**

## 1.4.0

### What's new

- **Proof of consent**, off by default. Article 7(1) GDPR puts the burden of proof on the controller,
  and a value in the visitor's own browser is not proof. Switch on `record.enabled`, run
  `php artisan migrate`, and every decision is recorded server-side — the id, timestamp, version,
  granted handles and how it was decided. **No IP address, no user agent**: both are personal data in
  their own right and neither is needed.
- **`php please consent:lookup`** answers the question the log exists for, with `--latest` and
  `--csv`. **`php please consent:prune`** enforces the retention.

## 1.3.1

### What's fixed

- **`&#123;&#123; consent:granted }}` never worked.** The cookie is written by JavaScript and is therefore not
  encrypted; Laravel's `EncryptCookies` middleware discarded it, so the server saw no cookie at all.
  The failure looked exactly like "nobody has consented yet", which is why it survived a green
  suite, a playground and a production install. The cookie is now registered with
  `EncryptCookies::except()`, and the exemption follows a renamed cookie.

## 1.3.0

Both of these came out of the first real installation, on a site that loads no third party at all.

### What's new

- **No services ship.** A service listed by default appears in the banner of every fresh install,
  describing data processing that site may not do. Add the ones your site actually loads; the config
  file carries the three most common as commented examples.

### What's fixed

- **A list emptied in the control panel stayed empty no longer than a page load.** Deleting every
  service fell back to the shipped list, so a client who removed them got them back — along with a
  banner asking about services their site does not load. An emptied list is an answer, not a missing
  value.

## 1.2.1

### What's fixed

- `php please consent:install` died with "mkdir(): Permission denied" on a containerised Statamic,
  where the application directory belongs to root while the process runs as www-data. Publishing the
  blueprint is a convenience; the global set is the job. It now warns, says where to copy the file
  from, and carries on.
- The install command had no test at all. It has three now, including the unwritable case.

## 1.2.0

### What's new

- **Nothing to ask, nothing rendered.** With no optional service configured, `&#123;&#123; consent:head }}`,
  `&#123;&#123; consent:banner }}` and `&#123;&#123; consent:settings_link }}` render nothing at all. Strictly necessary
  cookies need no consent, so a site that loads no third party has nothing to put in a banner — and
  that is the state every installation is in on its first day. A gate still blocks.

## 1.1.0

### What's new

- **Google Consent Mode v2**, off by default. Map each of Google's four signals to the services
  behind it; the `consent default` call is written inline and first, the update follows the
  visitor's decision.
- **Browser tests** for the three behaviours the PHP suite cannot reach: the localStorage mirror,
  Global Privacy Control and parked scripts. `npm test`.

### What's fixed

- Closing the settings panel with **Escape** without deciding left the visitor with no banner and no
  decision. Every way out now behaves the same.
- The CI matrix tested a Laravel 11 leg that Statamic 6 can never satisfy, and `orchestra/testbench`
  was pinned to Laravel 12 only, so the Laravel 13 leg could not resolve either.

## 1.0.0

### What's new

- **The banner is a card in the bottom-left corner and the settings panel sits in the opposite
  corner**, in the shape adriangoldner.com established — not a bar across the page. No font is
  loaded: the banner inherits the site's own faces. Every colour, radius and shadow is a custom
  property.

- **Cookie banner and settings dialog**, with the wording editable in the control panel under
  **Globals → Consent**. Every route out of the banner — accept all, essential only, settings — is
  one click and looks like the others.
- **`&#123;&#123; consent:gate }}`**, a two-click gate that parks the embed in a `<template>`, so no request
  reaches the third party before the visitor allows it.
- **`&#123;&#123; consent:granted }}`, `&#123;&#123; consent:settings_link }}`, `&#123;&#123; consent:head }}`,
  `&#123;&#123; consent:banner }}`** — see the README for signatures.
- **Parked scripts** via `<script type="text/plain" data-consent-service="…">`.
- **Global Privacy Control** is honoured: a visitor sending the signal is recorded as having
  rejected, and is not asked again.
- **English and German** translations; a field left empty in the control panel falls back to the
  shipped text in the visitor's language.
- **`php please consent:install`** publishes the assets and blueprint and seeds the global set.
- **Google Consent Mode v2**, off by default. Map each of Google's four signals to the services
  behind it; the `consent default` call is written inline and first, the update follows the
  visitor's decision.
