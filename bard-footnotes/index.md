# Bard Footnotes

<AddonHeader />

Footnotes for Bard: a toolbar button, superscript numbers in the text, and a source list that builds
itself.

<Figure
  src="bard-footnotes-toolbar"
  alt="The Bard toolbar in the Control Panel with the Footnote button at the right end, above a paragraph with three superscript numbers"
  caption="Bard's toolbar with the Footnote button at the right end. The paragraph below carries three footnotes; the numbers in the editor are live." />

## The problem

Bard has no superscript with an anchor. There is no built-in way to write "see
the source¹" where the ¹ is a link that jumps to a numbered source list at the
end of the article.

Bard Footnotes adds it as a node in the text itself. The editor places the
cursor, clicks **Footnote**, and fills in a source and, optionally, a link. No
second field, no typed `[1]`, no numbers to keep in sync by hand.

- The footnote renders inline as
  `<sup class="footnote-ref"><a href="#fn-1" id="fnref-1" aria-label="Footnote 1">1</a></sup>`
- Numbers are never stored. They come from the document: order of first
  occurrence, and citing the same source again reuses its number
- The source list below the article carries the jump targets `id="fn-1"`,
  `id="fn-2"` … and a `↩` back link per source
- The editor shows the live number while writing; hovering it shows the source

<Figure
  src="bard-footnotes-frontend"
  alt="The frontend: a paragraph with footnotes 1 and 2, a quote set, a paragraph citing source 1 again, and below it the source list under the heading Sources, with a back arrow per row"
  caption="The frontend: superscript links in the text, numbered across the quote set; the second citation of the NIDCD source reuses number 1. Below, the source list under “Sources” with a ↩ back link per row." />

## What you get

- **A toolbar button** and a panel for source and link, with the sources already
  cited in the field on offer — [Writing with the button](/bard-footnotes/writing)
- **A Sources list under the editor** that appears once the field holds a footnote:
  number, source, citation count, jump to the citation, edit a source for every
  place at once — [Where sources live](/bard-footnotes/writing#where-sources-live)
- **A tag** that prints the source list, either from the shipped view or as a
  pair loop — [the footnotes tag](/bard-footnotes/tag)
- **Rendering for free**: `{{ content }}` turns every footnote into its
  superscript link by itself — [Installation](/bard-footnotes/installation)
- **A static method** for Blade, Inertia and anywhere outside Antlers —
  [From PHP](/bard-footnotes/php)

## Limits

- **One footnote list per page.** The ids `fn-n` and `fnref-n` are fixed, so two
  `footnotes` tags on the same page produce the same ids.
- **`save_html` must be `false`**, the default. The footnotes are numbered from
  the saved JSON; see [Bard with sets](/bard-footnotes/sets#limits).
- **A Bard field nested in a set** numbers on its own and collides with the outer
  list's `#fn-1`.
- **Uninstalling the addon empties the field** in the Control Panel for every
  Bard field that holds footnotes. Migrate the content away first.

The addon ships no config file and no migrations; its Control Panel bundle is
published once. It is MIT and free, and not part of the Suite.

## Version 2.0

Version 2.0 is Statamic 6 only and a different product from 1.x, which kept the
sources in a grid and typed `[1]` markers into the text. On Statamic 5, stay on
the `1.x` branch. There is no automatic migration;
[Upgrading from 1.x](/bard-footnotes/upgrading) walks through it by hand.

## Next

- [Installation](/bard-footnotes/installation) — composer, publish, the button in the blueprint, a minimal template
- [Writing with the button](/bard-footnotes/writing) — for editors: the panel, reusing sources, editing, removing
- [The footnotes tag](/bard-footnotes/tag) · [Bard with sets](/bard-footnotes/sets) · [From PHP](/bard-footnotes/php)
- [Styling and translations](/bard-footnotes/styling) — the CSS rules, the publishable view, en/de strings
- [Upgrading from 1.x](/bard-footnotes/upgrading) · [Reference](/bard-footnotes/reference) · [Changelog](/bard-footnotes/changelog)
