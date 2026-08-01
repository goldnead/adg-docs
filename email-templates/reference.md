# Reference

<AddonHeader />

## Console commands

| Command | Purpose |
| --- | --- |
| `email-templates:import` | Pull file-based templates from sibling addons into entries, preserving slugs 1:1 |

| Option | |
| --- | --- |
| `--dry-run` | Report what would be imported, write nothing |
| `--overwrite` | Update entries whose slug exists. Without it, an existing slug is skipped. |
| `--source=` | Import from one source only, matched against its `label()` |

Nothing is scheduled. The command is a migration step you run yourself.

## Facade

```php
use Goldnead\EmailTemplates\Facades\EmailTemplates;

$template = EmailTemplates::resolve($slug, $fallback);
$template?->subject;   // string
$template?->body;      // email-ready HTML string
```

`$fallback` is a callable receiving the slug, returning an array (`['title' => …, 'body' => …]`) or `null`.
**A managed entry wins**; the fallback keeps un-migrated slugs working.

`resolve()` is the only method on the facade. By the time it returns, the body already has
the hidden preheader prepended and the layout wrapped around it; only merge-variable
substitution is left for the caller.

### `EmailTemplateData`

What `resolve()` returns.

| Property | Type | |
| --- | --- | --- |
| `slug` | `string` | The stable cross-addon reference |
| `title` | `string` | |
| `subject` | `string` | Merge tags still unresolved |
| `preview` | `string` | The preheader text, before it is turned into a snippet |
| `body` | `string` | Email-ready HTML: preheader prepended, layout wrapped |
| `plainText` | `?string` | |
| `description` | `?string` | |
| `layout` | `?string` | The entry's chosen handle from `email-templates.layouts` |
| `source` | `string` | `entry` for a managed entry |

| Method | |
| --- | --- |
| `EmailTemplateData::fromArray(array $data)` | Build one from a plain array |
| `toArray()` | The reverse |
| `toEntryData()` | The shape the collection stores |

## Merge variables

```php
use Goldnead\EmailTemplates\Support\MergeVariables;

MergeVariables::apply($string, $data);
```

The single substitution point, used identically by the send path and Live Preview. Unknown tags are left
**visible**.

Documented sample set:

| Variable | Sample source |
| --- | --- |
| `{{ contact.first_name }}` | sample data |
| `{{ contact.last_name }}` | sample data |
| `{{ contact.full_name }}` | sample data |
| `{{ contact.email }}` | sample data |
| `{{ contact.salutation }}` | sample data |
| `{{ sender.name }}` | `config('mail.from.name')` |
| `{{ sender.email }}` | `config('mail.from.address')` |
| `{{ unsubscribe_url }}` | sample data |
| `{{ date }}` | today, `d.m.Y` |

The real variable set is whatever the **consumer** supplies at send time. This addon substitutes; it does
not define.

## Collection

| | |
| --- | --- |
| Handle | `et_templates` |
| Blueprint | Title, Subject, Preview text, Layout, Body (Bard), Plain text (optional), Description |
| Blueprint file | `resources/blueprints/collections/et_templates/email_template.yaml`, written once when missing |
| Collection route | none — email templates are not public pages |
| Preview target | `/email-templates/live-preview` |
| Entry class | `EmailTemplateEntry`, overriding `livePreviewUrl()` |
| CP nav | under **Content** |
| Revisions | disabled |
| SEO Pro | opted out via `cascade.seo = false` |

The **slug** is the stable, cross-addon reference.

The collection carries no front-end route; the addon does register one web route of its own
for the preview iframe, listed below. Versions up to 1.2.1 put a placeholder route
(`_email-template-preview/{slug}`) on the collection to satisfy Statamic's Live Preview gate.
1.3.0 removes exactly that pattern on boot and leaves any route you set yourself alone.

## Live Preview

| | |
| --- | --- |
| Route | `GET /email-templates/live-preview` |
| Constant | `EmailTemplateCollectionManager::LIVE_PREVIEW_ROUTE` |
| Entry resolution | `LivePreview::item($request->statamicToken())` |
| Render path | `BardHtmlRenderer` → `MergeVariables::apply()` |
| Gating | valid, short-lived token; otherwise a neutral placeholder |

## Render classes

All under `Goldnead\EmailTemplates\Support`.

| Class | Purpose |
| --- | --- |
| `BardHtmlRenderer` | Bard nodes → email HTML, via tiptap-php, with the Statamic Bard augmentor as a fallback |
| `HtmlToBard` | Legacy HTML → Bard nodes, used by the import |
| `MergeVariables` | Merge-tag substitution |
| `EmailPreheader` | Builds and prepends the hidden preview-text snippet |
| `LayoutResolver` | A layout handle → a Blade view, with the precedence below |
| `BrandedBodyRenderer` | Wraps a body in that view |

The order the resolver applies them: `EmailPreheader::prepend()` first, then
`BrandedBodyRenderer::wrap()`, so the preheader is inside the layout and any merge tags it
carries are picked up by the caller's single substitution pass over the body.

### `LayoutResolver`

```php
LayoutResolver::resolve(?string $handle = null): ?string
```

Returns the Blade view name for a layout handle, or `null` when nothing usable resolves.
Precedence: the given handle in `email-templates.layouts`, then `default_layout` in the same
map, then `branded_layout` as the final fallback. A blank or unmapped value falls through
rather than throwing.

### `BrandedBodyRenderer`

| Method | |
| --- | --- |
| `wrap($bodyHtml, $subject, $layoutHandle = null)` | The wrapped document, or `$bodyHtml` unchanged when no layout resolves |
| `resolveLayout($layoutHandle = null)` | The view that would be used, per `LayoutResolver` |
| `enabledFor($layoutHandle = null)` | Whether that view resolves **and** exists |
| `enabled()` | Back-compat alias: is `branded_layout` alone usable? |
| `layout()` | The configured `branded_layout` view name, or `null` |

The layout is applied through a small addon view that `@extends` yours and injects the body
into its `@yield('content')`; the subject is passed as `$title`. A configured view that does
not exist yields the raw body rather than an exception mid-send.

### `EmailPreheader`

| Method | |
| --- | --- |
| `html(string $preview)` | The hidden snippet, or `''` for blank preview text |
| `prepend(string $bodyHtml, string $preview)` | `$bodyHtml` with that snippet in front, unchanged when blank |

The text is HTML-escaped. Merge tokens survive escaping untouched, which is why a preheader
can carry `{{ contact.first_name }}` and be resolved by the same pass as the body.

**Fidelity:** tiptap's default schema keeps headings, lists, links, images and tables, and **drops inline
styles and unknown attributes**. Simple transactional templates round-trip cleanly; heavily styled
marketing HTML may lose styling.

## Contracts

| Contract | Implement to |
| --- | --- |
| `Goldnead\EmailTemplates\Contracts\EmailTemplateSource` | contribute an import source |

```php
$this->app->tag([MySource::class], 'email-templates.sources');
```

## Configuration

| Key | Default | Purpose |
| --- | --- | --- |
| `enabled` | `true` | `false` skips the boot-time collection/blueprint/nav wiring. The route, the import command and `resolve()` stay. |
| `layouts` | `[]` | Named Blade layouts: `handle => view.path`. Populates the entry's Layout select. |
| `default_layout` | `null` | Used when an entry names no layout of its own |
| `branded_layout` | `null` | The final fallback in the layout chain. Not brand-aware; the name is historic. |
| `preview.sample_data` | see above | Data Live Preview substitutes |

Published with `--tag=email-templates-config`; that is the addon's only publish tag. No
environment variables.

## Events

None.

## Permissions

None of its own. `et_templates` is an ordinary Statamic collection, so the ordinary collection permissions
apply.

## Database

None. The addon owns no tables.

## Requirements

<Requirements laravel="12.x / 13.x" database="Not required" />

Composer requirements are `php ^8.2`, `illuminate/console` and `illuminate/support`
(`^12.40|^13.0`, which is where the Laravel floor comes from) and `statamic/cms ^6.0`. No
sibling addon is required, and **`brand-context` is not among the requirements** — this
addon has no brand awareness of its own.

## Guarantees

| | |
| --- | --- |
| Resolve order | managed entry, then the caller's fallback |
| Adding the addon | breaks no existing send |
| Removing the addon | breaks no existing send |
| Preview vs. send | the same render path and the same substitution call; only the data differs |
| Unknown merge tags | left visible, in preview **and** in a real send |
| Import | preserves slugs 1:1 |
| Brand scoping | not applicable; nothing of its own is persisted |
