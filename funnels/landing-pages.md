# Landing pages from entries

<AddonHeader />

A step can name a **Statamic entry**, and then that entry *is* the page: its own template,
its own layout, its own page builder, whatever sets and fields the site has defined.

There is no landing page builder in this addon and there should not be one. Statamic has
Bard, Replicator and the blueprint the site already uses; a second, worse builder inside
an addon is the wrong thing to maintain.

## It is delivered, not rendered

The funnel hands the entry to Statamic's own `DataResponse` rather than building a view by
hand. That is load-bearing rather than tidy: hand-building looked equivalent and was not.
It skipped `protect()`, `handlePrivateEntries()` and the entry's `redirect` field, so a
password-protected or date-gated page went out in the clear the moment a funnel step
pointed at it.

So on an entry-backed step, all of this keeps working exactly as it does anywhere else on
the site:

- password protection and any other protection scheme
- `private` entries
- the entry's own `redirect` field
- the entry's own template and layout

**Except drafts.** An unpublished entry is treated as *no entry* rather than as an error,
and the step falls back to its own `headline` and `body`. `handleDraft()` would 404, and a
page pulled back into draft must not take a running funnel down with it mid-purchase.

On a multi-site install the entry is resolved **in the site being served**. Without that a
multi-site install would show one language's page under every site's URL.

## The context lives under one key

The funnel adds its own data to the page under a single key, `funnel`:

```antlers
{{# In any template a step points at. #}}
{{ if funnel:action }}
    <form method="POST" action="{{ funnel:action }}">
        {{ csrf_field }}
        <button type="submit">Weiter</button>
    </form>
{{ /if }}
```

::: danger One key, not a dozen loose ones
This is not tidiness. Statamic merges view data **over** an entry's own fields, so a
funnel that handed over a flat `body` would blank the `body` of the very page it was
rendering — invisible unless the page happens to use that field name, which most page
blueprints do. Namespacing makes the collision impossible rather than unlikely.
:::

| Available | What it is |
| --- | --- |
| `funnel:handle`, `funnel:title` | The funnel |
| `funnel:step:key`, `:type`, `:label`, `:slug` | The step being shown |
| `funnel:action` | Where a form posts to move on |
| `funnel:form` | The Statamic form handle on a Form step |
| `funnel:headline`, `funnel:body` | The step's own fields |
| `funnel:offer` | The offer on an offer step, price included |
| `funnel:countdown` | The deadline, or null when there is none |
| `funnel:visit:name`, `:email` | What the visitor has told you so far |
| `funnel:variant` | `a` or `b`, so a template can style or measure the two apart |
| `funnel:preview` | `true` when the Control Panel is looking |
| `funnel:styles`, `funnel:scripts` | The shipped assets, or null when `styles` is off |

### `funnel:offer`

| Key | |
| --- | --- |
| `handle`, `buy_handle` | The offer, and the handle it is bought under |
| `name`, `headline`, `body` | The words. `headline` falls back to `name`. |
| `amount`, `compare_at` | With a dot, for anything that parses |
| `amount_local`, `compare_at_local` | For a person to read |
| `currency` | |
| `button_label` | The offer's own order-button wording, if it has one |
| `bumps` | A list, each with the same shape as the offer itself |
| `coupons` | Whether to show a field for a code at all |

**Two shapes for the price on purpose.** `1249.50` on a German site is not a badly styled
number, it is a different one: in German the dot groups thousands. Print `amount_local`,
parse `amount`.

An offer that does not exist, or is not sellable, resolves to null and the template shows
nothing rather than a broken order form.

### `funnel:countdown`

| Key | |
| --- | --- |
| `ends_at` | ISO 8601. What a script should trust. |
| `seconds` | The honest number at render time. |
| `expired` | Whether this visitor is already too late. |

Null when the step has no deadline, so a template that has to test for it behaves the same
either way. See [Deadlines and split tests](/funnels/deadlines-and-tests).

## Templates, when there is no entry

A step with no entry renders its own `template` if the site has one, and the shipped
template if not.

```
resources/views/funnels/angebot.antlers.html   →  template: funnels/angebot
```

`template_prefix` confines where those may live. A namespaced name (`vendor::view`) is
refused either way, as is anything with `..` in it — a step's `template` is typed in the
Control Panel, and without those rules it was a way to render any view in the application
with data of one's choosing.

The **shipped fallback matters more than it looks**: a funnel that renders nothing until
somebody has written four templates never gets tried out. Publish it to take it over:

```bash
php artisan vendor:publish --tag=statamic-funnels-views
```

The shipped template also reads the context's keys flat (`headline`, `offer`, `action`),
because it is this addon's own view and there is nothing there to collide with. **A site
writing its own template should read `funnel:`** — that is the documented shape, and the
only one that is safe on an entry.

## Linking into a funnel from an ordinary page

Two tags, for templates outside a funnel:

```antlers
{{ funnels:link handle="fruehlingskurs" }}
```

The funnel's entry URL, or an empty string if the funnel is unknown or not live. A
"continue where you left off" link into something half-built is how a visitor meets a
broken page.

```antlers
{{ funnels:progress handle="fruehlingskurs" }}
    {{ if no_results }}{{ else }}
        <a href="{{ url }}">Weiter bei „{{ step }}"</a>
    {{ /if }}
{{ /funnels:progress }}
```

The "you were partway through this" link, which is worth more than most of what a funnel
does at the front. It yields `funnel`, `title`, `step` and `url`, and falls through to
`no_results` when there is no walk, the walk is finished, or the funnel is not live.

::: tip It only looks
`progress` never starts a walk. Starting one from an ordinary page would set a cookie and
write a database row for every visitor and every crawler, for a funnel they never entered
— which is exactly what an early release did.
:::
