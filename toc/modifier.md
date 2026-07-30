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
  every heading it finds, whatever level. That is the right default: a link in the
  list must resolve, but a heading that is not in the list is harmless with an id
  on it.
- **Chaining order matters** if you also run other modifiers that rewrite HTML. Put
  `toc` last, so it sees the final markup.
