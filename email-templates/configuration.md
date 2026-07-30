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

`false` disables the addon's wiring — collection registration, nav entry, preview route — without
uninstalling.

Safe to flip, because consumers use `EmailTemplates::resolve($slug, $fallback)` and fall back to their
own file-based bodies. That is the whole reason the resolve API takes a fallback.

## `layouts` and `default_layout`

```php
'layouts' => [
    'sequence' => 'emails.layouts.sequence',
    'transactional' => 'emails.layouts.transactional',
],
'default_layout' => 'transactional',
```

Named Blade layouts a rendered template body can be wrapped in. The key is the name a consumer or a
template refers to; the value is a Blade view path.

This is where the parts every email needs live: the outer table, the header, the footer, the
`<!doctype>` and the styles a mail client will tolerate. Keep them **out** of the Bard body, so an
editor cannot accidentally delete the footer and a change to the wrapper reaches every template at
once.

`default_layout` is used when nothing names one. Leaving it `null` means a bare body, which is fine for
a fragment and wrong for a standalone email.

## `branded_layout`

```php
'branded_layout' => null,
```

A layout that takes precedence, for a multi-brand install where each brand needs its own wrapper. Set it
to a view path, or resolve it per brand in your own code.

Leave it `null` on a single-brand site.

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

## What is not configurable

- **The collection handle.** `et_templates`.
- **The blueprint fields.** Title, Subject, Body, Plain text, Description.
- **The merge-variable syntax.** `{{ dotted.key }}`, substituted by
  `Support\MergeVariables::apply()`, identically in the send path and the preview.
- **Whether unknown tags are hidden.** They are left **visible**, deliberately, so a typo is obvious
  rather than silently empty.

## No environment variables

Everything here is a config-file decision. There is nothing per-environment about a template library.
