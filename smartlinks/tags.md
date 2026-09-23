# Antlers tags

<AddonHeader />

Three tags, for a song's links on your own pages: a release page, a discography, a footer.

## Which entry

Every tag takes an `entry` parameter: an entry ID or a slug. Without it, the tag uses the entry
of the current context, so inside a song's own template no parameter is needed. A slug is
looked up in the configured [collections](/smartlinks/configuration#collections) of the current
site. An entry of any other collection gives nothing.

## `{{ smartlinks:links }}` {#smartlinks-links}

The song's links, one per platform, in [priority order](/smartlinks/configuration#priority).

```antlers
{{ smartlinks:links entry="{id}" }}
    <a href="{{ click_url ?? url }}">{{ label }}</a>
{{ /smartlinks:links }}
```

| Variable | |
| --- | --- |
| `platform` | the handle, `spotify` |
| `url` | the stored URL |
| `label` | the label, `Spotify` |
| `icon` | the handle again, for your own icon set |
| `click_url` | the full URL of the counting redirect, ending in `/hoeren/{slug}/spotify`, for a release `/hoeren/release/{slug}/spotify` |

Link to `click_url` if the click should be counted. It is `null` when the
[routes are off](/smartlinks/configuration#routes) or the entry has no slug; fall back to `url`.
A song without links gives an empty list.

Both `{{ smartlinks:links }}` and `{{ smartlinks:url }}` leave out a link that
[`smartlinks:check`](/smartlinks/link-health#dead-links) has confirmed dead, as the landing page
does, while [`check.hide_dead`](/smartlinks/configuration#check) is on.

## `{{ smartlinks:url }}` {#smartlinks-url}

The stored URL for one platform, or nothing.

```antlers
<a href="{{ smartlinks:url platform="spotify" }}">Listen on Spotify</a>
```

| Parameter | |
| --- | --- |
| `platform` | the handle, as in the [table](/smartlinks/platforms#built-in-platforms) |
| `entry` | optional, see above |

This is the stored URL itself, so a click on it is not counted.

## `{{ smartlinks:page }}` {#smartlinks-page}

The full URL of the landing page, ending in `/hoeren/{slug}` (a release:
`/hoeren/release/{slug}`), or nothing when the routes are off.

```antlers
<a href="{{ smartlinks:page }}">All platforms</a>
```

Useful wherever the whole choice should be offered at once: the newsletter, the bio link, the
QR code on a poster.
