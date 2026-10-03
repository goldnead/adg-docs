# Writing with the button

<AddonHeader />

For the editor, the whole addon is one button. Where a claim needs a source,
place the cursor and click **Footnote** in Bard's toolbar. A panel opens at the
side; fill in the source, add a link if it lives online, and apply.

<Figure
  src="bard-footnotes-new"
  alt="The Control Panel with the Footnote panel open for a new footnote: the select reads New source, below it an empty Source field and an optional link field"
  caption="The panel for a new footnote: the select at the top on “New source”, the source field focused, the link field marked optional. The editor on the left already shows three numbers." />

A footnote stores its source and nothing else. The number is derived from the
document and shown live in the editor, so there is nothing to renumber when you
add, move or delete one.

## Where sources live

Under the editor. As soon as a Bard field holds at least one footnote, a
**Sources (N)** list appears directly below it, in number order and live on every
change. It is the place to see every source of the field at a glance and to edit
any of them. A field without footnotes shows nothing.

<Figure
  src="bard-footnotes-overview"
  alt="A whole entry in the Control Panel: text with superscript numbers, a quote set, and below the editor the list Sources (2) with number, source, citation count and two icon buttons per row"
  caption="The whole entry: numbers in the text, a quote set, and under the editor the list “Sources (2)”. Each row shows the number, the source (↗ when it has a link), how often it is cited and two icon buttons." />

Each row carries:

- the **number** and the **source**; a source with a link shows ↗ and opens the
  link in a new tab
- the number of citations, such as **2×**
- **Go to citation** selects the first place that cites the source and scrolls to
  it. Click again and the button reads **Next citation**: it moves on to the next
  place, and after the last one starts over
- **Edit** opens the source in the panel

**Edit** opens the panel as **Edit Source N**. It has no source select, only the
source and its link, and the hint "Used N times. Changes apply to every place."
**Apply Source** changes every place that cites it. While the panel is open, all
places of that source are highlighted in the editor.

<Figure
  src="bard-footnotes-edit-source"
  alt="The Control Panel with the panel Edit Source 1 opened from the Sources list: no select, a hint that the source is used 2 times, the source and link fields and the button Apply Source. In the editor both places citing source 1 are highlighted"
  caption="“Edit Source 1”, opened from the list. Both places that cite source 1 are highlighted in the text while the panel is open." />

The list is for seeing and editing, not for removing: a footnote is removed in the
text, see [Changing a footnote](#changing-a-footnote). The list has no Edit button
in a read-only field. In Bard's fullscreen mode it is a card of its own under the
editor.

## The panel

This is the panel behind the toolbar button and behind a number in the text.

- **Source** is required text: a book, a study, a name and a date
- **Link** is optional and only reaches the page when it starts with `http://` or
  `https://`
- The select at the top offers the sources **already cited in this field**.
  Picking one fills the source and link with its text and link, so citing it
  again is one click and the second place gets the same number
- **Apply Footnote** inserts the footnote at the cursor

With text selected, the footnote is inserted at the **end of the selection**. The
selected text stays exactly as it is and is not taken over as the source.

A footnote with neither text nor link has no source: it gets no number, no list
entry and renders nothing.

## What counts as the same source

Two footnotes are the same source when they carry the same link (trimmed), or,
without a link, the same text: whitespace trimmed and collapsed, Unicode spaces
such as a non-breaking space included, case-insensitive. The Control Panel and
the rendered page apply exactly the same rule, so the number you see while
writing is the number on the page.

## Seeing a source

Hover a number in the editor and its source shows as a tooltip.

<Figure
  src="bard-footnotes-hover"
  alt="An editor excerpt: the pointer rests on the superscript 2 and a tooltip shows the source text, which reads Eigene Beobachtung followed by a script tag"
  caption="Hovering the 2 shows its source. The test data deliberately uses a script tag as the source text: it appears here as plain text, and on the page it is escaped the same way." />

## Changing a footnote

Click a number in the text to open the panel again. (To edit a source without
hunting for its number, use **Edit** in the [Sources list](#where-sources-live).) The select shows the source
this footnote cites, and the panel can do three things.

**Edit the source it cites.** Changing the text or the link of a source that is
used in more than one place changes **every** place that cites it, in one step.
The panel says so: "Used 2 times. Changes apply to every place."

<Figure
  src="bard-footnotes-edit-shared"
  alt="The Control Panel with the Footnote panel open on an existing footnote: the select shows the first source, a hint reads Used 2 times, and the source and link fields are filled in. In the editor on the left the numbers 1 and 2 stand before a quote set, and 1 again after it"
  caption="The panel opened from a number in the text, with the source select. The source appears twice: the hint under the select says it is used 2 times; applying the change updates both places. The editor on the left shows the live numbers 1, 2 and, after the quote set, 1 again." />

**Switch to another source.** Pick a different source in the select, or “New
source”, and only **this** footnote is re-pointed. The other places citing the
old source keep it.

**Remove it.** **Remove Footnote** deletes this one footnote and nothing else,
even when its source is cited elsewhere.

::: tip The difference to remember
Editing the text of the source a footnote cites changes every place that cites it.
Choosing another source changes only the one you opened.
:::

## If the button is missing

The button appears only in Bard fields whose blueprint lists `footnote` under
`buttons`; see [Installation](/bard-footnotes/installation#the-button).
Footnotes already in the text of a field without the button still display and can
be edited by clicking them.
