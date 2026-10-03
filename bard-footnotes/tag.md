# The footnotes tag

<AddonHeader />

The tag prints the source list. It reads the footnotes of one Bard field and
works two ways: on its own it renders the view the addon ships, and as a pair
it loops the sources so your template decides the markup.

```antlers
{{ content }}

{{ footnotes field="content" }}
```

`{{ content }}` needs nothing from the tag: the footnotes in it already render
as superscript links. The tag adds the list they point to.

## The `field` parameter

`field` is the handle of a Bard variable that is available where the tag is
used: an entry's `content`, a loop variable, and so on. The tag reads the field's
**raw** value from the template context by that handle. A `:content="content"`
binding would arrive as already-rendered HTML, too late to read the footnotes
from, so there is no such parameter.

If the handle is missing or the value is not a Bard value, the tag renders
nothing. With `APP_DEBUG=true` it also writes one warning to the log naming the
field, so a typo does not stay a silent empty page.

## The single tag

The rendered output is the shipped `bard-footnotes::list` view:

- a `<section class="footnotes">` with the heading **Sources** (translated)
- an ordered list, one `<li id="fn-n">` per source, in order of first citation
- a source with a link becomes `<a>` with `target="_blank"` and
  `rel="noopener noreferrer"`; a source without stays text
- a `↩` back link to `#fnref-n` on every source
- **no output at all when there are no footnotes**: no empty section, no heading

Text and url are escaped in the view, always. What an editor types as a source,
a script tag or a quote, prints as text. A link that is not `http(s)://` never
becomes an `href`.

## The tag pair

The pair loops the same sources and leaves the markup to you:

```antlers
{{ footnotes field="content" }}
    <li id="fn-{{ number }}">{{ text | entities }}{{ if url }} — <a href="{{ url | entities }}">{{ url | entities }}</a>{{ /if }} <a href="#fnref-{{ number }}">↩</a></li>
{{ /footnotes }}
```

Each source carries:

| Variable | What it is |
| --- | --- |
| `number` | the number in the text: order of first occurrence, a repeated source listed once |
| `text` | the source text, trimmed |
| `url` | the link, or `null` when it is not `http(s)://` |

`no_results` and `total_results` behave like in Statamic's collection tags: no
footnotes, and the pair shows its `{{ no_results }}` branch instead of looping.

Every listed source is cited by definition, so there is no `cited` variable.

**Escaping is the pair's difference from the single tag.** The single tag
escapes text and url in the shipped view; in the pair your template is the
view, hence `| entities` on both. Without it, a source text that happens to
contain markup would reach the page as markup.

## Parameters

| Parameter | Required | What it does |
| --- | --- | --- |
| `field` | yes | the handle of the Bard variable in the current context |
