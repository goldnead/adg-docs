# Integrations

<AddonHeader />

Sibling addons are detected automatically through `class_exists`. The package keeps
working without them, and nothing needs to be enabled on the other side.

| Integration | Detected class | Adds |
| --- | --- | --- |
| Webhook Manager | `Goldnead\WebhookManager\Facades\WebhookManager` | the *Send Webhook (via Webhook Manager)* action, with its destinations, plus the *Webhook Received* trigger |
| LeadHub | `Goldnead\Leadhub\Facades\LeadHub` | 6 LeadHub triggers and 11 LeadHub actions |
| Marketing | `Goldnead\Marketing\Services\SubscriptionService` | 3 Marketing triggers and 3 Marketing actions |
| Payments, Funnels, Courses, Affiliates, Entitlements, Booking, Invoices | per addon, under `integrations.<name>.detect` | their triggers, listed on [Triggers from the suite](/automations/suite-triggers) |
| Offers | `integrations.offers.detect` | no triggers of its own (Offers fires no events); the *Offer* and *Pricing option* filters on the payments triggers |

Class names are configurable under `integrations` in `config/automations.php`, so you can
swap implementations or use a fork. Leave the defaults otherwise.

Two integrations with outside services ship built in and need no sibling addon, only a
[connection](/automations/connections) as their credential: [CalDAV](#caldav) and
[Notion](#notion) <Badge type="tip" text="2.23.0" />.

## Webhook Manager

Two things arrive.

**Outbound.** The *Send Webhook (via Webhook Manager)* action lists your configured
outbound webhooks as destinations and dispatches one by handle. The delivery goes through
the real delivery engine, so it inherits the auth scheme, the retry policy, the delivery
snapshot and the replay button.

Prefer it over *Send Webhook (Simple)* wherever the destination matters. The simple
action is a direct POST with no retries, no signing and no delivery record.

**Inbound.** The *Webhook Received* trigger listens for the event Webhook Manager fires
when it receives a **validated** inbound request. So an external system can start an
automation, and the signature verification, rate limiting and replay protection are
handled before your flow ever sees it.

```php
'integrations' => [
    'webhook_manager' => [
        'detect' => ['Goldnead\WebhookManager\Facades\WebhookManager', /* … */],
        'outbound_repository' => 'Goldnead\WebhookManager\Contracts\Repositories\OutboundWebhookRepositoryInterface',
        'dispatch_action' => 'Goldnead\WebhookManager\Domain\OutboundWebhook\Actions\DispatchOutboundWebhookAction',
        'inbound_event' => 'Goldnead\WebhookManager\Events\WebhookReceived',
    ],
],
```

Note that destinations live in Webhook Manager's outbound **repository**, not on its
facade, which is why the adapter resolves an interface rather than calling a static.

## LeadHub

Six triggers and eleven actions, listed in the [node catalogue](/automations/nodes).

Five of the triggers are trigger classes; the sixth, *Contact score changed*, is
registered through the public `registerEventTrigger()` API against the event named in
`integrations.leadhub.score_changed_event`. Point that key elsewhere and the trigger
follows, without a code change here.

```php
'integrations' => [
    'leadhub' => [
        'detect' => ['Goldnead\Leadhub\Facades\LeadHub', 'Goldnead\Leadhub\LeadHubManager'],
        'emit_timeline_events' => true,
        'score_changed_event' => 'Goldnead\Leadhub\Events\LeadHubContactScoreChanged',
    ],
],
```

`emit_timeline_events` is on by default and means an automation that changes a lead
writes a timeline entry on it. Leave it on: the CRM timeline then shows that an
automation did this, not a person, which is the difference between a useful history and a
confusing one.

### The LeadHub timeline

Since 2.5.0 the **mails** an automation sends land there too. The contact screen answers "what has
this person had from us"; campaigns report themselves from Marketing's side, and the mails an
automation sends — often the very first ones anybody receives — were the one part of that answer
missing.

```php
'timeline' => [
    'enabled' => true,
],
```

::: warning What the entry cannot say, it says itself
An automation's mail goes out **through the mailer, not through Marketing's tracked send path**.
There is no pixel and no rewritten link, so there is no open and no click to report.

One entry, "sent", with that note attached. A timeline that stayed quiet about it would read as
"never opened", which is a different and untrue thing.
:::

Four properties worth knowing:

- **Only for contacts that already exist.** An automation may legitimately mail somebody who is not
  in the CRM, and creating a record here would be the automation quietly filing people.
- **Never fatal.** It hangs off the end of a send that has already succeeded. A CRM mid-upgrade must
  not turn a delivered mail into a failed step.
- **Test runs write nothing.** Not because the action happens to withhold the address in test mode,
  but checked explicitly on the run: `test_mode.send_real_emails` is a shipped, supported option, and
  with it on the success path hands back a real recipient again.
- **`marketing.send_email` stays out of it** and reports itself from Marketing's side, or every such
  mail would appear on the contact twice.

Everything goes through `Integrations\LeadHub\LeadHubAdapter`, which resolves LeadHub out of the
container and answers "not installed" without an error. No class name from the sibling addon appears
anywhere on this path — that is what keeps the integration optional.

The entry type is `automations.mail_sent`, deduplicated per run and step.

The address is read out of whatever the node's recipient field held, so `Lea <lea@example.test>`
resolves to a mailbox the CRM can look up. Without that the entry would simply never appear —
silently — for every automation whose recipient is written with a display name.

A step that mails several people writes the entry for the **first** address only. The alternative is
a CRM lookup per recipient on a path that hangs off every send, and multi-recipient steps are rare.

::: tip Two namespaces that have cost real time
LeadHub's PSR-4 namespace is `Goldnead\Leadhub` — **lowercase "hub"** — even though the
brand is "LeadHub". And this addon's own namespace is `Goldnead\StatamicAutomations`, not
`Goldnead\Automations`.
:::

## What Automations does *not* see

LeadHub emits a large event surface; the flow builder exposes a curated subset of it as
triggers.

Notably: **Automations sees the bridged LeadHub events, not raw ingestion source
events.** A purchase arriving through `LeadHub::ingest()` produces a
`LeadHubSourceIngested` event and a timeline entry, and an automation can react to the
lead changes that result — but there is no trigger for "any raw source event of type X".

If you need that, register the LeadHub event you care about as a
[custom event trigger](/automations/extending#turning-an-application-event-into-a-trigger).
That is a one-call registration and it puts the node in the library with a generated
config form.

## Marketing

Detected the same way as the other two: this addon checks whether Marketing is present
and, if it is, registers

- Triggers: `marketing.subscribed`, `marketing.unsubscribed`,
  `marketing.campaign_sent`
- Actions: `marketing.subscribe`, `marketing.unsubscribe`,
  `marketing.send_campaign`

So they appear in the node library when Marketing is installed, with no configuration in
either addon. See [Marketing → Extending](/marketing/extending).

The published `config/automations.php` has no `integrations.marketing` block, because the
detector carries its own fallbacks — `Goldnead\Marketing\Services\SubscriptionService`
and `Goldnead\Marketing\ServiceProvider`. Add the key yourself if you run a fork:

```php
'integrations' => [
    'marketing' => [
        'detect' => ['Acme\MarketingFork\Services\SubscriptionService'],
    ],
],
```

::: warning `marketing.send_campaign` is a real send
An automation action that sends a campaign to a list is not a transactional email. Filter
it hard, and remember that consent comes from the list — an automation cannot grant it.
See [Privacy & retention](/guide/privacy#consent).
:::

## CalDAV <Badge type="tip" text="2.23.0" /> {#caldav}

Two actions for a CalDAV calendar (iCloud, Nextcloud, Fastmail, mailbox.org, any server
that speaks CalDAV): find the events in a range, and keep a block of text inside an
event's description up to date. They were built for a shared band calendar whose events
are made by hand in a calendar app and get their details (programme, schedule, hotel)
filled in from Notion, but nothing in them knows about Notion.

### Setting it up

The credential is a **connection** (Automations → Connections), not an env key, so each
brand brings its own calendar:

- **Base URL:** the calendar collection itself, e.g.
  `https://p42-caldav.icloud.com/1234567/calendars/ABCD-…/`. For iCloud, the collection
  URL is what a CalDAV client like DAVx⁵ or Thunderbird shows after discovery.
- **Authentication:** Basic, with the account and an **app password** (iCloud:
  appleid.apple.com → Sign-In and Security → App-Specific Passwords).
- No operations are needed on the connection; the two actions talk to it directly.

Without a connection picked on the node, or with one that does not exist in the current
brand, both actions do nothing and fail with that message. Nothing is read or written.

Every call goes through the same fences as a connection operation: the host guard with
the pinned address, no redirects, and an `href` that points at another host, scheme or
port than the collection is refused rather than sent the credential.

### Find Events

`caldav.find_events`. Inputs: `connection`, `range_start`, `range_end` (anything a date
parser reads, in the site's time zone unless it says otherwise) and optionally
`url_contains` (only events whose URL field contains the text, case-insensitive).

One `REPORT` calendar-query with `Depth: 1`. The output:

| Field | |
| --- | --- |
| `events` | list of `{href, etag, uid, summary, dtstart, url, url_id, description}` |
| `count` | number of events |

One entry per event resource. A recurring series with changed occurrences (several
VEVENTs in one resource, the changed ones with `RECURRENCE-ID`) is one entry describing
the series. `dtstart` is the ICS value as it stands (`20260911` for an all-day event,
`20260911T190000Z` or a local time).

`url_id` is the id at the end of the URL's path, 32 hex digits or a UUID, returned
without dashes and lowercased; query and fragment do not count. For a Notion link
(`…/Sheet-Bevern-2026-3c8739f36bad809f90ebd3762307e5a1`) that is the page id, which makes
it the join key between a calendar event and a Notion page.

The raw calendar text never goes into the output, so it never reaches the run log. The
action only reads, so a test run reads too.

### Update Event Description Block

`caldav.upsert_description_block`. Inputs: `connection`, `href` (usually
`{{ item.href }}` from Find Events inside a loop), `block_text`, `marker_start`,
`marker_end`.

It fetches the event fresh (`GET`), sets `block_text` between the two marker lines in the
DESCRIPTION, and writes it back with `PUT` and `If-Match` on the ETag of that fetch,
**only if something changed**. Text people wrote before or after the block stays. Where
there is no block yet, it is appended after a blank line.

Only DESCRIPTION, DTSTAMP and LAST-MODIFIED change. The rest of the event goes back byte
for byte: the folding of other lines, the DESCRIPTION of a VALARM, parameters like
`LANGUAGE` or `ALTREP` on the description. Lines are folded at 75 octets without cutting
a UTF-8 character, TEXT values are escaped, and the written text always uses CRLF.

::: tip Every VEVENT gets the block, on purpose
A recurring series with a changed occurrence is one resource holding the series and, for
each changed date, its own VEVENT with a `RECURRENCE-ID` and its own DESCRIPTION. A
calendar app shows that occurrence's description, not the series', so a block written
only into the series would be missing exactly on the dates someone moved.
:::

| `status` | Step | Meaning |
| --- | --- | --- |
| `written` | success | changed and accepted by the server; `etag` is the new one if the server names it |
| `unchanged` | success | the block already stands so; no PUT went out |
| `skipped_empty` | success | `block_text` is empty; nothing is read or written, an existing block stays |
| `would_write` | success | test run: read, computed, not written |
| `conflict` | failed | 412, the event changed after it was read; a retry reads it again |
| `error` | failed | `reason` says why: `marker_missing`, `not_ics` (a 200 without any VEVENT, e.g. a login page), `not_found`, `no_etag`, `foreign_host`, `http_<status>`, `request_failed` |

`marker_missing` means the description holds the start marker but not the end marker.
There is then no telling where the block ends, and rather than cut off what someone typed
after it, nothing is written. A person fixes the markers.

Pick the markers once. A block under an old marker is not found again, and the next run
appends a second one.

## Notion <Badge type="tip" text="2.23.0" /> {#notion}

Three read-only actions (group **Notion**): rows of a data source, pages by ID, the text
of a page. Nothing here writes to Notion.

### Setting it up

1. In Notion, create an integration (Settings → Connections → Develop or manage
   integrations) and copy its token. Invite the integration to every page and database
   it should read: Notion answers 404 for anything not shared with it.
2. Under **Automations → Connections**, add a connection with the handle `notion`, base
   URL `https://api.notion.com` and **Bearer token** auth with the token.

The nodes take only the token and the timeout from the connection (not its default
headers) and always call `https://api.notion.com/v1/` with `Notion-Version: 2025-09-03`.
A node's **Connection** field names another connection by handle, for a second
workspace. Without a connection, with one that has no token, or with one whose auth is
not bearer, the nodes read nothing and fail with that reason, so a credential meant for
another service never reaches Notion. 429 and 5xx answers are retried twice.

Limits per node run: a query sends at most 50 requests, the children of one block are
read up to 1000 (more fails the node rather than returning part of the page), and one
node sends at most 300 requests in all.

### Nodes

| Node | Reads | Output |
| --- | --- | --- |
| Query Data Source (`notion.query_data_source`) | rows of a data source, with a raw JSON `filter` and `sorts`, and **Related to any of**: a relation property plus a list of page IDs | `pages`, `count`, `has_more`, `data_source_id` |
| Get Pages (`notion.get_pages`) | pages by ID (a list, JSON or text; IDs or Notion links), at most 100 | `pages`, `count`, `missing` |
| Get Page Text (`notion.page_text`) | the text blocks of a page, 1 to 3 levels deep | `blocks`, `plain`, `page_id` |

The data source ID is not the database ID: since API version 2025-09-03 a database can
hold several data sources (database menu → Manage data sources → Copy data source ID).

**Related to any of** with an empty ID list reads no rows and does not ask Notion;
without the filter, the query would have returned every row. `max_pages` caps the
requests (100 rows each, default 10), and `has_more` says whether the cap cut the list
short. A page that cannot be read fails Get Pages unless **Skip pages that cannot be
read** is on.

### Page values

Every page comes as `{id, url, title, created_time, last_edited_time, properties}`, each
property as a plain value under its name:

| Notion type | Value |
| --- | --- |
| title, rich_text | text |
| number, checkbox, url, email, phone_number | the value |
| select, status | the option's name |
| multi_select | list of names |
| date | `{start, end, time_zone, has_time, start_date, start_time, end_date, end_time}` |
| relation | list of page IDs (Notion includes at most 25 per page) |
| rollup | array rollup: list of values, relation entries spread into page IDs; number or date rollup: the value |
| formula | its value |
| people, files, unique_id | names, URLs, `PREFIX-12` |

**Dates and time zones.** Notion sends a time either with an offset in the string, or
without one plus a `time_zone`, meaning local time in that zone. Read naively, the second
form is off by the zone's offset. `start` and `end` therefore come out as ISO 8601 with
the offset written in, which every filter and modifier reads correctly; `start_date`,
`start_time`, `end_date`, `end_time` are the same moments in the node's **Time zone for
dates** (default: the site's display time zone). A date without a time stays
`2026-12-12`.

### Page text

`blocks` is a tree: `{type, text, children}` for paragraphs, headings, list items, to-dos
(`checked`), toggles, quotes, callouts and code. Columns and synced blocks give way to
their children; images, embeds, child databases and dividers are skipped. A callout also
has `heading` (its own text, or else a quote at its top) and `body` (its children without
that quote). `plain` is the whole tree as lines, with bullets and check boxes.

**Skip empty blocks** (on) drops blocks without text or children. **Skip empty template
labels** (off) drops lines that are only a label with a colon, such as `Zimmer gebucht:`,
left over from a page template.

All three only read, so a test run reads for real and shows the actual rows.

### A gig sheet on the canvas

Manual or scheduled trigger, then:

1. **Query Data Source (Notion)** on the sheets (key `sheets`).
2. **Loop** over `{{ nodes.sheets.pages }}`.
3. In the loop: **Query Data Source (Notion)** on the timetable (key `zeitplan`),
   **Related to any of** `Konzertkalender` = `{{ item.properties.Konzertkalender }}`,
   sorted by `Date`, time zone `Europe/Berlin`.
4. **[Compose Text](/automations/nodes#compose-text)**:

```antlers
{{ item.title }}

Zeitplan{{ days = nodes.zeitplan.pages | pluck('properties.Date.start_date') | unique | count }}
{{ nodes.zeitplan.pages }}{{ if days > 1 }}{{ properties.Date.start_date | format('d.m.') }} {{ /if }}{{ properties.Date.start_time }}{{ if properties.Date.end_time }}–{{ properties.Date.end_time }}{{ /if }} {{ title }}
{{ /nodes.zeitplan.pages }}

Notion: {{ item.url }}
```

A timetable over several days puts the date in front of each line; one day shows only the
times. Venue and hotel pages behind a rollup come from Get Pages with
`{{ item.properties.Venue }}`, callout sections from Get Page Text with `{{ item.id }}`.

To put the result into the calendar, the event's `url_id` from
[Find Events](#find-events) is the join key to the sheet's page id, and
[Update Event Description Block](#update-event-description-block) writes the composed
text between its markers. Run that as often as you like: an event whose block already
stands is `unchanged` and gets no PUT.

## Notifications and Activity

Neither is wired into the flow builder. They integrate with LeadHub and Marketing
directly, so an automation that changes a lead ends up in the Activity ledger and can
trigger a notification without going through a node.

If you want an automation to notify somebody through the Notifications addon, the current
answer is a custom action:

```php
Automations::registerAction(NotifyViaNotificationsAction::class);
```

See [Extending](/automations/extending).

## Detection is one-way and passive

The addon that *offers* the integration checks whether the other is present, at boot,
with `class_exists`. There is no handshake and no configuration on the other side.

Two consequences worth knowing:

- **Install order does not matter.** Detection happens at boot, not at install.
- **A too-old sibling degrades rather than fails.** The capability check is
  `method_exists(Facade::getFacadeRoot(), 'theMethod')` — on the facade **root**, because
  `method_exists` on a facade class returns `false` for everything it forwards through
  `__callStatic`. Getting that wrong is how every LeadHub action node once failed silently
  on every real install.

## Turning an integration off

Remove the class name from `detect`, or uninstall the sibling. There is no separate
enable flag, because the presence of the class *is* the flag.
