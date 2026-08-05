---
title: Blocks & Markdown
description: What each block type serialises to, and which of them are HTML rather than Markdown.
---

# Blocks & Markdown

<AddonHeader />

The editor has one document format. `parseMarkdown(string)` produces the block
list the editor renders, `serializeMarkdown(blocks)` produces the string again,
and every keystroke round-trips through that pair. There is no separate
document model to fall out of sync with the text.

## The plain Markdown blocks

These serialise to exactly what you would have typed by hand, and a document
written by hand parses back into them.

| Block | Serialises to |
|---|---|
| Heading 1–3 | `#`, `##`, `###` |
| Paragraph | the line itself |
| Bullet list | `- item` |
| Ordered list | `1. item` |
| To-do | `- [ ] item` / `- [x] item` |
| Quote | `> line` |
| Code | a fenced block, with the language on the fence |
| Divider | `---` |
| Table | a GitHub-flavoured pipe table |
| Image | `![alt](url)` |

Tables are written back aligned: each cell is padded to the widest entry in its
column, and a column that was already wider in the source document keeps that
width. Dragging a column in the editor resizes it on screen only — that width is
a pixel value on the block and never reaches the text.

### One line is one block

`parseMarkdown` walks the document line by line, so a paragraph that was
hard-wrapped in the source arrives as one block per line rather than as one
paragraph. Feed it Markdown wrapped at 80 columns and you get a stack of short
paragraphs with spacing between them.

This matters when a host seeds the editor from a file a human wrote in a text
editor. The editor's own output never has the problem, because it writes each
paragraph as a single long line.

## The blocks that are HTML

Markdown has no syntax for the remaining four, so they serialise to HTML that
Markdown renderers pass through untouched. They stay readable in a diff, which
was the point.

| Block | Serialises to |
|---|---|
| Toggle | `<details><summary>…</summary>…</details>` |
| Callout | `<aside>` with the emoji on its own line, then the body |
| Tabs | `<tabs>` containing one `<tab title="…">` per tab |
| Table of contents | `<!-- toc -->` |

A host that renders the stored Markdown elsewhere gets working disclosure
widgets for free from `<details>`, and has to decide what `<aside>`, `<tabs>`
and `<!-- toc -->` should become. The table of contents is a marker rather than
generated headings on purpose: the editor renders it live from the document's
own headings, so storing a snapshot of them would go stale the moment a heading
is renamed.

## Wiki links

A link chip serialises to `[[kind:id]]`:

```markdown
See [[file:docs/embedding.md]] and [[task:task-editor-einbetten]].
```

Six kinds parse: `task`, `project`, `file`, `backlog`, `contact` and `page`.
The slash menu's link command can currently offer the first three, because
that is what a `SearchResult` may carry; the other three render if the host
writes them into the document itself.

An unresolved chip still renders. Its label is derived from the id — a file
shows its basename, anything else is de-slugified and capitalised — so a
document referencing something the host no longer knows about degrades to a chip
with a readable name rather than to broken syntax.

## Inline formatting

Bold, italic, underline, strikethrough, inline code and links survive the round
trip. Text and background colour are stored on the block, not in the text —
Markdown has nowhere to put them, and inventing an attribute syntax would have
broken the promise that the output is ordinary Markdown. Recolour a block, and
the colour is lost when the document is saved and reloaded.
