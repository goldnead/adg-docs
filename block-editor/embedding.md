---
title: Embedding the Block Editor
description: Build the two static files and mount the editor into a page that already has its own styling.
---

# Embedding

<AddonHeader />

The editor ships as two files. A host page loads them and calls one function.
There is no build step on the host's side and no framework requirement: the
module carries its own React.

## Build the files

```bash
git clone https://github.com/goldnead/block-editor.git
cd block-editor
npm install
npm run build
```

`npm run build` writes:

| File | What it is |
|---|---|
| `public/editor.js` | An ES module. Importing it defines `window.CCEditor`. |
| `public/editor.css` | The editor's styles, self-contained. |

Both files are also committed in the repository, so a host that only wants to
copy them does not have to run Node at all. They are build output, though: a
change to the editor is only shipped once they are rebuilt and committed, and
the repository's CI fails a commit where they are stale.

## Mount it

```html
<link rel="stylesheet" href="/editor.css">

<div id="editor"></div>

<script type="module">
  import '/editor.js'

  const handle = window.CCEditor.mount(document.getElementById('editor'), {
    value: '# Title\n\nA paragraph.',
    placeholder: 'Type / for commands',
    onChange: (markdown) => draft = markdown,
    onSave: (markdown) => save(markdown),
  })
</script>
```

`mount` returns a handle. Keep it: it is the only way to read the document back
out, and the only way to tear the editor down again. See
[Mount API](/block-editor/api).

## Why it does not restyle your page

Tailwind's preflight is a global reset. A stylesheet that carries it would
change the host page's margins, heading sizes and form controls the moment it
loads, which is unacceptable for an editor you drop into an existing dashboard.

`scripts/build-editor.js` therefore compiles the stylesheet from
`scripts/editor-embed.css`, which imports Tailwind's theme and utility layers
and not its base layer, plus the editor's own hand-written base rules. Form
elements inside the editor are reset by a scoped rule rather than a global one.

The practical rule for a host: the editor will not touch your page, and your
page's own resets can still reach into the editor. If a menu button looks wrong,
that is the direction to check first.

## Checking a change

`public/demo.html` is a standalone page in the repository that loads the built
files exactly the way a host does. It is served at `/demo.html` by the dev
server, and it is the honest test of an embed — the Next.js app at `/` imports
the components directly and so cannot catch a bundling or stylesheet fault.
