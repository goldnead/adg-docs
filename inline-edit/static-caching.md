# Static caching

<AddonHeader />

Read this if static caching is switched on. There are two halves, and only one of them is
solved.

## Writing is safe

A page that rendered at least one marker is marked `X-Statamic-Uncacheable`, so an editor's
version of a page is never stored and never served to a visitor.

That matters more than it sounds. An editor's page carries their CSRF token, their markers and
their configuration block. Handing that to the next visitor would leak a token and show
outlines to somebody who cannot edit anything.

::: tip Why this is middleware and not an event listener
`pushMiddlewareToGroup` appends, so this addon's middleware runs innermost and its outbound
work happens **before** the caching middleware looks at the response. That is the only order in
which the header is read rather than set too late.
:::

## Reading is not

With **full-measure** caching the cache answers before this addon is ever reached. An editor
can therefore be handed a stored visitor page: no markers, no button, nothing to click, and no
explanation.

This is written down rather than papered over, because a marker that appears unreliably is
worse than one that is reliably absent.

## What to do about it

Either of these, whichever fits the site:

**Wrap the editable regions in `{{ nocache }}`.** Core's own tag, and the narrower answer. The
page stays cached; the parts a client edits are rendered per request.

```antlers
{{ nocache }}
    <h1>{{ editable:title }}</h1>
    <p>{{ editable:intro }}</p>
{{ /nocache }}
```

**Or exclude the URLs clients edit** from the static cache, in
`config/statamic/static_caching.php`. Blunter, and the right answer when the editable fields
are spread through a page rather than gathered in one region.

## Half measure

With **half-measure** caching the request reaches Laravel, so the addon runs and the markers
appear. Nothing to do.

## Checking it

Two `curl` calls say more than any setting does. Signed out, and then signed in with the
session cookie:

```bash
curl -sI https://example.test/a-page | grep -i x-statamic-uncacheable
```

A visitor's response must **not** carry the header. An editor's response must carry
`x-statamic-uncacheable: true`. If the editor's does not, the cache answered first and the
page needs one of the two treatments above.

## Next

- [Troubleshooting](/inline-edit/troubleshooting) — the outlines are missing, and other symptoms
