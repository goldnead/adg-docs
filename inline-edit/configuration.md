# Configuration

<AddonHeader />

Optional. The addon runs on its defaults, and the only key most sites ever touch is `rich`.

```bash
php artisan vendor:publish --tag=statamic-inline-edit-config
```

```php
// config/statamic-inline-edit.php
return [
    'enabled' => env('STATAMIC_INLINE_EDIT_ENABLED', true),

    'fieldtypes' => ['text', 'textarea', 'integer'],
    'controls' => ['toggle', 'select', 'date'],
    'source' => ['markdown'],
    'inline' => ['bard'],
    'multiline' => ['textarea'],

    'rich' => true,
    'inject' => true,
    'control_panel' => true,

    'middleware_groups' => ['statamic.web'],
    'inject_for_signed_in' => false,

    'max_length' => 100000,
];
```

## enabled

The master switch. Off means `{{ editable:title }}` renders exactly what `{{ title }}` would
have rendered, the script is never injected, and the save route answers 404.

It exists so that a site still making up its mind switches the addon off rather than tearing
the tags back out of its templates. `STATAMIC_INLINE_EDIT_ENABLED=false` in production while
staging keeps it on is the normal shape.

## fieldtypes, controls, source, inline

The four lists that decide what a marked field does when somebody double-clicks it. They are
covered one at a time in [What can be edited](/inline-edit/field-types); what matters here is
the rule that governs the first of them.

**Every fieldtype in `fieldtypes` must store a plain string.** The editor reads what the
browser calls `innerText` and posts that, which is the reason no markup a `contenteditable`
produces can ever reach your content. That guarantee holds only while the list stays plain
strings.

::: danger Adding `bard` to `fieldtypes` does not give you a rich editor
It gives you a field whose formatting the next save flattens to text. Rich editing for
markdown is `source` plus `rich`. Bard belongs in `inline`, where it already is, and that
opens the real control panel field rather than this addon's own editor. See
[What can be edited](/inline-edit/field-types#inline).
:::

`inline` is the one list that is not a rule about storage. A fieldtype there opens exactly
what `control_panel` would open for it — the real field, the real validation, the real save —
only over the block it belongs to instead of on a card in the middle of the screen. It starts
as `['bard']`, because a Bard is the article and an article read at a card's width is not the
article anybody will read.

Two things follow from it being the same field. `control_panel` set to `false` turns `inline`
off with it, because both need the control panel to be framable from the site's own origin.
And an entry on a collection with revisions falls back to the card, because the one-field
route refuses those entries and the whole entry form cannot stand in the article's column.

A handle in `multiline` that is not also in `fieldtypes` does nothing. That list only decides
whether Enter inserts a line break or ends the edit.

## rich

Whether a markdown field opens as an editor in place or as its own source in a monospace box.

On is the default and is what most sites want. Off is the answer for markdown that has to
survive byte for byte. The full trade, and how to tell which side you are on, is
[The rich editor](/inline-edit/rich-editor).

## inject

Whether the stylesheet, the script and the configuration block are placed before `</body>`
automatically. On means the integration really is only the tags.

Switch it off for a strict Content Security Policy and place the assets yourself:

```antlers
{{ inline_edit:assets }}
```

The tag renders nothing at all unless the page has already rendered at least one marker for a
user allowed to edit it, so it is safe to leave in a layout every page uses.

## middleware_groups

Which route groups the editor rides on. `statamic.web` is the group Statamic serves its own
pages in, and on an Antlers site that is every page there is. Leave this alone.

A site that draws its own pages — React through Inertia, Blade, a controller of your own —
serves them from `web` instead, and none of that goes through `statamic.web`. Nothing would
inject the editor there, and nothing would mark those responses uncacheable either:

```php
'middleware_groups' => ['statamic.web', 'web'],
```

Naming both is safe. Statamic's own frontend controller adds `statamic.web` on top of `web`,
so its pages pass through twice, and the second pass sees the script is already there and
leaves it alone.

## inject_for_signed_in

Whether the editor goes on **every** page a signed-in editor opens, rather than only on pages
that rendered a marker.

Off is the right answer whenever a new page means a new request, which is every Antlers site.
It is the wrong answer for a site that draws itself: going from a list to an article inside a
React or Vue application never reaches the server, so nothing is injected into the JSON that
comes back and the markers arriving with it have no script to act on them. The page looks
editable and double-clicking does nothing, silently.

::: warning The price is stated rather than hidden
The script carries a CSRF token, so every page a signed-in editor opens is marked
uncacheable. On a site whose pages Statamic does not serve that costs nothing, because
Statamic is not caching them either. Leave this off anywhere else.
:::

Both keys, and what a client-side router has to do for itself, are on their own page:
[A front end that is not Antlers](/inline-edit/headless).

## control_panel

Whether a field none of the first three lists covers opens as a control panel form in a panel
over the page. On a collection with revisions enabled it is the whole entry form instead, in
a full-screen overlay; see [What can be edited](/inline-edit/field-types#everything-else).

Switch it off if the control panel cannot be framed from the site's own origin: another
domain, or a proxy that sends `X-Frame-Options: DENY`. Those fields then render normally and
are not clickable, which is the correct outcome, not a degraded one.

It governs `inline` too. The field opened over a block is the same control panel field in the
same iframe, so a control panel that cannot be framed cannot be put there either.

## max_length

A ceiling on any single field the save route accepts, independent of what the blueprint says.

It is not a content rule. It is a bound on how much one browser request may push into a flat
file, and it is checked before the blueprint validation runs.

## What it deliberately has no key for

- **Which collections may be edited.** That is a permission question, and Statamic already
  answers it. See [Permissions and safety](/inline-edit/permissions).
- **A per-field switch.** A field is editable because a template marked it. Two places to say
  the same thing is one place to forget.
- **The colours of the bar.** It is chrome on somebody else's page and resets every property
  it can, so that a host stylesheet cannot reach it and it cannot reach the host.
