# Styling and translations

<AddonHeader />

No assets are published and nothing needs a build step. The shipped markup
carries three classes and the ids, and two small rules cover the essentials:

```css
sup.footnote-ref {
    font-size: 0.75em;
    line-height: 0;
}

.footnotes ol {
    font-size: 0.875rem;
}

.footnotes li {
    scroll-margin-top: 6rem; /* keep the jump target clear of a sticky header */
}
```

`line-height: 0` on the `sup` is the one that matters: without it a superscript
in the middle of a paragraph pushes the lines apart and the rhythm breaks.
`scroll-margin-top` keeps `#fn-n` from disappearing under a sticky header —
set it to whatever your header measures.

## The markup to style

| Selector / id | Where it is |
| --- | --- |
| `sup.footnote-ref` | around every linked marker in the text |
| `.footnotes` | the `section` around the whole list |
| `.footnotes ol` / `.footnotes li` | the ordered list and its rows |
| `#footnotes-title` | the `h2` with the list heading |
| `#fn-n` | the list entry of source `n` — the marker's jump target |
| `#fnref-n` | the first occurrence of marker `n` — the back link's target |
| `.footnote-back` | the `↩` back link, on cited sources only |

## Your own view

The single tag renders the view under the addon's namespace. Publish it to make
it yours:

```bash
php artisan vendor:publish --tag=bard-footnotes-views
```

That copies `list.antlers.html` to `resources/views/vendor/bard-footnotes/`,
and the tag renders your copy from then on. The shipped file is the contract:
an ordered list, `id="fn-n"` per row, `| entities` on text and url, the back
link only when a source is cited. Keep those four and the rest — classes,
wrappers, wording — is yours.

::: tip The pair needs no publishing
[The tag pair](/bard-footnotes/tag) never touches the shipped view; its markup
lives in your template already.
:::

## Translations

The strings that render — the list heading, the marker's `aria-label`, the back
link's `aria-label` — ship for English and German under
`bard-footnotes::messages`:

| Key | English | German |
| --- | --- | --- |
| `title` | Sources | Quellen |
| `footnote` | Footnote :number | Fußnote :number |
| `back` | Back to text :number | Zurück zur Textstelle :number |

Statamic resolves the site's locale against these automatically. Another
language, or different wording, needs no fork: a
`resources/lang/vendor/bard-footnotes/<locale>/messages.php` in your app
overrides the package strings — Laravel's standard mechanism for package
translations, and it survives `composer update`.
