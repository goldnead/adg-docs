# The footnotes modifier

<AddonHeader />

The modifier links the typed `[n]` markers in a Bard field's output. What it
needs besides the value is one number: how many sources exist. Only markers up
to that count become links.

```antlers
{{ article | footnotes(sources) }}
```

The count comes in three forms:

| Writes | Count comes from |
| --- | --- |
| `{{ article \| footnotes(sources) }}` | the `sources` value passed along |
| `{{ article \| footnotes:sources }}` | the field named `sources` in the context |
| `{{ article \| footnotes:3 }}` | the plain number |
| `{{ article \| footnotes }}` | the `sources` field in the context, no parameter at all |

All four end in the same call: the rendered article with every marker up to the
count replaced by its superscript link, and everything else — `[0]`, a number
past the count, markers in links, headings, `pre` and `code` — untouched.

The count is not a limit on citations: it is the highest number that has a
source. With three sources, `[3]` links and `[4]` stays text, however often
either appears.

## What it returns

`renderValue` under the hood, which means the modifier returns the field's own
shape, linked:

- **A plain Bard field** comes back as its rendered HTML. Print it and you are
  done
- **A Bard field with sets** comes back as the same set list, every text set's
  `text` rendered and linked, other sets untouched. That is a loop, not a
  string — [Bard with sets](/bard-footnotes/sets) shows the pair form
- **Anything else** passes through sensibly: no cast, no warning, `null`
  becomes an empty string

## Passing a number instead

When the sources do not live in a field the modifier can see — a hardcoded
list, a count from somewhere else — the plain number is the form to use:

```antlers
{{ article | footnotes:2 }}
```

The number is the count of sources, so `[1]` and `[2]` link and `[3]` stays
text. The sources themselves are the tag's business; see
[the footnotes tag](/bard-footnotes/tag).
