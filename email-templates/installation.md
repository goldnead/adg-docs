# Installation

<AddonHeader />

<Requirements laravel="12.x / 13.x" database="Not required" />

```bash
composer require goldnead/statamic-email-templates
php artisan vendor:publish --tag=email-templates-config
```

No migration: the addon owns no tables. Templates are entries in a native Statamic collection.

## What arrives

| | |
| --- | --- |
| Collection | `et_templates`, with a blueprint |
| Blueprint fields | Title, Subject, Preview text, Layout, Body (Bard), Plain text (optional), Description |
| CP nav | An entry under **Content**, pointing at the native collection listing |
| Live Preview | Wired to a custom render route, automatically at boot |

The collection itself has no front-end route, because email templates are not public pages. Entries are
instantiated as `EmailTemplateEntry`, which overrides `livePreviewUrl()` so the native Live Preview
button still appears. The addon does register one web route of its own,
`GET /email-templates/live-preview`, which renders the Live Preview iframe and is gated on a
short-lived token. See [Live Preview](/email-templates/live-preview).

::: tip Upgrading from 1.2.1 or earlier
Those versions gave the collection a placeholder route, `_email-template-preview/{slug}`, purely to
satisfy Statamic's Live Preview gate. It only ever returned 404. On boot, 1.3.0 removes exactly that
pattern and leaves any route you set yourself alone.
:::

## Creating your first template

1. CP → **Content → Email Templates → Create**.
2. **Title**, and a **slug** — the slug is the cross-addon reference, so pick something a consumer will
   name: `welcome`, `double-opt-in`, `newsletter-wrapper`.
3. **Subject**, with merge variables if you want: `Willkommen, {{ contact.first_name }}`.
4. **Preview text**, the line inbox clients show next to the subject. Optional, and worth filling in.
5. **Body** in Bard.
6. Open **Live Preview** and watch it render as you type.
7. Save.

Then point a consumer at the slug. See [Importing & consuming](/email-templates/importing).

## Migrating existing templates

If Marketing or another sibling addon already has file-based templates, import them rather than
retyping:

```bash
# See what would be imported, without writing anything
php artisan email-templates:import --dry-run

php artisan email-templates:import
```

Slugs are preserved 1:1, so a consumer resolving `welcome` finds the imported entry with no change on
its side.

::: warning Check the fidelity of the import
Legacy HTML is converted to Bard nodes by `HtmlToBard`. Structural markup survives; **inline styles and
unknown attributes are dropped**.

Run `--dry-run` first, then import and open each template in Live Preview to compare against the
original. Simple transactional templates round-trip cleanly; a heavily styled marketing template may
not. See [Authoring](/email-templates/authoring#fidelity).
:::

## Turning it off

```php
'enabled' => true,
```

`false` skips the boot-time wiring — ensuring the collection and blueprint, setting the entry class
and preview target, the nav entry — without uninstalling. Existing entries stay on disk.

On an install where no templates were ever created, consumers fall back to their own file-based
bodies, because `EmailTemplates::resolve($slug, $fallback)` prefers a managed entry and falls back to
the caller's. That is the point of designing the resolve API that way.

It does not retire entries that already exist: `resolve()` queries the collection by slug regardless
of this flag, so an existing entry still wins. See
[Importing & consuming](/email-templates/importing#consuming-from-a-sibling-addon).

## Permissions

None of its own. The collection is an ordinary Statamic collection, so the ordinary collection
permissions apply — grant your editors access to `et_templates` and nothing else changes.

## Licence

MIT.
