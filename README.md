# adg-docs

Unified documentation for the goldnead Statamic addon suite.

**Live:** https://docs.adriangoldner.dev

One VitePress site covering all ten addons. Content is centralised here rather than
living in each addon repository, so the sections stay structurally identical and one
build ships the lot.

## Local development

```bash
npm install
npm run dev        # → http://localhost:5173
npm run build      # fails on a dead internal link
npm run preview
```

`npm run build` is strict: a broken internal link fails the build, so a bad
cross-reference cannot be merged. While drafting a section whose targets do not exist
yet, `DOCS_ALLOW_DEAD_LINKS=1 npm run build`.

## Structure

```
.vitepress/
  config.mts          site config, nav, sidebars, markdown plugins
  addons.mjs          THE ADDON REGISTRY — nav + sidebars are generated from it
  theme/              brand CSS + three components
guide/                cross-suite guide (18 pages)
<addon-slug>/         one directory per addon
public/               logo, favicon
scripts/
  sync-changelogs.mjs pulls each addon's CHANGELOG.md into its section
```

### The addon registry

`.vitepress/addons.mjs` is the single source of truth. Every addon's nav entry and
sidebar is generated from its entry there, which is what keeps the sections uniform:

```
<Addon>   → Overview, Installation, Configuration
Guides    → the addon's own subject matter
Reference → Reference, Troubleshooting, Changelog
```

Adding an addon means adding one entry and creating the pages it lists. The section
structure comes for free.

### Components

Available in any page, registered globally:

| Component | Purpose |
| --- | --- |
| `<AddonHeader />` | Package/platform/licence chips. Infers the addon from the path. |
| `<Requirements ... />` | The PHP/Statamic/Laravel/database/queue block |
| `<AddonGrid />` | The layered addon grid on the hub page |

### Antlers and `{{ }}`

`markdown.config` in `config.mts` marks every **inline** code span `v-pre`, because
Antlers and Blade both use `{{ … }}` and the Vue compiler would otherwise treat it as
an interpolation. So you can write `` `{{ entry:title }}` `` freely.

Fenced blocks are already `v-pre` in VitePress. Prose outside code needs escaping —
put it in a code span instead.

`antlers` is aliased to Shiki's `handlebars` grammar, `blade` to `php`.

## Screenshots

`public/screenshots/*.png` are captured with Playwright against a **local** hub
checkout, at 1560×980 and a 2× device scale factor.

```bash
cd ~/Documents/WebDev/hub
php artisan serve --port=8123

cd ~/Documents/WebDev/adg-docs
node scripts/shoot-screenshots.mjs              # all
node scripts/shoot-screenshots.mjs leadhub      # name filter
```

Embed one with the global component:

```md
<Figure
  src="leadhub-contacts"
  alt="…"
  caption="…" />
```

### Where the data comes from

The hub checkout carries QA data and, in the case of email templates, **real
customer content**. Everything in the screenshots therefore lives in its own
`demo` brand (`Acme Studio`), seeded by three scripts in the hub checkout:

| Script | Seeds |
| --- | --- |
| `seed-docs-demo.php` | the brand, the CP user, contacts, tags, timeline, notes, follow-ups, pipeline, opportunities, tasks, segments |
| `seed-docs-demo2.php` | lists, subscriptions, campaigns, messages, webhooks, activities, notifications |
| `seed-docs-deliveries.php` | 30 days of webhook deliveries with a realistic latency spread |
| `seed-docs-automations.php` | two automations whose node handles and config match the addon's own schemas |

Run them with `php artisan tinker --execute="require 'seed-docs-demo.php';"`. They
clear and re-seed the `demo` brand only, and never touch another brand.

After seeding segments, materialise their membership — the sweep command takes no
`--brand` and sees nothing without a brand context:

```php
BrandContext::runFor('demo', fn () => Artisan::call('leadhub:segments:sweep'));
```

### Two guards, and why they exist

**Login is asserted.** An earlier version silently captured 21 perfect pictures of
the login form, because `waitForURL(/\/cp/)` matched the login URL itself. The
script now fails loudly if a page bounces to login.

**Email templates are refused if foreign entries are present.** Those entries are
ordinary Statamic entries, so the `demo` brand does **not** isolate them — brand
scoping is an Eloquent mechanism. The guard refuses rather than capturing customer
content, leaving the existing correct image in place. To re-shoot them, move the
other entries out of `content/collections/et_templates/` first.

## Changelogs

```bash
node scripts/sync-changelogs.mjs
```

Reads `../statamic-<slug>/CHANGELOG.md` for each addon and writes
`<slug>/changelog.md`. Run it from a machine that has the addon repos checked out as
siblings, then **commit the result** — the docs server does not have them.

It escapes `{{` outside fenced blocks, because changelog entries mention Antlers tags
in inline code.

## Deployment

Push to `main` → GitHub webhook → wrapper on the Hetzner host → `git pull`,
`npm ci`, `npm run build`, publish `.vitepress/dist` to `/srv/adg-docs`, which Caddy
serves as a static site.

See `deploy/README.md`.

## Editing

Every page has a "Suggest a change" link pointing at this repo. Keep the tone of the
existing pages: symptom-first troubleshooting, defaults stated with their
consequences, and the failure modes named plainly rather than implied.
