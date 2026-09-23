# Configuration

<AddonHeader />

```bash
php artisan vendor:publish --tag=smartlinks-config
```

Twenty-four keys in `config/smartlinks.php`, five of them with an environment variable. None
is on the shared settings screen: Smart Links registers no section there.

| Key | Default | What happens when it is wrong |
| --- | --- | --- |
| `collections` | `['songs']` | Entries of other collections get no page, no redirect and no row on the screen. |
| `field` | `'streaming_links'` | No links are found, and every song's page shows "No links for this song yet." |
| `url_key` | `'url'` | The same, for a Grid whose URL column has another handle. |
| `spotify_field` | `'spotify_id'` | Auto-fill falls back to a Spotify link already stored on the entry, or has no starting point. |
| `isrc_field` | `null` | Deezer needs the ISRC from Spotify's API instead. |
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
| `resolvers` | Spotify, Deezer, YouTube | The auto-fill chain, in this order. |
| `services.spotify.client_id` | `SPOTIFY_CLIENT_ID` | Without it, Spotify's API is not asked. |
| `services.spotify.client_secret` | `SPOTIFY_CLIENT_SECRET` | The same. |
| `services.spotify.market` | `SPOTIFY_MARKET`, else `'DE'` | The market the track is looked up in. |
| `services.youtube.key` | `YOUTUBE_API_KEY` | Without it, YouTube reports `not_configured`. |
| `services.timeout` | `10` | Seconds per request to any of the three services. |
| `cp.enabled` | `true` | Off, the Smart Links screen and its nav entry are gone. |
| `cp.days` | `30` | The period the screen counts clicks over, today included. |

## Collections and fields {#collections}

```php
'collections' => ['songs'],
'field' => 'streaming_links',
'url_key' => 'url',
'spotify_field' => 'spotify_id',
'isrc_field' => null,
```

`collections` are the collections whose entries get a smart link page. Songs and releases stay
ordinary collections of the site; the addon only reads them.

`field` holds the streaming links. Two shapes work:

- **A Grid or a Replicator** with one URL per row, the URL under `url_key`. Any other column in
  the row, a hand-typed "platform" say, is ignored.
- **A List** of plain URLs.

Only `http` and `https` URLs count. Any other value in the field is skipped, and so is a URL
with userinfo; see [Platform detection](/smartlinks/platforms#what-is-not-a-link).

Links are read with inheritance, so a localisation without links of its own shows its origin's.

`spotify_field` holds a Spotify track ID or URL, the starting point for auto-fill. `isrc_field`
is optional; with it, Deezer can be filled without Spotify credentials. See
[Auto-fill](/smartlinks/auto-fill#what-each-resolver-needs).

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
],
```

`enabled` removes both front-end routes, the landing page and the redirect. The switch is
checked where the routes are registered, so a disabled route does not exist, and again in the
controller, so a route cache built while it was on cannot keep them open. The tags then return
`null` for `click_url` and for the page URL.

`prefix` is read when routes are registered, so a change needs a route cache clear. `view` is
any Blade or Antlers view; see
[The landing page](/smartlinks/landing#your-own-page).

There is deliberately no throttle on either route. See
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
Schedule::command('smartlinks:prune')->daily();
```

Without it the table keeps a row per song, platform and day for as long as the site runs.

## `resolvers` and `services`

```php
'resolvers' => [
    SpotifyResolver::class,
    DeezerResolver::class,
    YouTubeResolver::class,
],

'services' => [
    'spotify' => [
        'client_id' => env('SPOTIFY_CLIENT_ID'),
        'client_secret' => env('SPOTIFY_CLIENT_SECRET'),
        'market' => env('SPOTIFY_MARKET', 'DE'),
    ],
    'youtube' => [
        'key' => env('YOUTUBE_API_KEY'),
    ],
    'timeout' => 10,
],
```

Used by `php artisan smartlinks:resolve`, in the order listed. Only services that are free:
Spotify's Web API with client credentials, Deezer's public ISRC lookup without a key, and the
YouTube Data API. How each one decides is on [Auto-fill](/smartlinks/auto-fill). A resolver of
your own goes into `resolvers`.

## `cp` {#cp}

```php
'cp' => [
    'enabled' => true,
    'days' => 30,
],
```

`enabled` removes the nav entry and the route together: a hidden entry with a reachable URL
would not be a disabled screen. `days` is the period the
[Smart Links screen](/smartlinks/control-panel) sums clicks over, today included.
