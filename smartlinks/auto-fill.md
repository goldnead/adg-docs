# Auto-fill

<AddonHeader />

A song with a Spotify ID can get some of its other links filled in. Not all of them: the
service that used to answer "here is one link, give me every other one" for free, Odesli /
song.link, shut its public API down in 2026. What remains free reaches three platforms.

```bash
# what would be added, nothing saved
php artisan smartlinks:resolve --dry-run

# all songs of the configured collections
php artisan smartlinks:resolve

# one song, by slug or ID
php artisan smartlinks:resolve alles-wird-gut
```

## What it never does

- **It never overwrites.** Only platforms the song has no link for are asked at all. A found
  link is appended as a new row; an existing link is never touched, even when it is wrong.
- **It never guesses.** A resolver that is not sure reports why and adds nothing.
- **It adds nothing for Apple Music, Amazon, Tidal and the rest.** Apple Music would need a
  paid developer account, and the addon only uses services that are free. Those stay
  hand-entered.

## The chain

The resolvers in [`smartlinks.resolvers`](/smartlinks/configuration#resolvers-and-services) run
in order: Spotify, Deezer, YouTube. Before them, if any platform other than Spotify is missing,
the Spotify Web API is asked once for the track, to learn its ISRC, title and artist.

| Resolver | Needs | How |
| --- | --- | --- |
| Spotify | the Spotify ID | The link follows from the ID, `https://open.spotify.com/track/{id}`. No API call. |
| Deezer | an ISRC | `api.deezer.com/track/isrc:{ISRC}`, free, no key. Only a link whose host really is Deezer's is taken. |
| YouTube | `YOUTUBE_API_KEY`, title and artist | Data API search, five results. Only a video from the artist's auto-generated "{artist} - Topic" channel counts, otherwise nothing. |

### What each resolver needs {#what-each-resolver-needs}

**The Spotify ID** comes from [`spotify_field`](/smartlinks/configuration#collections): a bare
22-character ID, a `spotify:track:` URI, or an `open.spotify.com` track URL, with or without an
`intl-xx` segment. Without one, a Spotify link already stored on the song is used.

**The ISRC** comes from [`isrc_field`](/smartlinks/configuration#collections) when you set one,
normalised to twelve characters without dashes. Otherwise from Spotify's API, which needs
credentials:

```dotenv
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_MARKET=DE
```

That is the client-credentials flow: no user, no consent screen, only public catalogue data.
The token is cached until shortly before it expires. When Spotify answers 401 anyway, a revoked
token say, it is forgotten and the request is tried once more with a fresh one.

**Title and artist**, which YouTube searches with, come only from Spotify's API. Without
Spotify credentials YouTube reports `missing_input`.

```dotenv
YOUTUBE_API_KEY=
```

**Why YouTube is so strict.** A title search is fuzzy, and a wrong link is worse than none. The
"{artist} - Topic" channel is the label's own upload of exactly this recording, so a video from
anywhere else is not taken, however well its title matches.

## Where found links go

Found links are appended to the song's links field:

- to a **Grid**, as a new row with the URL under `url_key` and the platform under
  [`platform_key`](/smartlinks/configuration#platform-key), as a handle or a label;
- to a **List**, as a bare URL.

A localisation that inherits its links from the origin gets the new links added **on the
origin**, not as a copy that would end the inheritance. The entry is saved like any other
save, with Statamic's events.

## Reasons

Every decision is logged at `info` level as `smartlinks: resolve`, with the entry, the platform,
the URL if any, whether it was a dry run, and one of these reasons:

| Reason | Means |
| --- | --- |
| `found` | a link was found, and added unless `--dry-run` |
| `already_present` | the song already has a link for that platform; the resolver was not asked |
| `not_configured` | the service needs credentials that are not set |
| `missing_input` | no Spotify ID, no ISRC, or no title and artist, whichever this resolver needs |
| `not_found` | the service does not know the track |
| `no_confident_match` | YouTube found videos, none from the Topic channel |
| `http_error` | the service did not answer, or answered with an error |

The console shows a table with the columns Song, Platform, Result and URL. It leaves out
`already_present`, and it adds a row "spotify lookup" when the Spotify API lookup did not
succeed, with its reason. The last line counts:

```
2 link(s) would be added for 1 song(s). Dry run: nothing saved.
```

Run the dry run first. It asks the services exactly as the real run does and saves nothing.

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
        // $track->spotifyId, isrc, title, artist
        return Resolution::none($this->platform(), Resolution::NOT_FOUND);
    }
}
```

`platform()` is the handle the resolver fills, as [Platform detection](/smartlinks/platforms)
knows it. A resolver does not throw for an expected miss, no key, no match, the API down: it
returns `Resolution::none()` with a reason, and the command logs it. `Resolution::found()`
takes the platform and the URL. Resolvers are resolved from the container, and a class in the
list that does not implement the contract stops the run with an `InvalidArgumentException`.
