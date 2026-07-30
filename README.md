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
