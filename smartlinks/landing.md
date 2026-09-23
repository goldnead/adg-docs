# The landing page

<AddonHeader />

The link you put on a poster, in a bio or in a newsletter is `/hoeren/{slug}`. Listeners pick
their platform there, and the pick goes through a redirect that counts it.

## Two routes

Both sit inside the `web` group, and both disappear with
[`SMARTLINKS_ROUTES_ENABLED=false`](/smartlinks/configuration#routes).

| Route | Name | What |
| --- | --- | --- |
| `GET /hoeren/{slug}` | `smartlinks.show` | The landing page, one button per platform. |
| `GET /hoeren/{slug}/{platform}` | `smartlinks.go` | 302 to the URL stored for that platform, click counted. |

The prefix `hoeren` is [`routes.prefix`](/smartlinks/configuration#routes). `{platform}` is the
platform handle, `spotify` or `applemusic`; the table is on
[Platform detection](/smartlinks/platforms#built-in-platforms).

## Which song

`{slug}` is looked up among the published entries of the configured
[collections](/smartlinks/configuration#collections), in the current site. A slug is only
unique per site, so on a multisite install each site's pages show that site's song. A
localisation without links of its own shows its origin's.

## What is a 404

- a slug that is not a song of the configured collections, or not in the current site;
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

Neither route is throttled, on purpose. At a concert a whole room scans the same QR code
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

Put `/hoeren/{slug}` wherever you announce the song. In a template,
[`{{ smartlinks:page }}`](/smartlinks/tags#smartlinks-page) returns the URL.
