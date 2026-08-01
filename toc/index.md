# Table of Contents

<AddonHeader />

Automatic table of contents for Statamic Bard fields, Markdown fields, or any
HTML string. One tag builds the nested heading tree, one modifier adds the
matching anchor ids to the rendered content, and the two agree on how a heading
becomes a slug.

No migrations, no Control Panel screen. The [config file](/toc/configuration) is
optional and only changes the defaults a tag falls back to.

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

```antlers
{{ article | toc }}
```

The first block renders the list. The second renders the article with an `id` on
every heading, so the links land. **You need both**, and they must run on the same
content, or the anchors will not match.

<Figure
  src="toc-frontend"
  alt="An article page with a nested On this page list in the right column, its links matching the headings in the article"
  caption="The tag built the nested list on the right; the modifier put the matching ids on the headings on the left. Markup and styling are entirely yours." />

## How it works

The tag parses the content for headings and returns an associative, nested array
you can iterate over like any recursive Antlers tag — the same shape and the same
`*recursive*` syntax you already use with `{{ nav }}`.

Behind the scenes it works with a plain Bard field, with no special heading sets
and no blueprint changes. It also reads:

- a Bard field saved as HTML (`save_html: true`)
- a Markdown field
- any HTML string you hand it

## What it is not

- It does not render markup for you. There is no `{{ toc_html }}`. You write the
  list, which is why it fits any design system without fighting it.
- It does not modify stored content. The modifier adds ids at render time.
- It does not track scroll position or highlight the current section. That is
  front-end work; the tag gives you the ids to do it with.

## Duplicate headings

Two headings with the same text would produce the same id, which is invalid HTML
and breaks anchor links in a way that looks random.

The addon suffixes duplicates with a number, and **the tag and the modifier
suffix them identically**, so `#this-is-a-heading-2` in the list points at
`<h2 id="this-is-a-heading-2">` in the article. You do not have to do anything
about it, but it is worth knowing when a link goes to the wrong section: check
that the tag and the modifier are being given the same content.

## Next

- [Installation](/toc/installation) — one Composer command
- [Configuration](/toc/configuration) — the five site-wide defaults
- [The `toc` tag](/toc/tag) — parameters and variables
- [The `toc` modifier](/toc/modifier) — anchor ids
- [Blueprint setup](/toc/blueprints) — what a Bard field needs, which is very little
- [Recipes](/toc/recipes) — a sticky sidebar, a flat list, Markdown, multiple fields
