# Configuration

<AddonHeader />

```bash
php artisan vendor:publish --tag=email-templates-config
```

```php
// config/email-templates.php

return [
    'enabled' => true,
    'branded_layout' => null,
    'layouts' => [
        // 'sequence' => 'emails.layouts.sequence',
        // 'transactional' => 'emails.layouts.transactional',
    ],
    'default_layout' => null,
    'preview' => [
        'sample_data' => [ /* … */ ],
    ],
];
```

Five keys. There is deliberately not much here: the templates themselves are content, not
configuration.

## `enabled`

```php
'enabled' => true,
```

`false` skips the boot-time work: the collection and blueprint are no longer ensured, the entry class
and preview target are no longer set, and the CP nav entry disappears. Existing entries stay on disk,
untouched.

Two things it does **not** turn off: the `/email-templates/live-preview` route stays registered, and
`email-templates:import` and `EmailTemplates::resolve()` keep working, because they address the
collection directly.

On an install where no templates were ever created, consumers fall back to their own file-based
bodies, because `EmailTemplates::resolve($slug, $fallback)` prefers a managed entry and falls back to
the caller's. That is the whole reason the resolve API takes a fallback. Where entries already exist,
they still win — see
[Importing & consuming](/email-templates/importing#consuming-from-a-sibling-addon).

## `layouts` and `default_layout`

```php
'layouts' => [
    'sequence' => 'emails.layouts.sequence',
    'transactional' => 'emails.layouts.transactional',
],
'default_layout' => 'transactional',
```

Named Blade layouts a rendered template body can be wrapped in. The key is the name a template's
**Layout** field refers to; the value is a Blade view path. The select on the entry is populated from
the keys of this map.

This is where the parts every email needs live: the outer table, the header, the footer, the
`<!doctype>` and the styles a mail client will tolerate. Keep them **out** of the Bard body, so an
editor cannot accidentally delete the footer and a change to the wrapper reaches every template at
once.

`default_layout` is used when a template names no layout of its own. Leaving it `null` falls through to
`branded_layout`, and with that unset too, a bare body — fine for a fragment and wrong for a standalone
email.

## `branded_layout`

```php
'branded_layout' => null,
```

The **last** step in the layout chain, and the oldest: it predates `layouts` and
`default_layout` and exists so that installs which only ever had one wrapper keep working
unchanged.

The full precedence, resolved identically by the send path and by Live Preview:

1. The entry's own **Layout** handle, looked up in `layouts`
2. `default_layout`, looked up in the same map
3. `branded_layout`

Each step is skipped when it is blank or does not map to anything, so an unknown handle
falls to the next rather than throwing mid-send. If no step yields a usable view, the body
is returned unwrapped.

A single-brand site that wants one shell for everything can use `branded_layout` alone and
never touch `layouts`. That is what it is for.

::: warning It is not brand-aware
The name is historic. `branded_layout` is a single global config value with no relation to
[Brand Context](/brand-context/) — this addon does not require it and reads no brand when
resolving a layout. Per-brand wrappers are your own code's job: bind a config value per
brand, or give each brand its own `layouts` handle and set it on the entry.
:::

## `preview.sample_data`

```php
'preview' => [
    'sample_data' => [
        'contact' => [
            'first_name' => 'Maria',
            'last_name' => 'Beispiel',
            'full_name' => 'Maria Beispiel',
            'email' => 'maria.beispiel@example.com',
            'salutation' => 'Hallo Maria',
        ],
        'unsubscribe_url' => 'https://example.com/newsletter/abmelden',
    ],
],
```

The data Live Preview substitutes into merge variables. Override it to match your own audience —
realistic names and a realistic address make a rendering problem visible that `foo bar` hides.

Two variables are filled in from your application rather than from this array:

| Variable | Source |
| --- | --- |
| `{{ sender.name }}` | `config('mail.from.name')` |
| `{{ sender.email }}` | `config('mail.from.address')` |
| `{{ date }}` | today, formatted `d.m.Y` |

::: tip Use a long name in your sample data
`Maria Beispiel` is a good default; a very long name and a very long email address are better test
cases, because that is what breaks a fixed-width table in Outlook. Consider putting one of each in your
sample data permanently.
:::

## `countdown.image`

```php
'countdown' => [
    'image' => true,
],
```

Whether the addon serves the PNG behind
[`{{ countdown_image }}`](/email-templates/merge-variables#countdown-image-the-moving-picture) from
`GET /!/statamic-email-templates/countdown.png`. With `false` — or without `ext-gd` on the server —
the route answers 404 and writes a warning to the log. The text tag `{{ countdown }}` needs nothing
from here and keeps working either way.

Switch it off when you do not want a public, image-rendering endpoint at all, signed and rate-limited
as it is. Nothing else in the addon depends on it.

## What is not configurable

- **The collection handle.** `et_templates`.
- **The set of blueprint fields.** Title, Subject, Preview text, Layout, Body, Plain text,
  Description. There is no config key that adds or removes one. The blueprint is written to
  `resources/blueprints/collections/et_templates/email_template.yaml` on first boot and is a
  file in your repository from then on — the addon only creates it when it is missing, so
  fields you add there survive. The **Layout** field's options are the one part driven by
  config, and only at the moment the file is first written.
- **The merge-variable syntax.** `{{ dotted.key }}`, substituted by
  `Support\MergeVariables::apply()`, identically in the send path and the preview.
- **Whether unknown tags are hidden.** They are left **visible**, deliberately, so a typo is obvious
  rather than silently empty.

## No environment variables

Everything here is a config-file decision. There is nothing per-environment about a template library.
