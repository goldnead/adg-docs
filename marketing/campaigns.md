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
