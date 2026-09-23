# What can be edited

<AddonHeader />

Five kinds of field, five different things on a double-click. Which one a field gets is
decided by its fieldtype, in `config/statamic-inline-edit.php`.

| | Fieldtypes | Double-clicking it |
| --- | --- | --- |
| **text** | `text`, `textarea`, `integer` | The text itself opens. What you type is what the page will show. |
| **source** | `markdown` | The text becomes a real editor, in place. |
| **control** | `toggle`, `select`, `date` | A small control opens beside the word. |
| **inline** | `bard` | The real control panel field, put over the block it belongs to, in the page's own type. |
| **cp** | everything else | That one field opens as a control panel form, in a panel over the page. |

Only **text** keeps what you typed on the page as you typed it. The other four reload the
page after saving, because only the server knows what the template will make of the new value.

## text

The original, and the plainest. The element becomes editable, the cursor goes where the
double-click was, and Escape reverts it.

What travels back to the server is the browser's `innerText`, **never `innerHTML`**. That is
the whole safety model: no markup a `contenteditable` produces can reach your content, not a
`<div>` a browser inserted on Enter, not a `<span style>` from a paste, not a stray `<br>`.

It is also why the fieldtype list may only ever contain fieldtypes that store a plain string.

::: warning `integer` is in the list, and it is still a text box
The blueprint validates it on the way in, so a typed word is refused with a message rather
than silently stored. But the field looks like any other while it is open.
:::

## source

The text on the page becomes the editor. Not a box over it and not a copy of it: the same
heading, the same measure, the same font, now with a cursor in it.

<Figure
  src="inline-edit-editor"
  alt="A markdown block on a public page, in edit mode, with a word selected and a light formatting toolbar in the left margin"
  caption="Same type, same spacing, same list. The toolbar goes in the page's margin, where it covers nothing." />

Markdown shortcuts work as you type them: `## ` for a heading, `- ` for a list, `> ` for a
quote, `**bold**` as you close the asterisks. Selecting text raises a small toolbar.

It has a real cost and a way out, both on their own page: [The rich editor](/inline-edit/rich-editor).

## control

A toggle renders as *Running*, or *ja*, or a coloured dot, depending on what the template
makes of it. There is nothing to put a cursor in, so a real control opens beside the word.

<Figure
  src="inline-edit-control"
  alt="A select with a Done button, opened next to the word the template rendered from the field"
  caption="The select shows what the field will become, next to what it still says." />

These need the pair form, because the tag has to wrap the template's output rather than
produce it:

```antlers
{{ editable field="promoted" }}{{ if promoted }}Running{{ else }}Paused{{ /if }}{{ /editable }}
```

A select's choices come from the blueprint, and **the save route checks the arriving value
against them again**. The dropdown in the browser is a suggestion; the request is what
happened, and a handcrafted one is refused the same way.

A toggle is kept as a real boolean all the way through, not as the string `"true"`.

## inline

The same real control panel field as **cp** — same fieldtype, same validation, same save —
put over the block it belongs to instead of on a card in the middle of the screen. It starts
as `['bard']`, and `bard` is the reason it exists.

**A Bard is not a field on a page, it *is* the page.** On a card it gets a different column
width, a different typeface and a different measure, so the article you are writing is not
the article anybody will read. You can check spelling there. You cannot see whether a
sentence lands.

So the block keeps its box and stops being drawn, and the frame goes over it and paints
nothing of its own. Nothing around it moves, because as far as the page is concerned nothing
changed.

::: tip Why the block keeps its box rather than being replaced by the frame
A heading's top margin collapses out through its parent. A replaced element has no children
and cannot collapse anything, so putting an iframe in the block's place closes the gap above
by exactly that margin and slides the rest of the article up — eight pixels on the test page,
and a different eight on every other one.
:::

### The typography is measured, not approximated

The page reads the computed style of the element that was double-clicked, and of one probe
for each kind of block a Bard can produce: paragraph, h2, h3, h4, list, list item, quote,
link, bold, italic, code, rule. That result travels to the editor as rules scoped to it.

What does **not** travel is your stylesheet. Loading it into the control panel would put your
reset through the control panel's own interface, which breaks the field you came to use.

**Same font values are not the same font file.** Every property can match and the same
sentence still measure two and a half pixels narrower in the frame, which over a line is a
word climbing into the row above. The control panel ships its own Inter and so does half the
web, so `font-family: Inter` in the frame asks for a different file than the same words ask
for on the page, and two builds of a typeface do not have the same advances. The `@font-face`
rules the page really loaded therefore travel with the typography, renamed so nothing can
claim them and with their URLs made absolute. Where they cannot be read — a stylesheet from
another origin, which is how most sites load Google Fonts — the frame asks that stylesheet
for itself, and only from hosts that serve font declarations and nothing else.

### What the control panel draws, and what comes off

Everything a control panel draws to tell one field from the next comes off: the box around
the field, the label, the instructions, the editor's own padding, its background and its
focus ring. What is left is the text, in the column it will be read in.

**The toolbar comes with the selection.** In place the field is opened in Bard's floating
mode, whatever `toolbar_mode` the blueprint sets: select a few words and the buttons appear
over them, let go and they are gone. A bar that stands there whether or not anybody is about
to use it says "form", and the promise of this mode is "page". The blueprint's own setting is
untouched — it answers a different question, how the field should look in the control panel,
where a docked toolbar is right, and it still applies on the card.

Room for it is reserved above the text all the same. That toolbar is drawn inside the frame
and the frame ends where the text does, so a selection on the first line would put it half
outside and it would be cut off. The reserved strip hangs over what is above the article and
is empty until something is selected.

Save and Close keep a strip **under** the text, and the page makes room for exactly that
strip. They have to be reachable the whole time, not only while something is selected. The
page's own bar steps aside while a field is open in place: two buttons saying "Save", one of
them greyed out, is a question nobody should have to answer.

### Two things it does not do

**A click in the strips does not reach the page.** The frame covers the room reserved for the
toolbar above the text and the one holding Save and Close below it, and an iframe cannot let a
click through part of itself. Whatever is under those strips is not clickable while the field
is open.

**The block keeps the height it had.** The page does not reflow while the text grows, so a
Bard that gets longer while you type has the frame covering more of what is under it rather
than pushing it down. The reload after saving puts it right.

### Revisions get the card

An entry on a collection with revisions enabled opens as **cp** instead, for the same reason
it always did: one field written past a working copy would publish straight to the site, and
the one-field route refuses those entries. The whole entry form cannot stand in the column
the article is read in, so it gets the card.

Add or remove fieldtypes in `inline`. A fieldtype there behaves exactly like **cp** in every
respect except where the frame is put — which also means `control_panel` set to `false`
turns this off with it. It is the same control panel field in the same iframe; if the
control panel cannot be framed, neither can be offered.

## Everything else

Replicator, assets, Grid, anything else with a shape that `inline` does not cover.
Double-clicking one of those opens a panel over the page holding **that one field** — the
real fieldtype, with its real metadata, on a control panel route of the addon's own.

<Figure
  src="inline-edit-control-panel"
  alt="A card over the public page holding a single Bard field: its label, its instructions, the full Bard toolbar, the text, and Close and Save below it"
  caption="One field, not the entry form. The page it belongs to stays visible around it. A Bard gets this card only where inline editing cannot be offered — an entry under revisions." />

**The real fieldtype, deliberately, and only the one.** Bard alone is an entire editor and an
asset picker is an entire browser; a second-rate copy of either is worse than the real thing.
So the panel renders the field exactly as the control panel would — the buttons you
configured, the sets you defined, the asset container you named — and saving runs through the
blueprint's own validation and permissions. The page reloads when the panel closes.

The panel is as tall as the form, not as tall as the screen: the form measures itself and
says so. A Bard that grows while you type grows the panel with it, up to the window.

::: danger One paragraph inside a Bard cannot be marked, and not because it is hard
The core builds a Bard value without a parent, so a text node inside it does not know its
entry. That is not a gap to be closed in a later version. The whole field is what opens —
over the block, in [inline](#inline) — and that is the answer, not a placeholder for a
better one.
:::

### Collections with revisions get the whole form

One exception, and it is deliberate. On a collection with revisions enabled, these fields open
the **entire** entry form in a full-screen overlay, scrolled to the field that was
double-clicked — the behaviour every version before 1.4.0 had for everything.

Writing one field past a working copy would publish it straight to the live site, on exactly
the collections whose point is that somebody approves first. The big form knows how to make a
working copy. The one-field panel does not, so it does not get the chance.

Switch `control_panel` off if the control panel cannot be framed from the site's own origin.
Those fields then render normally and are not clickable.

## On a phone

A double-click is a mouse gesture; on a touchscreen a double tap is zoom. So a **single tap**
opens a field, and only while edit mode is on, which the person switched on one tap earlier.
Reading the page is never interrupted.

<Figure
  src="inline-edit-phone"
  alt="The same page at phone width, a word selected inside the markdown block and the toolbar directly above it"
  caption="No margin at this width, so the toolbar goes over the text, above the selection. The selected word stays free." />

## Seeing it before you save it

Four of the five kinds cannot show the result in place, so each says what it can:

- A **control** shows what the field will become next to what it still says. The page reloads
  after saving, and the template has the last word.
- A **markdown** field is rendered by the server the moment the editor closes, through the
  same fieldtype the page uses. What appears there is what will be there. Nothing is written
  until Save is pressed.
- The **panel** and a field opened **in place over its block** are both control panel fields,
  which show their own result. In place, in the page's own type, that result is very close to
  the rendered page; it is still the control panel's rendering of the value, not the
  template's.

## What is refused

**The slug**, outright, and it cannot be enabled. Changing it moves the page out from under
the person editing it and breaks every link to it.

Along with it: `id`, `published`, `blueprint`, `date`, `author` and `parent`. Each of them
changes something structural that the sentence a client wanted fixed has nothing to do with.

**None of the seven gets a marker at all.** The save route always turned them away, but the
tag used to draw a `cp` marker on them anyway, so the outline appeared, the double-click
opened a panel, and the panel answered 404. A marker that cannot lead anywhere is a broken
promise, not a safe default, so the tag now renders those fields as plain values.

A fieldtype on none of the four lists, with `control_panel` off, renders normally and is not
clickable. No error, no outline, nothing to click. That is the intended outcome.

## Next

- [The rich editor](/inline-edit/rich-editor) — what Tiptap costs and how to switch it off
- [Permissions and safety](/inline-edit/permissions) — who may write to which field
- [A front end that is not Antlers](/inline-edit/headless) — the same markers without a template tag
