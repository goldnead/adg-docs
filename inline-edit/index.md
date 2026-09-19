# Inline Edit

<AddonHeader />

Edit content on the live page. Double-click the text a visitor sees, change it, save.

<Figure
  src="inline-edit-editor"
  alt="A paragraph on a public page with a cursor in it and a small formatting toolbar standing in the left margin"
  caption="The text on the page is the editor. The toolbar goes in the margin, where it covers nothing." />

## The hole this fills

A client asks for one wrong word in a headline. Today that means finding the login, finding
the collection, finding the entry, finding the field among thirty others, and hoping nothing
else got touched on the way. For a sentence.

So the change does not get made. It gets sent in an email, lands in somebody's afternoon, and
arrives a week late.

Statamic already has addons that go at this, and each one stops somewhere short. The
[Visual Editor](https://statamic.com/addons/mariohamann/statamic-visual-editor) puts the page
inside the control panel's preview pane, so the editing still happens in the form on the left.
[Workshop](https://github.com/statamic/workshop) renders an entry form in the front end, which
is the control panel with different chrome.
[Admin Bar](https://statamic.com/addons/el-schneider/admin-bar) and the toolbars like it link
into the control panel. [Editor API](https://statamic.com/addons/ppcharlier/editor-api) is a
write API with no interface of its own. Nobody puts the cursor in the text the visitor is reading.

## Not a page builder

That is the sentence to read twice, because every other decision follows from it.

You cannot move a block, add a section or change a layout with this. It edits the value of a
field that is already on the page, in the place it already occupies. Webflow's *content editor*
is the right comparison, not Webflow.

The consequence is a small, dull surface that can be trusted on a live public site: no drag
handles, no layout state, no second rendering path, and nothing at all for a visitor.

## A visitor gets the page they got before

Byte for byte. No wrapper element, no data attribute, no script tag, no inline style. The tag
that marks a field renders its value and nothing else unless somebody with permission to edit
that entry is signed in.

That is not a setting. There is no code path that emits the editor for an unauthenticated
request, which is also why the addon is safe to leave installed on a site that never uses it.

## What you get

- **One tag per field**, `{{ editable:title }}` instead of `{{ title }}`
- **A button in the corner** for a signed-in editor, or `Ctrl/Cmd + Shift + E`. Nothing until
  it is pressed
- **Four kinds of field**, so the whole page is reachable: text in place, a real control for a
  toggle or a date, a rich editor for markdown, and the control panel in an overlay for
  everything else
- **Tiptap for markdown**, the same engine as Statamic's own Bard, with the markdown shortcuts
  a client already met there
- **Statamic's own permissions**, not a second set. The core entry policy decides, and every
  request checks again
- **A refusal instead of a surprise** for the slug, for collections with revisions, and for a
  save from a page older than the entry
- **Static caching handled**, because an editor's page must never be cached and handed to a
  visitor

## The shortest useful path

1. Install it:

```bash
composer require goldnead/statamic-inline-edit
php artisan vendor:publish --tag=statamic-inline-edit-assets --force
```

2. Mark one field in a template. This is the whole integration:

```antlers
<h1>{{ editable:title }}</h1>
```

3. Load the page signed in, press the button in the corner, double-click the headline.

Nothing else changes. No blueprint, no config file, no new route to register, and the template
still renders the same string for everybody else.

## What it deliberately does not do

- **Find the fields by itself.** Antlers has flattened a value to a string before it reaches
  the output buffer, and inside Bard a text node does not know its entry. Every comparable tool
  in every CMS marks in the template. See [Marking a field](/inline-edit/marking).
- **Edit Bard or Replicator in place.** Not a shortcut left for later: the core builds those
  values without a parent, so the text cannot be traced back. They open in the control panel
  overlay instead, which is the honest answer rather than a worse editor.
- **Touch the slug.** Changing it changes the URL, and a URL is not a word in a sentence.
- **Work around a revision workflow.** A collection with revisions enabled is refused with a
  message. Somebody chose that workflow; this addon does not get to skip it.
- **Ship a licence check.** Like the rest of the suite. See [Licensing](/guide/licensing).

## Next

- [Installation](/inline-edit/installation)
- [Configuration](/inline-edit/configuration) — nine keys, and the one that matters is `rich`
- [Marking a field](/inline-edit/marking) — the tag, both forms, and why there is no magic
- [What can be edited](/inline-edit/field-types) — the four modes, field type by field type
- [The rich editor](/inline-edit/rich-editor) — Tiptap, the markdown trade, and how to turn it off
- [Permissions and safety](/inline-edit/permissions) — who may write what, and what is refused
- [Static caching](/inline-edit/static-caching) — the one thing to get wrong quietly
- [Reference](/inline-edit/reference) · [Troubleshooting](/inline-edit/troubleshooting)
