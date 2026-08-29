# Installation

<AddonHeader />

<Requirements laravel="12.x / 13.x" database="Only for the optional proof-of-consent log" />

No queue, no scheduler, no build step. A database is needed only if you switch
[Proof of consent](/consent/proof) on.

```bash
composer require goldnead/statamic-consent
php please consent:install
```

Under `php artisan` the same command is `statamic:consent:install`; `please` drops the
prefix.

<Figure
  src="consent-cp-banner"
  alt="The Banner tab of the Consent global set, with the wording fields"
  caption="The wording is yours. The addon ships defaults, not a voice." />

## What the install command does

Three things, in this order:

1. **Publishes the assets** to `public/vendor/statamic-consent` — `consent.css` and
   `consent.js`. Always with `--force`: they are build output, not something a site edits.
2. **Publishes the blueprint** to `resources/blueprints/globals/consent.yaml`.
3. **Creates the `consent` global set**, seeded from the config file, so the client opens
   the Control Panel and finds the services this site uses rather than an empty screen.

An existing global set is **left alone**. Re-running the command never overwrites what
somebody edited.

::: warning Re-run it after every update
```bash
php please consent:install
```
The assets are overwritten on purpose. A half-updated pair of `consent.js` and `consent.css`
behaves like the previous release, and the symptom is a banner that looks right and acts
wrong.
:::

### If the blueprint cannot be written

On a containerised Statamic the application directory often belongs to root while the
process runs as www-data, so publishing the blueprint throws. The command **warns and
carries on** rather than dying, because the global set is the part that matters and it is
written somewhere else entirely.

You then copy the file yourself:

```bash
cp vendor/goldnead/statamic-consent/resources/blueprints/globals/consent.yaml \
   resources/blueprints/globals/consent.yaml
```

Sites that keep blueprints in their repository are in exactly this position and are not
doing anything wrong.

## Add the tags

```antlers
<head>
    {{ consent:head }}
</head>
<body>
    ...
    <footer>{{ consent:settings_link }}</footer>
    {{ consent:banner }}
</body>
```

`{{ consent:head }}` prints the stylesheet, the configuration payload and the script.
`{{ consent:banner }}` prints the banner and the settings dialog and belongs before
`</body>`.

`{{ consent:settings_link }}` belongs on **every** page. A decision that cannot be revisited
is not a decision that was freely given.

## Nothing renders until you add a service

**No services ship.** A fresh install leaves the site exactly as it was: no banner, no
stylesheet, no script.

Add the ones this site actually loads, under **Globals → Consent → Services**, or in
`config/statamic-consent.php`:

| Field | |
| --- | --- |
| **Handle** | Lowercase, e.g. `youtube`. What your templates refer to. **Do not change it after launch** |
| **Name** | Shown in the dialog |
| **Description** | Shown in the dialog |
| **Category** | Essential, Analytics, External media or Marketing |
| **Provider's privacy policy** | Linked from the dialog and the blocked placeholder |
| **Block embeds (two-click)** | On for embedded content, off for scripts |
| **Text on the blocked placeholder** | Overrides the generic wording for this service |

A service in the **essential** category is always granted and cannot be switched off, and a
site with only essential services still renders no banner. See
[When there is nothing to ask](/consent/nothing-to-ask).

## Publish the config

```bash
php please vendor:publish --tag=statamic-consent-config
```

Optional. The config file owns the handles, the cookie and the behaviour; the global set
owns the wording and overrides the config key by key. See
[Configuration](/consent/configuration).

## Publish the views

```bash
php please vendor:publish --tag=statamic-consent-views
```

Also optional. The published paths under `resources/views/vendor/statamic-consent/` are
public API, so a customised banner survives an update. The CSS rules are not — theme with
the [custom properties](/consent/banner#making-it-yours) instead of overriding selectors.

## Proof of consent

Off by default. If you want it:

```php
// config/statamic-consent.php
'record' => ['enabled' => true],
```

```bash
php artisan migrate
```

The migration **only loads while the record is on**, so a flat installation that never wants
one never gets a table. Read [Proof of consent](/consent/proof) first — a record is itself a
processing activity and belongs in your privacy policy.

## Verifying the install

Two checks, and the second one matters more:

```bash
# the assets are where the tag points
ls public/vendor/statamic-consent/     # consent.css, consent.js

# the global set was created
ls content/globals/                    # consent.yaml
```

Then load a page with a configured service and confirm the banner appears. Open a gated
embed's page with the network tab open and confirm **zero** requests to the third party
before you press the button. That is the property the addon exists for, and it is the one
worth verifying by hand rather than assuming.

## Uninstalling

```bash
composer remove goldnead/statamic-consent
rm -rf public/vendor/statamic-consent resources/views/vendor/statamic-consent
rm resources/blueprints/globals/consent.yaml config/statamic-consent.php
rm -rf content/globals/consent.yaml content/globals/*/consent.yaml
```

Then remove the tags from your layout. Visitors keep a stale `statamic_consent` cookie until
it expires; it is inert.

## Licence

Commercial: `composer.json` says `proprietary`. See [Licensing](/guide/licensing) for how the commercial addons in the suite resolve their licence.
