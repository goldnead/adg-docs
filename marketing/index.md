# Marketing

<AddonHeader />

Email marketing and newsletters directly inside your Statamic 6 Control Panel: mailing lists,
double opt-in, campaigns, batch sending, and open and click tracking.

Think Mailcoach, but native to Statamic and built on top of [LeadHub](/leadhub/) contacts.

## The one hard dependency

**A subscriber is a LeadHub contact.** There is no separate subscriber table, so
`goldnead/statamic-leadhub` is required rather than suggested — the only hard inter-addon
dependency in the suite.

| Addon | Role |
| --- | --- |
| [LeadHub](/leadhub/) | CRM: contacts, tags, timeline. **Required.** |
| [Webhook Manager](/webhook-manager/) | Optional: ESP feedback webhooks in, marketing events out |
| [Automations](/automations/) | Optional: marketing triggers and actions in the visual builder |
| [Email Templates](/email-templates/) | Optional: CP-authored template bodies |

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
  `do_not_contact`.
- **LeadHub-native** — subscribing upserts the contact, records timeline events, and tags
  contacts with `list:{handle}`. Hard bounces and complaints opt the contact out.
- **Flat-file first** — lists, campaigns and templates live as YAML under
  `content/marketing/`; runtime data is always Eloquent.

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
