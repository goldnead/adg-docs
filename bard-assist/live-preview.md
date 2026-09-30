# Live preview

<AddonHeader />

Bard Assist can show its suggestions in Statamic's live preview, as dashed blocks drawn with
your own templates, before anything is accepted. Three pieces make that work, and each is a
few lines.

<Figure
  src="bard-assist-live-preview"
  alt="The live preview with suggestions drawn as dashed blocks in the site's design, each labelled Suggestion: and the set name, one of them orange for a question"
  caption="Each suggestion is drawn with the set's own partial and labelled. A question is drawn too, in orange, with the likelier of the two sets." />

Statamic's live preview renders only what would be saved, and until a suggestion is accepted
it is still paragraphs. So the addon asks your site to render the suggested set with its own
partial, and swaps the paragraphs in the preview document for that HTML. Suggestions are only
drawn in a preview on the same origin as the Control Panel.

A drawn suggestion is labelled `Suggestion: Heading`, or `Heading or Step?` in orange when it
is a question. The block the cursor is in gets a solid outline, and the preview scrolls to it.

### How a suggestion finds its place

The addon looks for the block's lines in the preview as consecutive `<p>` elements with the
same text, side by side under one parent, and replaces them with the rendered set, splitting
the parent around it so the set sits in the page's own grid. Bard's own text output, the
`{{ text }}` in the example below, produces exactly that. A template that wraps each
paragraph differently, or changes its text on the way out, gives the addon nothing to find,
and that block is left as it is.

## 1. One partial per set

Following Statamic's convention: `resources/views/partials/sets/{handle}.antlers.html`, or
with a leading underscore, `_step.antlers.html`. The set's values are available as variables,
plus `type`.

Render your Bard field with the same partials, so the preview and the published page draw a
set the same way:

```antlers
{{ content }}
  {{ if type == "text" }}
    <div class="text">{{ text }}</div>
  {{ else }}
    {{ partial src="sets/{type}" }}
  {{ /if }}
{{ /content }}
```

**Sets without a partial are simply not shown in the preview.** Nothing breaks; the
paragraphs stay as they are. Change the location with
[`preview.partial`](/bard-assist/configuration#preview-partial).

### Escaping

For the preview, the suggested values from line-like fields and the link are HTML-escaped
before your partial runs, so markup an editor typed shows as text and never runs in the
preview. Antlers partials usually print `{{ value }}` unescaped, which is exactly why.

Two visible consequences:

- A partial that escapes again itself (`| entities` or similar) may show `&amp;` in the
  preview where the accepted set will not.
- Markdown fields appear as plain text in the preview.

The values of an accepted set are **not** escaped: they become a real set in the entry and
are treated like any other stored text.

## 2. The tag at the end of your layout's body

```antlers
    …
    {{ bard_assist:live_preview }}
  </body>
</html>
```

It outputs a small script, and only inside a live preview request. On every other request
it outputs nothing, so it is safe in a layout every page uses.

The script swaps the preview's body in place instead of reloading the frame, and lets the
Control Panel paint its suggestions into the new document before it becomes visible. It only
reacts to messages from the Control Panel that embeds it, on the same origin, and only fetches
same-origin URLs.

## 3. A preview target without refresh

On the collection, so the preview is updated in place instead of reloaded, with no flicker:

```yaml
# content/collections/pages.yaml
preview_targets:
  -
    label: Entry
    url: '{permalink}'
    refresh: false
```

With `refresh: false` Statamic only posts a message to the preview when the content changes;
the tag's script fetches the new HTML itself and swaps it in. Only the latest response
counts, so fast typing does not paint an older state over a newer one.

## When the preview shows nothing

- **No dashed blocks at all**: the tag is missing from the layout, or sits outside the
  `<body>` that is rendered for the preview.
- **Some sets appear, others do not**: those sets have no partial under
  `partials/sets/{handle}`.
- **A block with a partial still does not appear**: its paragraphs are not rendered as plain
  `<p>` elements with the same text, so there is nothing to replace. See
  [How a suggestion finds its place](#how-a-suggestion-finds-its-place).
- **The preview reloads and flickers, and suggestions come and go**: the preview target
  does not have `refresh: false`.
- **The preview is opened in a separate window**, or the site is served from another domain
  than the Control Panel: suggestions are painted only into the preview frame inside the
  Control Panel, so the page is shown without them.

More in [Troubleshooting](/bard-assist/troubleshooting).
