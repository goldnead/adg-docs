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
- **It does not respect the tag's `from` and `depth`.** The modifier adds an id to
  every heading it finds, `h1` through `h6`, whatever the list is configured to show.
  That is the right default: a link in the list must resolve, but a heading that is
  not in the list is harmless with an id on it.

  ```html
  <h1 id="a">A</h1><h2 id="b">B</h2><h3 id="c">C</h3><h4 id="d">D</h4>
  ```

- **A heading that already has an id keeps exactly that one.** The modifier leaves
  it alone and the list links to it rather than to a slug of the title, so you can
  hand-write the anchors that matter and let the modifier fill in the rest:

  ```html
  <!-- in and out --> <h2 id="mine">Kept</h2>
  ```

- **Chaining order matters** if you also run other modifiers that rewrite HTML. Put
  `toc` last, so it sees the final markup.
- **On the 1.x line it logs a deprecation on PHP 8.2 and up.** The parser there
  still calls `mb_convert_encoding(..., 'HTML-ENTITIES', ...)`, deprecated since 8.2,
  so every render writes a notice to your log. Harmless, but it will fill a log file.
  Fixed in 2.0; removing it meant dropping PHP 7.4, which is why 1.x keeps it.

::: warning Upgrade to 1.10 or 2.0 if you are on anything older
Three defects made anchors point at nothing, and all three are fixed in 1.10:
id injection stopped at `h3`; the tag's `depth` leaked into the modifier through a
parser shared for the whole request, so `{{ toc depth="1" }}` above an article
stripped the ids from every `h2` below it; and a heading that already had an id got
a second one, which is invalid HTML and left the list linking to an anchor the
browser had discarded.

Nothing else changed for a document whose headings had no hand-written ids and whose
list stayed at the default depth.
:::
