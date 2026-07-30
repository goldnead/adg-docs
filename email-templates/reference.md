# Reference

<AddonHeader />

## Console commands

| Command | Purpose |
| --- | --- |
| `email-templates:import` | Pull file-based templates from sibling addons into entries, preserving slugs 1:1 |

## Facade

```php
use Goldnead\EmailTemplates\Facades\EmailTemplates;

$template = EmailTemplates::resolve($slug, $fallback);
$template?->subject;   // string
$template?->body;      // email-ready HTML string
```

`$fallback` is a callable receiving the slug, returning an array (`['title' => …, 'body' => …]`) or `null`.
**A managed entry wins**; the fallback keeps un-migrated slugs working.

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
| Blueprint | Title, Subject, Body (Bard), Plain text (optional), Description |
| Front-end route | none |
| Entry class | `EmailTemplateEntry`, overriding `livePreviewUrl()` |
| CP nav | under **Content** |

The **slug** is the stable, cross-addon reference.

## Live Preview

| | |
| --- | --- |
| Route | `GET /email-templates/live-preview` |
| Constant | `EmailTemplateCollectionManager::LIVE_PREVIEW_ROUTE` |
| Entry resolution | `LivePreview::item($request->statamicToken())` |
| Render path | `BardHtmlRenderer` → `MergeVariables::apply()` |
| Gating | valid, short-lived token; otherwise a neutral placeholder |

## Render classes

| Class | Purpose |
| --- | --- |
| `BardHtmlRenderer` | Bard nodes → email HTML, via tiptap-php, with the Statamic Bard augmentor as a fallback |
| `HtmlToBard` | Legacy HTML → Bard nodes, used by the import |
| `Support\MergeVariables` | Merge-tag substitution |

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
| `enabled` | `true` | `false` disables all wiring; consumers fall back |
| `branded_layout` | `null` | A layout taking precedence, for multi-brand |
| `layouts` | `[]` | Named Blade layouts: `name => view.path` |
| `default_layout` | `null` | Used when nothing names one |
| `preview.sample_data` | see above | Data Live Preview substitutes |

No environment variables.

## Events

None.

## Permissions

None of its own. `et_templates` is an ordinary Statamic collection, so the ordinary collection permissions
apply.

## Database

None. The addon owns no tables.

## Requirements

<Requirements laravel="Any version Statamic 6 supports" database="Not required" />

Composer requirements are PHP, `illuminate/console`, `illuminate/support` and `statamic/cms`. No sibling
addon is required.

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
