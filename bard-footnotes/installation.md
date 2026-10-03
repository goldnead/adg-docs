# Installation

<AddonHeader />

<Requirements php="8.2+" statamic="6.x" laravel="Any version your Statamic supports" database="Not required" />

```bash
composer require goldnead/statamic-bard-footnotes
php artisan vendor:publish --tag=statamic-bard-footnotes
```

The publish step copies the compiled Control Panel bundle into
`public/vendor/statamic-bard-footnotes`. No Node toolchain is needed: `dist/`
ships with the package.

The addon declares no Laravel constraint of its own: whatever version your
Statamic 6 runs on is fine. There is no migration and no config file. On
Statamic 5, stay on the `1.x` branch; [Upgrading from 1.x](/bard-footnotes/upgrading)
explains what changed.

## The button

The button appears in a Bard field when its blueprint config lists it, like every
core button:

```yaml
fields:
  -
    handle: content
    field:
      type: bard
      buttons:
        - h2
        - bold
        - footnote
```

Footnotes stay readable and editable in fields whose config does not list the
button. Only the toolbar button is opt-in; the node itself always renders.

Leave `save_html` at its default, `false`: the footnotes are numbered from the
saved JSON, and a field that saves HTML cannot carry them
([Limits](/bard-footnotes/sets#limits)).

## A minimal template

On an entry with a Bard field `content`:

```antlers
{{ content }}

{{ footnotes field="content" }}
```

The first line renders the article, and every footnote in it becomes a
superscript link by itself. The second prints the source list with the jump
targets and back links. Two small CSS rules make it read: [Styling and
translations](/bard-footnotes/styling) has them.

From there:

- [Writing with the button](/bard-footnotes/writing) — what the editor does in the Control Panel
- [The footnotes tag](/bard-footnotes/tag) — single tag or pair loop
- [Bard with sets](/bard-footnotes/sets) — numbering across sets, and the limits
- [From PHP](/bard-footnotes/php) — Blade and Inertia, without Antlers
