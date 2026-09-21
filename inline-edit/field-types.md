# What can be edited

<AddonHeader />

Four kinds of field, four different things on a double-click. Which one a field gets is
decided by its fieldtype, in `config/statamic-inline-edit.php`.

| | Fieldtypes | Double-clicking it |
| --- | --- | --- |
| **text** | `text`, `textarea`, `integer` | The text itself opens. What you type is what the page will show. |
| **source** | `markdown` | The text becomes a real editor, in place. |
| **control** | `toggle`, `select`, `date` | A small control opens beside the word. |
| **cp** | everything else | That one field opens as a control panel form, in a panel over the page. |

Only **text** keeps what you typed on the page as you typed it. The other three reload the
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

## Everything else

Bard, Replicator, assets, Grid, anything else with a shape. Double-clicking one of those
opens a panel over the page holding **that one field** — the real fieldtype, with its real
metadata, on a control panel route of the addon's own.

<Figure
  src="inline-edit-control-panel"
  alt="A card over the public page holding a single Bard field: its label, its instructions, the full Bard toolbar, the text, and Close and Save below it"
  caption="One field, not the entry form. The page it belongs to stays visible around it." />

**The real fieldtype, deliberately, and only the one.** Bard alone is an entire editor and an
asset picker is an entire browser; a second-rate copy of either is worse than the real thing.
So the panel renders the field exactly as the control panel would — the buttons you
configured, the sets you defined, the asset container you named — and saving runs through the
blueprint's own validation and permissions. The page reloads when the panel closes.

The panel is as tall as the form, not as tall as the screen: the form measures itself and
says so. A Bard that grows while you type grows the panel with it, up to the window.

::: danger Bard cannot be edited in place, and not because it is hard
The core builds a Bard value without a parent, so a text node inside it does not know its
entry. That is not a gap to be closed in a later version. The panel is the answer, not a
placeholder for a better one.
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

Three of the four kinds cannot show the result in place, so each says what it can:

- A **control** shows what the field will become next to what it still says. The page reloads
  after saving, and the template has the last word.
- A **markdown** field is rendered by the server the moment the editor closes, through the
  same fieldtype the page uses. What appears there is what will be there. Nothing is written
  until Save is pressed.
- The **panel** is a control panel field, which shows its own result.

## What is refused

**The slug**, outright, and it cannot be enabled. Changing it moves the page out from under
the person editing it and breaks every link to it.

Along with it: `id`, `published`, `blueprint`, `date`, `author` and `parent`. Each of them
changes something structural that the sentence a client wanted fixed has nothing to do with.

A fieldtype on none of the three lists, with `control_panel` off, renders normally and is not
clickable. No error, no outline, nothing to click. That is the intended outcome.

## Next

- [The rich editor](/inline-edit/rich-editor) — what Tiptap costs and how to switch it off
- [Permissions and safety](/inline-edit/permissions) — who may write to which field
