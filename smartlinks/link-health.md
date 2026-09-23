# Cleanup and dead links

<AddonHeader />

Two things keep the stored links usable: the cleanup, which removes what does not belong to a
link, and the dead-link check, which finds the ones that no longer lead anywhere.

## Cleanup {#cleanup}

On anders-band.de every Apple Music link carried Odesli's affiliate token, so the commission
for those clicks went to Odesli. The cleanup removes somebody else's affiliate and tracking
parameters and brings each link into one form. It runs:

- **on save**, for every entry of the configured collections, before it is written
  ([`cleanup.on_save`](/smartlinks/configuration#cleanup));
- **on links auto-fill finds**, before they are written;
- **on existing data**, with `smartlinks:clean`.

```bash
# which songs would change, nothing saved
php artisan smartlinks:clean --dry-run

# clean every song of the configured collections
php artisan smartlinks:clean
```

### What goes

| Where | Parameters |
| --- | --- |
| every host | `utm_*`, `si`, `refer`, `ref`, `ref_src` |
| every host, click IDs | `fbclid`, `gclid`, `gbraid`, `wbraid`, `dclid`, `msclkid`, `yclid`, `ttclid`, `twclid`, `igshid`, `li_fat_id` |
| every host, newsletter tools | `mc_cid`, `mc_eid`, `_hsenc`, `_hsmi`, `mkt_tok` |
| Apple Music | `at`, `ct`, `uo`, `app`, `itsct`, `itscg`, `ls`, `mt`, `pt` |
| Spotify | `si`, `nd`, `context`, `dl_branch` |
| Deezer | `deferredFl`, `host`, `app_id` |
| Tidal | `play` |

### One form per link

| Before | After |
| --- | --- |
| `spotify:track:{id}` (also album, artist, playlist) | `https://open.spotify.com/track/{id}` |
| `open.spotify.com/intl-de/track/…` | `open.spotify.com/track/…` |
| `geo.music.apple.com/…`, `itunes.apple.com/…` | `music.apple.com/…` |
| `music.apple.com/…/album/…/id123` | `music.apple.com/…/album/…/123` |
| `deezer.com/de/track/…` | `deezer.com/track/…` |
| `listen.tidal.com/browse/track/…/u` | `tidal.com/track/…` |

The parameter `i` on an Apple Music album URL stays: it is what makes the link point to one
track. A URL with nothing to remove stays byte for byte as it was.

### Duplicates

A row whose cleaned URL an earlier row already holds is dropped. Odesli stored every Apple
link twice, once with `app=itunes` and once with `app=music`; after cleaning they are the same
link. The check history of a rewritten URL moves to the new URL, and history rows for links
the song no longer holds are removed.

A localisation that inherits its links is left inheriting: the save hook only cleans an
entry's own value.

### Your own parameters

```php
'cleanup' => [
    'on_save' => true,
    'keep' => ['at'],   // your own affiliate token
    'strip' => [],      // more to remove
],
```

A parameter in `keep` is never removed, whatever the lists above say. `strip` adds to them; a
name ending in `*` matches by prefix.

### `smartlinks:clean` {#clean}

Cleans every song and release of the configured collections. It takes no entry argument.
`--dry-run` prints each song that would change with its number of URLs, and the total:

```
3 URL(s) in 2 song(s) would be cleaned. Dry run: nothing saved.
```

`-v` prints the songs on a real run too. The real run saves each changed entry quietly,
without Statamic's events, so a site's own listeners on entry saves do not fire. Run it once
after installing or updating; from then on the save hook keeps new links clean.

## Dead links {#dead-links}

```bash
# report only, record nothing
php artisan smartlinks:check --dry-run

# record the verdicts in smartlinks_link_status
php artisan smartlinks:check

# one song, by slug or ID
php artisan smartlinks:check deine-mutter
```

Each stored URL of a song is asked once per run: `HEAD` first, `GET` when `HEAD` does not
answer with success. One request per host and second
([`check.per_host_ms`](/smartlinks/configuration#check)), 10 seconds timeout.

### When a link is dead

| The link answers | Verdict |
| --- | --- |
| 2xx | `ok` |
| 404 or 410 | dead |
| 403, 429, 5xx, a timeout, a connection error | `unknown` |
| a host that does not resolve, a refused address, more than five redirects | `unknown` |

`unknown` is the network's word, not the link's, so it never counts as dead. A dead answer
also does not count alone: **a link is confirmed dead on the second dead check in a row.**
After the first it is `suspect`; an `ok` resets the streak, an `unknown` neither confirms nor
resets it. One 404 during a store's maintenance window does not hide a button.

The console counts this run's answers, "12 ok, 1 dead, 0 unknown.", and lists every link that
did not answer `ok` with the song, the verdict, the HTTP status and the URL.

### What a confirmed dead link does

- It is left off the landing page, out of the tags, and its redirect answers 404
  ([`check.hide_dead`](/smartlinks/configuration#check), on by default). A second link of the
  same platform takes over.
- `smartlinks:resolve` still counts the platform as present and appends nothing next to the
  dead link. `smartlinks:resolve --replace-dead` asks for the platform again, once all its
  links are confirmed dead, and puts a found link into the dead link's row. See
  [Replacing dead links](/smartlinks/auto-fill#replace-dead).
- The [Smart Links screen](/smartlinks/control-panel#badges) shows a "Dead links" badge on the
  song, and the filter "Dead links" lists those songs.

The link stays in the entry. Deleting it is left to a person, and replacing it to a person or
to `--replace-dead`.

### No request to your own network {#ssrf}

A stored URL is data someone typed, so the check never fetches an internal address. Each host
is resolved first, and the URL is refused when any of its addresses is private, loopback,
link-local, reserved, multicast or cloud metadata, for IPv4 and IPv6: `127.0.0.1`,
`169.254.169.254`, `10.0.0.0/8`, `::1`, `fc00::/7`, v4-mapped addresses, NAT64 prefixes.
Redirects are not followed by the HTTP client but by hand, at most five, and every hop is
checked the same way. The connection is pinned to the checked address, so DNS cannot change
between the check and the request. A refused URL is `unknown`.

The DNS lookup sits behind `Goldnead\Smartlinks\Contracts\HostResolver`. Bind your own class if
the server needs a different DNS policy; the addon's binding only applies when there is none.

### Schedule it {#schedule}

The addon schedules nothing. A suggested nightly plan, registered by you:

```php
// routes/console.php
Schedule::command('smartlinks:check')->dailyAt('03:30');
Schedule::command('smartlinks:resolve --replace-dead')
    ->dailyAt('04:30');
Schedule::command('smartlinks:prune')->weekly();
```

- `smartlinks:check` at 03:30 records the verdicts. Without it no link is ever marked dead,
  nothing is hidden, and the screen shows no dead-link badges. Since a link is confirmed only
  on the second dead check in a row, a nightly run confirms it on the second night.
- `smartlinks:resolve --replace-dead` at 04:30, an hour later, fills missing platforms and
  replaces the links the check has confirmed dead. See
  [Replacing dead links](/smartlinks/auto-fill#replace-dead). Leave the option out if dead
  links should wait for a person.
- `smartlinks:prune` weekly deletes click counters older than
  [`clicks.prune_days`](/smartlinks/configuration#pruning).
