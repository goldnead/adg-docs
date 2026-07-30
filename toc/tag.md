# The `toc` tag

<AddonHeader />

The tag builds the heading tree and gives you a scope to iterate over. It renders
no markup of its own, so the list is entirely yours.

```antlers
<ol>
  {{ toc }}
    <li>
      <a href="#{{ toc_id }}">{{ toc_title }}</a>

      {{ if children }}
        <ol>{{ *recursive children* }}</ol>
      {{ /if }}
    </li>
  {{ /toc }}
</ol>
```

It behaves like any recursive Antlers tag, so `{{ *recursive children* }}` works
exactly as it does in `{{ nav }}`.

## Where the content comes from

Three ways, in the order you will reach for them:

```antlers
{{ toc }}                     {{# the field named "article" #}}
{{ toc field="bard" }}        {{# a field by name #}}
{{ toc :content="bard" }}     {{# a value you already have #}}
{{ toc content="{bard}" }}    {{# the same, in string interpolation form #}}
```

`content` accepts a Bard array, an HTML string, or `null`. That last one is what
makes the Markdown case work:

```antlers
{{ toc content="{markdown_field}" }}
```

::: tip Which form to use
Use `field` when you are rendering a normal entry template. Use `content` when the
content is not a field on the current entry: a value from a `{{ collection }}`
loop, a global, or a string you assembled yourself.
:::

## Parameters

| Parameter | Description | Type | Default |
| --- | --- | --- | --- |
| `depth` | How deep the tree goes. `3` includes `h1`–`h3`. | int | `3` |
| `is_flat` | Return one flat level instead of nesting. `children` is then never populated. | bool | `false` |
| `field` | Name of the field to read. | string | `"article"` |
| `content` | The content itself: a Bard array, an HTML string, or `null`. | string / array / null | `null` |
| `from` | The heading level the list starts at. | string | `h1` |
| `to` | The deepest level the list shows, as an absolute level. Wins over `depth`. | string | `null` |
| `exclude` | Leave headings out of the list. Comma-separated text, or a delimited regex. | string | `null` |
| `when` | Switch the tag off without removing it from the template. | bool | `true` |

`exclude` and `when` were added in **1.9**, `to` in **2.0**. Every default in this table can
be changed in [the config file](/toc/installation#configuration).

### `depth` and `from` together

These two are easy to confuse, and getting them wrong is the usual reason a list
looks half-right.

`from` is where the tree **starts**. `depth` is how many levels it **spans**.

Most page designs use the entry title as the `h1` and start the body at `h2`. In
that case:

```antlers
{{ toc from="h2" depth="2" }}
```

That gives you `h2` and `h3` as a two-level tree, with the `h2`s at root level.
Leaving `from` at its `h1` default instead would nest every `h2` one level deep
under nothing, and `is_root` would be `false` for all of them.

### `to`, if the arithmetic annoys you <Badge type="tip" text="2.0" />

`to` says the same thing as `depth` without the counting: it is the deepest level
the list shows, absolute rather than relative to `from`.

```antlers
{{# these two are the same list #}}
{{ toc from="h2" depth="3" }}
{{ toc from="h2" to="h4" }}
```

`depth` keeps working and nothing needs changing. When both are given, `to` wins.
A `to` above `from` is clamped to `from`, so the list never comes back empty
because of a typo in one of the two.

### `exclude`

Leaves individual headings out of the **list**. They still get their ids from the
[modifier](/toc/modifier), so nothing about the rendered article changes — only the
navigation is shorter.

A comma-separated string matches **case-insensitively on any part** of the heading
text:

```antlers
{{ toc exclude="Introduction, Footnotes" }}
```

A **delimited pattern** is treated as a regular expression:

```antlers
{{ toc exclude="/^Appendix/i" }}
```

::: warning Substring, not equality
`exclude="Notes"` also removes "Release notes" and "Notes on pricing". If you mean
the whole heading, anchor a regex: `exclude="/^Notes$/"`.

Empty tokens are skipped, so a trailing comma cannot accidentally match everything.
An invalid regex falls back to the string match rather than throwing.
:::

### `when`

Switches the tag off without removing it from the template:

```antlers
{{ toc :when="show_toc" }}
```

When it evaluates to `false`, the tag returns an empty list and `no_results` is
`true` — so the same `{{ if no_results }}` branch you already use for a short article
also covers "the editor turned it off".

Falsy means `false`, `'false'`, `0` or `'0'`.

## The `toc:count` tag

Returns the number of headings found, as an integer.

```antlers
{{ if {toc:count field="article" depth="3"} > 0 }}
  …
{{ /if }}
```

::: warning Changed in 2.0
`{{ toc:count }}` now counts what the list shows, using the parameters you give it.
Before 2.0 it forced `depth` to **6** internally and reported every heading in the
document while the list underneath showed three levels.

If you used a bare count to ask "does this page have any headings at all", say so:

```antlers
{{ if {toc:count depth="6"} > 0 }}
```

If you used it to decide whether to render the list, pass it the list's parameters
and the two now agree:

```antlers
{{ if {toc:count field="article" from="h2" depth="2"} > 3 }}
  {{ toc field="article" from="h2" depth="2" }} … {{ /toc }}
{{ /if }}
```
:::

Inside the tag pair you already have `total_results` and `no_results`, so
`toc:count` is for deciding things **outside** it — whether to render the surrounding
`<nav>` and its heading at all. See
[Recipes](/toc/recipes#hide-the-whole-block-when-there-are-no-headings).

## Variables on each item

| Variable | Type | Description |
| --- | --- | --- |
| `toc_title` | string | The heading text |
| `toc_id` | string | The slugified title, for the anchor |
| `id` | int | Internal id, used to link children to parents |
| `is_root` | bool | Whether this heading sits at root level |
| `parent` | int / null | Id of the parent item, if this is a child |
| `has_children` | bool | Whether this item has children |
| `children` | array | The child headings |
| `total_children` | int | Number of children, only when `has_children` is true |

::: warning It is `toc_title`, not `title`
`title` would be the obvious name, and it is deliberately not used: inside an
entry template `title` is already the entry's own title, and shadowing it in the
tag scope caused cascade problems. The same reasoning gives us `toc_id` rather
than `id` for the anchor — note that `id` **does** exist on the item, and is the
internal integer, not the slug.
:::

## Variables in the tag scope

Available inside `{{ toc }}` but outside any single item:

| Variable | Type | Description |
| --- | --- | --- |
| `total_results` | int | Total number of headings, including children |
| `no_results` | bool | True when there are no headings at all |

Which gives you the one thing every table of contents needs and most forget:

```antlers
{{ toc from="h2" }}
  {{ if no_results }}
    {{# render nothing, not an empty box with a heading above it #}}
  {{ else }}
    <li><a href="#{{ toc_id }}">{{ toc_title }}</a></li>
  {{ /if }}
{{ /toc }}
```

For hiding the whole component including its own heading, see
[Recipes](/toc/recipes#hide-the-whole-block-when-there-are-no-headings).

## A worked example

```antlers
<div class="max-w-md mx-auto">
  <div class="text-2xl font-bold">Table of contents</div>

  <div class="py-4 text-base text-gray-700 sm:text-lg">
    <ol class="list-decimal list-inside space-y-2">
      {{ toc depth="3" }}
        <li>
          <a class="font-bold text-cyan-800" href="#{{ toc_id }}">{{ toc_title }}</a>

          {{ if children }}
            <ol>{{ *recursive children* }}</ol>
          {{ /if }}
        </li>
      {{ /toc }}
    </ol>
  </div>
</div>
```

## Remember the other half

The tag produces `toc_id` values. Nothing has written those ids into your rendered
content yet — that is [the modifier's](/toc/modifier) job, and without it every
link in this list is dead.
