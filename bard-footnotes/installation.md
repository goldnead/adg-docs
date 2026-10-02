# Installation

<AddonHeader />

<Requirements php="8.2+" statamic="5.x or 6.x" laravel="Any version your Statamic supports" database="Not required" />

```bash
composer require goldnead/statamic-bard-footnotes
```

The addon declares no Laravel constraint of its own: whatever version your Statamic
runs on is fine, and Statamic 5 and 6 are both supported from this first release.

That is the whole installation. There is no migration, no Control Panel screen and
no config file. What is left is wiring the field into your blueprint and the two
tags into your template.

## The field

Add the shipped fieldset to the blueprint of the collection that carries articles:

```yaml
fields:
  -
    import: bard-footnotes::sources
```

That gives you a grid named `sources` with the columns **Source** (text) and
**Link** (url). One source per row; reference it in the text with `[1]`, `[2]` …
in the order of this list. Rows without text drop out on output, and the
numbering follows the remaining rows.

<Figure
  src="bard-footnotes-field"
  alt="The entry form: the Bard field with the article, and below it the sources grid with rows of a source text and a link"
  caption="The fieldset in the entry form: the article above, the sources grid below. The two nasty test rows — a script tag as source text, a “Böser Link” with a javascript: address — are deliberate; see Styling and translations for what happens to them on output." />

You can build the same grid yourself instead of importing the fieldset. The two
keys the output reads from each row are `text` and `url`, so give the columns
those handles; the grid's own handle is whatever you pass to the modifier and
the tag. The import is the one-liner for all of that.

## A minimal template

Modifier and tag, on an entry with a Bard field `article` and the `sources`
grid:

```antlers
{{ article | footnotes(sources) }}

{{ footnotes :sources="sources" :content="article" }}
```

The first line links the `[n]` markers in the rendered article; the second
prints the source list with the jump targets and back links. Two small CSS
rules make it read — [Styling and translations](/bard-footnotes/styling) has
them.

From there:

- [Writing with markers](/bard-footnotes/writing) — what the editor types, and what stays text
- [The footnotes modifier](/bard-footnotes/modifier) — the three ways to pass the count
- [The footnotes tag](/bard-footnotes/tag) — single tag or pair loop
- [Bard with sets](/bard-footnotes/sets) — when the Bard field has sets
- [From PHP](/bard-footnotes/php) — Blade and Inertia, without Antlers
