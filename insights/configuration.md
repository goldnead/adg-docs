# Configuration

<AddonHeader />

```bash
php artisan vendor:publish --tag=statamic-insights-config
```

Two keys, both optional. The defaults are the right answer for almost every site. The website statistics have a block of their own, [further down](#website-statistics).

```php
// config/statamic-insights.php
return [
    'currency' => env('STATAMIC_INSIGHTS_CURRENCY'),
    'default_period' => env('STATAMIC_INSIGHTS_PERIOD', '30d'),
];
```

## `currency`

Which currency the revenue screen opens on, and the default for every metric that takes a
currency filter. `null` follows `config('statamic-payments.currency')`.

It is only a starting point. If the configured currency has never actually been taken, the
screen opens on the **busiest one the data contains** instead — a site that only ever sold
in francs must not open on an empty EUR screen with no reason given.

The switch appears in the header as soon as a second currency has ever been taken, and the
currencies left out of the current figure are named on screen.

## `default_period`

One of `7d`, `30d`, `90d`, `12m`, `ytd`, `all`. Anything else falls back to `30d` rather
than producing an empty range.

The period and currency both live in the query string —
`/cp/insights/revenue?period=90d&currency=CHF` — so a view can be bookmarked or pasted
into a message, and survives a reload. The Subscriptions screen, the Metrics screen and a
single metric's detail view read the same parameters.

A bookmark of the old address, `/cp/insights?period=90d&currency=CHF`, still works:
`/cp/insights` redirects to the revenue screen and keeps the query string.

Both keys govern presentation only. A contributing addon decides for itself what a figure
counts and on which day; nothing here can change that.

## Website statistics

The `website` block is the one part of the configuration that is not about presentation. It
says where the traffic figures come from: six figures and five tables, listed under
[Website](/insights/what-the-family-reports#website). The source is a self-hosted
[Rybbit](https://rybbit.io) instance.

```dotenv
STATAMIC_INSIGHTS_WEBSITE_URL=https://analytics.example
STATAMIC_INSIGHTS_WEBSITE_KEY=rb_…
STATAMIC_INSIGHTS_WEBSITE_SITE=7
```

All three are required. The block has four more, all optional:

| Variable | Default | |
| --- | --- | --- |
| `STATAMIC_INSIGHTS_WEBSITE_URL` | none | The address of the analytics service |
| `STATAMIC_INSIGHTS_WEBSITE_KEY` | none | The API key. A credential |
| `STATAMIC_INSIGHTS_WEBSITE_SITE` | none | Which of the sites on that service this installation is |
| `STATAMIC_INSIGHTS_WEBSITE_TIMEZONE` | `app.timezone` | Decides which calendar day an evening visit falls on |
| `STATAMIC_INSIGHTS_WEBSITE_CACHE` | `300` | Seconds an answer is kept, so a screen of six figures and five tables does not become dozens of requests |
| `STATAMIC_INSIGHTS_WEBSITE_TIMEOUT` | `8` | Seconds before a request gives up |
| `STATAMIC_INSIGHTS_WEBSITE_VERIFY` | `true` | Set `false` only for an instance behind a certificate that is trusted between a CDN and its origin and nowhere else |

### Why nothing appears until it is set

If any of the three required values is missing or blank, the group is **not registered at
all**: no Website heading on the Metrics screen, no tiles, no tables on the Reports list, and no
line saying "not installed". A heading over nothing would promise a source this installation does
not have, and "run `composer require`" is not true of a web service.

It is environment only, never a field on the settings screen. The key is a credential, which
does not belong on a screen. The other two could have gone there, but whether the group exists is
decided while the addon boots, before stored settings are applied, so a site id typed into the
Control Panel would change nothing until the next boot: a switch that looks like it works.
Change the `.env`, then clear the config cache if you have one.

### The internal address, not the tracking domain

Two addresses lead to the same service and they are for different readers. The **tracking
domain** is what a visitor's browser calls to send a pageview, so it has to be public. The
`STATAMIC_INSIGHTS_WEBSITE_URL` is what the **server** calls to read the figures back, and
there the address inside your own network is the one we recommend when the site and the service
share one, rather than going out through the public domain. If the public domain sits behind a
CDN whose origin certificate is trusted only between the CDN and the origin, verification fails;
that is what `STATAMIC_INSIGHTS_WEBSITE_VERIFY` exists for. The URL is
the base address of the service, without `/api`.

### What the connection will and will not tell you

The addon checks that an answer is an answer. A `200` that carries a login page from an access
proxy raises an error rather than becoming six zeroes: "nobody asked successfully" and "nobody
visited" look the same on a screen, and only one is a measurement. The metric then fails on its
own, and as everywhere in this addon that costs its tile and a line in `laravel.log`, never the
page.

## Permissions

| Permission | What it opens |
| --- | --- |
| `view insights` | Revenue, Subscriptions, Metrics and Reports, and their navigation entries |

One permission, no children. The screens are read-only: there is nothing on them to grant
separately.

::: tip The nav entry is registered unconditionally
A nav item resolves its target through `cp_route()` while the navigation is built, on
**every** Control Panel page. A route registered only under a condition, behind an
unconditional nav item, takes the whole panel down with a `RouteNotFoundException`. So the
route always exists, and the permission decides who may reach it.
:::
