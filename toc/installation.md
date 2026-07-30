# Installation

<AddonHeader />

<Requirements php="8.2+" statamic="5.x or 6.x" laravel="Any version your Statamic supports" database="Not required" />

```bash
composer require goldnead/statamic-toc
```

That is the whole installation. There is no migration to run and nothing to build.
The tag and the modifier are available immediately, and the [config file](#configuration)
is optional.

::: tip On Statamic 3 or 4? Stay on the 1.x line
2.0 requires PHP 8.2 and Statamic 5 or 6. The 1.x line is maintained for everyone
else and carries the same anchor fixes:

```bash
composer require "goldnead/statamic-toc:^1.10"
```

Both lines take the same templates. See [UPGRADE.md](https://github.com/goldnead/statamic-toc/blob/main/UPGRADE.md)
for the full list of behaviour differences.
:::

## Configuration <Badge type="tip" text="2.0" />

Optional. Without it the defaults below apply, which are the ones the addon has
always used.

```bash
php artisan vendor:publish --tag=statamic-toc-config
```

```php
// config/statamic-toc.php
return [
    'field' => 'article',   // the field the tag reads with no field= or content=
    'from' => 'h1',         // the level the list starts at
    'depth' => 3,           // how many levels it spans, counted from `from`
    'to' => null,           // the level it stops at, absolute; wins over depth
    'flat' => false,        // a flat array instead of a nested tree
];
```

A tag parameter always wins over the config. Setting `field` here is the usual
reason to publish it at all: if your Bard field is called `content` rather than
`article`, this is where you say so once instead of in every template.

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

## The starter kit <Badge type="tip" text="1.10" />

A Tailwind-styled partial, if you want a working list before you style your own:

```antlers
{{ partial:statamic-toc::starter-kit }}
```

Publish the views to change the markup:

```bash
php artisan vendor:publish --tag=statamic-toc-views
```

## Upgrading to 2.0

Every tag parameter and template variable from v1 still works and the output has the
same shape, so most sites bump the version and are done. Two things need a look:

- **`{{ toc:count }}` counts what the list shows.** It used to force `depth` to 6
  internally and report a different number than the list right underneath it. See
  [the count tag](/toc/tag#the-toc-count-tag).
- **Some ids shift.** Collision suffixes were counted separately per side and per
  field before 2.0, so a `#titel-2` style anchor you link to from outside may move.
  Ids you wrote by hand are now used verbatim and never move.

`UPGRADE.md` in the repository lists every difference.

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
