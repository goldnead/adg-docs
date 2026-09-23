# The Smart Links screen

<AddonHeader />

One screen: every song of the configured collections with its clicks over the last 30 days,
in total and per platform.

<Figure
  src="smartlinks-cp-list"
  alt="The Smart Links screen on a phone, German Control Panel: the line Klicks der letzten 30 Tage, je Plattform, a search field, and a table with the columns Song, Klicks and Spotify for three songs, a row menu on each row, and the footer 1–3 von 3"
  caption="The playground at 390 pixels wide, German. Three columns and the row menu fit a phone; the others are under Customize columns." />

## Who sees it

Users with the permission `view smartlinks`, under the group **Smart Links** in the role
editor. Without it the nav entry is missing and the URL is refused. Super users hold it.

The entry sits under **Content**. [`cp.enabled`](/smartlinks/configuration#cp) removes the entry
and the route together.

## The columns

| Column | Visible by default | |
| --- | --- | --- |
| Song | yes | the title, linking to the entry |
| Clicks | yes | all platforms together; the default sort, busiest first |
| Links | no | how many platforms the song has a link for |
| one per platform | the busiest only | clicks on that platform |

A platform gets a column only when it has clicks in the period, and the columns are ordered by
their clicks across all songs. Like core's Entries listing, few columns are visible by default,
so the title and the row menu fit on a phone; the others are under **Customize columns**.

The period is [`cp.days`](/smartlinks/configuration#cp), 30 by default, today included. The
counters themselves are kept until [pruned](/smartlinks/configuration#pruning).

## Search, sort, pages

The listing pages on the server, with core's paginator footer ("1–3 of 3"). Search matches the
title. Every column sorts, because the counts are computed on the server rather than stored on
the entry. The screen reads at most 2,000 songs.

Each row's menu has **Edit** and, while the routes are on, **Open page**, the landing page in a
new tab.

## Empty and unfinished installs

- **Migration not run:** a "Setup required" state saying that the `smartlinks_clicks` table is
  missing and that `php artisan migrate` creates it, and a warning in the log,
  `statamic-smartlinks: the smartlinks_clicks table is missing; run php artisan migrate.` Not
  a 500.
- **No songs:** a sentence saying that Smart Links reads the songs from the collections in
  `config/smartlinks.php`, and that there are none yet.
