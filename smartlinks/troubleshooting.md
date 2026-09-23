# Troubleshooting

<AddonHeader />

## The landing page answers 404

In order:

1. **Is the song published?** Drafts and unpublished entries get no page.
2. **Is it in one of [`collections`](/smartlinks/configuration#collections)?** The default is
   `songs`.
3. **Is the slug the one in the current site?** On a multisite install a slug is looked up in
   the site the request is for.
4. **Are the routes on?** [`SMARTLINKS_ROUTES_ENABLED`](/smartlinks/configuration#routes) is
   `false`, or `routes.prefix` was changed without clearing the route cache.

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

- **`not_configured`** on the "spotify lookup" row: `SPOTIFY_CLIENT_ID` and
  `SPOTIFY_CLIENT_SECRET` are not set. Deezer then needs [`isrc_field`](/smartlinks/configuration#collections),
  and YouTube cannot run at all.
- **`missing_input`** for Spotify: the song has no Spotify ID in `spotify_field` and no stored
  Spotify link.
- **`no_confident_match`** for YouTube: videos were found, none from the artist's
  "{artist} - Topic" channel. That is deliberate.
- **Nothing in the table at all:** every platform the resolvers cover already has a link. Those
  rows are `already_present`, and the console leaves them out.

Apple Music, Amazon, Tidal and every other platform are never filled. Enter them by hand.

## The Smart Links screen says setup is required

The migration has not run. `php artisan migrate` creates `smartlinks_clicks`. The log has
`statamic-smartlinks: the smartlinks_clicks table is missing; run php artisan migrate.`

## The Smart Links entry is not in the navigation

The user lacks `view smartlinks`, or [`cp.enabled`](/smartlinks/configuration#cp) is off. The
entry is under **Content**.

## The table keeps growing

`smartlinks:prune` is not scheduled by the addon. Register it; see
[Pruning](/smartlinks/configuration#pruning).
