# Configuration

<AddonHeader />

```bash
php artisan vendor:publish --tag=smartlinks-config
```

Thirty-eight keys in `config/smartlinks.php`, eight of them with an environment variable. None
is on the shared settings screen: Smart Links registers no section there.

| Key | Default | What happens when it is wrong |
| --- | --- | --- |
| `collections` | `['songs']` | Entries of other collections get no page, no redirect and no row on the screen. |
| `release_collections` | `[]` | Releases get no page, or are resolved as songs by ISRC instead of as albums by UPC. |
| `field` | `'streaming_links'` | No links are found, and every song's page shows "No links for this song yet." |
| `url_key` | `'url'` | The same, for a Grid whose URL column has another handle. |
| `spotify_field` | `'spotify_id'` | Auto-fill starts from the stored links alone. |
| `isrc_field` | `null` | The ISRC is worked out on every run and never stored. |
| `upc_field` | `null` | The same, for the UPC. |
| `country` | `SMARTLINKS_COUNTRY`, else `'DE'` | Links point to another storefront, and Deezer tracks unavailable in your country are linked or left out wrongly. |
| `cleanup.on_save` | `true` | Off, links are saved as typed, tracking parameters included. |
| `cleanup.keep` | `[]` | Your own affiliate token is removed with the others. |
| `cleanup.strip` | `[]` | Extra parameters to remove. |
| `check.hide_dead` | `true` | Off, confirmed dead links stay on the landing page and in the tags. |
| `check.timeout` | `10` | Seconds per request of the link check. |
| `check.per_host_ms` | `1000` | The pause between two check requests to the same host. |
| `check.user_agent` | `'Mozilla/5.0 (compatible; statamic-smartlinks link check)'` | The user agent the check sends. |
| `platform_key` | `'platform'` | Where auto-fill writes the platform next to a URL it adds. `null` writes the URL only. |
| `platform_value` | `'handle'` | `handle` writes `spotify`, `label` writes `Spotify`. |
| `platforms` | `[]` | Extra hosts, added to the built-in table. |
| `priority` | ten platforms, see below | The order of the buttons. |
| `routes.enabled` | `true` (`SMARTLINKS_ROUTES_ENABLED`) | Off, the landing page and the redirect do not exist, and the tags return no page or click URLs. |
| `routes.prefix` | `'hoeren'` | Changes both URLs. QR codes already printed carry the old one. |
| `routes.view` | `'smartlinks::landing'` | The view the landing page renders. |
| `clicks.enabled` | `true` | Off, the redirect still works and counts nothing. |
| `clicks.per_minute` | `10` | Counted clicks per IP, song and platform and minute. `0` means no cap. |
| `clicks.prune_days` | `400` | The default for `smartlinks:prune`. |
| `clicks.bots` | fourteen fragments | User agents containing one of them are not counted. |
| `resolvers` | Spotify, Deezer, Apple Music, Tidal, YouTube | The auto-fill chain, in this order. |
| `services.spotify.client_id` | `SPOTIFY_CLIENT_ID` | Without it, Spotify's API is not asked. |
| `services.spotify.client_secret` | `SPOTIFY_CLIENT_SECRET` | The same. |
| `services.spotify.market` | `SPOTIFY_MARKET`, else `country` | The market the track is looked up in. |
| `services.tidal.client_id` | `TIDAL_CLIENT_ID` | Without it, Tidal reports `not_configured`. |
| `services.tidal.client_secret` | `TIDAL_CLIENT_SECRET` | The same. |
| `services.itunes.interval_ms` | `3100` | The pause between two Apple lookups. Too low, and Apple refuses calls: `rate_limited`. |
| `services.itunes.duration_tolerance` | `10` | Seconds an Apple track may differ in length before it is a `mismatch`. |
| `services.youtube.key` | `YOUTUBE_API_KEY` | Without it, YouTube reports `not_configured`. |
| `services.timeout` | `10` | Seconds per request to any of the services. |
| `cp.enabled` | `true` | Off, the Smart Links screen and its nav entry are gone. |
| `cp.days` | `30` | The period the screen counts clicks over, today included. |

One more key is read but not in the file: `services.deezer.retry_ms`, `1500`, the pause
before the Deezer client repeats a request that hit Deezer's quota.

## Collections and fields {#collections}

```php
'collections' => ['songs'],
'release_collections' => [],
'field' => 'streaming_links',
'url_key' => 'url',
'spotify_field' => 'spotify_id',
'isrc_field' => null,
'upc_field' => null,
'country' => env('SMARTLINKS_COUNTRY', 'DE'),
```

`collections` are the collections whose entries get a smart link page. Songs and releases stay
ordinary collections of the site; the addon only reads them.

`release_collections` are collections of releases: albums, EPs, singles. Their entries get a
page too, appear on the Smart Links screen, and are resolved as albums by UPC instead of as
tracks by ISRC. See [Releases](/smartlinks/auto-fill#releases).

`field` holds the streaming links. Two shapes work:

- **A Grid or a Replicator** with one URL per row, the URL under `url_key`. Any other column in
  the row, a hand-typed "platform" say, is ignored.
- **A List** of plain URLs.

Only `http` and `https` URLs count. Any other value in the field is skipped, and so is a URL
with userinfo; see [Platform detection](/smartlinks/platforms#what-is-not-a-link).

Links are read with inheritance, so a localisation without links of its own shows its origin's.

`spotify_field` holds a Spotify track ID or URL, for a release an album ID or URL. It is one of
the starting points of auto-fill. `isrc_field` and `upc_field` are optional: when the
blueprint has them, auto-fill reads the ISRC and UPC from there, and stores the ones it works
out in them while they are empty. See
[Step one: the identity](/smartlinks/auto-fill#identity).

`country` is the storefront: iTunes `country`, Spotify `market`, Tidal `countryCode`, and the
country in which Deezer must list a track as available. See
[The region](/smartlinks/auto-fill#region).

## `cleanup` {#cleanup}

```php
'cleanup' => [
    'on_save' => true,
    'keep' => [],
    'strip' => [],
],
```

`on_save` cleans the links of every entry of the configured collections before it is saved.
`keep` lists parameters never to remove, your own affiliate token say. `strip` adds parameters
to remove; a name ending in `*` matches by prefix. What is removed by default is on
[Cleanup and dead links](/smartlinks/link-health#cleanup).

## `check` {#check}

```php
'check' => [
    'hide_dead' => true,
    'timeout' => 10,
    'per_host_ms' => 1000,
    'user_agent' => 'Mozilla/5.0 '
        .'(compatible; statamic-smartlinks link check)',
],
```

Used by `smartlinks:check`. `hide_dead` leaves confirmed dead links off the landing page, out
of the tags and out of the redirect. `timeout` is per request, `per_host_ms` the pause between
two requests to the same host. See [Dead links](/smartlinks/link-health#dead-links).

## `platform_key` and `platform_value` {#platform-key}

```php
'platform_key' => 'platform',
'platform_value' => 'handle',
```

When `smartlinks:resolve` appends a link to a Grid, it writes the URL under `url_key` and the
platform under `platform_key`, for templates that render a row's `platform`. The addon itself
never reads it back: the platform is always derived from the URL again. `platform_value` is
`handle` (`spotify`) or `label` (`Spotify`). With `null` as the key, only the URL is written.
A List field gets the bare URL either way.

## `platforms` and `priority` {#priority}

```php
'platforms' => [],

'priority' => [
    'spotify', 'applemusic', 'youtubemusic', 'amazonmusic', 'deezer',
    'tidal', 'youtube', 'soundcloud', 'bandcamp', 'amazon',
],
```

`platforms` adds hosts to the built-in table, `['handle' => ['host.tld', …]]`. The table and
the matching rules are on [Platform detection](/smartlinks/platforms).

`priority` is the order of the buttons on the landing page and in `{{ smartlinks:links }}`.
Platforms not listed follow alphabetically by handle, "other" last. The stored row order does
not matter. Handles may be written with underscores: `apple_music` is `applemusic`.

## `routes` {#routes}

```dotenv
SMARTLINKS_ROUTES_ENABLED=false
```

```php
'routes' => [
    'enabled' => (bool) env('SMARTLINKS_ROUTES_ENABLED', true),
    'prefix' => 'hoeren',
    'view' => 'smartlinks::landing',
    'segments' => [],
],
```

`enabled` removes every front-end route, the landing pages and the redirects. The switch is
checked where the routes are registered, so a disabled route does not exist, and again in the
controller, so a route cache built while it was on cannot keep them open. The tags then return
`null` for `click_url` and for the page URL.

`prefix` is read when routes are registered, so a change needs a route cache clear. `view` is
any Blade or Antlers view; see
[The landing page](/smartlinks/landing#your-own-page).

`segments` maps a collection to the URL segment after the prefix. A collection that is not
listed gets `release` when it is in `release_collections`, and no segment otherwise:

```php
'segments' => [
    'releases' => 'album',  // /hoeren/album/{slug}
    'songs' => '',          // at the prefix, the default
],
```

An empty segment mounts the collection at the prefix. A slug is looked up only in the
collections of its segment, in config order, so two collections at the same segment always
resolve the same way. Like `prefix`, `segments` is read when routes are registered. A song
whose slug equals a segment is shadowed by that segment's routes; see
[One segment per collection](/smartlinks/landing#segments).

There is deliberately no throttle on any of these routes. See
[The landing page](/smartlinks/landing#no-throttle).

## Clicks {#clicks}

```php
'clicks' => [
    'enabled' => true,
    'per_minute' => 10,
    'prune_days' => 400,
    'bots' => [
        'bot', 'crawl', 'spider', 'slurp', 'preview',
        'facebookexternalhit', 'whatsapp', 'telegram', 'curl', 'wget',
        'python-requests', 'headless', 'lighthouse', 'monitor',
    ],
],
```

`smartlinks_clicks` holds **one counter per song, platform and day**. A click adds one to
today's row with an upsert on a unique index, so parallel clicks never make a second row. The
day is the application's date.

**Nothing about the listener is stored.** No IP, no cookie, no user agent, no referrer.

A request to the redirect is sent on in every case below, but it is **not counted** when:

- `clicks.enabled` is off;
- it is a `HEAD` request, which link previews send;
- it is a browser prefetch or prerender: a `Sec-Purpose`, `Purpose`, `X-Moz` or `X-Purpose`
  header containing `prefetch`;
- its user agent is empty, or contains one of `clicks.bots`, compared case-insensitively;
- it is over the cap.

**The cap.** At most `per_minute` counted clicks per IP, song and platform within a minute.
Beyond that the listener is still redirected, the click is just not counted. The cap lives in
Laravel's rate limiter, under a cache key that is a SHA-256 hash of the IP, the song and the
platform, and it expires after a minute. The IP never reaches `smartlinks_clicks`. With the
`database` cache driver that hashed key sits in the cache table for its minute. `0` switches
the cap off.

A click that cannot be written, a database hiccup say, still redirects. It is logged as a
warning, `smartlinks: click not recorded`, with the reason `click_not_recorded`.

### Pruning {#pruning}

```bash
php artisan smartlinks:prune            # keeps clicks.prune_days, 400
php artisan smartlinks:prune --days=90  # keeps 90 days, today included
```

Deletes the day counters older than that. 400 is a year plus a margin, so this year's release
can be compared with last year's. `--days` below 1 is refused.

The command is **not scheduled**. Register it yourself:

```php
// routes/console.php
Schedule::command('smartlinks:prune')->weekly();
```

Weekly is enough for a limit counted in days; daily does no harm either. The whole nightly
plan is on [Schedule it](/smartlinks/link-health#schedule).

Without it the table keeps a row per song, platform and day for as long as the site runs.

## `resolvers` and `services`

```php
'resolvers' => [
    SpotifyResolver::class,
    DeezerResolver::class,
    AppleMusicResolver::class,
    TidalResolver::class,
    YouTubeResolver::class,
],

'services' => [
    'spotify' => [
        'client_id' => env('SPOTIFY_CLIENT_ID'),
        'client_secret' => env('SPOTIFY_CLIENT_SECRET'),
        // Falls back to `country`.
        'market' => env('SPOTIFY_MARKET'),
    ],
    'tidal' => [
        'client_id' => env('TIDAL_CLIENT_ID'),
        'client_secret' => env('TIDAL_CLIENT_SECRET'),
    ],
    'itunes' => [
        'interval_ms' => 3100,
        'duration_tolerance' => 10,
    ],
    'youtube' => [
        'key' => env('YOUTUBE_API_KEY'),
    ],
    'timeout' => 10,
],
```

Used by `php artisan smartlinks:resolve`, in the order listed. Deezer and Apple Music need no
key; Spotify and Tidal use client credentials; YouTube needs a Data API key. How each one
decides, and the limits of each service, are on [Auto-fill](/smartlinks/auto-fill). A resolver
of your own goes into `resolvers`.

## `cp` {#cp}

```php
'cp' => [
    'enabled' => true,
    'days' => 30,
],
```

`enabled` removes the nav entry and the routes together: a hidden entry with a reachable URL
would not be a disabled screen. `days` is the period the
[Smart Links screen](/smartlinks/control-panel) sums clicks over, today included.
