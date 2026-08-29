# Configuration

<AddonHeader />

```bash
php artisan vendor:publish --tag=statamic-insights-config
```

Two keys, both optional. The defaults are the right answer for almost every site.

```php
// config/statamic-insights.php
return [
    'currency' => env('STATAMIC_INSIGHTS_CURRENCY'),
    'default_period' => env('STATAMIC_INSIGHTS_PERIOD', '30d'),
];
```

## `currency`

Which currency the screen opens on. `null` follows
`config('statamic-payments.currency')`.

It is only a starting point. If the configured currency has never actually been taken, the
screen opens on the **busiest one the data contains** instead — a site that only ever sold
in francs must not open on an empty EUR screen with no reason given.

The switch appears in the header as soon as a second currency has ever been taken, and the
currencies left out of the current figure are named on screen.

## `default_period`

One of `7d`, `30d`, `90d`, `12m`, `ytd`, `all`. Anything else falls back to `30d` rather
than producing an empty range.

The period and currency both live in the query string —
`/cp/insights?period=90d&currency=CHF` — so a view can be bookmarked or pasted into a
message, and survives a reload.

## Permissions

| Permission | What it opens |
| --- | --- |
| `view insights` | The revenue screen and its navigation entry |

One permission, no children. The screen is read-only: there is nothing on it to grant
separately.

::: tip The nav entry is registered unconditionally
A nav item resolves its target through `cp_route()` while the navigation is built, on
**every** Control Panel page. A route registered only under a condition, behind an
unconditional nav item, takes the whole panel down with a `RouteNotFoundException`. So the
route always exists, and the permission decides who may reach it.
:::
