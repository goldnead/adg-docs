---
title: Block Editor
description: A Notion-style block editor that reads and writes plain Markdown, and embeds into any page as two files.
---

# Block Editor

<AddonHeader />

A block editor with slash commands, drag handles, tables, callouts and wiki
links, whose document model is plain Markdown and nothing else.

This is not a Statamic addon. It is a standalone React application that also
builds to two static files, and it is documented here because it is the editing
surface the addon suite's own tooling uses. Nothing on this page requires
Statamic, PHP or Composer.

## What makes it different from the other block editors

Most block editors keep a private document tree and offer Markdown as an import
and an export. This one has no private tree to keep. `parseMarkdown` turns a
string into blocks when the editor mounts, `serializeMarkdown` turns blocks back
into a string on every change, and there is no third representation in between.

The consequence a host actually feels: whatever the user writes stays diffable,
reviewable in a pull request, and readable without the editor. That is the whole
reason it exists, for a dashboard whose content lives in git.

The second design constraint was that it had to embed into a page that already
had its own styling. The build emits a stylesheet compiled without Tailwind's
preflight, carrying only the theme and the utilities the editor uses, so
mounting the editor cannot restyle the page around it.

## What you get

| | |
|---|---|
| Blocks | Paragraph, H1–H3, bullet, ordered, to-do, table, code, quote, divider, toggle, callout, tabs, image, table of contents |
| Inline | Bold, italic, underline, strikethrough, code, links, text and background colour |
| Input | Slash menu for blocks, drag handles for reordering, `⌘F` / `Ctrl+F` for search and replace |
| Links | Wiki-link chips resolved by a callback the host supplies |
| Output | An ES module and a self-contained stylesheet, 166 KB gzipped together, React included |
| Network | No telemetry and no backend of its own. Two user actions load remote assets — see [Mount API](/block-editor/api#what-it-never-does) |

The editor's own interface strings are German.

## Where to go next

- [Embedding](/block-editor/embedding) — the two files, and the page that loads them.
- [Mount API](/block-editor/api) — every option and every handle method.
- [Blocks & Markdown](/block-editor/markdown) — what each block serialises to.

The source is at [goldnead/block-editor](https://github.com/goldnead/block-editor),
MIT licensed.
