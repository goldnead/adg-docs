# Reference

<AddonHeader />

## Console

| Command | |
| --- | --- |
| `php artisan smartlinks:resolve {entry?}` | Fills missing links from Spotify, Deezer and YouTube; never overwrites. `entry` is an ID or a slug; without it, every song. `--dry-run` saves nothing. |
| `php artisan smartlinks:prune` | Deletes day counters older than `clicks.prune_days` (400). `--days=` for another number. Not scheduled. |

Details on [Auto-fill](/smartlinks/auto-fill) and
[Pruning](/smartlinks/configuration#pruning).

## Facade

`Goldnead\Smartlinks\Facades\Smartlinks`, alias `Smartlinks`. `$entry` is a Statamic entry.

| Method | |
| --- | --- |
| `links(Entry $entry): array` | the song's links as `Link` objects, one per platform, in priority order |
| `url(Entry $entry, string $platform): ?string` | the stored URL for that platform |
| `landingUrl(Entry $entry): ?string` | `null` when the routes are off |
| `clickUrl(Entry $entry, string $platform): ?string` | `null` when the routes are off |
| `recordClick(Entry $entry, string $platform): void` | one more click for today, without any check |
| `clicks(int $days): array` | entry id → platform → clicks, over that many days, today included |

```php
use Goldnead\Smartlinks\Facades\Smartlinks;

foreach (Smartlinks::links($entry) as $link) {
    $link->platform; // 'spotify'
    $link->url;
    $link->label;    // 'Spotify'
    $link->clickUrl; // null when the routes are off
}
```

`recordClick()` does not apply the bot, prefetch or per-minute rules. Those belong to the
redirect.

## Resolver contract

`Goldnead\Smartlinks\Contracts\Resolver`:

| Method | |
| --- | --- |
| `platform(): string` | the handle this resolver fills |
| `resolve(Track $track): Resolution` | a URL, or the reason there is none |

`Resolution::found($platform, $url)` and `Resolution::none($platform, $reason)`, with the reason
constants `FOUND`, `NOT_CONFIGURED`, `MISSING_INPUT`, `NOT_FOUND`, `NO_CONFIDENT_MATCH` and
`HTTP_ERROR`. `Track` carries `spotifyId`, `isrc`, `title` and `artist`, each nullable. See
[Auto-fill](/smartlinks/auto-fill#a-resolver-of-your-own).

## Fieldtype

| Handle | Stores | |
| --- | --- | --- |
| `smartlink_url` | the URL | shows the detected platform; validates `http` or `https` |

## Routes

| Method | URL | Name | |
| --- | --- | --- | --- |
| GET | `/hoeren/{slug}` | `smartlinks.show` | `web` group, public, not throttled |
| GET | `/hoeren/{slug}/{platform}` | `smartlinks.go` | `web` group, public, not throttled, 302 |
| GET | `{cp}/smartlinks` | `statamic.cp.smartlinks.index` | `can:view smartlinks` |
| GET | `{cp}/smartlinks/listing` | `statamic.cp.smartlinks.listing` | `can:view smartlinks`, the rows as JSON |

`{slug}` matches letters, digits, `-` and `_`; `{platform}` lower-case letters, digits, `-` and
`_`. The two front-end routes follow [`routes.*`](/smartlinks/configuration#routes); the two
Control Panel routes follow [`cp.enabled`](/smartlinks/configuration#cp).

## Permissions

| Permission | |
| --- | --- |
| `view smartlinks` | the Smart Links screen |

## Table

`smartlinks_clicks`, one row per song, platform and day:

| Column | |
| --- | --- |
| `id` | |
| `entry_id` | the song's entry id, up to 64 characters |
| `platform` | the handle, up to 32 characters |
| `day` | a date |
| `clicks` | the counter |

Unique on `entry_id` + `platform` + `day`: that index, and an upsert on it, is what keeps
parallel clicks from making a second row. Indexed on `day` for pruning. No IP, no user agent,
no cookie, nothing that identifies a listener.

## Log lines

| Message | Level | When |
| --- | --- | --- |
| `smartlinks: resolve` | info | every auto-fill decision, with its reason |
| `smartlinks: click not recorded` | warning | a click could not be written; the listener was redirected anyway |
| `statamic-smartlinks: the smartlinks_clicks table is missing; run php artisan migrate.` | warning | the Smart Links screen was opened before the migration ran |

## Configuration

| Key | Default |
| --- | --- |
| `collections` | `['songs']` |
| `field` | `'streaming_links'` |
| `url_key` | `'url'` |
| `spotify_field` | `'spotify_id'` |
| `isrc_field` | `null` |
| `platform_key` | `'platform'` |
| `platform_value` | `'handle'` |
| `platforms` | `[]` |
| `priority` | `spotify`, `applemusic`, `youtubemusic`, `amazonmusic`, `deezer`, `tidal`, `youtube`, `soundcloud`, `bandcamp`, `amazon` |
| `routes.enabled` | `true` (`SMARTLINKS_ROUTES_ENABLED`) |
| `routes.prefix` | `'hoeren'` |
| `routes.view` | `'smartlinks::landing'` |
| `clicks.enabled` | `true` |
| `clicks.per_minute` | `10` |
| `clicks.prune_days` | `400` |
| `clicks.bots` | fourteen fragments, from `bot` to `monitor` |
| `resolvers` | `SpotifyResolver`, `DeezerResolver`, `YouTubeResolver` |
| `services.spotify.client_id` | `SPOTIFY_CLIENT_ID` |
| `services.spotify.client_secret` | `SPOTIFY_CLIENT_SECRET` |
| `services.spotify.market` | `SPOTIFY_MARKET`, else `'DE'` |
| `services.youtube.key` | `YOUTUBE_API_KEY` |
| `services.timeout` | `10` |
| `cp.enabled` | `true` |
| `cp.days` | `30` |
