# Live Preview

<AddonHeader />

The addon uses Statamic's **native** Live Preview — split-screen, live as you type — directly in the entry
publish form. There is no separate preview page.

## How it is wired

Two pieces, set up automatically on boot:

**A preview target.** The `et_templates` collection gets one, pointing at a custom render route
(`EmailTemplateCollectionManager::LIVE_PREVIEW_ROUTE`).

**A custom entry class.** Email templates are not public pages, so the collection has no front-end route
— and without one, Statamic would not show a Live Preview button at all. Entries are therefore
instantiated as `EmailTemplateEntry`, which overrides `livePreviewUrl()`.

That is the whole trick, and it is worth knowing if you build something similar: Live Preview is
available to a routeless collection as long as something answers `livePreviewUrl()`.

::: tip Added in 1.3.0
Up to 1.2.1 the entry class did not exist, and the collection was given a placeholder front-end
route (`_email-template-preview/{slug}`) to satisfy the same gate — a public URL that only ever
returned 404. On boot, 1.3.0 sets the entry class and removes exactly that pattern. A route you
set yourself is left alone.
:::

## The render route

```
GET /email-templates/live-preview
```

It resolves the **live-edited, unsaved** entry from the Live Preview token:

```php
LivePreview::item($request->statamicToken())
```

and renders it through the same classes a real send uses:

```
Bard nodes → BardHtmlRenderer → HTML
           → MergeVariables::apply()
           → EmailPreheader::prepend()      (the hidden preview-text snippet)
           → BrandedBodyRenderer::wrap()    (the entry's layout, if one resolves)
           → iframe contents
```

returning the merged subject and HTML body, wrapped in whatever layout the entry chose. When
no layout resolves — the marketplace default, with nothing configured — the preview falls
back to a lean generic document so the body is still readable.

::: tip This is why the preview is trustworthy
Substitution is centralised in `Support\MergeVariables::apply()`, so the send path and the preview replace
tags identically — **only the supplied data differs**. A rendering difference between preview and send is
a bug, not an expected discrepancy.
:::

## Token gating

The body only renders for a **valid, short-lived** Live Preview token. Otherwise a neutral placeholder is
shown.

So the route is not a way to render arbitrary templates, and a leaked URL is useless within minutes. If
you see the placeholder instead of your template, the token has expired — reopen Live Preview rather than
reloading the iframe.

## Sample data

```php
'preview' => [
    'sample_data' => [
        'contact' => [
            'first_name' => 'Maria',
            'last_name' => 'Beispiel',
            'full_name' => 'Maria Beispiel',
            'email' => 'maria.beispiel@example.com',
            'salutation' => 'Hallo Maria',
        ],
        'unsubscribe_url' => 'https://example.com/newsletter/abmelden',
    ],
],
```

`{{ sender.name }}`, `{{ sender.email }}` and `{{ date }}` come from your application, so they are already
real.

Override the array to match your own audience. And consider a deliberately awkward case as your permanent
default — a long name and a long email address are what break a fixed-width table, and the preview is
where you want to discover that. See
[Merge variables](/email-templates/merge-variables#testing-sample-data).

## Unknown tags stay visible

A tag with no data is left in place rather than replaced with nothing, so `{{ contact.frist_name }}` shows
up as itself. That is what makes the preview useful for catching typos.

## What Live Preview does not tell you

::: danger It is a browser, not a mail client
The iframe is Chrome or Safari. Your recipients are using Outlook, whose rendering engine is Word;
Gmail's web client, which strips `<style>` blocks in some contexts; and Apple Mail, which is the only one
that behaves like a browser.

A template that looks perfect in Live Preview can be broken in Outlook, and nothing in this addon can
tell you that.
:::

The workflow that actually works:

1. **Live Preview** while writing — structure, copy, merge variables, obvious mistakes.
2. **A real test send** through the consumer — for Marketing, its
   [test send](/marketing/campaigns#preview-and-test-send).
3. **Read it in a real mail client.** At minimum Outlook and one webmail client.

Step 3 is the one people skip, and it is where the problems are.

## Fidelity in the preview

The preview shows what `BardHtmlRenderer` produces, which means it also shows the fidelity loss: tiptap's
default schema keeps structural markup and **drops inline styles and unknown attributes**.

That is a feature of the preview. If an imported template looks plainer in Live Preview than the original
HTML did, that is not a preview artefact — that is what will be sent. See
[Authoring → Fidelity](/email-templates/authoring#fidelity).

## When the preview shows a placeholder

| Cause | Fix |
| --- | --- |
| Expired token | Reopen Live Preview |
| Reloading the iframe directly | Reopen from the publish form |
| No token at all, e.g. opening the URL by hand | Expected. The route only renders for a valid token. |

## When the preview shows nothing at all

The Live Preview **button** missing is a different problem from the preview being blank: it means
`EmailTemplateEntry` is not in play, so the collection is being treated as an ordinary routeless
collection. The entry class is set on the collection by the boot-time `ensure()` call, so check that
that call ran: `'enabled' => false` skips it entirely, and it also logs a warning when it fails —
a permissions problem or a corrupt YAML file in your content directory will be in your log rather
than on screen.
