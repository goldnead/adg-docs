# Writing with markers

<AddonHeader />

For the editor, the whole addon is one habit: where a claim needs a source, type
`[1]` — plain text, in brackets, the number of the source. Save the entry. The
numbering is the order of the rows in the **sources** grid below the article:
row one is `[1]`, row two is `[2]`, and so on up to `[99]`.

<Figure
  src="bard-footnotes-sets"
  alt="The Control Panel: a Bard field with a text set and a quote block, and the sources grid below with rows of source text and link"
  caption="A Bard field with sets, the typed markers inside the text sets, and the sources grid below. The number of a marker is the row it points at, wherever in the text it stands." />

Everything else happens on output. What you type is what is stored — which is
why the markers survive every save, the live preview, inline editing, and a
move of the text into another entry.

## What becomes a link

- `[1]` to `[99]`, when a source with that number exists: a superscript link to
  the source list, and a back link from the list to the first occurrence
- Cite the same source twice: both `[1]` become links; only the first carries
  the jump target the back link returns to

## What stays text

- **A number without a source.** `[4]` when the grid has three rows stays `[4]`,
  and `[0]` always stays `[0]`. Fixing it means adding the row, not editing the text
- **Everything inside a link.** `Link [1]` in the middle of an anchor keeps its
  brackets — a marker inside a link would break the link's own meaning
- **Headings, h1 through h6.** A heading carries no sentence that needs a
  source, and a superscript in a heading line breaks the line's rhythm
- **`pre` and `code`.** `arr[1]` in a code block is code, not a citation; it is
  left alone on purpose

If a marker you expected to become a link stays text, one of the four above is
the reason — or the number is higher than the count of source rows.

## The sources grid

One row per source: the **source text** (a book, a study, a name and a date)
and, when it lives online, a **link**. Order the rows in the order you cite
them; the numbering follows the rows, and a link only reaches the page when it
starts with `http://` or `https://`.

An empty row does no harm: rows without text drop out on output, and the
numbering closes the gap. Deleting a row in the middle renumbers everything
below it — the markers follow the rows, so check the text when you reorder.
