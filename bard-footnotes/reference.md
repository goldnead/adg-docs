# Reference

<AddonHeader />

Everything the addon exposes, on one page.

## Modifier

`{{ <field> | footnotes[:<param>] }}` · `{{ <field> | footnotes(<param>) }}`

| Parameter | Type | Description |
| --- | --- | --- |
| none | — | count from the `sources` field in the context |
| `sources` | value | the grid value passed along, e.g. `footnotes(sources)` |
| a field name | string | resolved against the context, e.g. `footnotes:sources` |
| a number | int | the count of sources, e.g. `footnotes:3` |

Returns the field's own shape, linked: rendered HTML for a plain Bard field,
the set list for a field with sets. Markers only up to the count, only in text
— never inside links, headings h1–h6, `pre` or `code`.

## Tag

`{{ footnotes }}` … `{{ /footnotes }}`

| Parameter | Required | Type | Description |
| --- | --- | --- | --- |
| `sources` | one of the two | grid value | the rows to list; falls back to the `sources` field in the context |
| `content` | no | Bard value | the article, rendered to decide `cited`; without it every source is `cited => false` |

Single tag: renders `bard-footnotes::list` — heading, ordered list, external
links with `target="_blank" rel="noopener noreferrer"`, a `↩` back link per
cited source, nothing at all when there are no sources.

Tag pair: loops the sources. Variables per row:

| Variable | Type | Description |
| --- | --- | --- |
| `number` | int | sequential, gaps from empty rows closed |
| `text` | string | the source text, trimmed; escape it yourself (`\| entities`) |
| `url` | string \| null | only when it starts with `http(s)://`, case-insensitive |
| `cited` | bool | whether the rendered content contains the marker |

Plus `no_results` and `total_results`, as in Statamic's collection tags.

## The fieldset

`- import: bard-footnotes::sources` gives the blueprint a grid:

| Field | Type | Notes |
| --- | --- | --- |
| `sources` | grid | one row per source; instructions carry the `[1]`, `[2]` … convention |
| `sources.text` | text | the source; rows without text drop out on output |
| `sources.url` | text, `input_type: url` | the link; non-`http(s)` values never reach an `href` |

## Classes and ids in the markup

| Name | Where |
| --- | --- |
| `sup.footnote-ref` | wraps every linked marker |
| `a[href="#fn-n"]` | the marker's link, `aria-label="Footnote n"` |
| `id="fnref-n"` | the first occurrence of marker `n` — the back link's target |
| `.footnotes` | the `section` around the list |
| `#footnotes-title` | the `h2` list heading |
| `id="fn-n"` | the list entry of source `n` |
| `.footnote-back` | the `↩` back link |

## PHP API

`Goldnead\BardFootnotes\Footnotes`, all methods static:

```php
// Link the markers in a bare HTML string. $placed tracks which jump targets
// exist already; pass one array across several calls to keep them unique.
public static function render(string $html, int $count, array &$placed = []): string;

// A Bard set list: text sets rendered and linked, other sets unchanged.
public static function renderSets(array $sets, int $count): array;

// Whatever the field hands over, in its own shape: HTML string in, HTML string
// out; set list in, set list out; null → '', scalar → its string, else ''.
public static function renderValue(mixed $value, int $count): mixed;

// The joined HTML of the text sets (or the string itself). What cited() reads.
public static function html(mixed $value, int $count): string;

// The grid, normalized: list of ['number' => int, 'text' => string, 'url' => ?string],
// numbers sequential, empty rows dropped, urls kept only when http(s)://.
// Accepts the raw value, a Statamic Value or a collection; anything else → [].
public static function sources(mixed $rows): array;

// Whether the rendered output contains the jump target fnref-{$number}.
public static function cited(string $renderedHtml, int $number): bool;
```

## Publishing

| What | Tag |
| --- | --- |
| the view (`list.antlers.html` → `resources/views/vendor/bard-footnotes/`) | `bard-footnotes-views` |

No config file, no migrations, no assets.
