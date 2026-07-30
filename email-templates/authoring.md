# Authoring a template

<AddonHeader />

Templates are entries in the `et_templates` collection. **Content → Email Templates**.

## The fields

| Field | Notes |
| --- | --- |
| **Title** | For humans, in the CP listing |
| **Slug** | The **stable, cross-addon reference**. Consumers resolve by this. |
| **Subject** | Merge variables allowed |
| **Body** | Bard |
| **Plain text** | Optional. A text alternative. |
| **Description** | Optional. What this template is for, for the next editor. |

### The slug is an API

A consumer resolves `EmailTemplates::resolve('double-opt-in', $fallback)`. Renaming the slug breaks that
call silently — the resolve falls back to the caller's file body, which still works and is no longer the
template you edited.

So pick the slug once, name it for the **purpose** rather than the wording, and treat it as fixed:
`double-opt-in`, not `bitte-bestaetigen-neu`.

## Writing the body

Bard, so headings, lists, links, images and tables are the buttons you already know.

Put in the body only what changes between templates. Everything every email needs — the outer table, the
header, the footer, the unsubscribe link, the styles — belongs in a
[layout](/email-templates/configuration#layouts-and-default-layout):

```php
'layouts' => [
    'transactional' => 'emails.layouts.transactional',
],
'default_layout' => 'transactional',
```

That separation is what stops an editor deleting the footer, and it means a change to the wrapper reaches
every template at once.

## Fidelity

The body is ProseMirror nodes. `BardHtmlRenderer` renders them to email HTML at send or preview time,
via tiptap-php, with the Statamic Bard augmentor as a fallback.

| Survives | Dropped |
| --- | --- |
| headings, paragraphs | inline `style` attributes |
| lists | unknown attributes |
| links | anything outside tiptap's default schema |
| images | |
| tables | |

::: warning Test this before migrating a template library
Simple transactional templates round-trip cleanly. **Heavily styled marketing HTML may lose styling.**

If you need pixel fidelity for a complex template, two options:

- `save_html: true` on the Bard field, which stores the rendered HTML
- a dedicated raw-HTML fallback field

Both trade editability for fidelity, which is the honest trade. Decide per template rather than globally.
:::

## Merge variables

`{{ dotted.key }}` in the subject and the body. Unknown tags are left **visible** in the preview, so a
typo shows up as `{{ contact.frist_name }}` rather than as an empty gap.

See [Merge variables](/email-templates/merge-variables) for the documented set.

## Writing email HTML that survives

Not this addon's rules, but the ones that decide whether your template looks right:

**Tables for layout.** Outlook's rendering engine is Word. Flexbox and grid do not exist.

**Inline what matters, and remember it may be dropped.** Because tiptap drops inline styles from the Bard
body, put your styling in the **layout** — a `<style>` block for clients that support it, and inline
attributes on the layout's own table cells.

**Images need absolute URLs.** A relative `src` resolves against the mail client, which is nowhere.

**No web fonts.** Specify a stack and accept the fallback.

**Alt text on every image.** Many clients block images by default, so alt text is the first thing a
substantial share of your audience reads.

## Plain text

Optional, and worth filling in. Some clients prefer it, some filters weight its absence, and a
screen-reader user may get a better experience from it than from your table layout.

If you leave it empty, the send path uses the HTML alone.

## Previewing

Statamic's native **Live Preview**, split-screen in the publish form, rendering through the same path as
a real send. See [Live Preview](/email-templates/live-preview).

::: danger Live Preview is not a mail-client test
It shows what the render path produces. It says nothing about how Outlook, Gmail's web client or Apple
Mail will treat it.

Before a template goes into production, use the consumer's own test send — [Marketing's
test send](/marketing/campaigns#preview-and-test-send) — and read the result in a real mail client.
:::

## A practical structure

Three templates cover most sites, and keeping them separate keeps each one short:

| Slug | Purpose |
| --- | --- |
| `double-opt-in` | The confirmation mail. Subject and one paragraph plus the link. |
| `newsletter-wrapper` | The layout Marketing campaigns are rendered into |
| `transactional` | Receipts, notifications, password resets |

Everything else is usually a variant that wants to be the same template with different content, not a
fourth file.
