# The `toc` modifier

<AddonHeader />

The modifier renders your content with an `id` on every heading, so the links the
[tag](/toc/tag) produced have somewhere to land.

```antlers
{{ article | toc }}
```

In:

```html
<h2>This is an example heading</h2>
<p>Voluptate do ad anim do mollit proident incididunt culpa ex quis aliquip.</p>
```

Out:

```html
<h2 id="this-is-an-example-heading">This is an example heading</h2>
<p>Voluptate do ad anim do mollit proident incididunt culpa ex quis aliquip.</p>
```

Nothing else about the content changes, and nothing is written back to storage.
The ids exist only in the rendered output.

## It must be the same content

The tag and the modifier slugify headings the same way, including how they
disambiguate duplicates. That agreement is what makes the anchors line up, and it
only holds if both are looking at the same content.

```antlers
{{# correct: both read the article field #}}
{{ toc field="article" }} … {{ /toc }}
{{ article | toc }}

{{# broken: the list is built from one field, the ids are added to another #}}
{{ toc field="article" }} … {{ /toc }}
{{ summary | toc }}
```

The broken version fails quietly: you get a list of links and a page of headings,
and none of the links work.

## Duplicate headings

Two headings with identical text would otherwise produce identical ids, which is
semantically wrong in HTML and makes anchor links jump to whichever one the
browser found first.

The modifier suffixes duplicates with a number, and the tag applies the same
suffix, so the pairing survives:

```html
<h2 id="introduction">Introduction</h2>
…
<h2 id="introduction-2">Introduction</h2>
```

## What it accepts

The modifier works on the same things the tag does:

- a Bard field, in default mode
- a Bard field with `save_html: true`
- a Markdown field
- any HTML string

```antlers
{{ article | toc }}
{{ body_markdown | toc }}
{{ some_html_variable | toc }}
```

## Where to put it

On the field, in the template that renders the article body. Not in the layout,
and not on a partial that also renders the list, or you will end up rendering the
content twice.

```antlers
{{# resources/views/pages/article.antlers.html #}}

<aside>
  <ol>
    {{ toc from="h2" depth="2" }}
      <li><a href="#{{ toc_id }}">{{ toc_title }}</a></li>
    {{ /toc }}
  </ol>
</aside>

<article class="prose">
  {{ article | toc }}
</article>
```

## Limitations worth knowing

- **It only adds ids to headings.** It does not add `<a>` anchors, permalink icons
  or `aria` attributes. If you want a clickable "¶" next to each heading, that is
  CSS and a `::after`, or front-end JavaScript over the ids this gives you.
- **It stops at `h3` by default**, and `h4` and below come back untouched:

  ```html
  <h1 id="a">A</h1><h2 id="b">B</h2><h3 id="c">C</h3><h4>D</h4>
  ```

  If your list goes deeper than three levels, its links to the `h4`s resolve to
  nothing.

::: danger The tag's `depth` leaks into the modifier
The tag and the modifier share one parser instance for the whole request, and the
tag's `depth` overwrites the level the modifier injects up to. Render
`{{ toc depth="1" }}` before `{{ content | toc }}` and only `h1` gets an id:

```html
<h1 id="a">A</h1><h2>B</h2><h3>C</h3>
```

So the modifier's reach depends on a parameter you set somewhere else on the page,
and narrowing the list quietly breaks the anchors under it. Keep `depth` at its
default on any page where the modifier also runs, or set the same `depth` in both
places.
:::

::: danger A heading that already has an id gets a second one
The check for an existing id misses one in the last attribute position, so the
modifier appends its own:

```html
<!-- in  --> <h2 id="mine">Kept</h2>
<!-- out --> <h2 id="mine" id="kept">Kept</h2>
```

Two `id` attributes on one element is invalid HTML and a browser keeps only the
first, while the list links to `#kept`. The anchor silently does nothing.

Until this is fixed, either let the modifier own every id or write your own anchors
without it. Do not mix the two on the same field.
:::
- **Chaining order matters** if you also run other modifiers that rewrite HTML. Put
  `toc` last, so it sees the final markup.
- **It logs a deprecation on PHP 8.2 and up.** The parser still calls
  `mb_convert_encoding(..., 'HTML-ENTITIES', ...)`, deprecated since 8.2, so every
  render writes a notice to your log. Harmless, but it will fill a log file.
