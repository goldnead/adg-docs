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

- The **tokenised link** in the email footer.
- **RFC 8058 one-click**, via `List-Unsubscribe` and `List-Unsubscribe-Post` headers, which is
  what a mail client's own unsubscribe button uses.
- **Suppression** from a hard bounce or a complaint, which is not the person's decision but has the
  same effect.

```php
'unsubscribe' => ['global_opt_out' => false],
```

Turn `global_opt_out` on if unsubscribing from one list should mean "do not contact me at all",
which sets LeadHub's `do_not_contact` and stops every CRM push too.

### The preference centre <Badge type="tip" text="1.7.0" />

An unsubscribe token identifies **one subscription**, one address on one list, so the link has
always been per list. What was missing was everything after the click: the confirmation page
said "you have been removed from X" and stopped, never mentioning the four other lists the same
brand runs.

Since 1.7.0 the unsubscribe page is the entry rather than the end. The unsubscribe still happens
on arrival, unchanged, and the page then shows every list of that brand with its current state
and lets each one be switched:

```
GET  /!/marketing/preferences/{token}
POST /!/marketing/preferences/{token}
```

The `POST` takes `action=save` with a `lists[]` selection, or `action=unsubscribe_all`.

There is no login, and that is a decision rather than an omission. Almost no subscriber has an
account on the site that mails them, and a registration form standing between a person and their
unsubscribe is a dark pattern with a password field on it. The token is the credential. It is
also the only thing the request carries: there is no session to read a brand from, so the brand
is derived from the token via `SetBrandFromRouteValue` on `Subscription.token`, exactly as the
unsubscribe route does.

::: warning "Unsubscribe from everything" means every list of this brand
Not the CRM-wide opt-out. Somebody done with one brand's mailings has said nothing about another
brand's, and nothing at all about transactional mail, which does not rest on consent in the first
place. Where `unsubscribe.global_opt_out` is on, it still applies through the ordinary
unsubscribe path, not through this button.
:::

The page renders from `preferences.blade.php`. Publish the views to restyle it:

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
