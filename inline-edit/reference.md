# Reference

<AddonHeader />

## The tag

```antlers
{{ editable:<handle> }}
{{ editable field="<handle>" }}…{{ /editable }}
```

| Parameter | Default | |
| --- | --- | --- |
| `field` | — | The handle, for the pair form or when the handle is a variable. |
| `tag` | `span`, or `div` for a source field | The wrapper element. |

Anything after the colon is the handle. The tag has no named methods on purpose: a method
called `head()` would shadow a field called `head`.

## The assets tag

```antlers
{{ inline_edit:assets }}
```

Renders the stylesheet, the script and the configuration block. Only needed with `inject` off,
and it renders nothing unless the page has already rendered a marker for a user allowed to
edit it.

## Routes

Both `POST`, both in the `statamic.web` middleware group, so they carry the site's session and
CSRF token. Both answer 404 with `enabled` off.

| | |
| --- | --- |
| `/!/statamic-inline-edit/save` | Writes one or more fields of one entry. |
| `/!/statamic-inline-edit/preview` | Renders markdown through the real fieldtype. Writes nothing. |

## Response codes

| Code | Means |
| --- | --- |
| `200` | Saved. |
| `403` | This user may not update this entry. |
| `404` | No such entry, or the addon is disabled. |
| `409` | The entry changed since the page was loaded. Reload. |
| `422` | Validation failed, the fieldtype is not editable, the handle is refused, or the collection uses revisions. |

## Keyboard and touch

| | |
| --- | --- |
| `Ctrl/Cmd + Shift + E` | show and hide the bar |
| Double-click, or a single tap on a touch screen | start editing |
| `Enter` / `Space` on a focused field | start editing, without a mouse |
| `Escape` | discard this field |
| `Enter` | leave the field, on single-line fields |
| `Cmd/Ctrl + S` | save everything |

A single tap only opens a field while edit mode is on, which the person switched on one tap
earlier. Reading the page is never interrupted.

## Publish tags

| | |
| --- | --- |
| `statamic-inline-edit-assets` | The stylesheet and the scripts for the public page. Required, and with `--force` on every deploy. |
| `statamic-inline-edit` | The control panel bundle. Required, and with `--force` on every deploy. Missing, it takes **every** control panel page down, not just the panel. |
| `statamic-inline-edit-config` | `config/statamic-inline-edit.php`. |
| `statamic-inline-edit-translations` | `lang/vendor/statamic-inline-edit`. |

## Refused handles

`id`, `slug`, `published`, `blueprint`, `date`, `author`, `parent`. Not configurable.

## What ships in the browser

| | Gzipped |
| --- | --- |
| `inline-edit.js` | 12 KB |
| `inline-edit.css` | 8 KB |
| `inline-edit-rich.js` | 179 KB, fetched on first use of a markdown field |
| `build/assets/cp-*.js` | 3 KB, and only inside the control panel. Vue and the control panel's component library stay with the host. |

Nothing at all for a visitor, and nothing on a page that rendered no markers.

## Not in this version

Named, not hidden.

- **Bard and Replicator, inline.** The core builds the values inside a set without a link back
  to their entry, so a paragraph in a Bard is genuinely unaddressable from the page. Marking
  the whole field opens it as a control panel field instead.
- **Revisions.** Refused with a message rather than written straight past. Those entries open
  the whole control panel entry form, where revisions work as they should.
- **Globals, taxonomy terms and users.** Entries only. All three reach a template as augmented
  values too, but each needs its own way of being found again on save, and rendering a marker
  that cannot be saved is worse than rendering none.
- **Multisite** works, with one thing to know: editing a field on a localised entry writes into
  that localisation, so the field stops inheriting from its origin. That is what the control
  panel does once a field is localised there.

## Line breaks in a textarea

A `textarea` can hold line breaks a template does not render, because HTML collapses them into
spaces. An editor who cannot see them deletes them on the first save without ever knowing they
were there, so a field whose stored value really contains a break is rendered with `pre-wrap`.

Two consequences, both deliberate:

- **Only fields that actually contain a break.** A textarea holding one paragraph renders
  exactly as a visitor sees it.
- **From the first paint, not when edit mode goes on.** Nothing re-wraps under you when the
  toggle is pressed. The page an editor reads is the page they edit.

To show those breaks to visitors too, that is `| nl2br` in the template, not a setting here.

## The bar

It docks across the bottom of the window and reserves matching space at the end of the
document, so it covers none of the page. It cannot get out of the way of another **fixed**
overlay: a cookie dialog or a chat bubble pinned to the same corner shares that strip with it.
No bottom bar anywhere solves that.
