# Configuration

<AddonHeader />

```bash
php artisan vendor:publish --tag=assessments-config
```

Six keys in `config/assessments.php`. There is no settings screen: none of these is a
thing an editor changes, and the first one changes every URL.

| Key | Default | What happens when it is wrong |
| --- | --- | --- |
| `routes.prefix` | `'a'` | Every assessment URL changes with it, including ones already sent out. |
| `routes.throttle` | `'20,1'` | Submits per minute per address. Too low turns a class submitting together into 429s. |
| `layout` | `'layout'` | The site layout the shipped templates are wrapped in. Missing, the addon's own shell is used. |
| `styles` | `true` | Off for a site with its own design. The markup keeps its class names. |
| `integrations.leadhub` | `true` | Off, no contact and no event, even with LeadHub installed. |
| `integrations.automations` | `true` | Off, no trigger, even with Automations installed. |

## `routes.prefix`

```php
'routes' => ['prefix' => 'a', 'throttle' => '20,1'],
```

An assessment with the handle `stimm-check` is then at `/a/stimm-check`, its result pages at
`/a/stimm-check/r/{token}`.

::: danger Changing it breaks every link already sent out
The prefix is part of every assessment URL and of every result link. Pick it before the
first assessment goes live and leave it alone.
:::

## `layout`

The shipped templates are rendered through Statamic's own view and wrapped in this layout,
so they pick up the site's header, footer and stylesheet. When no view of that name exists
the addon falls back to `assessments::layout`, a plain shell with a system font — enough to
see the form work on a fresh install.

## `styles`

The shipped templates include a small inline stylesheet. It is driven by six custom
properties on `.assessment` (`--as-accent`, `--as-border`, `--as-muted`, `--as-radius`,
`--as-gap`, `--as-font-size`), so a site can restyle the form without replacing the
template. `false` drops the stylesheet and keeps the markup.

## Integrations

Both bridges probe for the sibling's facade with `class_exists` and do nothing when it is
absent. The switches exist for the case where the sibling is installed for something else
and this addon should stay out of it — a site that runs LeadHub for its shop, say, and does
not want quiz takers in the same CRM.
