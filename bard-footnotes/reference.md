# Reference

<AddonHeader />

Everything the addon exposes, on one page.

## The button

`footnote` in the `buttons` list of a Bard field in the blueprint:

```yaml
type: bard
buttons:
  - h2
  - bold
  - footnote
```

The button is opt-in per field. The `footnote` node itself is always registered,
so footnotes display and can be edited in fields that do not list the button.
Requires `save_html: false`, the default.

## The Sources list

Shown under a Bard field that cites at least one source, titled **Sources (N)**.
Per row: number, source (↗ for a link), citation count, **Go to citation** /
**Next citation** and **Edit**. Edit opens **Edit Source N** (source and link, no
select; **Apply Source** changes every place). There is no remove in the list, and
no Edit in a read-only field.

## The node

An inline node `footnote` in the Bard document. It stores two attributes:

| Attribute | Type | Description |
| --- | --- | --- |
| `text` | string | the source; required unless there is a link |
| `url` | string \| null | the link, optional; only `http(s)://` ever reaches an `href` |

Numbers are not stored. They are derived at render time and in the editor:
order of first occurrence, the same source keeping the same number. A footnote
with neither text nor url is not numbered, not listed and renders nothing.

## Tag

`{{ footnotes field="…" }}` … `{{ /footnotes }}`

| Parameter | Required | Type | Description |
| --- | --- | --- | --- |
| `field` | yes | string | the handle of a Bard variable in the current context; its raw value is read from the context |

Single tag: renders `bard-footnotes::list`: heading, ordered list, external links
with `target="_blank" rel="noopener noreferrer"`, a `↩` back link per source,
nothing at all when there are no footnotes.

Tag pair: loops the sources. Variables per source:

| Variable | Type | Description |
| --- | --- | --- |
| `number` | int | order of first occurrence |
| `text` | string | the source text, trimmed; escape it yourself (`\| entities`) |
| `url` | string \| null | only when it starts with `http(s)://`, case-insensitive |

Plus `no_results` and `total_results`, as in Statamic's collection tags. If
`field` is missing or not a Bard value, the tag renders nothing and, with
`APP_DEBUG=true`, logs one warning naming the field.

## Markup

| Name | Where |
| --- | --- |
| `sup.footnote-ref` | wraps every footnote reference |
| `a[href="#fn-n"]` | the reference's link, `aria-label="Footnote n"` |
| `id="fnref-n"` | the first occurrence of source `n`, the back link's target |
| `.footnotes` | the `section` around the list |
| `#footnotes-title` | the `h2` list heading |
| `id="fn-n"` | the list entry of source `n` |
| `.footnote-back` | the `↩` back link |

## PHP API

`Goldnead\BardFootnotes\Footnotes`, all methods static:

```php
// The distinct sources of a Bard field in order of first citation:
// list of ['number' => int, 'text' => string, 'url' => ?string].
// Accepts the raw value, a Statamic Value or a collection; anything else → [].
public static function sources(mixed $bardJson): array;

// The key that decides whether two footnotes are the same source.
public static function key(?string $text, ?string $url): string;

// True for a footnote with neither text nor url.
public static function isEmpty(?string $text, ?string $url): bool;

// The augment hook: writes the derived number into every footnote node.
// Idempotent: a fully numbered document comes back unchanged.
public static function number(mixed $value): mixed;

// A Bard value to its raw document.
public static function raw(mixed $value): mixed;
```

## Publishing

| What | Tag |
| --- | --- |
| the compiled Control Panel bundle (`public/vendor/statamic-bard-footnotes`) | `statamic-bard-footnotes` |
| the view (`list.antlers.html` → `resources/views/vendor/bard-footnotes/`) | `bard-footnotes-views` |

No config file and no migrations.

## Translations

English and German under `bard-footnotes::messages`; see
[Styling and translations](/bard-footnotes/styling).
