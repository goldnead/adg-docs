# Email Templates

<AddonHeader />

CP-native, Bard-authored email templates in a shared Statamic collection.
[Automations](/automations/) and [Marketing](/marketing/) consume it **optionally** — there is no hard
dependency in either direction.

The point is that an editor can write the email. The body is a Bard field, Statamic's own Live Preview
works on it, and the slug is a stable reference any addon can resolve.

## What it does

- Registers a native `et_templates` collection and blueprint: **Title**, **Subject**, **Body** (Bard),
  optional **Plain text**, **Description**. The **slug** is the stable, cross-addon reference.
- Adds a CP nav entry under Content, pointing at the native collection listing.
- `email-templates:import` pulls file-based templates from sibling addons into entries, preserving the
  slug 1:1.
- `EmailTemplates::resolve($slug, $fallback)` — a managed entry wins; the caller-supplied file fallback
  keeps un-migrated slugs working.

That last point is what makes adoption safe: adding this addon does not break existing sends, and
removing it does not either.

## The render path

The body is authored as Bard (ProseMirror nodes). `BardHtmlRenderer` renders those nodes to email HTML
at send or preview time, via tiptap-php, with the Statamic Bard augmentor as a fallback. Imported legacy
HTML is converted to Bard nodes by `HtmlToBard`.

::: warning Fidelity: structure survives, styling may not
tiptap's default schema keeps structural markup — headings, lists, links, images, tables — and **drops
inline styles and unknown attributes**.

Simple transactional templates round-trip cleanly. Heavily styled marketing HTML may lose styling. If
you need pixel fidelity for a complex template, consider `save_html: true` on the Bard field or a
dedicated raw-HTML fallback field.

This is the one thing to test before migrating an existing template library.
:::

## Live Preview

The addon uses Statamic's **native** Live Preview — split-screen, live as you type — directly in the
entry publish form. No separate preview page.

The preview renders through the **exact same path as a real send**: Bard to HTML, then merge-variable
substitution. So what you see is what goes out, with sample data instead of real. See
[Live Preview](/email-templates/live-preview).

## Merge variables

Templates use `{{ dotted.key }}` placeholders in subject and body. Unknown tags are left **visible** in
the preview, so typos are obvious rather than silently empty.

Substitution is centralised in `Support\MergeVariables::apply()`, which means the send path and the
preview replace tags identically — only the supplied data differs. See
[Merge variables](/email-templates/merge-variables).

## What it is not

- **Not a template engine.** The body is Bard, not Antlers. Marketing campaign *bodies* are Antlers;
  this addon supplies the wrapper and the transactional templates.
- **Not required.** Both consumers work without it, using their own file-based bodies.
- **Not a sender.** It resolves a subject and an HTML body; sending belongs to the consumer.
- **Not brand-scoped.** It persists nothing of its own; the collection is an ordinary Statamic
  collection.

## Next

- [Installation](/email-templates/installation)
- [Configuration](/email-templates/configuration)
- [Authoring a template](/email-templates/authoring)
- [Merge variables](/email-templates/merge-variables)
- [Live Preview](/email-templates/live-preview)
- [Importing & consuming](/email-templates/importing)
