# Reference

<AddonHeader />

Everything the addon exposes, on one page.

## Tag

`{{ toc }} … {{ /toc }}`

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `depth` | int | `3` | How many heading levels the tree spans |
| `is_flat` | bool | `false` | Return one flat level; `children` stays empty |
| `field` | string | `"article"` | Name of the field to read |
| `content` | string / array / null | `null` | The content itself: a Bard array or an HTML string |
| `from` | string | `h1` | The heading level the tree starts at |
| `to` | string | `null` | The level the tree stops at, absolute. Wins over `depth` |
| `exclude` | string | `null` | Comma-separated substrings, or a delimited regex. Matches case-insensitively. |
| `when` | bool | `true` | Falsy (`false`, `'false'`, `0`, `'0'`) returns an empty list |

`exclude` and `when` require **1.9**, `to` requires **2.0**. From 2.0 on, five of these
have a site-wide default in `config/statamic-toc.php`: `field`, `from`, `depth`, `to`
and `flat` (the config key for `is_flat`). `exclude`, `when` and `content` are tag
parameters only. See [Configuration](/toc/configuration).

## `toc:count` tag

`{{ toc:count }}` — returns the number of headings as an integer.

Takes the same parameters as the list and counts what the list shows.

**Changed in 2.0.** Before 2.0 it forced `depth` to `6` internally, so a bare count
next to a default list reported a larger number than the list rendered. To count
every heading in the document, ask for it: `{{ toc:count depth="6" }}`.

### Item variables

| Variable | Type | |
| --- | --- | --- |
| `toc_title` | string | The heading text |
| `toc_id` | string | The anchor |
| `id` | int | Internal id, links children to parents |
| `level` | int | The heading's own level: `2` for an `h2` |
| `is_root` | bool | Set on items at the shallowest level in the list |
| `is_deepest_children` | bool | Set on items at the deepest level in the list |
| `parent` | int / null | |
| `has_children` | bool | |
| `children` | array | |
| `total_children` | int | |

`level` is the absolute HTML level, not a position in the tree, so a list starting at
`from="h2"` has `level` `2` on its root items. `is_root` and `is_deepest_children` are
relative to what the list actually contains: they are computed from the shallowest and
deepest level present after `from`, `to`, `depth` and `exclude` have been applied.

### Scope variables

| Variable | Type | Description |
| --- | --- | --- |
| `total_results` | int | Total headings, including children |
| `no_results` | bool | True when there are none |

## Modifier

`{{ value | toc }}`

Returns the value rendered with an `id` on every heading. Accepts a Bard field
(default or `save_html`), a Markdown field, or an HTML string. Nothing is written
back to storage.

### Parameters

Any parameters are joined with a space and written into every opening heading tag as
extra attributes. The literal `[id]` is replaced with that heading's anchor.

```antlers
{{ article | toc:x-on:click="go('[id]')" }}
```

```html
<h2 id="resonanz" x-on:click="go('resonanz')">Resonanz</h2>
```

The attributes are added alongside the `id`, never instead of it. A heading that
already carries an `id` is left untouched entirely, so it gets neither a second id nor
the extra attributes.

## Console commands

None.

## Events

None.

## Permissions

None. The addon has no Control Panel surface.

## PHP API

```php
use Goldnead\StatamicToc\Facades\ParserFacade;
```

The facade is a static entry point to `Goldnead\StatamicToc\Parser`, the class the tag
and the modifier drive. It reads anchors from the same per-request registry they do, so
a list built in PHP and a body rendered in a template agree on every id.

| Method | Returns | |
| --- | --- | --- |
| `make($content)` | `Parser` | A parser for a Bard array, a Markdown string or HTML |
| `setContent($content)` | `Parser` | The same, on an existing parser |
| `options(Options $options)` | `Parser` | Replace the whole option set at once |
| `from($level)` | `Parser` | The level the list starts at |
| `to($level)` | `Parser` | The deepest level, absolute |
| `depth($depth)` | `Parser` | How many levels the list spans |
| `exclude($exclude)` | `Parser` | Comma-separated text, or a delimited regex |
| `flatten()` / `flattenIf($bool)` | `Parser` | One flat level instead of a tree |
| `build()` | `array` | The heading tree, in the shape the tag hands to templates |
| `injectIds($value, $params = null)` | `string` | What the modifier does, with the same `[id]` handling |
| `isHTML()` / `isBard()` / `isMarkdown()` | `bool` | Which extractor the content matched |

```php
$items = ParserFacade::make($entry->value('article'))->from('h2')->to('h3')->build();
```

`Options` is immutable: every builder method hands back a new instance rather than
mutating one, so a half-applied option set cannot leak between calls.

## Configuration

`config/statamic-toc.php`, published with `--tag=statamic-toc-config`. Five keys —
`field`, `from`, `depth`, `to`, `flat` — all optional, all overridable per tag. The
views are published separately with `--tag=statamic-toc-views`. See
[Configuration](/toc/configuration).

## Requirements

<Requirements php="8.2+" statamic="5.x or 6.x" laravel="Any version your Statamic supports" database="Not required" />

`v1.10` runs on PHP 7.4+ and Statamic 3.x through 6.x. It stays installable but is no
longer maintained.

## Behaviour guarantees

| | |
| --- | --- |
| Duplicate headings | Suffixed with a number. The tag and the modifier suffix identically, so anchors pair up. |
| Slug generation | Identical between tag and modifier, given the same content. |
| Content mutation | None. Ids exist only in rendered output. |
| Brand scoping | Not applicable; the addon persists nothing. |
| Queue / scheduler | Not used. |

## Known limitations

- The modifier adds ids to **every** heading it finds, regardless of the tag's
  `from` and `depth`. Deliberate: a link in the list must resolve, and a heading
  outside the list is harmless with an id.
- Two `{{ toc }}` calls on **different fields** number their duplicates
  independently, so the same heading text in two fields can produce the same id.
  Concatenate into one variable if that is a risk. Within one document, 2.0 decides
  every anchor once, so repeated calls no longer renumber each other.
- No `{{ toc_html }}` or prebuilt markup. You write the list.
- No scroll-spy or current-section highlighting. See
  [Recipes](/toc/recipes#highlight-the-current-section).
- `exclude` drops headings from the **list** only; the modifier still gives them ids.
  That is intended, so an excluded heading remains linkable from elsewhere.
- The `mb_convert_encoding` deprecation notice on PHP 8.2+ is fixed in 2.0. `v1.10`
  still logs it, and will not be fixed there — removing it meant dropping PHP 7.4,
  which is the whole reason 2.0 exists.

## Version notes

| Version | |
| --- | --- |
| **2.0** | Requires PHP 8.2 and Statamic 5 or 6. Statamic 3 and 4 support ends here. Extraction split into `Extractors/{Bard,Html,Markdown}` behind a `Detector`, so content is no longer taken for Markdown because it contains a `#`. Tag and modifier read anchors from **one registry**, so repeated calls on a document stop renumbering each other and `exclude` no longer shifts the anchors of the rest. New `to` parameter and an optional config file. **Breaking:** `{{ toc:count }}` counts what the list shows. The `mb_convert_encoding` deprecation is gone. |
| **1.10** | Three anchor fixes: ids are injected into `h1`–`h6` rather than stopping at `h3`; the tag's `depth` no longer leaks into the modifier through a shared parser; a heading that already has an id keeps exactly that one and the list links to it. A Tailwind starter-kit partial. |
| **1.9** | `exclude` and `when` parameters. Headings inside **nested Bard sets** (columns, grids, replicators) are found — before this only top-level nodes were scanned. Headings with inline formatting keep their full text; previously one starting with a mark was dropped and one containing a mark was cut short. Malformed Bard nodes are skipped rather than fatal. Headings that normalise to an empty string are left out. |
| **1.8** | Statamic 6 support. |
