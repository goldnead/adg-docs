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

### Item variables

| Variable | Type |
| --- | --- |
| `toc_title` | string |
| `toc_id` | string |
| `id` | int |
| `is_root` | bool |
| `parent` | int / null |
| `has_children` | bool |
| `children` | array |
| `total_children` | int |

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

## Console commands

None.

## Events

None.

## Permissions

None. The addon has no Control Panel surface.

## Configuration

None. There is no config file and nothing to publish.

## Requirements

<Requirements laravel="Any version Statamic 6 supports" database="Not required" />

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
- Separate `{{ toc }}` calls disambiguate duplicates independently, so the same
  heading text in two different calls can produce the same id. Concatenate into one
  variable if that is a risk.
- No `{{ toc_html }}` or prebuilt markup. You write the list.
- No scroll-spy or current-section highlighting. See
  [Recipes](/toc/recipes#highlight-the-current-section).
