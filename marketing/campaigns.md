# Campaigns

<AddonHeader />

A campaign is one send: a subject, a body, an audience, a schedule, and its report.

**Marketing → Campaigns**, behind `manage marketing campaigns`. Sending is the separate
`send marketing campaigns` permission — writing the newsletter and pressing send to four thousand
people are different levels of trust.

## Composing

The body is Antlers, so the merge variables are ordinary Antlers tags:

```antlers
<p>Hallo {{ first_name }},</p>

<p>hier ist die Ausgabe dieses Monats.</p>

<p><a href="{{ unsubscribe_url }}">Abmelden</a></p>
```

| Variable | Resolves to |
| --- | --- |
| `{{ first_name }}` | The contact's first name |
| `{{ name }}` | Full name |
| `{{ email }}` | The recipient's address |
| `{{ unsubscribe_url }}` | The recipient's tokenised unsubscribe link |

::: danger `{{ unsubscribe_url }}` is not optional
Legally in most jurisdictions, and practically for deliverability. A campaign without it will send,
and the complaints that follow are worse than a bounce. Put it in the **template** so no individual
campaign can forget it.
:::

Variables that resolve to nothing render as nothing, so `Hallo {{ first_name }},` becomes
`Hallo ,` for a contact with no first name. Guard it:

```antlers
<p>{{ if first_name }}Hallo {{ first_name }}{{ else }}Hallo{{ /if }},</p>
```

## Templates

A campaign body is rendered **into** a template: the wrapper markup, the header, the footer, the
unsubscribe link, the styles. Reusable across campaigns, and behind
`manage marketing templates`.

Put everything every campaign needs in the template, and keep campaigns to their actual content.
That is what stops the fifth newsletter from being the one that shipped without a footer.

Optionally, author templates as Bard entries in the Control Panel with
[Email Templates](/email-templates/). A managed entry wins and a file fallback keeps un-migrated
slugs working, so adding that addon later breaks nothing.

## The audience

```
subscribed list members ∩ segment members
```

Pick a list. Optionally narrow with a [LeadHub segment](/marketing/segments), which shows a live
member count in the CP.

**The segment only narrows.** Consent comes from the list, and no segment means the whole list. A
segment can never add a recipient who is not a subscribed member.

Only `subscribed` members are mailed. `pending` rows — someone who started a double opt-in and never
confirmed — are excluded, because they are a record that somebody began, not permission.

## Preview and test send

Both, before every real send.

**Preview** renders the campaign in the template with sample data. **Test send** delivers a real
email to an address you name, through the real render and send path.

The test send is the one that matters. It is the same code path as the real send, so it catches the
things a preview cannot: a template variable that does not resolve, an image URL that is relative, a
`{{ unsubscribe_url }}` you forgot.

Read it in a real mail client, not only in a browser.

The preview is deliberately inert. It is HTML a Control Panel user wrote, so since 1.9.0 the
response carries `Content-Security-Policy: sandbox; default-src 'none'` and the iframe around it
carries `sandbox` without `allow-scripts` or `allow-same-origin`. Images and inline styles are
handed back explicitly, because a preview without them is not a preview; scripts never are. A
template containing a `<script>` will therefore look right and do nothing.

## Scheduling

Set a send time and the campaign goes out when it arrives.

```bash
php artisan marketing:send-scheduled     # registered to run every minute
```

::: danger Without the scheduler, scheduled campaigns silently never send
No error, no failed job, no warning in the CP. The campaign sits there looking scheduled.

```bash
php artisan schedule:work    # or a cron entry calling schedule:run
```

This is the single most common way a Marketing install disappoints somebody.
:::

## Send now

Queues the batch immediately. See [Sending](/marketing/sending) for chunking, throttling and what
happens when it goes wrong.

There is no undo. A queue that is paused can be drained before it delivers much; a campaign that has
started sending cannot be recalled.

## The report

Per campaign: open rate, click rate, bounces and unsubscribes, plus the per-recipient message
records behind them.

<Figure
  src="marketing-campaign-report"
  alt="A sent campaign's report with recipient and send counts, open and click rates, failures, bounces, and a per-recipient table"
  caption="The per-recipient rows are what make &quot;did this person get it&quot; answerable, and where a bounce is recorded." />

Treat **click rate** as the real number. Open tracking is structurally unreliable — image-blocking
clients never report an open, prefetching clients report opens nobody made — so a low open rate may
be your audience's mail client rather than your subject line. See
[Tracking](/marketing/tracking).

### The five tabs

Since 2.9.0 the report is five tabs, and each one names the people behind its number rather than
only the number:

| Tab | Answers |
| --- | --- |
| **Overview** | The figures, the A/B variants where there are any, and the timeline below |
| **Delivery** | Who it was sent to and what became of it, filterable by status |
| **Opens** | Who, when first, when last, how many — and how much of that was machine |
| **Clicks** | Who, when, which link — plus a breakdown per link, with clicks and distinct people |
| **Unsubscribes** | Who, and when |

Every person tab paginates at 50 and eager-loads, so the number of queries a page costs does not
depend on how many recipients the campaign had.

**A failed send now carries its reason.** The column had been in the database since the beginning
and was never shown; it is on the delivery tab, and only on campaigns where something actually
failed — a column of dashes on every report of every install that never fails is noise.

::: tip The opens tab lists by first open, not by the counter
Somebody who blocks images and clicks has `opens = 0` and a `first_opened_at` — a click sets that
timestamp. Ordering by the counter dropped exactly those people out of the tab whose first column is
that timestamp.
:::

### The timeline

On the overview: **scheduled → sending started → sent → first open → last activity**.

A station that did not happen is left out rather than shown empty. A campaign that was never
scheduled has no scheduling to report, and a row reading "Scheduled: —" is an invitation to wonder
what went wrong.

"Sending started" is the only derived station — nothing records when a fan-out began — so it is
dropped rather than printed when it would land after "sent". That happens with messages written
retrospectively, and a timeline reading "sent on the 12th, started on the 15th" is worse than a
timeline with one station fewer.

### CSV export

Every tab exports the same selection it is showing, streamed rather than built in memory, behind
`manage marketing campaigns`.

The file always carries every column of its tab, including the ones the screen hides — a file is
read by a program, and a column that appears and disappears is worse there than an empty one. A
leading `=`, `+`, `-` or `@` in a cell is neutralised: the name fields come from a public sign-up
form, so a stranger chooses their contents, and a spreadsheet executes a cell beginning with `=` on
open, for the person who has the right to the export.

### The link to the contact

Every row links to the [LeadHub contact](/leadhub/contacts) where there is one, and **never creates
one**. A report is a read.

Resolution is over the normalised address rather than `contact_uuid`: the uuid only exists once a
subscription has been confirmed and synced, and an unconfirmed sign-up is precisely what somebody
opens this screen to look at. A Control Panel user with Marketing's permissions but none of the
CRM's gets no links at all, rather than rows that 403 on click.

## The web archive

A campaign can also exist as a public web version on a stable, readable URL — no token, so it can be
linked, shared and indexed. It is not the personalised page a token link in a mail leads to.

::: warning It ships switched off, and while it is off its routes do not exist
```dotenv
MARKETING_ARCHIVE=false     # the shipped default
```

The three routes — the index, `feed.xml`, and one page per campaign — are registered inside an
`if` on this flag, so with the archive off they are not merely empty, they are absent.

If you are looking for the **Publish a public web version** switch on a campaign and cannot find it,
this is why: the panel is only drawn once the archive is on. Turn it on, then release the campaign.
:::

The default is `false` because the archive claims a readable path — `newsletter` unless you change
`archive.prefix` — and a site that already has a page there would lose it to a `composer update`. A
package may not take a public URL from its host without being asked.

Visibility is then **per campaign and off by default**: nothing appears on the open web until an
editor releases it from the campaign's own page. A campaign can carry a price, a segment's context or
an individual address, and none of that should go public because a package was updated.

```php
'archive' => [
    'enabled' => env('MARKETING_ARCHIVE', false),
    'prefix' => env('MARKETING_ARCHIVE_PREFIX', 'newsletter'),
    'title' => env('MARKETING_ARCHIVE_TITLE'),
    'neutral_name' => null,
    'feed_limit' => 20,
],
```

`neutral_name` is what stands in for `{{ first_name }}` and `{{ name }}` in the web version. There is
no recipient there, so a greeting has to be addressed to somebody. Left `null` it uses the
translation `marketing::public.archive_neutral_name`.

## Storage

Campaigns live wherever your driver says: YAML under `content/marketing/campaigns/` on the default
`flat` driver, or database rows on `eloquent`. Per-recipient messages and events are always Eloquent.

The flat driver makes a campaign reviewable in a pull request, which is a genuine benefit for a
newsletter that goes to a large list.

## Multi-brand

Campaigns are brand-scoped. A campaign belongs to one brand and can only target that brand's lists,
which is what stops a mis-click sending Acme's newsletter to Contoso's subscribers.

## Automations

With [Automations](/automations/) installed, `marketing.campaign_sent` becomes a trigger and
`marketing.send_campaign` becomes an action.

::: warning `marketing.send_campaign` is a real send
An automation action that sends a campaign to a list is not a transactional email. Filter it hard,
and remember that consent comes from the list — an automation cannot grant it.
:::
