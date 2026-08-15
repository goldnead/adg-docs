# Marketing

<AddonHeader />

Email marketing and newsletters directly inside your Statamic 6 Control Panel: mailing lists,
double opt-in, campaigns, batch sending, and open and click tracking.

Think Mailcoach, but native to Statamic and built on top of [LeadHub](/leadhub/) contacts.

## What it depends on

**A subscriber is a LeadHub contact.** There is no separate subscriber table, which is the reason
`goldnead/statamic-leadhub` is required rather than suggested. Two more siblings are in `require`
beside it, so a bare `composer require` installs three addons whether or not you asked.

| Addon | Role |
| --- | --- |
| [LeadHub](/leadhub/) `^1.4` | CRM: contacts, tags, timeline. **Required.** |
| [Suppression](/suppression/) `^1.0` | The gate every send path asks before it mails. **Required.** |
| [Brand Context](/brand-context/) `^1.4` | Brand resolution on the public routes. **Required**, multi-brand mode optional. |
| [Preference Center](/preference-center/) | Optional: the multi-list preference page the footer link points at |
| [Webhook Manager](/webhook-manager/) | Optional: ESP feedback webhooks in, marketing events out |
| [Automations](/automations/) | Optional: marketing triggers and actions in the visual builder |
| [Email Templates](/email-templates/) | Optional: CP-authored template bodies, detected at runtime |

## What it does

- **Mailing lists** with per-list double opt-in — confirmation mail plus a tokenised confirm
  link — and a honeypot-guarded public subscribe endpoint.
- **Campaigns** composed in Antlers (`{{ first_name }}`, `{{ unsubscribe_url }}`, …), wrapped in
  reusable email templates, with preview, test send, scheduling and send-now.
- **Segment targeting** — narrow a campaign's audience to a
  [LeadHub segment](/leadhub/segments), with a live member count in the CP.
- **Queued batch sending** through any Laravel mailer, with a configurable throttle,
  per-recipient message records and automatic finalisation.
- **Tracking** — open pixel, signed click redirects, per-campaign reports with open and click
  rates, bounces and unsubscribes.
- **Unsubscribes** via a tokenised link plus RFC 8058 one-click
  (`List-Unsubscribe` / `List-Unsubscribe-Post`), with optional global opt-out to LeadHub's
  `do_not_contact`. The footer link goes to the [Preference Center](/preference-center/) where that
  addon is installed; the one-click endpoint is always this addon's own.
- **LeadHub-native** — subscribing upserts the contact, records timeline events, and tags
  contacts with `list:{handle}`. Hard bounces and complaints opt the contact out.
- **Flat-file first** — lists, campaigns and templates live as YAML under
  `content/marketing/`; runtime data is always Eloquent.
- **A dashboard** — audience totals, the most recent campaigns, and two charts: engagement across
  the last twelve sent campaigns, and list growth week by week. See [The dashboard](#the-dashboard).

## The consent rule

Two sentences that govern everything else on this site:

> **A list grants consent. A segment only narrows.**

A campaign's audience is `subscribed list members ∩ segment members`, resolved at send time. No
segment means the whole list, and a segment can never add a recipient who is not a subscribed
member of the list.

One address on one list is one consent record, enforced by a database unique index. See
[Unsubscribes & suppression](/marketing/suppression) and
[Privacy & retention](/guide/privacy#consent).

## The shortest useful path

```bash
composer require goldnead/statamic-marketing
php artisan migrate
```

1. CP → **Marketing → Lists → Create**, handle `newsletter`, double opt-in on.
2. Put the form on a page:

```antlers
{{ marketing:subscribe list="newsletter" class="newsletter-form" }}
    <input type="email" name="email" required placeholder="you@example.com">
    <input type="text" name="first_name" placeholder="First name">
    <button>Subscribe</button>
{{ /marketing:subscribe }}
```

3. Subscribe yourself, confirm the email.
4. **Marketing → Campaigns → Create**, write it, **test send**, then send.

## The dashboard

CP → **Marketing** opens on it: how many people are subscribed and how many are still pending, one
row per list, the five most recent campaigns — and, since 2.10.0, two charts.

### Engagement across recent campaigns

Open and click rate of the last twelve campaigns that actually went out, oldest on the left, because
a trend is read left to right. Drafts and scheduled campaigns are left out: an open rate on a
campaign that was never sent is a nought pretending to be a result.

The rates are the ones the campaign's own report prints — the same calculation, not a second one
that happens to agree today. What [Tracking](/marketing/tracking#how-to-read-your-numbers-now) says
about the open rate applies here unchanged: it is the number that counts every pixel fetch, machine
or person, and it is the only one that stays comparable with campaigns sent before 2.8.0.

The bars are scaled to the largest rate in the row rather than to a fixed hundred, since a
three-percent click rate against a full-height axis is a line nobody can compare. The top of the
axis is therefore named above the chart. Two sentences appear when they apply: that a trend needs at
least two sent campaigns, and that the newest bar is early — a campaign less than 48 hours old is
still collecting its opens, and read as a trend it says "engagement is falling" about nothing.

### List growth

Sign-ups against sign-offs per week, over twelve weeks. Weeks start on Monday whatever the CP
language is set to, so the same install does not regroup its own history when somebody switches
language. A week nobody joined is an empty track rather than a missing column — dropped, the bars
close ranks and a quiet month looks like a busy one.

::: warning It is the list as the database stands today, not a ledger of events
A sign-off is recorded on the subscription, and it is **cleared** when the same address subscribes
again. Somebody who left in week two and came back in week five is therefore gone from week two, and
appears only with the new sign-up. The page carries that sentence under the chart.

Unsubscribe events are never rewritten, but they are the worse source for this question: one is only
recorded where the unsubscribe carried a message, so every sign-off made in the
[Preference Center](/preference-center/) would be missing. Complete beats immutable here.
:::

Sign-ups are counted from the moment the form was submitted, which is **before** a double opt-in is
confirmed. That is the honest answer to "did people join this week". Counting confirmations instead
would look stricter and be worse: rows that arrived by import have no confirmation on record, and
their weeks would silently read nought.

## What it is not for

- **One transactional email in response to one event.** That is
  [Automations](/automations/nodes) — this addon is built around lists and consent.
- **An ESP.** It sends through your Laravel mailer. Deliverability, SPF, DKIM and reputation are
  still your provider's job.
- **A CRM.** Contacts belong to LeadHub.

## Next

- [Installation](/marketing/installation)
- [Configuration](/marketing/configuration)
- [Concepts](/marketing/concepts)
- [Lists & subscriptions](/marketing/lists)
- [Front-end forms](/marketing/forms)
- [Campaigns](/marketing/campaigns)
- [Sending](/marketing/sending)
- [Tracking](/marketing/tracking)
- [Unsubscribes & suppression](/marketing/suppression)
- [Sending to a segment](/marketing/segments)
- [Extending](/marketing/extending)
- [Reference](/marketing/reference)
- [Troubleshooting](/marketing/troubleshooting)
