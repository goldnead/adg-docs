# Marking a field

<AddonHeader />

One tag, one field. Wrap the output you already have and nothing else changes.

```antlers
{{ hero_title }}          →    {{ editable:hero_title }}
```

Do it for the handful of fields clients actually ask you to change. A field nobody asked about
stays a plain `{{ field }}` and is not editable, which is a decision, not an oversight.

## The two forms

The short form names the field after the colon. It renders the field's value, wrapped:

```antlers
<h1>{{ editable:hero_title }}</h1>
<p>{{ editable:intro }}</p>
```

The pair form wraps whatever the template produced instead of producing it itself. It is
required whenever the value is not what the page shows:

```antlers
{{ editable field="promoted" }}{{ if promoted }}Running{{ else }}Paused{{ /if }}{{ /editable }}
{{ editable field="starts_on" }}{{ starts_on format="d.m.Y" }}{{ /editable }}
```

`field="…"` also takes a variable, for a template that does not know the handle until it runs:

```antlers
{{ editable field="{field_handle}" }}
```

## The wrapper element

A `<span>` by default, a `<div>` for a markdown field, because a `span` around block content
has no box and therefore no outline to draw. Override it where the surrounding markup needs
something else:

```antlers
{{ editable:intro tag="div" }}
{{ editable:price tag="strong" }}
```

::: tip A marked field must survive being wrapped
The tag adds one element around the value. If the CSS around it depends on a heading being the
direct child of a grid cell, say so with `tag=` rather than fighting the outline afterwards.
:::

## Why the tag, and not magic

This is the one question every reader asks, so here is the answer with the reasons, not just
the conclusion.

**Antlers cannot be asked afterwards.** By the time a rendered value reaches the output buffer
it is a plain string. The `Value` object that knew its handle, its fieldtype and its entry has
already been reduced away in `NodeProcessor`, and the runtime offers no hook in between. There
is nothing left to ask.

**Inside Bard or Replicator there was never a link.** The core builds those values without a
parent, in `Fieldtypes\Bard\Augmentor`. A text node in a Bard set does not know which entry it
came from, by construction, so no amount of cleverness downstream recovers it.

**The invisible-marker trick does not apply either.** Sanity's
[visual editing](https://www.sanity.io/docs/visual-editing/visual-editing-architecture) encodes
zero-width characters into every text value, so the browser can trace any text node back to a
document and a field path without touching a template. It needs the same hook Antlers does not
offer, so it fails at exactly the same place.

Every comparable tool in every CMS marks in the template, and for this reason.

## Do not chain modifiers onto it

```antlers
{{ editable:title | upper }}    {{-- wrong --}}
```

The modifier runs on the tag's whole output, wrapper element and all. The editor would then
treat the uppercased text as the field's value and save that back.

Put modifiers on a plain `{{ title }}` somewhere that is not editable, or format inside the
pair form, where the tag wraps the result instead of being fed through it:

```antlers
{{ editable field="title" }}{{ title | upper }}{{ /editable }}
```

That saves the real value and displays the shouted one, which is what was meant.

## What a visitor gets

The tag's value and nothing else. No wrapper element, no attribute, no class, no script.

The wrapper appears only when a signed-in user is allowed to edit that entry, so a template
full of these tags renders byte for byte the same page for everybody who is not.

## Next

- [What can be edited](/inline-edit/field-types) — what the double-click actually opens
- [Permissions and safety](/inline-edit/permissions) — who counts as allowed
