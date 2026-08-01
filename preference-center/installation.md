# Installation

<AddonHeader />

<Requirements php="8.2+" statamic="6.0+" laravel="12.40+ / 13.x" database="None of its own" />

```bash
composer require goldnead/statamic-preference-center
```

That is the whole installation. There is **no migration to run**: this package is a view
over other packages' storage and owns no table.

## What comes with it

Two hard requirements, both pulled automatically:

| Package | Constraint | Why |
| --- | --- | --- |
| `goldnead/statamic-brand-context` | `^1.4\|^1.5` | Every door has to establish a brand before it reads anything |
| `goldnead/statamic-identity-contracts` | `^1.0` | The one stable answer to "who is this?" |

`statamic/cms ^6.0` is in `require` as well. It is not optional and never was: Brand Context
hard requires it, so there has never been an installation of this package without Statamic
in it. The constraint states out loud what the dependency graph already enforced.

## The three sources are suggestions

```
goldnead/statamic-marketing        the mailing-list block
goldnead/statamic-notifications    the notification matrix and the cadence block
goldnead/statamic-suppression      the block state
goldnead/statamic-leadhub          contact lookup, and the audit trail on the timeline
```

None of the four is required. Each block is detected with `class_exists()` against a marker
class in the package that provides it, so presence is decided by the class map rather than
by reading a manifest — a host running a fork, a path repository or a `replace` still has
the classes and still gets the block.

Install none of them and the page renders, correctly, saying there is nothing to set for
this address. That empty state is a real state, not a failure mode, and it is the honest
answer for a host that has only just started.

::: warning Install Suppression before you trust the page
Without it nothing is ever reported as blocked. The page will happily offer a list back to
an address that has been bouncing for a month, because it has nothing to ask.
:::

## Publishing

Three tags, all optional:

```bash
php artisan vendor:publish --tag=preference-center-config
php artisan vendor:publish --tag=preference-center-views
php artisan vendor:publish --tag=preference-center-translations
```

The views are two templates and a layout with the CSS inlined in it. Every row and cell
carries a `data-*` attribute so that a fork can be restyled without the selectors moving.

## Verifying it works

```bash
php artisan route:list --name=preference-center
```

Seven routes, of which two are the token door:

```
GET|POST   !/preference-center               preference-center.show / .update
GET|POST   !/preference-center/t/{pcToken}   preference-center.token / .token.update
GET|POST   !/preference-center/request       preference-center.request / .request.send
GET        !/preference-center/link/{pcLink} preference-center.link
```

If `preference-center.token` is missing, that is not a bug. The token door is registered
only where Marketing is installed and `preference-center.sources.marketing` is not `false`.
See [Sources](/preference-center/sources).

Then open `/!/preference-center/request` in a browser and ask for a link with an address
your installation knows.

::: tip The route table is cached, and the token door is conditional
`php artisan route:cache` freezes the answer to "is Marketing installed?" into the cache
file. Rebuild the cache after any deploy that adds or removes
`goldnead/statamic-marketing`, or the page will disagree with reality silently.
:::

## Pointing other packages at it

Marketing finds this page on its own through the
[discovery interface](/preference-center/extending). Notifications needs to be told:

```dotenv
NOTIFICATIONS_PREFERENCES_URL="https://example.com/!/preference-center"
```

## Coming from Marketing's own preference page

If this host served `/!/marketing/preferences/{token}` before, the upgrade is a cutover with
one consequence you have to decide about before deploying. Read
[Migrating from Marketing](/preference-center/migrating-from-marketing).
