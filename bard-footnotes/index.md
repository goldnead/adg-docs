# Bard Footnotes

<AddonHeader />

Footnotes for Bard: type `[1]`, keep the sources in a grid, get superscript links and a
source list.

<Figure
  src="bard-footnotes-field"
  alt="The Control Panel: an article in Bard with typed bracket markers in the text, and below it the sources grid with a source text and a link per row"
  caption="The Control Panel: the article with typed markers on the left, the sources grid at the bottom. Two test rows are deliberately nasty — a script tag typed as a source text, and a “Böser Link” whose address is a javascript: URL — which the output escapes and drops, as the frontend shot below shows." />

## The problem

Bard has no superscript with an anchor. There is no built-in way to write "see
the source¹" where the ¹ is a link that jumps to a numbered source list at the
end of the article.

What Bard does have is plain text, and plain text survives everything: every
save, the Control Panel, inline editing, the live preview, a copy-paste between
entries. So the marker of choice is a typed `[1]`, and everything else happens
on output:

- A `[1]` in the rendered text becomes
  `<sup class="footnote-ref"><a href="#fn-1" id="fnref-1" aria-label="Footnote 1">1</a></sup>`
- The source list below the article carries the jump targets `id="fn-1"`,
  `id="fn-2"` … and, for cited sources, a back link `#fnref-n`
- Markers without a matching source stay text — `[0]`, or `[4]` when there are
  three sources. So does everything inside links, headings, `pre` and `code`:
  `arr[1]` in a code block stays code

The sources live in a grid field on the same entry: one row per source, a text
and optionally a link. The order of the rows is the numbering; empty rows drop
out on output and the numbering closes the gaps.

<Figure
  src="bard-footnotes-frontend"
  alt="The frontend: the article with a superscript 1 behind a sentence, and below it the source list under the heading Sources, with a back arrow per row"
  caption="The frontend. The typed [1] has become a superscript link; the source list under “Sources” carries the jump target and the ↩ back link. The script tag typed as a source text is printed as escaped text, and the javascript: address from the same grid is not a link at all — by design, since nothing from a content field should end up in an href unvetted." />

## What you get

- **A modifier** that links the markers in a Bard field's rendered output —
  [the footnotes modifier](/bard-footnotes/modifier)
- **A tag** that prints the source list, either from the shipped view or as a
  pair loop over the rows — [the footnotes tag](/bard-footnotes/tag)
- **A fieldset** for the blueprint, so the grid is one import line —
  [Installation](/bard-footnotes/installation)
- **Static methods** for Blade, Inertia and anywhere outside Antlers —
  [From PHP](/bard-footnotes/php)

## Limits

The ids are fixed: `fn-n` for the list entries, `fnref-n` for the markers in the
text. That means **one footnote list per page** — two `footnotes` tags on the
same page produce the same ids. On a normal article page that is the one list
you want; see [Bard with sets](/bard-footnotes/sets) for the one case it
touches.

The addon ships no config file and no Control Panel screen. It is MIT and free,
and not part of the Suite.

## Next

- [Installation](/bard-footnotes/installation) — composer, the fieldset import, a minimal template
- [Writing with markers](/bard-footnotes/writing) — for editors: what becomes a link and what stays text
- [The footnotes modifier](/bard-footnotes/modifier) · [The footnotes tag](/bard-footnotes/tag)
- [Bard with sets](/bard-footnotes/sets) · [From PHP](/bard-footnotes/php)
- [Styling and translations](/bard-footnotes/styling) — the two CSS rules, the publishable view, en/de strings
- [Reference](/bard-footnotes/reference) · [Changelog](/bard-footnotes/changelog)
