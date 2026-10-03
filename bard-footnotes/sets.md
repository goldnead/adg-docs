# Bard with sets

<AddonHeader />

A Bard field with sets stores a list of blocks, not a string: a text block here,
a quote there. Footnotes number across the **whole field**, so a footnote before
a set and one after it are numbered in reading order, and one source cited on
both sides of a set is one source with one number.

```antlers
{{ content }}
    {{ if type == 'text' }}{{ text }}{{ /if }}
    {{ if type == 'quote' }}<blockquote>{{ quote | entities }}</blockquote>{{ /if }}
{{ /content }}

{{ footnotes field="content" }}
```

Each text block renders with its superscript links, numbered from the same
sequence. The first citation of a source anywhere in the field carries
`id="fnref-n"`; a later citation of it links to the same `#fn-n` without an id of
its own. The `footnotes` tag then lists the field's sources once, all sets
included, which is why one tag below the loop is enough.

## One list per page

Sets change the shape of the field, not the ids. List entries stay `fn-n` and the
jump targets `fnref-n`, so one `footnotes` tag per page remains the rule.

## Limits

- **One list per page.** The ids `fn-n` and `fnref-n` are fixed. Two `footnotes`
  tags on the same page produce the same ids.
- **`save_html: false` is required**, and it is the default. The footnotes are
  numbered from the saved JSON. A Bard field saving HTML (`save_html: true`)
  stores the superscript without a number and has no source list: the footnote
  reads `[source]` in the saved markup and nothing more.
- **A Bard field nested in a set** is its own document and numbers its footnotes
  on its own, from 1, the same way Statamic augments it. Its `#fn-1` and
  `#fnref-1` collide with the same ids of the outer field's list when both
  appear on one page.
- **Removing the addon empties the field.** A Bard document containing footnote
  nodes needs this addon's node registered, for rendering and in the Control
  Panel. With the addon uninstalled or disabled, a Bard field holding footnotes
  loads **empty** in the CP, and the next save destroys the value. Migrate the
  content away first (remove or convert the footnotes), then remove the addon.
- **The tag needs a Bard variable.** `field` must be the handle of a Bard value
  available in the current context; otherwise the tag renders nothing and, in
  debug mode, logs a warning. See [the footnotes tag](/bard-footnotes/tag).
