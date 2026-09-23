# Auto-fill

<AddonHeader />

A song that carries one link of the right kind can get its other links filled in. Exact, never
by name: first the song's identity, its ISRC (a release: its UPC), then every service is asked
for exactly that key. The service that used to answer "here is one link, give me every other
one" for free, Odesli / song.link, shut its public API down in 2026 and is not used.

```bash
# what would be added, nothing saved
php artisan smartlinks:resolve --dry-run

# all songs and releases of the configured collections
php artisan smartlinks:resolve

# one song, by slug or ID
php artisan smartlinks:resolve alles-wird-gut

# also replace links smartlinks:check confirmed dead
php artisan smartlinks:resolve --replace-dead
```

## What it never does

- **It never overwrites.** Only platforms the song has no link for are asked at all. Every
  platform the song holds a link for counts as present, dead or not. A found link is appended
  as a new row; an existing link is never touched, even when it is wrong. The one exception
  is a confirmed dead link, and only with [`--replace-dead`](#replace-dead).
- **It never writes a name match.** YouTube can only be searched by name, so what it finds is
  a [suggestion](#suggestions) that someone accepts or rejects in the Control Panel.
- **It never guesses.** A resolver that is not sure reports why and adds nothing.
- **It adds nothing for Amazon, Boomplay, Yandex, Anghami, Napster and the rest.** None of them
  has a free lookup by ISRC or UPC. Those stay hand-entered.

## Step one: the identity {#identity}

Before any resolver runs, the chain works out the key. For a song that is the ISRC, which
names one recording. For an entry of a [release collection](#releases) it is the UPC, which
names one release.

```
what the entry holds, in this order
  isrc_field / upc_field
  a Deezer link                   free
  spotify_field or a Spotify link credentials
  a Tidal link                    credentials
  → the ISRC (song) or the UPC (release)

Deezer, looked up by that ISRC
  → its own link, the album, track and disc
    number, length, title, artist, and the
    countries the track is available in
Deezer, that album
  → the album's UPC
```

Each step only runs while the key is still missing, and one failing step does not stop the
next. A Deezer answer looked up by ISRC must carry that ISRC, otherwise it is a `mismatch`.
The identity is only worked out when at least one resolver's platform is missing.

When the blueprint has the fields named in
[`isrc_field` and `upc_field`](/smartlinks/configuration#collections) and they are empty, the
found ISRC and UPC are stored there, and the next run starts from them.

## Step two: the resolvers {#the-chain}

The resolvers in [`smartlinks.resolvers`](/smartlinks/configuration#resolvers-and-services) run
in this order: Spotify, Deezer, Apple Music, Tidal, YouTube. Each is asked only when the song
has no link for its platform, and each on the key from step one.

| Resolver | Needs | How |
| --- | --- | --- |
| Spotify | a Spotify ID, or the ISRC or UPC plus credentials | With an ID the link follows from it, `https://open.spotify.com/track/{id}` (`album` for a release), no API call. Otherwise a Web API search for `isrc:{ISRC}` (type track) or `upc:{UPC}` (type album). A track whose ISRC differs is a `mismatch`. |
| Deezer | the ISRC or UPC | `api.deezer.com/track/isrc:{ISRC}` or `album/upc:{UPC}`, free, no key. Only a link whose host really is Deezer's is taken. Not linked where the track is unavailable, see [the region](#region). |
| Apple Music | the UPC | The iTunes lookup, `lookup?upc={UPC}&entity=song`, free, no key. For a release the album link. For a song the track at Deezer's track and disc number, checked against the length. See below. |
| Tidal | the ISRC or UPC plus credentials | `tracks?filter[isrc]=` or `albums?filter[barcodeId]=`. Only an item with exactly that ISRC or UPC counts, otherwise `mismatch`. The API's `TIDAL_SHARING` link is preferred, else `https://tidal.com/track/{id}`. |
| YouTube | `YOUTUBE_API_KEY`, title and artist | Data API search, five results. Only a video from the artist's auto-generated "{artist} - Topic" channel counts, and even that becomes a [suggestion](#suggestions), never a link. |

Every found link goes through the [cleanup](/smartlinks/link-health#cleanup) before it is
written. A resolver that throws costs only its own platform: the chain logs
`smartlinks: resolver failed` and records `http_error`.

### The keys

```dotenv
SMARTLINKS_COUNTRY=DE

SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_MARKET=

TIDAL_CLIENT_ID=
TIDAL_CLIENT_SECRET=

YOUTUBE_API_KEY=
```

Deezer and Apple Music need none. Spotify and Tidal use the client-credentials flow: no user,
no consent screen, only public catalogue data. Their tokens are cached until shortly before
they expire, and after a 401 the request is tried once more with a fresh token.

### Apple Music in detail {#apple-music}

Apple's lookup has no ISRC parameter, so the way in is the UPC, which Deezer supplies. The
lookup returns every track of that release, and the song is picked by its position:

- The track and disc number come from the Deezer album the ISRC lookup landed on. They are used
  only when that album carries the entry's UPC. A compilation or another edition puts the
  recording elsewhere, and then only a release with a single track is unambiguous. Anything
  else is `no_confident_match`.
- The length must agree within
  [`services.itunes.duration_tolerance`](/smartlinks/configuration#resolvers-and-services), 10
  seconds, otherwise `mismatch`.
- Calls are spaced 3.1 seconds apart (`services.itunes.interval_ms`), to stay under Apple's
  documented 20 or so a minute. A 403 or 429 is `rate_limited`.

### The region {#region}

[`country`](/smartlinks/configuration#collections), `SMARTLINKS_COUNTRY`, `DE` by default, is
the storefront every resolver asks: iTunes `country`, Spotify `market` (unless
`SPOTIFY_MARKET` is set), Tidal `countryCode`. Deezer's answer lists the countries a track or
album is available in; when `country` is not among them the link is not added, with the reason
`not_available_in_region`. A service that says nothing about availability counts as
available.

### Releases {#releases}

Collections in [`release_collections`](/smartlinks/configuration#collections) get a page like
songs, and are resolved as albums by UPC: the Deezer album, the Apple Music album, the Spotify
album, the Tidal album. A Deezer album link on the release is enough to start. For a release,
`spotify_field` may hold a Spotify album ID or album URL.

## YouTube suggestions {#suggestions}

A video YouTube finds is stored in `smartlinks_suggestions` as pending, with the reason
`suggested`, and is not written to the song. On the
[Smart Links screen](/smartlinks/control-panel#suggestions) a user with `manage smartlinks`
accepts it, and it is appended like any found link, or rejects it.

- Once a platform has been suggested for a song, whatever came of it, the song is not searched
  again for that platform. The reason is `already_suggested`. A rejected suggestion is an
  answer, not a reason to ask YouTube every night.
- The same URL is never stored twice for a song.
- A dry run stores no suggestion.

Title and artist, which YouTube searches with, come from Deezer's answer or from Spotify's.
Without either, YouTube reports `missing_input`.

**Why YouTube is so strict.** A title search is fuzzy, and a wrong link is worse than none. The
"{artist} - Topic" channel is the label's own upload of exactly this recording, so a video from
anywhere else is not suggested, however well its title matches.

## Where found links go

Found links are appended to the song's links field:

- to a **Grid**, as a new row with the URL under `url_key` and the platform under
  [`platform_key`](/smartlinks/configuration#platform-key), as a handle or a label;
- to a **List**, as a bare URL.

A localisation that inherits its links from the origin gets the new links added **on the
origin**, not as a copy that would end the inheritance. The entry is saved like any other
save, with Statamic's events.

## Replacing dead links {#replace-dead}

A link that [`smartlinks:check`](/smartlinks/link-health#dead-links) has confirmed dead still
counts as present. Without `--replace-dead` its platform is not asked, and no second link is
appended next to the dead one. With the option, off by default:

- A platform is asked again only when **all** its stored links are confirmed dead, that is
  dead on two checks in a row. A link that is `suspect` or `unknown`, or a live link of the
  same platform, keeps the platform out.
- A found link goes into the row of the platform's first dead link. In a Grid only the URL
  column changes; the row's other columns stay. A List gets the new URL in the old one's
  place. Further dead links of that platform stay where they are.
- The dead link's check history in `smartlinks_link_status` is dropped, so the new link
  starts with none.
- Each replacement is logged at `info` as `smartlinks: replaced dead link`, with the entry, the
  platform, the old and the new URL.

The console shows a replacement as its own row, Result `replaced` (`would replace` on a dry
run) and the URL column `old → new`. A replacement is not counted among the added links in
the last line.

Run `--replace-dead` after the check, not before it: the nightly plan on
[Schedule it](/smartlinks/link-health#schedule) puts it an hour later.

## Reasons

Every decision is logged at `info` level as `smartlinks: resolve`, with the entry, the platform,
the URL if any, whether it was a dry run, and one of these reasons:

| Reason | Means |
| --- | --- |
| `found` | a link was found, and added unless `--dry-run` |
| `suggested` | YouTube found a video; stored as a suggestion unless `--dry-run` |
| `already_present` | the song already has a link for that platform; the resolver was not asked |
| `already_suggested` | the platform was suggested for this song before; not searched again |
| `not_configured` | the service needs credentials that are not set |
| `missing_input` | no ISRC or UPC, or no title and artist for YouTube |
| `not_found` | the service does not know the track or release |
| `not_available_in_region` | Deezer lists the track as unavailable in `country` |
| `mismatch` | an answer came back, but its ISRC, UPC, position or length disagree |
| `no_confident_match` | YouTube found no Topic video, or Apple Music had no safe position |
| `rate_limited` | the service asked to slow down: a 429, Deezer's quota, Apple's 403 |
| `http_error` | the service did not answer, or answered with an error |

Deezer's quota and "busy" answers pass within a second or two, so the Deezer client tries once
more after a pause of 1.5 seconds before the reason stands.

The console shows a table with the columns Song, Platform, Result and URL. It leaves out
`already_present`. A row "identify (ISRC/UPC)" appears when step one found no key, with its
reason, and a row per ISRC or UPC field that was, or would be, stored. The last line counts:

```
2 link(s) would be added for 1 song(s). Dry run: nothing saved.
```

Run the dry run first. It asks the services exactly as the real run does and saves nothing.

## Measured on a real catalogue {#hit-rate}

On 23 September 2026 the chain ran against the live services on the 53 songs of
anders-band.de, read only, from a server in Germany, `country` `DE`, without Spotify or Tidal
credentials. 39 of the songs carry a Deezer link. The chain started from that link alone, and
each answer was compared with the link the site had stored, after cleanup.

| Service | identical | different, valid | new | missing | wrong |
| --- | --- | --- | --- | --- | --- |
| Deezer | 39 | 0 | 0 | 0 | 0 |
| Apple Music | 23 | 10 | 6 | 0 | 0 |

All 39 songs were identified. Of the ten Apple Music links that differ, nine belong to one
album whose stored links answer 404: Apple had re-released it under a new ID, and the resolver
found the live links. The tenth is the same song as a single and as an album track; both
answer 200. The six new links are songs that had no Apple link, each answering 200. **None of
the found links pointed to another song or failed to answer.**

Spotify and Tidal were not measured, for want of credentials. Their resolvers are covered by
tests with faked responses only. YouTube is not part of the measurement.

## Limits {#limits}

- **Deezer.** The `isrc:` and `upc:` paths are public but not documented, and can go away.
  Deezer's developer FAQ allows commercial use only with an agreement. Clear that before you
  use it for a client.
- **Tidal.** Needs an app in the Tidal developer portal. Cost and terms for commercial use are
  not known yet.
- **Spotify.** Since February 2026 an app in Development Mode needs a Premium account as its
  owner, returns at most 10 search results and allows 5 users. Extended quota is only for
  organisations with 250,000 monthly users. Lookups without users, as here, work within that.
- **Apple Music.** Through the free iTunes Search API, about 20 calls a minute, no ISRC lookup.
  A song whose release Deezer does not have, or has without a UPC, gets no Apple link.
- **YouTube.** The Data API's free quota is 100 searches a day, by name only, hence
  suggestions.
- **Amazon, Amazon Music, Boomplay, Yandex Music, Anghami, Napster** and every other platform:
  no automatic lookup. Enter them by hand.

## A resolver of your own

Implement `Goldnead\Smartlinks\Contracts\Resolver` and add the class to `smartlinks.resolvers`:

```php
use Goldnead\Smartlinks\Contracts\Resolver;
use Goldnead\Smartlinks\Resolvers\Resolution;
use Goldnead\Smartlinks\Resolvers\Track;

class BandcampResolver implements Resolver
{
    public function platform(): string
    {
        return 'bandcamp';
    }

    public function resolve(Track $track): Resolution
    {
        // $track->isrc, upc, album, title, artist, …
        return Resolution::none(
            $this->platform(),
            Resolution::NOT_FOUND,
        );
    }
}
```

`platform()` is the handle the resolver fills, as [Platform detection](/smartlinks/platforms)
knows it. A resolver does not throw for an expected miss, no key, no match, the API down: it
returns `Resolution::none()` with a reason, and the command logs it. `Resolution::found()`
takes the platform and the URL. Resolvers are resolved from the container, and a class in the
list that does not implement the contract stops the run with an `InvalidArgumentException`.

A resolver that matches by name rather than by ISRC or UPC implements
`Goldnead\Smartlinks\Contracts\SuggestsOnly` instead. Its finds become suggestions, like
YouTube's.
