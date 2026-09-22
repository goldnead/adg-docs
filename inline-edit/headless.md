# A front end that is not Antlers

<AddonHeader />

A Statamic site is not always Antlers. The content stays, the control panel stays, and the
pages are drawn by React through Inertia, by Blade, or by a front end of its own. There is no
template to put a tag in, so ask for the marker directly.

## The marker, as an array

```php
use Goldnead\StatamicInlineEdit\InlineEdit;

return Inertia::render('Site/ArticleDetail', [
    'article' => $article,
    'edit' => [
        'title' => InlineEdit::marker($entry, 'title'),
        'content' => InlineEdit::marker($entry, 'content'),
    ],
]);
```

```jsx
<h1 {...edit.title}>{article.title}</h1>
<div {...edit.content} dangerouslySetInnerHTML={{ __html: article.content }} />
```

In Blade, the same thing as a string of attributes, already escaped:

```blade
<div {!! InlineEdit::attributes($entry, 'content') !!}>…</div>
```

It is the same decision the tag makes, from the same place: the same permissions, the same
refusals, the same fieldtype handling. **An empty array is the normal answer**, because it is
what every visitor gets, and an element that spreads an empty array is byte for byte the
element it was. Nothing has to be wrapped in a condition.

::: tip The modes are not different here
A `text` field opens in the text, a `markdown` field becomes the rich editor, a `bard` opens
over its block. The marker carries which one it is; what drew the element around it makes no
difference. See [What can be edited](/inline-edit/field-types).
:::

## Two things such a site has to do

An Antlers site needs neither of these, which is why they are off by default.

### Name its own route group

```php
// config/statamic-inline-edit.php
'middleware_groups' => ['statamic.web', 'web'],
```

`statamic.web` is the group Statamic serves its own pages in, and on an Antlers site that is
every page there is. Pages your own controllers serve run in `web` and never reach
`statamic.web`, so without this nothing injects the editor there — and nothing marks those
responses uncacheable either.

Naming both is safe. Statamic's own frontend controller adds `statamic.web` on top of `web`,
so its pages pass through twice, and the second pass sees the script is already there and
leaves it alone.

### Put the editor on every page

```php
'inject_for_signed_in' => true,
```

**Because a new page is not a new request.** Going from a list to an article inside a React
or Vue application never reaches the server: the response is JSON, nothing is injected into
it, and the markers that arrive with it were born after the script would have run. The page
looks editable and double-clicking does nothing, silently — which is the worst way for this
to fail, because there is nothing to see and nothing to look up.

With this on, the script is already there when those markers appear, and it takes them in. It
shows nothing on a page that has none.

::: warning What the second switch costs
The script carries a CSRF token, so every page a signed-in editor opens is marked
uncacheable. On a site whose pages Statamic does not serve that costs nothing, because
Statamic is not caching them either. Anywhere else, leave it off. See
[Static caching](/inline-edit/static-caching).
:::

## Client-side navigation

Nothing is read once. Every marker goes through a rescan that runs at boot and again whenever
the document changes, batched to the end of the task, because a framework rendering a page
touches the document a few hundred times. Markers that leave with their page are let go, so
the bar stops counting unsaved changes in a document nobody can see.

So a client-side navigation needs nothing from you. Two things your router can ask anyway:

```js
window.StatamicInlineEdit.rescan()   // I just changed the page
window.StatamicInlineEdit.dirty()    // how many fields have unsaved text in them
```

`rescan()` is for the case the observer cannot see, and it is safe to call as often as you
like.

**`dirty()` is the one that matters.** On such a site, leaving a page is a navigation and not
an unload, so the browser's own "you have unsaved changes" never fires and three rewritten
paragraphs go with it without a word. Ask it in your router's before-hook:

```js
router.on('before', (event) => {
    if (window.StatamicInlineEdit?.dirty() && ! confirm('Unsaved changes. Leave anyway?')) {
        event.preventDefault();
    }
});
```

The optional chaining is not decoration: on a page without the editor — a visitor's, or a
signed-in user who may not edit anything — `window.StatamicInlineEdit` is not there at all.

## Placing the assets yourself

`InlineEdit::active()` answers whether this request has a marker on it at all, which is the
answer to "should my layout bother". False for every visitor.

`InlineEdit::assets()` gives the stylesheet, the configuration and the script as markup, for
a layout that places them itself. Empty when there is nothing to edit. Only needed with
`inject` off — for a Content Security Policy that wants the script somewhere specific.

## Next

- [Static caching](/inline-edit/static-caching) — what `inject_for_signed_in` means for the cache
- [Reference](/inline-edit/reference) — the facade, the routes and the response codes
