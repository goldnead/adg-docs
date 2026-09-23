# The landing page

<AddonHeader />

The link you put on a poster, in a bio or in a newsletter is `/hoeren/{slug}`, for a release
`/hoeren/release/{slug}`. Listeners pick their platform there, and the pick goes through a
redirect that counts it.

## The routes

All sit inside the `web` group, and all disappear with
[`SMARTLINKS_ROUTES_ENABLED=false`](/smartlinks/configuration#routes).

| Route | Name | What |
| --- | --- | --- |
| `GET /hoeren/{slug}` | `smartlinks.show` | A song's landing page, one button per platform. |
| `GET /hoeren/{slug}/{platform}` | `smartlinks.go` | 302 to the URL stored for that platform, click counted. |
| `GET /hoeren/release/{slug}` | `smartlinks.segment.show` | The same page for a release. |
| `GET /hoeren/release/{slug}/{platform}` | `smartlinks.segment.go` | The same redirect for a release. |

The prefix `hoeren` is [`routes.prefix`](/smartlinks/configuration#routes). `{platform}` is the
platform handle, `spotify` or `applemusic`; the table is on
[Platform detection](/smartlinks/platforms#built-in-platforms).

## One segment per collection {#segments}

Songs sit at the prefix. Entries of
[`release_collections`](/smartlinks/configuration#collections) sit under the segment `release`,
so a song and its single can share a slug: on anders-band.de five pairs do, `alles-wird-gut`
among them, and `/hoeren/alles-wird-gut` and `/hoeren/release/alles-wird-gut` are two
different pages.

[`routes.segments`](/smartlinks/configuration#routes) sets the segment per collection. An
empty segment mounts that collection at the prefix. The two routes with a segment are
registered before the two without, so `/hoeren/release/x` is never read as the song
`release` and the platform `x`.

Up to 0.2.0 a release answered at `/hoeren/{slug}` like a song. Since 0.2.1 that URL is a 404
for it; a link to a release printed or sent before the update needs the new URL. Song URLs
are unchanged.

::: warning A song with the slug `release`
A song whose slug equals a segment, `release` by default, is shadowed by that segment's routes.
`/hoeren/release` still reaches it, but `/hoeren/release/{platform}` is read as a release
called `{platform}`. Give the song another slug, or the releases another segment.
:::

## Which song

`{slug}` is looked up among the published entries of the collections at that segment, in the
current site: at the prefix the collections without a segment, under `release/` the release
collections. A song's slug under `release/` is a 404, and so is a release's slug at the
prefix.

When several collections share a segment, they are asked one after the other in config order,
[`collections`](/smartlinks/configuration#collections) first, then `release_collections`. The
first published entry with that slug wins, every time.

A slug is only unique per site, so on a multisite install each site's pages show that site's
song. A localisation without links of its own shows its origin's.

## What is a 404

- a slug that is not an entry of the collections at that segment, or not in the current site;
- a song that is not published;
- on the redirect, a platform the song has no link for, or whose only link is confirmed dead.

A stored value that is not an `http` or `https` URL never becomes a button and never becomes a
redirect target. **The redirect only ever goes to a URL stored on the entry.** Nothing from
the request is echoed into the location.

## What goes out

| | Landing page | Redirect |
| --- | --- | --- |
| Status | 200 | 302 |
| `X-Robots-Tag` | `noindex` | `noindex` |
| `Cache-Control` | not set by the addon | `no-store` |

The packaged view also carries `<meta name="robots" content="noindex">`. Each button links to
the song's redirect, with `rel="nofollow"` and a `data-platform` attribute holding the handle.

## One link per platform, in priority order

When a song has two Spotify links, the first one stored counts and the second is not shown.
The buttons follow [`smartlinks.priority`](/smartlinks/configuration#priority), not the stored
row order: Spotify, Apple Music, YouTube Music, Amazon Music, Deezer, Tidal, YouTube,
SoundCloud, Bandcamp, Amazon, then the rest alphabetically by handle, "other" last.

A link that [`smartlinks:check`](/smartlinks/link-health#dead-links) has confirmed dead is left
off, and a second link of the same platform takes its place. See
[`check.hide_dead`](/smartlinks/configuration#check).

A song with no links gets its page anyway, with the line "No links for this song yet."

## No throttle {#no-throttle}

None of these routes is throttled, on purpose. At a concert a whole room scans the same QR code
through one venue IP, and every one of them has to get through. Only the counting is capped,
at [`clicks.per_minute`](/smartlinks/configuration#clicks) per IP, song and platform. The
pages themselves are cheap reads.

## Your own page {#your-own-page}

The page is `smartlinks::landing`, a plain Blade view with a small stylesheet of its own, so it
works without a theme. Two ways to change it:

```bash
# edit the packaged view
php artisan vendor:publish --tag=smartlinks-views
```

That copies `landing.blade.php` into `resources/views/vendor/smartlinks/`. Or point
[`routes.view`](/smartlinks/configuration#routes) at a template of your site, Blade or Antlers:

```php
'routes' => [
    // …
    'view' => 'songs/listen',
],
```

The view receives three values:

| Variable | |
| --- | --- |
| `entry` | the song entry |
| `title` | its title |
| `links` | one array per link: `platform`, `url`, `label`, `icon`, `click_url` |

`icon` is the platform handle, for your own icon set. Link the buttons to `click_url`, so the
click is counted, and fall back to `url`. An Antlers template loops over `links` like any
array:

```antlers
<h1>{{ title }}</h1>
{{ links }}
    <a href="{{ click_url ?? url }}" rel="nofollow">{{ label }}</a>
{{ /links }}
```

The fixed wording of the packaged view, "Where do you want to listen?" and "No links for this
song yet.", comes from the language files, English and German
(`--tag=smartlinks-translations`).

## Linking to the page

Put `/hoeren/{slug}` wherever you announce the song, `/hoeren/release/{slug}` for a release.
In a template, [`{{ smartlinks:page }}`](/smartlinks/tags#smartlinks-page) returns the URL, and
it builds each entry's URL on its own route. So do `click_url`, the facade's `landingUrl()`
and `clickUrl()`, and the links on the [Smart Links screen](/smartlinks/control-panel).
