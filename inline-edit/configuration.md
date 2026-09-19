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
    'multiline' => ['textarea'],

    'rich' => true,
    'inject' => true,
    'control_panel' => true,

    'max_length' => 100000,
];
```

## enabled

The master switch. Off means `{{ editable:title }}` renders exactly what `{{ title }}` would
have rendered, the script is never injected, and the save route answers 404.

It exists so that a site still making up its mind switches the addon off rather than tearing
the tags back out of its templates. `STATAMIC_INLINE_EDIT_ENABLED=false` in production while
staging keeps it on is the normal shape.

## fieldtypes, controls, source

The three lists that decide what a marked field does when somebody double-clicks it. They are
covered one at a time in [What can be edited](/inline-edit/field-types); what matters here is
the rule that governs all three.

**Every fieldtype in `fieldtypes` must store a plain string.** The editor reads what the
browser calls `innerText` and posts that, which is the reason no markup a `contenteditable`
produces can ever reach your content. That guarantee holds only while the list stays plain
strings.

::: danger Adding `bard` here does not give you a rich editor
It gives you a field whose formatting the next save flattens to text. Rich editing for
markdown is `source` plus `rich`, and Bard is not supported in place at all. See
[What can be edited](/inline-edit/field-types#everything-else).
:::

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

## control_panel

Whether a field none of the three lists covers opens the entry's control panel form in an
overlay.

Switch it off if the control panel cannot be framed from the site's own origin: another
domain, or a proxy that sends `X-Frame-Options: DENY`. Those fields then render normally and
are not clickable, which is the correct outcome, not a degraded one.

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
