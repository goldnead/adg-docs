# Configuration

<AddonHeader />

```bash
php artisan vendor:publish --tag=brand-context-config
```

Five keys. Each one is short, and each one changes behaviour that other addons
depend on, so they are documented with their consequences rather than just their
types.

```php
// config/brand-context.php

return [
    'multi_brand' => env('BRAND_CONTEXT_MULTI_BRAND', false),
    'license_check' => null,
    'default_handle' => env('BRAND_CONTEXT_DEFAULT_HANDLE', 'default'),
    'default_name' => env('BRAND_CONTEXT_DEFAULT_NAME', 'Default'),
    'fail_mode' => env('BRAND_CONTEXT_FAIL_MODE', 'closed'),
];
```

## `multi_brand`

```php
'multi_brand' => env('BRAND_CONTEXT_MULTI_BRAND', false),
```

The master switch. `false` means the global scope is a no-op, records are stamped
with the default brand on create, and no brand UI exists anywhere. `true` turns on
scoping, stamping, the switcher and the members screen.

No migration is involved in either direction, because the schema is identical.
Turning it back off does not delete anything; it stops filtering.

::: danger Turning it off is not a rollback
On an install that has genuinely used two brands, setting this back to `false`
makes every brand's rows visible to every user at once. It is a valid thing to do
only after you have consolidated to one brand.
:::

## `license_check`

```php
'license_check' => null,
```

An optional callable that must return `true` for multi-brand mode to activate.
When it is `null`, `multi_brand` alone decides.

This exists so a product built on top of the suite can ship multi-brand as a
premium tier without forking anything: point it at your own licence resolver and
the flag becomes necessary but not sufficient.

```php
'license_check' => fn () => app(MyLicence::class)->hasFeature('multi-brand'),
```

On an ordinary install, leave it `null`. Note that a `license_check` returning
`false` produces exactly the behaviour of `multi_brand => false`, which is the
safe direction to fail in: everything works, nothing is isolated.

## `default_handle` and `default_name`

```php
'default_handle' => env('BRAND_CONTEXT_DEFAULT_HANDLE', 'default'),
'default_name' => env('BRAND_CONTEXT_DEFAULT_NAME', 'Default'),
```

Identify the brand that always exists and that every backfilled row belongs to.
The handle is what you pass to `runFor()` and to `--brand=` on every scheduled
command in the suite.

Set these **before** the first migration if you want something meaningful, for
example your own company handle. Changing `default_handle` afterwards does not
rename the existing brand: it is read when the default brand is created, and
after that the row is the truth. Rename the row instead.

## `fail_mode`

```php
'fail_mode' => env('BRAND_CONTEXT_FAIL_MODE', 'closed'),
```

What a scoped query does in multi-brand mode when no current brand is resolved.

| Value | Behaviour |
| --- | --- |
| `closed` (default) | Return **no** rows |
| `open` | Do not filter |

Keep it `closed`. The whole safety argument of this package is that a missing
brand context is a bug that shows up as an empty list rather than as one client
seeing another client's contacts.

`open` exists for a narrow migration window: an install part-way through adopting
multi-brand, where some code paths do not yet set a brand and an empty screen is
worse than an unscoped one. Treat it as temporary and note that with it on, the
fail-closed guarantee documented by every other addon in the suite no longer
holds.

## What is not configurable

Deliberately, and worth stating so you do not go looking:

- **The membership rule.** A user with no membership at all counts as a member of
  every brand, and there is no flag to make membership strict. See
  [why](/brand-context/members#the-rule-that-will-surprise-you).
- **Per-brand uniqueness.** Which columns are unique per brand rather than globally
  is decided by each dependent addon's migrations, not by config.
- **Whether `brands` itself is scoped.** It is not, and cannot be. Brands are the
  scoping root.

## Environment summary

```dotenv
BRAND_CONTEXT_MULTI_BRAND=false
BRAND_CONTEXT_DEFAULT_HANDLE=default
BRAND_CONTEXT_DEFAULT_NAME=Default
BRAND_CONTEXT_FAIL_MODE=closed
```
