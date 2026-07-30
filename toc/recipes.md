# Recipes

<AddonHeader />

Patterns that come up on real article pages.

## A flat list

`is_flat` collapses everything to one level. `children` is never populated, so the
recursive block goes away:

```antlers
<ol>
  {{ toc is_flat="true" }}
    <li><a href="#{{ toc_id }}">{{ toc_title }}</a></li>
  {{ /toc }}
</ol>
```

Useful when the article's heading structure is inconsistent and a nested list
would look accidental.

## The standard article layout

The entry title is the `h1`, the body starts at `h2`, and you want two levels:

```antlers
<div class="lg:grid lg:grid-cols-[1fr_16rem] lg:gap-12">
  <article class="prose">
    <h1>{{ title }}</h1>
    {{ article | toc }}
  </article>

  <aside class="hidden lg:block">
    <nav class="sticky top-24" aria-label="Table of contents">
      <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        On this page
      </p>

      <ol class="space-y-1 text-sm">
        {{ toc from="h2" depth="2" }}
          <li>
            <a class="block py-1 text-gray-700 hover:text-black" href="#{{ toc_id }}">
              {{ toc_title }}
            </a>

            {{ if children }}
              <ol class="ml-3 border-l border-gray-200 pl-3">
                {{ *recursive children* }}
              </ol>
            {{ /if }}
          </li>
        {{ /toc }}
      </ol>
    </nav>
  </aside>
</div>
```

`position: sticky` on the `nav` and nothing else is what makes it follow the
scroll. No JavaScript involved.

## Hide the whole block when there are no headings

`no_results` lives in the tag scope, so wrap the *entire* component in the tag
rather than putting the check inside the `<li>`:

```antlers
{{ toc from="h2" }}
  {{ if no_results }}{{ else }}
    {{ if first }}
      <nav aria-label="Table of contents">
        <p class="font-semibold">On this page</p>
        <ol>
    {{ /if }}

    <li><a href="#{{ toc_id }}">{{ toc_title }}</a></li>

    {{ if last }}
        </ol>
      </nav>
    {{ /if }}
  {{ /if }}
{{ /toc }}
```

If that reads awkwardly to you, it is because it is. Since 1.9 there is a cleaner
way: `{{ toc:count }}` gives you the number **outside** the tag pair, so the wrapper
markup can be branched on normally.

```antlers
{{ if {toc:count field="article" from="h2" depth="2"} > 0 }}
  <nav aria-label="Table of contents">
    <p class="label">On this page</p>
    <ol>
      {{ toc field="article" from="h2" depth="2" }}
        <li><a href="#{{ toc_id }}">{{ toc_title }}</a></li>
      {{ /toc }}
    </ol>
  </nav>
{{ /if }}
```

::: warning Give `toc:count` the same parameters
It defaults `depth` to **6**, the list to **3**. Called bare, it can count headings
the list will not show — and then you render an empty `<nav>` with a heading above
it, which is the exact thing you were trying to avoid.
:::

## Only show it on long articles

A three-heading table of contents is noise. Gate the whole block on the count:

```antlers
{{ if {toc:count field="article" from="h2" depth="2"} > 3 }}
  <nav aria-label="Table of contents"> … </nav>
{{ /if }}
```

`total_results` is also available inside the tag scope, but it can only hide the
items, not the wrapper.

## Let the editor turn it off

`when` switches the tag off without touching the template. Pair it with a toggle
field on the entry:

```antlers
{{ toc :when="show_toc" from="h2" }}
  <li><a href="#{{ toc_id }}">{{ toc_title }}</a></li>
{{ /toc }}
```

With the toggle off the tag returns an empty list and `no_results` is `true`, so the
same branch that handles a heading-less article handles this too.

## Leave headings out of the list

`exclude` drops headings from the navigation while the modifier still gives them
ids, so nothing about the article changes:

```antlers
{{ toc from="h2" exclude="Footnotes, About the author" }}
```

For anything more precise than a substring, use a delimited regex:

```antlers
{{ toc from="h2" exclude="/^(Appendix|Notes)$/i" }}
```

Both require 1.9.

## Highlight the current section

The addon gives you ids; the highlighting is front-end work. An `IntersectionObserver`
over the same headings is about fifteen lines:

```html
<script>
  const links = document.querySelectorAll('[aria-label="Table of contents"] a')
  const ids = [...links].map((a) => a.hash.slice(1))
  const headings = ids.map((id) => document.getElementById(id)).filter(Boolean)

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        links.forEach((a) => a.classList.remove('is-current'))
        document
          .querySelector(`[href="#${entry.target.id}"]`)
          ?.classList.add('is-current')
      }
    },
    { rootMargin: '-20% 0px -70% 0px' },
  )

  headings.forEach((h) => observer.observe(h))
</script>
```

Add `scroll-margin-top` to your headings in CSS so a sticky site header does not
cover the target after the jump.

## A Markdown field

```antlers
{{ toc content="{body}" from="h2" }}
  <li><a href="#{{ toc_id }}">{{ toc_title }}</a></li>
{{ /toc }}

<article class="prose">{{ body | toc }}</article>
```

## A table of contents across two fields

The tag reads one source per call. For an intro field plus a main field, call it
twice and let the second list continue where the first stopped:

```antlers
<ol>
  {{ toc :content="intro" from="h2" }}
    <li><a href="#{{ toc_id }}">{{ toc_title }}</a></li>
  {{ /toc }}

  {{ toc :content="article" from="h2" }}
    <li><a href="#{{ toc_id }}">{{ toc_title }}</a></li>
  {{ /toc }}
</ol>

{{ intro | toc }}
{{ article | toc }}
```

::: warning Duplicate ids across fields
Each call slugifies independently, so a heading called "Overview" in both fields
produces `#overview` twice — the disambiguating suffix only counts within one
call. If your two fields can share heading text, concatenate them into one
variable first and make a single call.
:::

## Inside a collection loop

`field` reads from the current cascade, so it works unchanged inside a loop, but
`content` is clearer about which entry you mean:

```antlers
{{ collection:articles }}
  <h2>{{ title }}</h2>

  <ul>
    {{ toc :content="article" from="h2" is_flat="true" }}
      <li><a href="{{ url }}#{{ toc_id }}">{{ toc_title }}</a></li>
    {{ /toc }}
  </ul>
{{ /collection:articles }}
```

Note `{{ url }}#{{ toc_id }}`: on an index page the anchors have to point at the
other page, not at this one.
