# Troubleshooting

<AddonHeader />

## Nothing appears, not even the button

Work down this list; it is ordered by how often each one is the answer.

1. **Signed in as somebody who may edit that entry?** The core policy decides. Open the entry
   in the control panel; if it is read-only there, it is not editable here.
2. **Does the template actually mark a field?** `{{ title }}` is not `{{ editable:title }}`.
3. **`enabled`?** `STATAMIC_INLINE_EDIT_ENABLED=false` in `.env` switches everything off,
   including the button.
4. **Static caching answered first.** The most common cause on a live site, and the one with
   no error message. See [Static caching](/inline-edit/static-caching).
5. **`inject` is off** and `{{ inline_edit:assets }}` is not in the layout.
6. **The assets were never published**, or were published once and are now stale. Run
   `php artisan vendor:publish --tag=statamic-inline-edit-assets --force`.

## The outlines appear but the button does nothing

The script is loading and the stylesheet is not, or the other way round. Both live in
`public/vendor/statamic-inline-edit/`. Check the network tab for a 404 on either.

## A field has no outline, and the others do

Its fieldtype is on none of the three lists, and `control_panel` is off. That is the intended
outcome, not a fault. Switch `control_panel` on to reach it through the overlay, or add its
fieldtype to a list if it stores a plain string.

## The control panel overlay stays empty

The control panel refuses to be framed. Either it is on another domain, or a proxy or a
security header sends `X-Frame-Options: DENY` or a `frame-ancestors` policy that excludes the
site's own origin.

Switch `control_panel` off. Those fields then render normally and are not clickable, which is
honest, where an overlay that never loads is not.

## The overlay opens but does not scroll to the field

It polls for the field for eight seconds and then stops. The control panel is a Vue app, so
the iframe's `load` event fires long before the form exists, and a single look finds nothing.

If it times out, the field is usually inside something that renders later still, a Grid or a
Replicator set. The form is there; scroll to it.

## Saving says "reload the page"

A **409**. Somebody else saved that entry after this page was loaded, so the addon refuses
rather than overwriting their work. Reload and make the change again.

If it happens to one person working alone, something else is touching the entry: a scheduled
import, a sync, or a second tab.

## Saving says the collection uses revisions

A **422**, and it is deliberate. Somebody enabled a review workflow on that collection.
Editing on the page would write straight past it.

Use the control panel overlay for those entries, where revisions work as they should.

## The markdown came back reformatted

Expected, and it is the price of editing rendered text. `*a*` becomes `_a_`, a setext heading
becomes an ATX one. The rendered page is identical; the file is not.

Set `rich` to `false` if the source has to survive byte for byte. See
[The rich editor](/inline-edit/rich-editor#what-it-costs).

## A space does not type in the rich editor

Fixed in 1.2.0. The handler that lets Space open a focused field was swallowing every space
typed into Tiptap, because Tiptap mounts its editable element as a **child** of the marker, so
the marker itself is not `isContentEditable`. Typing `## ` produced `##` and the shortcut never
fired.

If it still happens, the published assets are older than the installed package. Republish with
`--force`.

## The page jumps when the editor opens

Fixed in 1.2.0, and it was two separate things: ProseMirror appending an empty paragraph to a
document ending in a list, and the box that makes an empty field clickable arriving with edit
mode instead of with the first paint.

Same check as above: republish the assets with `--force`.

## The bar sits on top of a cookie banner

Both are fixed to the bottom of the window, so they share that strip. The bar reserves space
at the end of the **document**, which moves page content but cannot move another fixed
overlay. No bottom bar solves this; close the banner, or move it.

## The toolbar covers a line of text on a phone

By design, where there is no other option. On a page with a margin the toolbar goes into it
and covers nothing; on a phone there is no margin, so it goes above the selection, which
covers the line above. Never the selection itself.

## Everything works locally and nothing works in production

In this order: static caching, then stale published assets, then `STATAMIC_INLINE_EDIT_ENABLED`
in the production `.env`. The three of them account for nearly all of it.
