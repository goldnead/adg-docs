# Platform detection

<AddonHeader />

On one band site, 216 of 444 hand-labelled streaming links pointed somewhere else than their
label said. So there is no label. **The platform is derived from the URL's host**, wherever a
link is read: on the landing page, in the redirect, in the tags, on the Control Panel screen
and in the entry form. It is never stored as the source of truth, so it cannot drift from the
URL.

## The rules

- The host is lower-cased, and a leading `www.` and a trailing dot are dropped.
- **A host matches itself and every subdomain.** `open.spotify.com` is `spotify.com`.
- **The most specific host wins.** Hosts are compared longest first, so `music.youtube.com` is
  YouTube Music although `youtube.com` is YouTube, and `geo.music.apple.com` is Apple Music.
- A host in no table is **"other"**. `apple.com` itself is "other": only `music.apple.com`,
  `itunes.apple.com` and `apple.co` are Apple Music.
- **Short links count.** `spoti.fi`, `spotify.link` and `link.tospotify.com` are Spotify,
  `apple.co` is Apple Music, `youtu.be` is YouTube, `amzn.to` is Amazon.

## What is not a link {#what-is-not-a-link}

Only `http` and `https` URLs are links. A stored `javascript:` or `data:` value is never
listed and never redirected to, and neither is a URL with userinfo, such as
`https://open.spotify.com@evil.test/`, which reads like one host and goes to another. Such a
value is skipped as if the row were empty.

## Built-in platforms {#built-in-platforms}

Nineteen, plus "other". The handle is what appears in the redirect URL, in `platform` in the
tags, in `priority` and in the database.

| Handle | Label | Hosts |
| --- | --- | --- |
| `spotify` | Spotify | `spotify.com`, `spotify.link`, `spoti.fi`, `tospotify.com` |
| `applemusic` | Apple Music | `music.apple.com`, `itunes.apple.com`, `apple.co` |
| `amazonmusic` | Amazon Music | `music.amazon.` + `com`, `de`, `co.uk`, `fr`, `it`, `es`, `ca`, `co.jp` |
| `amazon` | Amazon | `amazon.` + `com`, `de`, `co.uk`, `fr`, `it`, `es`, `at`, `ca`, `co.jp`; `amzn.to`, `amzn.eu` |
| `youtubemusic` | YouTube Music | `music.youtube.com` |
| `youtube` | YouTube | `youtube.com`, `youtu.be`, `youtube-nocookie.com` |
| `tidal` | Tidal | `tidal.com`, `tidal.link` |
| `deezer` | Deezer | `deezer.com`, `deezer.page.link`, `dzr.page.link` |
| `soundcloud` | SoundCloud | `soundcloud.com`, `snd.sc` |
| `bandcamp` | Bandcamp | `bandcamp.com` |
| `yandex` | Yandex Music | `music.yandex.ru`, `music.yandex.com`, `yandex.ru`, `yandex.com` |
| `anghami` | Anghami | `anghami.com` |
| `boomplay` | Boomplay | `boomplay.com`, `boomplaymusic.com` |
| `pandora` | Pandora | `pandora.com`, `pandora.app.link` |
| `napster` | Napster | `napster.com`, `napster.de` |
| `audiomack` | Audiomack | `audiomack.com` |
| `qobuz` | Qobuz | `qobuz.com` |
| `beatport` | Beatport | `beatport.com` |
| `kkbox` | KKBOX | `kkbox.com` |
| `other` | Other | anything else |

"Other" is translated: the German label is "Andere".

### Amazon and Amazon Music

`music.amazon.*` is the streaming service, `amazonmusic`. The shop, with product pages such as
`amazon.de/dp/…` or `amazon.com/gp/…` and the short links `amzn.to` and `amzn.eu`, is its own
platform `amazon`, labelled "Amazon". Its redirect is `/hoeren/{slug}/amazon`. A site that
imported its links with both folded into one platform will see its shop links as "Amazon"
once the addon reads them.

## More hosts

```php
'platforms' => [
    'mixcloud' => ['mixcloud.com'],
],
```

[`platforms`](/smartlinks/configuration#priority) maps a handle to a list of hosts, added to
the table above with the same rules. A handle that is not built in is labelled with its first
letter capitalised, `Mixcloud`. A host listed here that is also built in goes to the handle
named here. A new handle sorts after the ten in `priority`, alphabetically, unless you add it
there.

## In the entry form {#in-the-entry-form}

<Figure
  src="smartlinks-fieldtype"
  alt="A song entry in a German Control Panel, tab Streaming: a Spotify ID field and a Streaming-Links grid with the columns Plattform, Art and URL; next to each URL a small badge reads Yandex Music, YouTube Music, Boomplay, Deezer, YouTube or Tidal"
  caption="The Streaming URL fieldtype in the playground's song blueprint. The blueprint still has a hand-typed Plattform column: its second row says youtube, the badge says YouTube Music, and the badge is what the addon goes by." />

Give the URL column of the links Grid the **Streaming URL** fieldtype, handle `smartlink_url`.
It is a URL input with a badge next to it that shows the detected platform as you type. An
unknown host shows as "Other", in red. The browser uses the same host table the server does,
handed over with the field, so the badge never disagrees with what the redirect and the tags
decide.

The fieldtype validates the value as an `http` or `https` URL and stores only the URL. A
`platform` column you already have is ignored and can go, unless your own templates render
it. Auto-fill can keep writing one for them; see
[`platform_key`](/smartlinks/configuration#platform-key).
