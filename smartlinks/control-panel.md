# The Smart Links screen

<AddonHeader />

One screen: every song and release of the configured collections with its clicks over the last
30 days, in total and per platform, and what needs a person: dead links and YouTube
suggestions.

<Figure
  src="smartlinks-cp-list"
  alt="The Smart Links screen on a phone, German Control Panel: the line Klicks der letzten 30 Tage, je Plattform, a search field, and a table with the columns Song, Klicks and Spotify for three songs, a row menu on each row, and the footer 1–3 von 3"
  caption="The playground at 390 pixels wide, German. Three columns and the row menu fit a phone; the others are under Customize columns." />

## Who sees it

| Permission | Allows |
| --- | --- |
| `view smartlinks` | the screen, its clicks, badges and filter |
| `manage smartlinks` | accepting and rejecting suggestions |

Both sit under the group **Smart Links** in the role editor; `manage smartlinks` is nested
under `view smartlinks`. Without `view smartlinks` the nav entry is missing and the URL is
refused. Without `manage smartlinks` the suggestions are listed, but the row menu has no
**Accept** or **Reject**, and the two routes behind them answer 403. Super users hold both.

The song title links to the entry, and the row menu has **Edit**, only for users who may edit
that entry. Everyone else sees the title as plain text.

The entry sits under **Content**. [`cp.enabled`](/smartlinks/configuration#cp) removes the entry
and the routes together.

## The columns

| Column | Visible by default | |
| --- | --- | --- |
| Song | yes | the title, with the badges below it |
| Clicks | yes | all platforms together; the default sort, busiest first |
| Links | no | how many platforms the song has a link for |
| Dead links | no | how many of its links are confirmed dead |
| Suggestions | no | how many suggestions wait for review |
| one per platform | the busiest only | clicks on that platform |

A platform gets a column only when it has clicks in the period, and the columns are ordered by
their clicks across all songs. Like core's Entries listing, few columns are visible by default,
so the title and the row menu fit on a phone; the others are under **Customize columns**.

The period is [`cp.days`](/smartlinks/configuration#cp), 30 by default, today included. The
counters themselves are kept until [pruned](/smartlinks/configuration#pruning).

## Badges {#badges}

<Figure
  src="smartlinks-cp-badges"
  alt="The Smart Links screen in a German Control Panel with three songs: Deine Mutter with a red badge Tote Links: 1, Neuer Tag without a badge, Alles wird gut with an amber badge Vorschläge: 1, and the columns Klicks and Spotify"
  caption="The playground, German, cropped to the listing. The state sits in the title cell, as core's status dot does, so a phone needs no extra column." />

Two badges in the title cell, only when there is something to show:

- **Dead links: n**, red, for links [`smartlinks:check`](/smartlinks/link-health#dead-links)
  has confirmed dead. A link dead on one check only is not counted yet.
- **Suggestions: n**, amber, for YouTube suggestions nobody has accepted or rejected.

The same numbers are the hidden columns **Dead links** and **Suggestions**, which sort.

## The filter {#filter}

<Figure
  src="smartlinks-cp-filter"
  alt="The filter panel of the Smart Links screen, German: the group Linkstatus with the options Tote Links, selected, and Offene Vorschläge; behind it the listing reduced to one song with the badges Tote Links: 1 and Vorschläge: 2, and the footer 1 von 1"
  caption="The filter Link state set to Dead links, German. The listing behind the panel is down to the one song with a confirmed dead link." />

**Link state** is pinned to the filter panel, with two choices: **Dead links**, the songs with
at least one confirmed dead link, and **Open suggestions**, the songs with at least one
pending suggestion. The active choice shows as a badge above the listing, like core's filters.

## Suggestions {#suggestions}

<Figure
  src="smartlinks-cp-suggestions"
  alt="The row menu of the song Alles wird gut, German, opened below its badge Vorschläge: 2: two groups headed YouTube-Vorschlag: youtube.com/watch?v= followed by an eleven-character ID, each with the items Ansehen, Übernehmen and Ablehnen, then Bearbeiten and Seite öffnen"
  caption="Two YouTube suggestions for one song in the playground, German. The video IDs are test values. Each group is headed by its target, so two suggestions of one platform can be told apart." />

A song's row menu lists its pending suggestions first, one group each, headed by the platform
and a short form of the target, at most 40 characters:

- **View** opens the suggested URL in a new tab, to listen before deciding.
- **Accept** appends the URL to the song's links like a found link, saves the entry and marks
  the suggestion accepted. When the song has meanwhile got a link for that platform by other
  means, nothing is added and the suggestion is dropped as superseded, with the message
  "YouTube already has a link; suggestion dropped."
- **Reject** marks it rejected. That song is not searched on YouTube again.

After either the listing reloads its rows, so the badge count follows. Where suggestions come
from is on [Auto-fill](/smartlinks/auto-fill#suggestions).

## Search, sort, pages

The listing pages on the server, with core's paginator footer ("1–3 of 3"). Search matches the
title. Every column sorts, because the counts are computed on the server rather than stored on
the entry. The screen reads at most 2,000 songs.

Each row's menu ends with **Edit** and, while the routes are on, **Open page**, the landing
page in a new tab.

## Empty and unfinished installs

- **Migration not run:** a "Setup required" state saying that the `smartlinks_clicks` table is
  missing and that `php artisan migrate` creates it, and a warning in the log,
  `statamic-smartlinks: the smartlinks_clicks table is missing; run php artisan migrate.` Not
  a 500.
- **No songs:** a sentence saying that Smart Links reads the songs from the collections in
  `config/smartlinks.php`, and that there are none yet.
