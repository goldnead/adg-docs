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
| `exclude` | string | `null` | Comma-separated substrings, or a delimited regex. Matches case-insensitively. |
| `when` | bool | `true` | Falsy (`false`, `'false'`, `0`, `'0'`) returns an empty list |

`exclude` and `when` require **1.9**.

## `toc:count` tag

`{{ toc:count }}` — returns the number of headings as an integer.

Takes the same parameters as the list, **except that `depth` defaults to `6`, not
`3`**. Pass `field`, `depth` and `from` explicitly or you will count a different set
than the list renders.

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
- `exclude` drops headings from the **list** only; the modifier still gives them ids.
  That is intended, so an excluded heading remains linkable from elsewhere.
- `{{ toc:count }}` defaults `depth` to `6` while `{{ toc }}` defaults to `3`. Pass
  the same parameters to both or they disagree.

## Version notes

| Version | |
| --- | --- |
| **1.9** | `exclude` and `when` parameters. Headings inside **nested Bard sets** (columns, grids, replicators) are found — before this only top-level nodes were scanned. Headings with inline formatting keep their full text; previously one starting with a mark was dropped and one containing a mark was cut short. Malformed Bard nodes are skipped rather than fatal. Headings that normalise to an empty string are left out. |
| **1.8** | Statamic 6 support. |
