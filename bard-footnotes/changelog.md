---
title: Bard Footnotes changelog
editLink: false
---

# Changelog

<AddonHeader slug="bard-footnotes" />

Release notes for `goldnead/statamic-bard-footnotes`, as published with the package.

Cross-version upgrade notes for the whole suite are in
[Upgrading](/guide/upgrading).

All notable changes to `statamic-bard-footnotes` will be documented in this file.

## 2.1.0 - 2026-10-03

### Sources under the field

- A Bard field citing at least one source shows **Sources (N)** under the editor, styled like
  core's footer toolbar: number, source text (↗ for links, new tab), citation count, and two
  icon buttons — **Go to citation** / **Next citation** (selects the first citation and scrolls
  to it; again for the next) and **Edit**. Edit opens "Edit Source n": no source select, only
  text and link, Apply Source changes every place of that source (nothing is merged), and those
  places are highlighted in the text while the panel is open. Live on every change, in number
  order; no Edit in read-only fields. No remove: footnotes are removed in the text.
- Mounted by a ProseMirror plugin view through TipTap's `VueRenderer` (same app context and
  provides as a node view), right after the editor frame and before core's footer toolbar.
  Rebuilt with the editor when Bard enters or leaves fullscreen, where it is a card of its own
  under the editor card. Nothing is mounted in a field without footnotes.
- New pure helpers in `footnotes.js`, tested against a real ProseMirror schema: `hasFootnotes`,
  `nextCitation`, `isHttpUrl`, the `citationHighlightPlugin` with its `setCitationHighlight`
  command (not recorded for undo); `reusedCount` learns `wholeSource`.
- New strings (en/de): `sources_heading`, `cited_count`, `cited_times`, `open_link`,
  `go_to_citation`, `next_citation`, `edit`, `edit_source`, `apply_source`.

### Rendering a field in parts

- `Footnotes::number()` is idempotent: a document whose every footnote with a source already
  carries a `number` comes back unchanged (with its `first` flags). Number the whole field once,
  split it, render each part through `Augmentor::convertToHtml()`: the numbers run across all
  parts and `fnref-n` sits only on the first occurrence in the whole field. Before, the hook
  restarted at 1 in every part. A partly numbered document is numbered anew. See "Rendering a
  Bard field in parts" in the README.

## 2.0.0 - 2026-10-03

### Breaking: footnotes move into the text

- Requires Statamic 6 and PHP 8.2. For Statamic 5, stay on the `1.x` branch — see
  UPGRADE.md for the manual migration.
- Removed the `sources` grid fieldset and typed `[n]` markers: no more `Footnotes::render()`,
  `renderSets()`, `renderValue()`, the `&#123;&#123; | footnotes }}` modifier, or the fieldset import.
  Footnotes are now created with a **Footnote** toolbar button in Bard — an inline node storing
  its source (`text`, optional `url`), rendered as a superscript link.
- Numbers are derived, never stored: order of first occurrence, same source = same number
  (same trimmed URL, else same text — whitespace collapsed, case-insensitive). The editor shows
  the live number; clicking a footnote reopens its popover.
- Numbering runs across the whole field, Bard sets included; a Bard field nested inside a set
  remains its own document.
- Markup: `<sup class="footnote-ref"><a href="#fn-n" id="fnref-n" aria-label="Footnote n">n</a></sup>`,
  jump target on first occurrence only. The CP bundle (button, popover, node view) is committed
  under `dist/` and published with `vendor:publish --tag=statamic-bard-footnotes`.
- The `&#123;&#123; footnotes }}` tag reads the field from the template context by handle
  (`field="content"` — a `:content` binding arrives as rendered HTML). `cited` is gone: every
  listed source is cited by definition. The pair loop now yields `number`, `text`, `url`.
- `Footnotes::sources()` returns `list<{number, text, url}>` for a raw Bard value.

### Refined: editing reused sources, CP polish

- Opening a footnote selects the source it cites in the popover ("New source" only for
  unmatched ones); the select is labeled, the inputs use placeholders, and the link field
  is marked optional.
- Editing a reused source updates every footnote citing it — one transaction, with a hint
  ("Used N times. Changes apply to every place.") when it applies. Removing a footnote
  still only removes that one spot.
- The popover focuses the source text field on open, like Bard's link toolbar.
- The toolbar button inserts the footnote at the end of the selection; selected text is kept
  (it used to be replaced) and is not taken over as the source.
- Picking another existing source, or "New source", in a footnote's popover re-points only that
  footnote; before, it overwrote every place citing the old source. Editing the source it
  already cites still changes all of them, and the "Used N times" hint now shows only then.
- A footnote with neither text nor link is ignored: no number, no list entry, no markup.
- The source key treats Unicode whitespace (NBSP, U+FEFF, U+0085, `\p{Z}`) the same in PHP and
  in the editor, so numbers in the CP and on the page can no longer disagree.
- `&#123;&#123; footnotes field="…" }}` logs one warning in debug mode when the field is missing or not a
  Bard value.
- Limits documented: `save_html: true` is unsupported (the saved HTML shows `[source]` instead of
  an empty superscript), and a Bard field nested in a set reuses the ids `fn-1` … of the outer list.
- The superscript in the editor is link-colored, underlines on hover, highlights when
  selected, and carries the source as tooltip; the toolbar icon is its own shape
  (text line, superscript 1, footnote rule).

## 1.0.0 - 2026-10-02

### First release

- `Footnotes::render()`: `[n]` markers (1–2 digits) in rendered Bard HTML become superscript
  links `<sup class="footnote-ref"><a href="#fn-n" id="fnref-n">`; only 1 to the source count,
  never inside links, headings (h1–h6), `pre` or `code`, jump target only on the first occurrence.
- Bard fields with sets: every text set is rendered, other sets pass through untouched, and the
  jump target is placed once across all text sets (`Footnotes::renderSets()`,
  `Footnotes::renderValue()`).
- `Footnotes::sources()`: normalizes the `sources` grid to numbered source rows. Empty rows
  drop out and the numbering closes the gaps; urls survive only with `http(s)://`.
- `&#123;&#123; | footnotes }}` modifier: count from the sources field (passed, named, or from the
  context) or from a plain number. Bard values render to HTML first.
- `&#123;&#123; footnotes }}` tag: as a pair, loops the sources with `number`, `text`, `url`, `cited`
  (plus `no_results`/`total_results`); on its own, renders the publishable
  `bard-footnotes::list` view with the source list and back links.
- Fieldset `bard-footnotes::sources` for the blueprint import.
- Translations for English and German.
