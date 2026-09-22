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

## It works on the first page and on no page after it

A site whose pages are drawn client-side. Going from a list to an article never reaches the
server, so nothing injects the editor into the JSON that comes back, and the markers arriving
with it have no script to act on them. The page looks editable, the double-click does
nothing, and there is no error anywhere.

Two keys, both in [A front end that is not Antlers](/inline-edit/headless):
`middleware_groups` has to name the group your own controllers serve from, and
`inject_for_signed_in` has to be on so the script is already there when those markers appear.

## The outlines appear but the button does nothing

The script is loading and the stylesheet is not, or the other way round. Both live in
`public/vendor/statamic-inline-edit/`. Check the network tab for a 404 on either.

## A field has no outline, and the others do

Its fieldtype is on none of the four lists, and `control_panel` is off. That is the intended
outcome, not a fault. Switch `control_panel` on to reach it through the one-field panel, or
add its fieldtype to a list if it stores a plain string.

The other possibility is the handle rather than the fieldtype: `id`, `slug`, `published`,
`blueprint`, `date`, `author` and `parent` get no marker, because the save route would refuse
them anyway. Not configurable; see [Permissions and safety](/inline-edit/permissions).

## Every control panel page is a 500, including the login page

The control panel bundle was not published. Statamic loads it through its Vite manifest, and
a missing manifest throws in the layout every control panel page is rendered in — so it takes
the whole control panel down, not just this addon's panel. The log says
`Vite manifest not found at: …/public/vendor/statamic-inline-edit/build/manifest.json`.

```bash
php artisan vendor:publish --tag=statamic-inline-edit --force
```

That is the tag named after the addon slug, and it is a different one from
`statamic-inline-edit-assets`. Both belong in the deploy script; see
[Installation](/inline-edit/installation#the-four-publish-tags).

## The panel stays empty

The control panel refuses to be framed. Either it is on another domain, or a proxy or a
security header sends `X-Frame-Options: DENY` or a `frame-ancestors` policy that excludes the
site's own origin.

Switch `control_panel` off. Those fields then render normally and are not clickable, which is
honest, where a panel that never loads is not.

A second cause, with the same symptom: the person is signed in to the site but has no
`access cp` permission. The control panel answers with a redirect to its login page, which
refuses to be framed in turn.

## The panel opens the whole entry form instead of one field

The collection has revisions enabled. That is deliberate and not configurable: writing one
field past a working copy would publish it straight to the live site. See
[What can be edited](/inline-edit/field-types#collections-with-revisions-get-the-whole-form).

## The panel is the right size but the content is not

The panel takes its height from the form, which reports it after mounting and again whenever
it grows. If it stays at its fallback height, the form never mounted — look for a JavaScript
error from the control panel bundle in the frame's console, not in the page's.

## Saving says "reload the page"

A **409**. Somebody else saved that entry after this page was loaded, so the addon refuses
rather than overwriting their work. Reload and make the change again.

If it happens to one person working alone, something else is touching the entry: a scheduled
import, a sync, or a second tab.

## Saving says the collection uses revisions

A **422**, and it is deliberate. Somebody enabled a review workflow on that collection.
Editing on the page would write straight past it.

Double-clicking a Bard or an asset on such an entry opens the whole control panel entry form
instead, where revisions work as they should.

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
