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

## Bard sets and headings inside them

Headings that live inside a Bard **set** — a custom "callout" set with its own
`title` field, say — are not headings in the rendered content unless your set's
template renders them as `<h2>`, `<h3>` and so on.

If it does, and if the modifier runs over the rendered result, they will get ids
and appear in the tree. If your set renders the title as a `<div>` with a heading
class, it will not, and no configuration will make it: the addon reads headings,
not intentions.

The practical rule: **if it is a heading in the HTML, it is in the table of
contents.**

## Multiple fields on one page

The tag reads one source per call, so a page with an intro Bard field and a main
Bard field gets two calls. See
[Recipes](/toc/recipes#a-table-of-contents-across-two-fields).
