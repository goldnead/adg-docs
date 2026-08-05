---
title: Block Editor playground
description: A running Block Editor with the Markdown it produces beside it, editable in the page.
# The frame needs more room than the 688px prose column, or its two panes stack
# and the whole point — document and Markdown side by side — is lost. The page
# drops the right-hand outline to buy that width; it has two headings.
aside: false
pageClass: gn-playground-page
---

# Playground

<AddonHeader />

The editor below is running. Type in it, open the block menu with `/`, and watch
the right-hand pane: that is the document, rewritten on every keystroke, not an
export you asked for.

<Playground slug="block-editor" title="Block Editor playground" />

## What to try

- **`/` on an empty line** opens the block menu. Insert a table, a callout, a
  toggle, or tabs, and compare what each one becomes on the right.
- **`/` then `Verweis`** searches a small mock directory — the playground's
  `resolveLinks` callback. Picking a result inserts a chip that stores as
  `[[kind:id]]`.
- **Drag a column edge** in the table sample. The width changes on screen and
  the Markdown stays a clean pipe table, because that width is a pixel value on
  the block and never reaches the text.
- **`⌘F` / `Ctrl+F`** opens search and replace inside the editor rather than the
  browser's own find bar.
- **Paste Markdown** in from anywhere. It parses into blocks; there is no import
  step.

The interface is German. The four samples in the toolbar are the document, so
switching one discards whatever you typed.

## What the playground is

The page in the frame is 60 lines of HTML and one `mount()` call, which is the
entire integration described in [Embedding](/block-editor/embedding). It runs
from `editor.js` and `editor.css` copied out of the repository's build output —
the same two files a host would copy.

Two things it does not demonstrate. `onSave` is not wired, so `⌘S` does nothing
here; a real host binds it. And it runs in an iframe rather than directly in
this page, because the editor is styled for a light surface and carries no dark
mode, while VitePress styles every heading, list and table inside its content
area. Mounted straight into the documentation, each would reach into the other.
That is worth knowing before you embed it: **the editor expects a light
background**, and a host page's own resets can still reach inside it.
