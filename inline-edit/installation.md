# Installation

<AddonHeader />

<Requirements />

```bash
composer require goldnead/statamic-inline-edit
```

That is all on a standard Statamic site. Its `composer.json` runs `php artisan statamic:install`
after every `composer install` and `composer update`, and since 1.11.1 that publishes all of this
addon's files with `--force`: the stylesheet and the script for the public page, and the control
panel bundle.

If your site does not run `statamic:install` from Composer, run the publish yourself, on every
deploy, next to `vendor:publish` for everything else:

```bash
php artisan vendor:publish --tag=statamic-inline-edit --force
```

**`--force` is not optional.** The files are served from `public/vendor/statamic-inline-edit/`,
so a stale copy there is an editor talking to a newer save route. That fails in a way nobody can
reproduce from the repository.

::: warning A missing publish breaks the control panel, not just this addon
The same tag publishes the control panel bundle, which Statamic loads through its Vite
manifest. A missing manifest is a hard error on **every** control panel page, not a missing
feature on one. Before 1.11.1 the front-end files needed a second tag,
`statamic-inline-edit-assets`; it still works, and a deploy script that names both is fine.
:::

There is no migration, no queue and no scheduled task, and the addon adds no screen to the
control panel navigation. It adds one tag, one middleware, two POST routes, and one control
panel route that only its own panel ever opens.

## What comes with it

Nothing. No addon of the suite is required, and this one contributes nothing to another. It
talks to the Statamic core and to the browser.

## Quick start

Mark one field in a template:

```antlers
<h1>{{ editable:title }}</h1>
```

Load that page signed in as a user who may edit the entry. A button appears in the bottom
corner; press it, or `Ctrl/Cmd + Shift + E`, and the headline picks up a dashed outline.
Double-click it, type, press `Cmd/Ctrl + S`.

Then work outwards: the intro, the teaser, the numbers. A field a template does not mark is
simply not editable, so there is no half-finished state to clean up.

<Figure
  src="inline-edit-editing-on"
  alt="A public page in edit mode: dashed outlines around the marked fields, an untouched paragraph below them, and a dark bar at the bottom"
  caption="Only marked fields get an outline. The paragraph below belongs to no field and stays out of it." />

## The four publish tags

| Tag | When |
| --- | --- |
| `statamic-inline-edit` | Published by `statamic:install` on its own; otherwise on every deploy with `--force`. Everything the browser loads: the stylesheet and the scripts for the public page, and the control panel bundle behind the one-field panel. |
| `statamic-inline-edit-assets` | Not needed since 1.11.1. The stylesheet and the scripts for the public page on their own, kept for deploy scripts that already name it. |
| `statamic-inline-edit-config` | Only to change a default. See [Configuration](/inline-edit/configuration). |
| `statamic-inline-edit-translations` | Only to reword the bar, the labels or the messages. |

## Permissions

None of its own. A field is editable for exactly the people Statamic's own entry policy
already lets edit that entry, which for a stock site means `edit {collection} entries`. See
[Permissions and safety](/inline-edit/permissions).

## Content Security Policy

The addon injects its stylesheet, its script and one `<script type="application/json">` block
before `</body>`. If a policy forbids that, switch `inject` off and place
`{{ inline_edit:assets }}` in the layout yourself, inside whatever your policy does allow.

The rich editor is fetched from the same origin, from
`public/vendor/statamic-inline-edit/inline-edit-rich.js`. Nothing is loaded from a CDN.

## No scheduler, no queue

Neither is used. A save is one request, answered synchronously, and the page knows the result
before it stops spinning.

## Licence

Commercial: `composer.json` says `proprietary`. See [Licensing](/guide/licensing).
