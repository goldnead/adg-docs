# Reference

<AddonHeader />

## Console

| Command | |
| --- | --- |
| `php artisan smartlinks:resolve {entry?}` | Fills missing links by ISRC or UPC from Spotify, Deezer, Apple Music and Tidal, and stores YouTube finds as suggestions; never overwrites. Every platform with a stored link counts as present, dead or not. `entry` is an ID or a slug; without it, every song and release. `--dry-run` saves nothing. `--replace-dead` also resolves platforms whose links are all confirmed dead and puts the new link into the dead link's row. |
| `php artisan smartlinks:clean` | Removes affiliate and tracking parameters from every stored link, normalises its form and drops rows that are duplicates afterwards. `--dry-run` saves nothing. |
| `php artisan smartlinks:check {entry?}` | Asks every stored link whether it still answers and records the verdict; a link is dead on the second dead check in a row. `--dry-run` records nothing. Not scheduled. |
| `php artisan smartlinks:prune` | Deletes day counters older than `clicks.prune_days` (400). `--days=` for another number. Not scheduled. |

Details on [Auto-fill](/smartlinks/auto-fill),
[Cleanup and dead links](/smartlinks/link-health) and
[Pruning](/smartlinks/configuration#pruning).

## Facade

`Goldnead\Smartlinks\Facades\Smartlinks`, alias `Smartlinks`. `$entry` is a Statamic entry.

| Method | |
| --- | --- |
| `links(Entry $entry): array` | the song's links as `Link` objects, one per platform, in priority order; confirmed dead links left out while `check.hide_dead` is on |
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
constants `FOUND`, `NOT_CONFIGURED`, `MISSING_INPUT`, `NOT_FOUND`, `NO_CONFIDENT_MATCH`,
`HTTP_ERROR`, `RATE_LIMITED`, `NOT_AVAILABLE_IN_REGION`, `MISMATCH` and `SUGGESTED`.

`Track` carries what the entry holds, `spotifyId`, `isrc`, `upc`, `deezerId`, `tidalId` and
`album` (true for a release), and what step one adds: `title`, `artist`, `deezerLink`,
`deezerAlbumId`, `trackNumber`, `discNumber`, `duration` in seconds and
`availableCountries`. See [Auto-fill](/smartlinks/auto-fill#a-resolver-of-your-own).

`Goldnead\Smartlinks\Contracts\SuggestsOnly` extends `Resolver` and adds nothing: a resolver
that implements it has its finds stored as suggestions instead of links.

`Goldnead\Smartlinks\Contracts\HostResolver` has one method, `resolve(string $host): array`,
every A and AAAA address of the host, or an empty list. The link check's SSRF guard uses it.
The addon binds its own only when nothing else is bound.

## Fieldtype

| Handle | Stores | |
| --- | --- | --- |
| `smartlink_url` | the URL | shows the detected platform; validates `http` or `https` |

## Routes

| Method | URL | Name | |
| --- | --- | --- | --- |
| GET | `/hoeren/{slug}` | `smartlinks.show` | `web` group, public, not throttled |
| GET | `/hoeren/{slug}/{platform}` | `smartlinks.go` | `web` group, public, not throttled, 302 |
| GET | `/hoeren/{segment}/{slug}` | `smartlinks.segment.show` | the same for a collection with a segment, `release` by default; registered only when a segment is in use |
| GET | `/hoeren/{segment}/{slug}/{platform}` | `smartlinks.segment.go` | the same, 302 |
| GET | `{cp}/smartlinks` | `statamic.cp.smartlinks.index` | `can:view smartlinks` |
| GET | `{cp}/smartlinks/listing` | `statamic.cp.smartlinks.listing` | `can:view smartlinks`, the rows as JSON |
| POST | `{cp}/smartlinks/suggestions/{id}/accept` | `statamic.cp.smartlinks.suggestions.accept` | `can:manage smartlinks` |
| POST | `{cp}/smartlinks/suggestions/{id}/reject` | `statamic.cp.smartlinks.suggestions.reject` | `can:manage smartlinks` |

`{slug}` matches letters, digits, `-` and `_`; `{platform}` lower-case letters, digits, `-` and
`_`; `{segment}` one of the segments in use; `{id}` digits. The segment routes are
registered before the other two, so a song whose slug is a segment is shadowed; see
[One segment per collection](/smartlinks/landing#segments). The four front-end routes follow
[`routes.*`](/smartlinks/configuration#routes); the four Control Panel routes follow
[`cp.enabled`](/smartlinks/configuration#cp).

## Permissions

| Permission | |
| --- | --- |
| `view smartlinks` | the Smart Links screen |
| `manage smartlinks` | accepting and rejecting suggestions; nested under `view smartlinks` |

## Tables

Four migrations, run from the package, create three tables. None of them holds anything that
identifies a listener.

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
no cookie.

`smartlinks_suggestions`, one row per suggested URL and song:

| Column | |
| --- | --- |
| `id` | |
| `entry_id` | up to 64 characters |
| `platform` | the handle, up to 32 characters |
| `url` | the suggested URL |
| `url_hash` | its SHA-256 |
| `status` | `pending`, `accepted`, `rejected` or `superseded` |
| `created_at`, `updated_at` | |

Unique on `entry_id` + `url_hash`, so a URL is suggested once per song. Indexed on
`entry_id` + `status`.

`smartlinks_link_status`, the last verdict of `smartlinks:check` per stored link:

| Column | |
| --- | --- |
| `id` | |
| `entry_id` | up to 64 characters |
| `url_hash` | the SHA-256 of the URL |
| `url` | the URL |
| `status` | `ok`, `suspect`, `dead` or `unknown` |
| `http_status` | the last HTTP status, or `null` |
| `dead_streak` | dead checks in a row |
| `checked_at` | |

Unique on `entry_id` + `url_hash`, indexed on `status`. The cleanup moves a row to the URL it
rewrote and removes rows for links the song no longer holds.

## Log lines

| Message | Level | When |
| --- | --- | --- |
| `smartlinks: resolve` | info | every auto-fill decision, with its reason |
| `smartlinks: replaced dead link` | info | `--replace-dead` put a new link into a dead link's row, with the platform, the old and the new URL |
| `smartlinks: resolver failed` | warning | a resolver threw; that platform is recorded as `http_error`, the others go on |
| `smartlinks: click not recorded` | warning | a click could not be written; the listener was redirected anyway |
| `statamic-smartlinks: the smartlinks_clicks table is missing; run php artisan migrate.` | warning | the Smart Links screen was opened before the migration ran |

## Configuration

| Key | Default |
| --- | --- |
| `collections` | `['songs']` |
| `release_collections` | `[]` |
| `field` | `'streaming_links'` |
| `url_key` | `'url'` |
| `spotify_field` | `'spotify_id'` |
| `isrc_field` | `null` |
| `upc_field` | `null` |
| `country` | `SMARTLINKS_COUNTRY`, else `'DE'` |
| `cleanup.on_save` | `true` |
| `cleanup.keep` | `[]` |
| `cleanup.strip` | `[]` |
| `check.hide_dead` | `true` |
| `check.timeout` | `10` |
| `check.per_host_ms` | `1000` |
| `check.user_agent` | `'Mozilla/5.0 (compatible; statamic-smartlinks link check)'` |
| `platform_key` | `'platform'` |
| `platform_value` | `'handle'` |
| `platforms` | `[]` |
| `priority` | `spotify`, `applemusic`, `youtubemusic`, `amazonmusic`, `deezer`, `tidal`, `youtube`, `soundcloud`, `bandcamp`, `amazon` |
| `routes.enabled` | `true` (`SMARTLINKS_ROUTES_ENABLED`) |
| `routes.prefix` | `'hoeren'` |
| `routes.view` | `'smartlinks::landing'` |
| `routes.segments` | `[]`: release collections under `release`, the rest at the prefix |
| `clicks.enabled` | `true` |
| `clicks.per_minute` | `10` |
| `clicks.prune_days` | `400` |
| `clicks.bots` | fourteen fragments, from `bot` to `monitor` |
| `resolvers` | `SpotifyResolver`, `DeezerResolver`, `AppleMusicResolver`, `TidalResolver`, `YouTubeResolver` |
| `services.spotify.client_id` | `SPOTIFY_CLIENT_ID` |
| `services.spotify.client_secret` | `SPOTIFY_CLIENT_SECRET` |
| `services.spotify.market` | `SPOTIFY_MARKET`, else `country` |
| `services.tidal.client_id` | `TIDAL_CLIENT_ID` |
| `services.tidal.client_secret` | `TIDAL_CLIENT_SECRET` |
| `services.itunes.interval_ms` | `3100` |
| `services.itunes.duration_tolerance` | `10` |
| `services.youtube.key` | `YOUTUBE_API_KEY` |
| `services.timeout` | `10` |
| `cp.enabled` | `true` |
| `cp.days` | `30` |
