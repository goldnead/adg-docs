# Installation

<AddonHeader />

<Requirements php="7.4+" statamic="3.x, 4.x, 5.x or 6.x" laravel="Any version your Statamic supports" database="Not required" />

```bash
composer require goldnead/statamic-toc
```

That is the whole installation. There is no config file to publish, no migration
to run, and nothing to build. The tag and the modifier are available immediately.

## Verifying it works

Add both halves to a template that renders a Bard field with at least two
headings in it:

```antlers
{{# the list #}}
<ol>
  {{ toc field="article" }}
    <li><a href="#{{ toc_id }}">{{ toc_title }}</a></li>
  {{ /toc }}
</ol>

{{# the content, with ids #}}
{{ article | toc }}
```

You should get a flat list of links, and clicking one should jump. If the list is
empty, see [nothing renders](#nothing-renders) below.

## Licence

Table of Contents is commercial software, licensed through the
[Statamic Marketplace](https://statamic.com/addons). A site in development mode
needs no licence; a production domain does. The licence is entered in Statamic and
shown in the Control Panel's licensing utility, like any other Marketplace addon.

## Nothing renders

The tag defaults to a field named **`article`**. That is the single most common
cause of an empty list: your field is called something else.

```antlers
{{ toc field="bard" }}
```

The other three causes, in order of likelihood:

1. **The content has no headings at the level you asked for.** `depth` defaults to
   `3` and `from` defaults to `h1`, so a field containing only `h4`s produces
   nothing.
2. **The Bard field has no heading buttons.** If editors cannot make an `h2`,
   there are no headings to find. See [Blueprint setup](/toc/blueprints).
3. **You are passing the augmented value where the tag wants the field name, or
   the reverse.** Both work, but not interchangeably:

```antlers
{{ toc field="bard" }}          {{# the name of the field #}}
{{ toc :content="bard" }}       {{# the value of the field #}}
{{ toc content="{bard}" }}      {{# also the value #}}
```

## Upgrading from 1.8

1.9 is worth taking. Two of its fixes change what appears in your list rather than
only how it behaves:

- **Headings inside nested Bard sets** — columns, grids, replicators — are now found.
  Before this only top-level nodes were scanned, so a heading inside a two-column set
  rendered on the page and was missing from the navigation.
- **Headings with inline formatting** keep their full text. One starting with a bold
  or linked word was dropped entirely; one containing formatting mid-way was cut
  short at the mark.

So expect the list to get **longer** after the upgrade. That is the bug being fixed,
not a regression.

It also adds the [`exclude`](/toc/tag#exclude) and [`when`](/toc/tag#when) parameters
and the [`toc:count`](/toc/tag#the-toc-count-tag) tag.

## Upgrading from the old docs

If you arrived here from `goldnead.github.io/statamic-toc`, that site documented
the same tag and modifier and is no longer updated. Nothing in the API changed;
this section is simply the current version of it, and covers `from`, duplicate id
handling and the Markdown path, which the old site did not.
