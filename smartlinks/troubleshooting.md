# Troubleshooting

<AddonHeader />

## The landing page answers 404

In order:

1. **Is the song published?** Drafts and unpublished entries get no page.
2. **Is it in one of [`collections`](/smartlinks/configuration#collections)?** The default is
   `songs`.
3. **Is the slug the one in the current site?** On a multisite install a slug is looked up in
   the site the request is for.
4. **Is it under the right segment?** A release is at `/hoeren/release/{slug}`, a song at
   `/hoeren/{slug}`, and neither answers under the other. See
   [One segment per collection](/smartlinks/landing#segments).
5. **Are the routes on?** [`SMARTLINKS_ROUTES_ENABLED`](/smartlinks/configuration#routes) is
   `false`, or `routes.prefix` or `routes.segments` was changed without clearing the route
   cache.

## The buttons of a song called `release` answer 404

A song whose slug equals a segment is shadowed by that segment's routes. Its page at
`/hoeren/release` opens, but its redirect `/hoeren/release/spotify` is read as the page of a
release called `spotify`, a 404 unless there is one. Give the song another slug,
or the releases another segment in
[`routes.segments`](/smartlinks/configuration#routes).

## The page shows "No links for this song yet."

The song has no `http` or `https` URL in [`field`](/smartlinks/configuration#collections). Check
the field handle, and for a Grid the URL column's handle, `url_key`. Values without a scheme,
`open.spotify.com/…` say, do not count; neither does a URL with userinfo.

## A platform button answers 404

The redirect only goes to a URL stored for that platform. The handle in the URL is the one
detected from the stored URL's host, not a label you typed: a link typed as "Spotify" that
points at Tidal is `/hoeren/{slug}/tidal`. The detected platform is the badge in the entry form;
see [Platform detection](/smartlinks/platforms#in-the-entry-form).

## A link shows up under the wrong platform, or as "Other"

The host decides. See the [table](/smartlinks/platforms#built-in-platforms). A host that is not
in it is "Other"; add it under [`platforms`](/smartlinks/configuration#priority). An Amazon
shop link (`amazon.de/dp/…`, `amzn.to`) is "Amazon", not "Amazon Music"; see
[Amazon and Amazon Music](/smartlinks/platforms#amazon-and-amazon-music).

## A song shows only one Spotify button although it has two links

One link per platform. The first one stored counts, the second is not shown.

## The buttons are in a different order than in the entry

On purpose: they follow [`priority`](/smartlinks/configuration#priority), not the stored row
order.

## Clicks are missing on the screen

A redirect that was followed is not necessarily a counted click. Not counted:

- user agents that are empty or contain one of `clicks.bots`, which includes `preview`,
  `whatsapp`, `telegram`, `facebookexternalhit` and `curl`;
- `HEAD` requests and browser prefetches;
- clicks beyond [`clicks.per_minute`](/smartlinks/configuration#clicks) per IP, song and
  platform within a minute, 10 by default. Testing by clicking the same button repeatedly from
  one machine hits this quickly.

Clicks on a [`{{ smartlinks:url }}`](/smartlinks/tags#smartlinks-url) link or on a stored URL
used directly are not counted either: only the redirect counts. And the screen shows the last
[`cp.days`](/smartlinks/configuration#cp) days only.

If the log has `smartlinks: click not recorded`, the counter could not be written. The
database error is in the same log line, under `error`.

## Auto-fill adds nothing

Run with `--dry-run` and read the Result column, or the `smartlinks: resolve` lines in the
log. See [Reasons](/smartlinks/auto-fill#reasons).

- **A row "identify (ISRC/UPC)"** with `missing_input`: the song holds nothing to start from.
  Add a Deezer link, which is free to look up, or an ISRC in
  [`isrc_field`](/smartlinks/configuration#collections). A Spotify ID or link only helps with
  Spotify credentials, a Tidal link only with Tidal credentials.
- **`missing_input`** on every resolver: the same cause. They all need the ISRC or UPC.
- **`not_configured`** for Spotify or Tidal: their client ID and secret are not set. For YouTube:
  `YOUTUBE_API_KEY` is not set.
- **`no_confident_match`** for Apple Music: Deezer's track position is on another release than
  the entry's UPC, a compilation say. See [Apple Music in detail](/smartlinks/auto-fill#apple-music).
- **`no_confident_match`** for YouTube: videos were found, none from the artist's
  "{artist} - Topic" channel. That is deliberate.
- **`not_available_in_region`** for Deezer: Deezer lists the track as unavailable in
  [`country`](/smartlinks/auto-fill#region).
- **`rate_limited`**: the service asked to slow down. Run it again later.
- **Nothing in the table at all:** every platform the resolvers cover already has a link. Those
  rows are `already_present`, and the console leaves them out. A confirmed dead link counts
  too; `--replace-dead` asks for its platform again.

Amazon, Amazon Music, Boomplay, Yandex Music, Anghami, Napster and every other platform without
a resolver are never filled. Enter them by hand.

## A YouTube link was found but is not on the page

YouTube finds are suggestions. They wait on the
[Smart Links screen](/smartlinks/control-panel#suggestions) until someone with
`manage smartlinks` accepts them. A dry run stores none.

## YouTube is not searched for a song any more

The song had a YouTube suggestion before, accepted or rejected. The reason is
`already_suggested`, and it is deliberate: a rejection is an answer. Enter a link by hand if
the song needs one.

## Accept and Reject are missing from the row menu

The user has `view smartlinks` but not `manage smartlinks`.

## A button disappeared from the landing page

[`smartlinks:check`](/smartlinks/link-health#dead-links) found the link dead twice in a row,
and [`check.hide_dead`](/smartlinks/configuration#check) leaves it off. The song shows a "Dead
links" badge on the Smart Links screen. Replace the link, or run
`smartlinks:resolve --replace-dead` for the song. Plain `smartlinks:resolve` does not help: it
counts the dead link as present. See [Replacing dead links](/smartlinks/auto-fill#replace-dead).

## `smartlinks:check` reports `unknown` for a link that works in the browser

The store answered with a 403 wall, a 429, a 5xx or not at all, or its host resolves to an
address the check refuses. `unknown` never hides a link. A store that blocks automated requests
stays `unknown`.

## A link lost its parameters on save

That is the [cleanup](/smartlinks/link-health#cleanup). To keep a parameter, your own affiliate
token say, add it to [`cleanup.keep`](/smartlinks/configuration#cleanup).

## The Smart Links screen says setup is required

The migration has not run. `php artisan migrate` creates `smartlinks_clicks`. The log has
`statamic-smartlinks: the smartlinks_clicks table is missing; run php artisan migrate.`

## The Smart Links entry is not in the navigation

The user lacks `view smartlinks`, or [`cp.enabled`](/smartlinks/configuration#cp) is off. The
entry is under **Content**.

## The table keeps growing

`smartlinks:prune` is not scheduled by the addon. Register it; see
[Pruning](/smartlinks/configuration#pruning).

## No link is ever marked dead

`smartlinks:check` is not scheduled by the addon either. Register it; see
[Schedule it](/smartlinks/link-health#schedule). A link is confirmed dead only on the second
dead check in a row, so after the first run it is at most `suspect`.
