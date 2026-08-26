# Troubleshooting

<AddonHeader />

## No banner appears

The first question is not "what is broken" but "did the addon decide there was nothing to
ask". Look at the page source:

- **No `consent.css`, no `statamic-consent-config` JSON, no `consent.js`** → the addon
  rendered nothing on purpose. Go to
  [When there is nothing to ask](/consent/nothing-to-ask).
- **The assets are there, no banner** → read on.

Then, in order:

1. **Is `{{ consent:banner }}` in the layout?** It belongs before `</body>`. A site with
   several layouts often has it in one of them.
2. **Is `assets.scripts` on?** Off disables the addon entirely: the banner markup is
   rendered hidden and nothing ever reveals it.
3. **Has this browser already decided?** Run `StatamicConsent.reset()` in the console.
4. **Is GPC on in this browser?** With `respect_gpc` true, a GPC signal is recorded as a
   rejection and the banner is not shown. That is correct behaviour, and it makes testing in
   a privacy-hardened browser misleading.
5. **404 on `consent.js`?** The assets were never published, or were published to a
   different `public` directory. Run `php please consent:install`.

## The banner is there but no service is listed

Only categories that **have services** are rendered; an empty group reads as a bug, so it is
dropped. If every category is empty, there is nothing to ask about and the banner would not
render at all.

Check that each service's **Category** matches a configured category handle. A service whose
category names something that does not exist belongs to no rendered group.

## Services I put in the config file do not appear

The global set overrides the config file, key by key, and **an emptied list stays empty** on
purpose. Check **Globals → Consent → Services** — what the set holds is what renders.

That behaviour exists because the alternative broke a real site: until 1.3.0 an emptied list
fell back to the shipped one, so a client who deleted the services got them back within a
page load, along with a banner asking about services their site does not load.

To go back to the config file as the source, delete the set's `services` list entirely
rather than emptying it row by row.

## The banner looks like someone else's website

You are on a version before 1.5.0. Until then the shipped defaults were one particular site's
identity: a warm yellow, a cream ground, 40px corners and pill buttons. Update.

From 1.5.0 the defaults are neutral, and if you *liked* the old look it is a visual breaking
change — restore it by setting the tokens yourself. See
[Making it yours](/consent/banner#making-it-yours).

## My colours disappear in dark mode

Fixed in 1.5.0. Before it, `:root[data-consent-theme="dark"]` (specificity 0,1,1) outranked a
host's plain `:root` (0,1,0), so a themed banner lost its brand the moment dark mode was on.

From 1.5.0 the shipped tokens sit in a `@layer` and your unlayered CSS wins in both
directions — which means it wins *literally*. A dark accent set for light mode stays dark on
dark. Give the dark theme its own values:

```css
:root[data-consent-theme="dark"] { --csnt-brand: #7FB8AF; --csnt-brand-ink: #0C1F1C; }
```

## A `!important` is the only thing that works

You are fighting a component rule rather than a token. The component rules are deliberately
not layered, because they are the widget's mechanics.

Check the token list first — shape and label styling became tokens in 1.5.0
(`--csnt-radius-button`, `--csnt-btn-transform`, `--csnt-label-tracking` and the rest), and
before that they were hard-coded and genuinely needed `!important`.

If you need to override selectors, take the stylesheet over completely with
`assets.styles => false` and write your own against the class names.

## The banner flashes on every page for a visitor who decided months ago

The stylesheet is missing or loading late. The banner is rendered hidden and revealed by the
script; without the CSS there is nothing hiding it in the first place.

Check that `{{ consent:head }}` is in `<head>` and that `consent.css` returns 200.

## An embed loads before the visitor allows it

Then it is not inside a gate. Check three things:

1. The markup is **between** `{{ consent:gate }}` and `{{ /consent:gate }}`, not next to it.
2. The service's **Block embeds (two-click)** is on. With `block_content` off, the tag
   renders its contents directly and blocks nothing — which is the correct setting for a
   script and the wrong one for an iframe.
3. There is not a second copy of the embed elsewhere on the page, in a layout partial or a
   Bard field.

Verify with the network tab filtered to the provider's domain: zero requests before the
click is the property the addon promises, and it is worth checking rather than assuming.

## A gate says the service is not configured

A gate naming a handle that does not exist stays blocked and says so, rather than falling
through. That is deliberate — a typo must not publish an unconsented embed.

Causes, in order of likelihood: a typo in the `service` parameter; a handle renamed in the
Control Panel after the template was written; the whole services list emptied.

## `{{ consent:granted }}` is always false

Two candidates, and the second one is the historical bug.

**A cached page.** This tag reads the cookie on the server, so a page served from a
full-page cache carries whichever answer was true for the visitor who warmed it. Use the gate
for anything that loads a third party.

**A discarded cookie.** The cookie is written by JavaScript and is therefore not encrypted,
and Laravel's `EncryptCookies` middleware discards anything it cannot decrypt. The addon
registers it with `EncryptCookies::except()` at boot — this was broken until 1.3.1, and the
symptom was exactly "nobody has consented yet", forever, on an otherwise working install.

If you renamed the cookie, the exemption follows the new name, but a `config:cache` from
before the rename does not.

## Everyone is asked again after a deploy

`version` was raised, or `cookie.name` changed. Both invalidate every stored decision by
design.

Raising `version` is correct when you add a service that is not essential — an old yes must
not cover something the visitor never saw. Renaming the cookie is almost never what you
wanted.

## A parked script never runs

- **Is the type exactly `text/plain`?** Anything else and the browser executes it at parse
  time.
- **Is `data-consent-service` set to a handle that exists?** An unknown handle is never
  granted.
- **Is the script inside a `<template>`?** A gate parks its whole content; a script in there
  is unlocked with the gate, not by the script mechanism.
- **Does it depend on `DOMContentLoaded`?** A re-created script runs when consent is given,
  which is after that event.

## Google Consent Mode does nothing

- `google_consent_mode.enabled` must be `true`, and the page must actually load gtag. The
  runtime only ever pushes onto a `dataLayer` the page already has.
- **A signal with an empty service list stays denied.** That is the intended default for
  anything unmapped, and it is the usual reason a signal never turns green.
- **A signal is granted only when every service mapped to it is granted.** One unchecked
  service in the list keeps the whole signal denied.
- Confirm the `consent default` call is inline in the head and **before** any Google script.
  `{{ consent:head }}` writes it first; a Google tag pasted above that tag defeats it.

## Nothing is recorded in `consent_records`

1. **Is `record.enabled` true**, and did you run `php artisan migrate` afterwards? The
   migration only loads while the record is on.
2. **Are you on 1.4.0?** That release answered **419 on every delivery** and recorded
   nothing. Update to 1.4.1 or later. An empty log is the only symptom.
3. **Is the request reaching the endpoint at all?** Look for
   `POST /!/statamic-consent/record` in the browser's network tab. It should answer 204.
4. **Is something adding CSRF protection back** onto the `web` group? The route removes four
   class names; a global middleware of your own can put one back.
5. **Is the rate limit being hit?** `record.rate_limit` is 30 per minute per IP, which a
   shared NAT or a load test can exceed.

Remember that a 204 does not mean a row was written. The endpoint answers the same either
way on purpose, so it does not tell a stranger whether a cookie was present.

## `consent:lookup` says the record is switched off

It is, and that is a different answer from "no records". Set `record.enabled`, run
`php artisan migrate`, and note that decisions made before you switched it on were never
recorded and cannot be recovered.

## `consent:prune` deletes nothing

- `record.keep_days` is `null`. The command warns and exits successfully rather than
  quietly doing nothing.
- Nothing is old enough. The default is 400 days.
- Nothing schedules the command. The addon does not register it; if you never call it, it
  never runs.

## `consent:install` cannot write the blueprint

Expected on a containerised Statamic, where the application directory belongs to root while
the process runs as www-data. The command **warns and carries on**, because the global set is
the part that matters and it is written elsewhere.

Copy the file yourself:

```bash
cp vendor/goldnead/statamic-consent/resources/blueprints/globals/consent.yaml \
   resources/blueprints/globals/consent.yaml
```

## The banner behaves like the previous release after an update

The published assets are stale. `consent.js` and `consent.css` live in `public/vendor/` and
are not updated by `composer update` alone.

```bash
php please consent:install
```

Re-run it after **every** update. A half-updated pair is worse than either version on its
own.

## Escape closes the dialog and nothing happens

That is correct as of 1.1.0 and 1.6.0 together: closing without deciding stores nothing,
unlocks nothing, and brings the banner back. Whichever way you close it — the button,
Escape, or clicking away from a gate — the behaviour is the same.

If the banner does **not** come back, you are on a version before 1.1.0, where Escape walked
past that check.

## Still stuck

[Support](/guide/support). Only the latest version is supported, so start by confirming which
one you are on.
