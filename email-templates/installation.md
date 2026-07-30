# Installation

<AddonHeader />

<Requirements laravel="Any version Statamic 6 supports" database="Not required" />

```bash
composer require goldnead/statamic-email-templates
php artisan vendor:publish --tag=email-templates-config
```

No migration: the addon owns no tables. Templates are entries in a native Statamic collection.

## What arrives

| | |
| --- | --- |
| Collection | `et_templates`, with a blueprint |
| Blueprint fields | Title, Subject, Body (Bard), Plain text (optional), Description |
| CP nav | An entry under **Content**, pointing at the native collection listing |
| Live Preview | Wired to a custom render route, automatically at boot |

The collection has no front-end route, because email templates are not public pages. Entries are
instantiated as `EmailTemplateEntry`, which overrides `livePreviewUrl()` so the native Live Preview
button still appears.

## Creating your first template

1. CP → **Content → Email Templates → Create**.
2. **Title**, and a **slug** — the slug is the cross-addon reference, so pick something a consumer will
   name: `welcome`, `double-opt-in`, `newsletter-wrapper`.
3. **Subject**, with merge variables if you want: `Willkommen, {{ contact.first_name }}`.
4. **Body** in Bard.
5. Open **Live Preview** and watch it render as you type.
6. Save.

Then point a consumer at the slug. See [Importing & consuming](/email-templates/importing).

## Migrating existing templates

If Marketing or another sibling addon already has file-based templates, import them rather than
retyping:

```bash
php artisan email-templates:import
```

Slugs are preserved 1:1, so a consumer resolving `welcome` finds the imported entry with no change on
its side.

::: warning Check the fidelity of the import
Legacy HTML is converted to Bard nodes by `HtmlToBard`. Structural markup survives; **inline styles and
unknown attributes are dropped**.

Import into a non-production environment first, open each template in Live Preview, and compare against
the original. Simple transactional templates round-trip cleanly; a heavily styled marketing template may
not. See [Authoring](/email-templates/authoring#fidelity).
:::

## Turning it off

```php
'enabled' => true,
```

`false` disables the addon's wiring — the collection registration, the nav entry, the preview route —
without uninstalling.

Consumers fall back to their own file-based bodies, because
`EmailTemplates::resolve($slug, $fallback)` prefers a managed entry and falls back to the caller's. So
this is a safe switch to flip, which is the point of designing the resolve API that way.

## Permissions

None of its own. The collection is an ordinary Statamic collection, so the ordinary collection
permissions apply — grant your editors access to `et_templates` and nothing else changes.

## Licence

MIT.
