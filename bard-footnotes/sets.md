# Bard with sets

<AddonHeader />

A Bard field with sets stores a list of blocks, not a string — a text set here,
a quote there. The modifier handles that list without flattening it: every
text set comes back with its `text` rendered and its markers linked, every
other set passes through untouched.

The output is a list again, so the template is a pair loop. Antlers accepts a
modifier's result as the data of a pair — the same mechanism
`{{ list | reverse }}` uses:

```antlers
{{ content | footnotes }}
    {{ if type == 'text' }}{{ text }}{{ /if }}
    {{ if type == 'quote' }}<blockquote>{{ quote }}</blockquote>{{ /if }}
{{ /content }}
```

The count comes from the `sources` field in the surrounding context, like the
parameterless modifier on a plain field; [the modifier](/bard-footnotes/modifier)
lists the other forms.

## One jump target across all sets

A source cited in two different text sets is one source, and its back link
needs one place to jump back to. The modifier renders the whole set list in one
pass: the first `[1]` anywhere in the field — set one or set five — carries
`id="fnref-1"`, and every later `[1]` links without an id of its own.

The same is true inside one text set: cite `[1]` in the first paragraph and
again two paragraphs down, and only the first carries the jump target.

## What passes through

Anything that is not a text set keeps its exact shape: a quote set stays the
array it was, with its own fields and nothing rendered into it. The loop above
prints each set by its own `type`, and markers a redactor types into a quote
set's fields stay text — rendering touches only `text` sets, the field Bard
itself treats as prose.

## One list per page still holds

Sets change the shape of the field, not the ids: the list entries stay `fn-n`,
the jump targets `fnref-n`. One `footnotes` tag below the loop, as on any
article page, and the whole field — all its sets — feeds that one list.
