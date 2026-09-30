# Writing with it

<AddonHeader />

Type paragraphs, separate blocks with an empty line, and pause. A block is every run of
non-empty paragraphs between two empty lines (or between a set and the next empty line).
After a short typing pause, each block gets a pill in its first line.

## The bar

Above the text, a bar counts what is open: how many suggestions, how many need a choice.
**Accept all** turns every confident suggestion into its set in one go. It skips the blocks
that are only a question, and the ones suggested as plain text.

Right after an acceptance the bar says so for a few seconds, with **Undo**.

## The pills

| Pill | What it means | What a click does |
| --- | --- | --- |
| `Reading …` | The model is being asked. | Nothing yet. |
| `Heading` | A suggestion, above the threshold. On the active block (the one with the cursor, or under the mouse) it reads `✓ As Heading`. | Turns the block into that set. The arrow beside it opens the other sets. |
| `Heading or Step?` | A question: the model is below the threshold and names its two likeliest sets. | Opens a menu with both as answers, and every other set below them. |
| `Text` | The model thinks this is plain running text. Quiet on purpose. | Opens the list of sets, for when it is wrong. |
| `Unavailable · Try again` | The request failed. Hover for the reason; the bar shows it too. | Asks again. |

<Figure
  src="bard-assist-menu"
  alt="A suggestion pill with its menu open: Which set is this? Überschrift 81 percent with a tick, Text 14 percent, Schritt 4 percent, Liste 1 percent, then Angebot, Frage and Aufruf, each with the first words of its instructions"
  caption="The arrow opens every set with its probability, sorted. The grey line under each name is the start of that set's instructions, so a short first clause helps the editor as much as the model." />

### ⌥↩ (Alt+↩)

Accepts the block the cursor is in. On a suggestion it takes that set; on a question it takes
the likelier of the two. It does nothing when the likeliest answer is plain text.

## The fields of a block

On the active block, every line carries the name of the field it would go into, at the
right edge. Click one to move the line to another field, or choose **Don't use** to leave it
out of the set.

<Figure
  src="bard-assist-fields-dark"
  alt="A dark Control Panel: a block of nine lines under the pill As Angebot, each line with a small field name on the right such as Paketname, Umfang, Preis, Preis pro Stunde, Für wen, Leistungen and Knopftext, and a Link target? pill at the top"
  caption="One field name per line. Three lines go into the same list field, Leistungen, and become three items." />

Only line-like fields are offered here: `text`, `textarea`, `list` and `markdown`. Which of
them the model picks is steered by their `instructions`; see
[Setting up a field](/bard-assist/setup#field-instructions-which-line-goes-where).

## Link targets

When the suggested set has a link field with a label field directly before it, the block
gets a second pill:

- **`→ Contact`**: the entry the model picked for the label. Click to choose another; the
  menu shows the six likeliest entries with their probabilities.
- **`Link target?`**: nothing was confident enough, so the link is left open. Pick one from
  the menu, or leave it.

A URL written in the paragraph wins over your entries: once a line has gone into the label
field, the URL is used as the target as it stands, without asking the model. Punctuation
directly after it counts as part of it, so leave a space. The page being edited is never offered as a target of itself.

Moving the label line to another field looks the target up again, because the label is what
it was chosen for.

## Accepting

A click on a suggestion, a menu answer, **Accept all** or ⌥↩ replaces the block with a real
Bard set (choosing **Text** in the menu leaves the paragraphs as they are), the lines filled into their fields. From there it is an ordinary set: edit it,
move it, delete it, save the entry.

## Undoing

A set created this way carries a **✦ From your text** pill in its header:

- **Back to text** turns it back into the original paragraphs.
- **Other set …** does the same, then opens the choice of sets again.

<Figure
  src="bard-assist-set"
  alt="An accepted set named Überschrift with its fields Rubrik and Einleitung filled, and the From your text pill in its header opened: Back to text, turns it back into paragraphs; Other set, back to text and choose again"
  caption="Every set Bard Assist made can go back to the paragraphs it came from." />

Back to text uses the original lines while the editor still has them. Otherwise it rebuilds
the paragraphs from the set's line fields, in blueprint order.

## Corrections become house examples

When you accept a different set than the one suggested (from the menu, or by answering a
question with the second option), Bard Assist remembers that paragraph, up to 300 characters,
and the set you chose. The twelve most recent corrections per field handle are kept, and sent
along as **house examples** with every later request that chooses a set for that field. The request tells the
model that these are the editors' decisions and take precedence when in doubt.

After a correction, the other open blocks are asked again, so the new example counts at
once.

Two things follow from where they are kept, the browser's `localStorage`:

- They belong to the **browser**, not to the Statamic user. Someone else signing in on the
  same browser profile uses, and sends, the same examples.
- They travel **across entries**. A correction made on one page is sent with requests from
  the same field on every other page.

Clearing the site data for the Control Panel removes them. What this means for personal data
is on [Privacy and security](/bard-assist/privacy).

## What costs a request

Each block is classified after a typing pause when it changed, and again when the set of the
block before it changed, because that is part of what the model is told. A classified block
costs up to three requests: one for the set, one for its fields (when the set has line-like
fields), and one for a link target (when there is a label line, no URL in the text, and
entries to choose from). Accepting the suggested set and picking a link target from the menu use answers
that are already there; choosing another set asks again for its fields, and moving the label
line asks again for the link target. The live preview draws suggestions through your own
site, not through the provider. The per-user limit is
[`rate_limit`](/bard-assist/configuration#rate-limit).

## The live preview and fullscreen

Statamic rebuilds the editor when you open the live preview or fullscreen. Suggestions,
answers and remembered originals are kept per field across those rebuilds, so nothing is
asked twice. Only the visible editor sends requests.
