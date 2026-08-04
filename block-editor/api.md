---
title: Block Editor mount API
description: Every option mount() accepts and every method on the handle it returns.
---

# Mount API

<AddonHeader />

The whole public surface is one function and the handle it returns.

```js
const handle = window.CCEditor.mount(targetElement, options)
```

`window.mountEditor` is the same function under a second name, for hosts whose
script loader cannot reach a namespaced property.

## Options

| Option | Type | Default | |
|---|---|---|---|
| `value` | `string` | — | The initial document, as Markdown. Required. |
| `placeholder` | `string` | none | Shown in an empty block. |
| `readOnly` | `boolean` | `false` | Renders the document without editing affordances. |
| `onChange` | `(markdown: string) => void` | none | Fires after every edit, with the serialised document. |
| `onSave` | `(markdown: string) => void` | none | Fires on `⌘S` / `Ctrl+S`. |
| `resolveLinks` | `(query: string) => Promise<SearchResult[]>` | none | Backs the link command. |

`onChange` is called with the result of serialising the block list, not with a
patch. A host that wants to persist on a timer should debounce it.

`onSave` is what makes `⌘S` mean something inside the editor rather than
offering to save the browser page. Without it, the shortcut is still swallowed,
so bind it if the host has anywhere to put the document.

## The handle

| Method | |
|---|---|
| `getMarkdown()` | The current document as Markdown. Returns `''` before the editor has mounted. |
| `setMarkdown(md)` | Replaces the document. |
| `focus()` | Puts the caret in the editor. |
| `destroy()` | Unmounts the React root. Call it before removing the target element. |

`destroy()` is not optional in a single-page host. The editor mounts its own
React root into the target; dropping the element without unmounting leaks that
root and its listeners.

## Resolving links

`resolveLinks` is how the editor learns about objects it has no way to know
about. The link command in the slash menu calls it with whatever the user has
typed and offers the results:

```js
resolveLinks: async (query) => {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
  return res.json()   // [{ kind, id, label }, …]
}
```

A result is:

```ts
interface SearchResult {
  kind: 'task' | 'project' | 'file'
  id: string
  label: string
}
```

Picking one inserts a chip that serialises to `[[kind:id]]`. The Markdown layer
additionally parses `backlog`, `contact` and `page` chips, so a host may store
those kinds and they will render, even though `resolveLinks` cannot currently
offer them.

Without the callback the link command still opens; it just has nothing to
suggest.

## What it never does

There is no telemetry, no autosave endpoint and no remote configuration.
Everything the editor knows about the host's world came in through `mount`, and
the document never leaves the page on its own.

Two user actions do reach the network, and a host on a locked-down CSP should
know about both:

- Opening the emoji picker on a callout loads emoji images from
  `cdn.jsdelivr.net`. That is `emoji-picker-react`'s default asset source.
- The image block offers a random placeholder from `picsum.photos`. Images the
  user pastes in are loaded from wherever their URL points.
