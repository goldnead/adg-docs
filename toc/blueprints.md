# Blueprint setup

<AddonHeader />

There is nothing to set up. The addon works with a plain Bard field, with no
special heading sets and no blueprint changes: it parses the content for headings
and builds the tree from what it finds.

The only thing that matters is that your editors can **create** headings.

## A Bard field that works

```yaml
title: Article
sections:
  main:
    display: Main
    fields:
      -
        handle: article
        field:
          type: bard
          display: Article
          buttons:
            - h2
            - h3
            - bold
            - italic
            - unorderedlist
            - orderedlist
            - removeformat
            - quote
            - anchor
            - image
            - table
          always_show_set_button: false
          toolbar_mode: fixed
          link_noopener: false
          link_noreferrer: false
          target_blank: false
          reading_time: false
          fullscreen: true
          allow_source: true
          enable_input_rules: true
          enable_paste_rules: true
          icon: bard
          listable: hidden
```

The relevant lines are `h2` and `h3` in `buttons`. Add as many heading buttons as
you like; the addon reads whatever is in the content.

::: tip Field name
Name it `article` and the tag needs no parameters. Name it anything else and pass
`field="…"`. Neither is better; `article` is just the default the addon was built
around.
:::

## Bard saved as HTML

If you prefer to store the body as an HTML string:

```yaml
- handle: article
  field:
    type: bard
    save_html: true
```

Both the tag and the modifier handle this. Nothing in your templates changes.

::: warning One thing `save_html` costs you
Statamic renders Bard to HTML once, at save time, so you lose the ability to
change how sets and marks render later without re-saving every entry. That is a
Statamic trade-off rather than anything to do with this addon, but if you are
turning `save_html` on *for* the table of contents, you do not need to: default
mode works fine.
:::

## Markdown fields

No blueprint changes at all. Pass the field to the tag as content:

```yaml
- handle: body
  field:
    type: markdown
    display: Body
```

```antlers
{{ toc content="{body}" }}
  <li><a href="#{{ toc_id }}">{{ toc_title }}</a></li>
{{ /toc }}

{{ body | toc }}
```

## Nested Bard structures

Headings inside **nested Bard nodes** — columns, grids, replicators — are found.

::: warning This needed 1.9
Before that, only top-level nodes were scanned, so a heading inside a two-column set
was invisible to the tag while still rendering on the page: the article had a
section the table of contents did not list.

1.9 also fixed headings with **inline formatting**. A heading starting with a bold
or linked word used to be dropped entirely, and one containing formatting mid-way
was cut short at the mark ([#26](https://github.com/goldnead/statamic-toc/issues/26)).
Malformed Bard nodes — missing `attrs`, empty `content`, a non-numeric level — are
now skipped rather than fatal.

If you are on 1.8 or earlier and headings are missing from the list but present in
the article, that is this.
:::

## Bard sets that render their own headings

A custom set — a "callout" with its own `title` field, say — is only a heading if its
**template renders one**. If the set outputs `<h2>`, it is in the tree. If it outputs
a `<div>` with a heading class, it is not, and no configuration will change that: the
addon reads headings, not intentions.

The practical rule: **if it is a heading in the HTML, it is in the table of
contents.**

## Multiple fields on one page

The tag reads one source per call, so a page with an intro Bard field and a main
Bard field gets two calls. See
[Recipes](/toc/recipes#a-table-of-contents-across-two-fields).
