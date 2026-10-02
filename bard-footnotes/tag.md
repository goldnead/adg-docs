# The footnotes tag

<AddonHeader />

The tag prints the source list. It takes the sources from the `sources` field
in the context, or from a parameter, and it works two ways: on its own it
renders the view the addon ships, and as a pair it loops the rows so your
template decides the markup.

## The single tag

```antlers
{{ footnotes :sources="sources" :content="article" }}
```

That is the whole call on a normal article page. The rendered output is the
shipped `bard-footnotes::list` view:

- a `<section class="footnotes">` with the heading **Sources** (translated)
- an ordered list, one `<li id="fn-n">` per source, in the order of the grid
- a source with a link becomes `<a>` with `target="_blank"` and
  `rel="noopener noreferrer"`; a source without stays text
- a `↩` back link to `#fnref-n` on every source the article actually cites
- **no output at all when there are no sources** — no empty section, no heading

Text and url are escaped in the view, always. What an editor types into the
grid — a script tag, a quote — prints as text or not at all; a link that is
not `http(s)://` never becomes an `href`.

## The tag pair

The pair loops the same rows and leaves the markup to you:

```antlers
{{ footnotes :sources="sources" :content="article" }}
    <li id="fn-{{ number }}">{{ text | entities }}{{ if url }} — {{ url | entities }}{{ /if }}{{ if cited }} <a href="#fnref-{{ number }}">↩</a>{{ /if }}</li>
{{ /footnotes }}
```

Each row carries:

| Variable | What it is |
| --- | --- |
| `number` | the sequential number, gaps from empty rows already closed |
| `text` | the source text, trimmed |
| `url` | the link, or nothing when it is not `http(s)://` |
| `cited` | whether the content actually contains the marker `[n]` |

`no_results` and `total_results` behave like in Statamic's collection tags: no
sources, and the pair shows its `{{ no_results }}` branch instead of looping.

**Escaping is the pair's difference from the single tag.** The single tag
escapes text and url in the shipped view; in the pair your template is the
view, hence `| entities` on both. Without it, a source text that happens to
contain markup would reach the page as markup.

## The `content` parameter

`cited` needs the rendered article to look at — without `:content` every source
is `cited => false`, and the single tag prints its list without back links.
The parameter takes whatever the field is: the HTML of a plain Bard field, or
its set list, in which case every text set counts.

## Parameters

| Parameter | Required | What it does |
| --- | --- | --- |
| `sources` | one of the two | the rows to list; falls back to the `sources` field in the context |
| `content` | no | the rendered article, so `cited` can be decided |
