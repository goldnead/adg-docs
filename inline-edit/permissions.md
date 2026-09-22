# Permissions and safety

<AddonHeader />

The addon adds no permission of its own, and that is the point.

## Statamic's own entry policy decides

If somebody cannot edit a page in the control panel, no marker is rendered for them here and
the save route refuses them. There is no separate permission to forget to grant, and no way
for this addon to be more permissive than the control panel it sits next to.

For a stock site that means `edit {collection} entries`, the same permission that opens the
entry in the control panel.

::: tip There is nothing to configure per collection
Whoever may already edit an entry may edit it here. Whoever may not, cannot. A second list of
who-may-what is a second list to get wrong.
:::

## Every request is checked again

The markers in the HTML say what the server offered. A request says what a browser sent, and
those are the same thing only until somebody opens the console. So a save is re-checked from
nothing:

1. The entry exists.
2. This user may update **this** entry, through the core policy.
3. The handle is a real field on that entry's blueprint.
4. Its fieldtype is on one of the configured lists.
5. The value is within `max_length`.
6. For a select, the value is one of the blueprint's own options.
7. The entry has not changed since the page was loaded.
8. The blueprint's own validation for that one field passes.

Only the fields that were actually sent are validated, not the whole blueprint. A one-field
save through the control panel's own entry endpoint would fail on a `required` field somewhere
else on the form, which is why this addon has routes of its own — this one for the fields
edited on the page, and a control panel route for the one-field panel, which checks the same
way behind the control panel's own session.

## What never travels

**`innerHTML` never goes back to the server.** In a text field it is the browser's `innerText`;
in a source field the markdown itself; in a control field a scalar from a real form element.

No markup a `contenteditable` produced can therefore reach your content: not the `<div>` a
browser inserts on Enter, not a `<span style>` from a paste, not a stray `<br>`.

::: danger This guarantee is exactly as strong as the fieldtype list
It holds because every fieldtype in `fieldtypes` stores a plain string. Adding one that does
not breaks it. See [Configuration](/inline-edit/configuration#fieldtypes-controls-source-inline).
:::

## What is refused, with a message

Not silently, and not by doing something almost right instead:

| | Why |
| --- | --- |
| The slug | It changes the URL. Every link to the page breaks, including the one the editor is standing on. |
| `id`, `published`, `blueprint`, `date`, `author`, `parent` | Structural. None of them is the sentence somebody wanted fixed. |
| A marker on any of those seven | Not rendered at all. See below. |
| A collection with revisions enabled | Somebody chose a review workflow. This addon does not get to skip it. |
| A fieldtype on no list | Not editable in place. With `control_panel` on it opens the one-field panel instead. |
| A handle the page never offered | The request is not trusted because the page said so. |
| A save from a page older than the entry | See below. |

A refusal answers with a status and a sentence, and the bar shows it. Nothing is half-written.

### The refused handles get no marker in the first place

The save route turned those seven away from the start, but the tag still drew a `cp` marker
on them: the field was outlined, the double-click opened a panel, and the panel answered 404.
A refusal only works as a refusal where somebody could plausibly have got it right. A marker
that cannot lead anywhere is a broken promise, so `{{ editable:slug }}` and its six siblings
now render the plain value, exactly as the tag does with editing switched off.

This is the one place where a marker is withheld for something other than a permission. The
rule sits with the marker as well as with the route, on purpose: two places, because the
request is not trusted because the page said so.

## Two people at once

Every marker carries the entry's modification time as the page saw it. A save arriving with a
stale one is refused with a **409** and a message that says to reload.

Nobody's work disappears quietly, which is the only outcome that matters here. The addon does
not merge, does not pick a winner and does not show a diff; it stops and says so.

## Revisions

A collection with revisions enabled is refused with a **422** and a message.

The alternative would be to write straight past a review workflow somebody deliberately turned
on. Creating a revision instead of publishing is a reasonable future version; quietly
bypassing the workflow is not a version of anything.

The one-field panel refuses them too, for the same reason and in two places: the tag does not
offer the route for such an entry, and the route itself answers **403** if somebody asks
anyway. Those entries open the whole control panel entry form instead, which knows how to make
a working copy.

## The routes

Two, both `POST`, both inside Statamic's `statamic.web` middleware group, so they carry the
site's own session and CSRF token:

| Route | |
| --- | --- |
| `/!/statamic-inline-edit/save` | Writes. Everything above applies. |
| `/!/statamic-inline-edit/preview` | Renders markdown through the real fieldtype and writes nothing. Same permission check. |

With `enabled` off, both answer 404.

## Next

- [A front end that is not Antlers](/inline-edit/headless) — the same markers, without a template tag
- [Static caching](/inline-edit/static-caching) — the half that is not solved
- [Reference](/inline-edit/reference) — the tag, the facade, the routes and the response codes
