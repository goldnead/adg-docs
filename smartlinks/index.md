# Smart Links

<AddonHeader />

Smart links for music in Statamic 6. Every song gets a page, `/hoeren/{slug}`, with one button
per platform it is on. Each button goes through `/hoeren/{slug}/{platform}`, which counts the
click and sends the listener on with a 302. The platform is derived from the URL's host, never
from a hand-typed label. Missing links are filled by ISRC or UPC from Deezer, Apple Music,
Spotify and Tidal, and YouTube finds wait in the Control Panel for someone to accept them.

<Figure
  src="smartlinks-landing"
  alt="The packaged landing page on a phone: the song title Neuer Tag, the line Wo möchtest du hören?, and six buttons, YouTube Music, Deezer, Tidal, YouTube, Boomplay and Yandex Music"
  caption="The packaged page at 390 pixels wide in the playground, German, shown on a wider strip of its own background. The buttons follow the priority order, not the order the links were stored in." />

## What it is

- **A landing page per song or release** and a **counting redirect** per platform, both
  public, both `noindex`. See [The landing page](/smartlinks/landing).
- **Platform detection from the URL's host**, for 19 built-in platforms, short links included,
  and extendable in config. A fieldtype, **Streaming URL**, shows the detected platform next to
  each URL in the entry form. See [Platform detection](/smartlinks/platforms).
- **A click counter per song, platform and day.** No IP, no cookie, no user agent is stored.
  Bots, link previews, `HEAD` requests and browser prefetches are redirected but not counted.
  See [Configuration](/smartlinks/configuration#clicks).
- **Three Antlers tags** for your own templates. See [Antlers tags](/smartlinks/tags).
- **Auto-fill** with `php artisan smartlinks:resolve`: the song's ISRC or the release's UPC,
  then exactly that key at Deezer, Apple Music, Spotify and Tidal, in your country's
  storefront. Never by name, never overwriting a link that is there. YouTube can only be
  searched by name, so its finds are suggestions. See [Auto-fill](/smartlinks/auto-fill).
- **Link cleanup** on every save and with `smartlinks:clean`: foreign affiliate and tracking
  parameters removed, one form per link, duplicates dropped. See
  [Cleanup and dead links](/smartlinks/link-health#cleanup).
- **A dead-link check**, `smartlinks:check`: a link that answers 404 or 410 on two checks in a
  row is left off the page. It never fetches an address inside your network. See
  [Dead links](/smartlinks/link-health#dead-links).
- **One Control Panel screen**, Smart Links, with the clicks per song and platform over the
  last 30 days, badges and a filter for dead links and open suggestions, and the suggestions
  to accept or reject. See [The Smart Links screen](/smartlinks/control-panel).

## What it is not

- **Not a content model.** Songs and releases stay ordinary collections of your site. The addon
  reads a field you name; it brings no blueprint and no collection.
- **Not "one link in, every link out" for every platform.** The service that used to answer
  that for free, Odesli / song.link, shut its public API down in 2026 and is not used.
  Auto-fill reaches Deezer, Apple Music, Spotify and Tidal by ISRC or UPC, and YouTube as a
  suggestion. Amazon, Boomplay, Yandex Music, Anghami and the rest stay hand-entered.
- **Not listener analytics.** The counter knows a song, a platform and a day. It does not know
  who clicked, from where, or whether the same person clicked twice.
- **Not a link shortener.** The redirect only ever goes to a URL stored on the entry. Nothing
  from the request becomes a location.
- **Not throttled.** A concert crowd scanning one QR code shares the venue's IP, and every one
  of them has to get through. Only the counting is capped.

## How it fits

```
entry in a smart link collection
  field streaming_links: one URL per row
  → cleaned on save
  → platform from each URL's host
  → one link per platform, in priority order,
    confirmed dead links left out

GET /hoeren/{slug}             landing page, one button each
GET /hoeren/{slug}/{platform}  302 to the stored URL
  ├─ counted: +1 in smartlinks_clicks
  │    (song, platform, day)
  └─ not counted: bot, preview, HEAD,
     prefetch, over the per-minute cap

smartlinks:resolve   ISRC or UPC, then the missing links;
                     YouTube as a suggestion
smartlinks:clean     cleanup for links stored before
smartlinks:check     dead on two checks in a row
Smart Links screen   clicks, badges, suggestions
```

## Next

- [Installation](/smartlinks/installation)
- [Configuration](/smartlinks/configuration)
- [The landing page](/smartlinks/landing)
- [Platform detection](/smartlinks/platforms)
- [Antlers tags](/smartlinks/tags)
- [Auto-fill](/smartlinks/auto-fill): the resolver chain, measured hit rate, limits
- [Cleanup and dead links](/smartlinks/link-health)
- [The Smart Links screen](/smartlinks/control-panel)
- [Reference](/smartlinks/reference): commands, facade, routes, permissions, tables
- [Troubleshooting](/smartlinks/troubleshooting)
