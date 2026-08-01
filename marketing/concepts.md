# Concepts

<AddonHeader />

| Term | Means |
| --- | --- |
| **List** | A mailing list. **A list grants consent.** |
| **Subscription** | One address on one list. This *is* the consent record. |
| **Campaign** | One send: a subject, a body, an audience, a schedule, a report |
| **Template** | Reusable wrapper markup a campaign body is rendered into |
| **Message** | One campaign's delivery to one recipient |
| **Message event** | An open, click, bounce or complaint on a message |
| **Suppression** | An address that must not be sent to again |

## A subscriber is a LeadHub contact

There is no separate subscriber table. Subscribing:

1. upserts the LeadHub contact
2. creates or updates a `marketing_subscriptions` row for that list
3. records timeline events (`marketing.subscribed` / `marketing.unsubscribed`)
4. tags the contact `list:{handle}`

Which means a newsletter signup and a form inquiry from the same address are **one person**, with
one timeline. That is the reason for the hard dependency.

## The consent rule

> **A list grants consent. A segment only narrows.**

A campaign's audience is `subscribed list members ∩ segment members`, resolved at **send** time.
No segment means the whole list. A segment can never add a recipient who is not already a
subscribed member.

If you find yourself wanting a segment to *be* the audience, you want a list.

### One address, one list, one subscription

Enforced by a database unique index, because that is the only place a guarantee about people can
actually live.

```bash
php artisan marketing:consent-integrity            # reports; changes nothing
php artisan marketing:consent-integrity --repair
```

It names any list/address pair holding more than one subscription, with each row's id, status and
confirmation date, and exits non-zero if the guarantee is not in force. It **never deletes a
subscription**, and `--repair` refuses to build the index while anything would have to go for it —
which of two sign-ups is *the* consent record is not a decision a schema change gets to make.

## Subscription states

| State | Means |
| --- | --- |
| `pending` | Subscribed, awaiting double-opt-in confirmation. **Not mailable.** |
| `subscribed` | Confirmed. Mailable. |
| `unsubscribed` | The person opted out |

With double opt-in off, a subscription goes straight to `subscribed`.

A campaign only ever goes to `subscribed` members. A `pending` row is a record that somebody
started, not permission to mail them.

## Double opt-in

Per list, on by default for new lists. Subscribing sends a confirmation mail with a **tokenised**
link; clicking it confirms.

The token is what makes the link work at all: it is opened without a session, so in multi-brand
mode nothing would be visible to the fail-closed scope. The brand comes from the token. See
[Brand Context → Public routes](/brand-context/public-routes).

## Sending

Queued, batched, throttled:

```php
'sending' => [
    'chunk' => 200,
    'messages_per_minute' => 0,   // 0 = no throttle
],
```

The audience is resolved at send time, one `Message` row is created per recipient, and the campaign
finalises automatically when the batch completes. Each message carries its own tracking identity,
which is what makes per-recipient reporting possible.

## Tracking

An open pixel and signed click redirects, both per recipient, feeding the campaign report:
open rate, click rate, bounces, unsubscribes.

Open tracking is structurally unreliable — image-blocking clients never report, prefetching
clients report opens nobody made. Treat click rate as the real number.

## Unsubscribing

Three routes, all of which end in the same state:

- The **tokenised link** in the email footer, `{{ unsubscribe_url }}`.
- **RFC 8058 one-click**, via `List-Unsubscribe` and `List-Unsubscribe-Post` headers, which is
  what a mail client's own unsubscribe button uses.
- **Suppression** from a hard bounce or a complaint, which is not the person's decision but has the
  same effect.

The tokenised link ends the subscription **on arrival**. `GET {prefix}/unsubscribe/{token}`
unsubscribes and then renders a page saying so; there is no confirmation step to get wrong and no
second click to miss.

```php
'unsubscribe' => ['global_opt_out' => false],
```

Turn `global_opt_out` on if unsubscribing from one list should mean "do not contact me at all",
which sets LeadHub's `do_not_contact` and stops every CRM push too.

### Where the preference page lives <Badge type="tip" text="1.9.0" />

An unsubscribe token identifies **one subscription**, one address on one list. So this addon's own
page can only honestly speak about that one list: it ends the subscription, says so, and stops.

Everything beyond that — every list of the brand, the notification types and the suppression state
on one screen — belongs to the [Preference Center](/preference-center/) addon. Until 1.9.0 Marketing
shipped a second copy of that page and kept linking to its own, so installing the preference centre
changed nothing a reader could see. Marketing's copy, and its route, are gone.

Which of the two a link points at is decided in one place, `Support\PreferenceLink`:

| Link | Goes to |
| --- | --- |
| `{{ unsubscribe_url }}` — the footer link a person clicks | the preference centre where it is installed, this addon's unsubscribe page otherwise |
| `{{ one_click_unsubscribe_url }}` — the RFC 8058 header | **always** this addon's own endpoint |

That split is the whole point. A provider POSTing `List-Unsubscribe` expects an unsubscribe, not a
form. And stopping mail is a legal obligation, so it may not depend on somebody having chosen to
install an optional package: the one-click path works on a bare install.

Detection is `class_exists()` on the centre's facade **and** a lookup in the route registry. The
centre registers its token route only where Marketing is present, so class-present and route-absent
is a real state rather than a hypothetical one.

::: danger `/!/marketing/preferences/{token}` is gone, and nothing redirects it
The route was removed in 1.9.0. Links in newsletters you have **already sent** point at it and now
return 404.

No redirect ships with the addon. The old URL and the new one carry the same token, but only your
application can decide where to forward it, so if you have delivered mail carrying those links, add
that redirect yourself before you upgrade. This is a breaking change inside a minor release; it is
called out here because the version number does not call it out for you.
:::

The public pages that remain — the confirmation page and the unsubscribe page — render from this
addon's views. Publish them to restyle:

```bash
php artisan vendor:publish --tag=marketing-views
```

## Storage

| What | Where |
| --- | --- |
| Lists, campaigns, templates | `flat` (default) or `eloquent` |
| Subscriptions, messages, events | **always Eloquent** |

Configuration is authored, reviewed and deployed, and belongs in git. Runtime data is high-volume
and useless in a diff. So "flat driver" means your *lists* are files and your *subscriptions* are
rows.

## Multi-brand, and the one exception

Lists, campaigns and templates are brand-scoped — the eloquent driver by `brand_id`, the flat
driver by directory.

**But list handles are unique across all brands.** The public subscribe endpoint derives the brand
from the list handle the form names, so there is no brand in the URL and nothing for a visitor to
get wrong — and that only holds while a handle has exactly one owner. Creating a duplicate is
refused with a message naming the brand that holds it.

Consent itself remains per brand: the same address can hold independent state in two brands, because
somebody who unsubscribed from Acme has said nothing about Contoso.

## Where this addon stops

| Concern | Owner |
| --- | --- |
| One transactional email for one event | [Automations](/automations/nodes) |
| Contacts, tags, timelines, segments | [LeadHub](/leadhub/) |
| The authored template body | [Email Templates](/email-templates/) |
| Receiving ESP bounce webhooks reliably | [Webhook Manager](/webhook-manager/inbound) |
| Deliverability, SPF, DKIM, reputation | your mail provider |
