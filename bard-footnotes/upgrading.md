# Upgrading from 1.x

<AddonHeader />

2.0 is a different product, not a drop-in: footnotes move out of a grid and typed
`[1]` markers into the Bard text itself. There is no automatic migration, because
the sources' wording never existed in a machine-readable link to the markers.

## Requirements

2.0 needs Statamic 6 and PHP 8.2. On Statamic 5, stay on the `1.x` branch: it keeps
the grid and marker workflow and remains maintained for it.

## What disappears

- The `sources` grid fieldset (`bard-footnotes::sources`) and the blueprint import
  of it
- The `{{ | footnotes }}` modifier and `Footnotes::render()`, `renderSets()` and
  `renderValue()`

## Manual migration

1. Add `footnote` to the Bard field's `buttons` in your blueprint
   ([Installation](/bard-footnotes/installation#the-button)).
2. Remove the `sources` import from the blueprint.
3. For each entry, re-create every footnote at its `[n]` marker with the toolbar
   button, using row *n* of the old grid as the source, then delete the marker.
   The live superscript number replaces it.
4. Adjust the template (below), then drop the old `sources` field data.

## Templates

Before:

```antlers
{{ article | footnotes(sources) }}
{{ footnotes :sources="sources" :content="article" }}
```

After:

```antlers
{{ article }}
{{ footnotes field="article" }}
```

The tag now takes the field's handle via `field`. Its raw value is read from the
template context, and a `:content` binding would arrive as already-rendered HTML.
In the pair loop, `cited` is gone: every listed source is cited by definition.

## The empty-field warning

A Bard document containing footnote nodes needs this addon registered, for
rendering **and** for the Control Panel. With the addon uninstalled or disabled, a
Bard field holding footnotes loads **empty** in the CP, and the next save destroys
the value. The same applies to going back to 1.x: the 1.x code does not know the
`footnote` node either. Migrate the content away before removing the addon on any
site.
