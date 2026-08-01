# Unsubscribes & suppression

<AddonHeader />

Three ways an address stops being mailed, two of them the person's decision and one of them not.

| | Who decided | Mechanism |
| --- | --- | --- |
| **Unsubscribe** | the person | tokenised link, or RFC 8058 one-click |
| **Suppression** | the mail system | hard bounce or spam complaint |
| **Global opt-out** | the person, escalated | `do_not_contact` on the LeadHub contact |

## Unsubscribing

The tokenised link in the footer:

```antlers
<a href="{{ unsubscribe_url }}">Abmelden</a>
```

::: danger Put it in the template, not in each campaign
`{{ unsubscribe_url }}` is required legally in most jurisdictions and practically for deliverability,
and a campaign without it will still send. Putting it in the shared template is what stops the fifth
newsletter being the one that shipped without it.
:::

`GET {prefix}/unsubscribe/{token}` ends the subscription **on arrival** and then renders a page
saying so. There is no second click to miss.

The token carries the brand, because the link is opened with no session and the fail-closed scope
would otherwise hide the subscription. See
[Brand Context → Public routes](/brand-context/public-routes).

### Where the link points <Badge type="tip" text="1.9.0" />

`{{ unsubscribe_url }}` is resolved through `Support\PreferenceLink`, which sends a reader to the
[Preference Center](/preference-center/) where that addon is installed and to this addon's own
unsubscribe page where it is not. `{{ one_click_unsubscribe_url }}`, the URL behind the RFC 8058
header, is always this addon's endpoint.

::: danger `/!/marketing/preferences/{token}` was removed in 1.9.0
Marketing used to serve a multi-list preference page of its own. It is gone, along with its route,
and **no redirect replaces it**. Links in newsletters you have already sent point at that URL and
now return 404.

The old URL and the new one carry the same token, but only your application can decide where to
forward it, so the redirect is yours to add. This is a breaking change inside a minor release: the
version number will not warn you, this page has to.

See [Concepts → Where the preference page lives](/marketing/concepts#where-the-preference-page-lives).
:::

## RFC 8058 one-click

Every campaign message carries `List-Unsubscribe` and `List-Unsubscribe-Post`, so the mail client's
own unsubscribe button works without the reader visiting your site.

Providers weight this, and a reader who cannot find your unsubscribe link presses "spam" instead — so
it is a deliverability feature as much as a courtesy.

It arrives as a **POST from a mail client with no session and no CSRF token**, which is why that route
has to skip CSRF.

::: warning A green test suite proves nothing here
Laravel's CSRF middleware skips itself automatically in unit tests, so a fully passing suite says
nothing about whether the live endpoint returns **419**. This exact class of bug shipped in Webhook
Manager's inbound route and was only found by hitting the URL for real.

If you customise these routes, test with `curl` against a running server.
:::

## Global opt-out

```php
'unsubscribe' => ['global_opt_out' => false],
```

`true` means unsubscribing from **one** list sets LeadHub's `do_not_contact`, which stops every other
list **and** every CRM connector push.

Turn it on if your lists are one relationship, so leaving means leaving. Leave it off if they are
genuinely separate consents — where leaving the newsletter should not cancel the customer
notifications somebody is paying for.

`LeadHub::optOut()` goes further still: it sets the flag **and** actively removes the contact from
supported destinations, for example a Brevo list. That distinction matters, because suppressing
locally does nothing about the copy already sitting in an ESP.

## Bounces and complaints

```php
'leadhub' => [
    'hard_bounce_opt_out' => true,
    'complaint_opt_out' => true,
],
```

A **hard bounce** means the address does not exist. A **complaint** means somebody pressed the spam
button. Both set `do_not_contact` on the LeadHub contact, and both leave the address suppressed for
future sends even while its subscription row still says `subscribed`.

**Leave both on.** Continuing to mail an address that hard-bounced damages your sending reputation;
continuing after a complaint is considerably worse, and at scale it is what gets a sending domain
blocked.

Suppression is enforced **at send time**, so a suppressed address is skipped even if the campaign's
audience includes it.

### Where the answer comes from <Badge type="tip" text="1.8.0" />

From [Suppression](/suppression/), a foundation package shared with every other addon that queues
mail, rather than from this addon's own state. Every path here that puts a mail on the wire asks it:
`StartCampaignJob` once per batch, `SendMessageJob` per message, `CampaignSender`, and the double
opt-in mail.

The consent-writing side asks it too. `SubscriptionPreferences` — the service that turns a
preference selection into subscription rows — has checked the gate since **1.8.1**, and it still
does. Only the page in front of it moved to the [Preference Center](/preference-center/) addon in
1.9.0; the addon reads this service rather than reimplementing it, so the check is in the same
place it was.

Before 1.8.0 only `StartCampaignJob` checked anything, and what it checked was LeadHub's
`do_not_contact` rather than the suppression table. An address blocked *during* a long campaign was
still mailed by a queue that had stopped listening.

::: danger The gate throws rather than answering wrong
If it cannot answer it raises `SuppressionCheckFailed` instead of returning "not suppressed". A send
that does not happen is recoverable; a send to a complainant is not. See
[Asking the gate](/suppression/gate).
:::

## ESP feedback webhooks

Bounces and complaints are not something this addon can observe. They come from your provider, and
without that path wired up **the bounce and complaint columns in your reports stay at zero regardless
of reality** — which reads as a clean list and is not one.

With [Webhook Manager](/webhook-manager/) installed, Marketing registers an inbound action
`marketing.process_esp_event` that maps Mailgun and Postmark bounce and complaint payloads onto
subscriptions.

| Field | Value |
| --- | --- |
| URL | `https://example.com/webhooks/inbound/esp-events` |
| Verifier | static header, `X-Webhook-Token` |
| Secret | `MARKETING_ESP_WEBHOOK_SECRET` from your environment |
| Action | `marketing.process_esp_event` |

```dotenv
MARKETING_ESP_WEBHOOK_SECRET=…
```

The endpoint is created **disabled** until the secret is set, deliberately: an enabled endpoint with
an empty secret accepts everything.

Then enter that URL and header in your provider's webhook settings, and verify both cases:

```bash
# correct token → 200
curl -X POST https://example.com/webhooks/inbound/esp-events \
  -H 'X-Webhook-Token: <secret>' -H 'Content-Type: application/json' \
  -d '{"event":"bounce","email":"a@example.com"}'

# wrong token → 401
curl -X POST https://example.com/webhooks/inbound/esp-events \
  -H 'X-Webhook-Token: nope' -d '{}'
```

The 401 matters as much as the 200: an endpoint that accepts everything looks identical to a working
one from the first test alone.

::: tip Raise the inbound rate limit first
`inbound.rate_limit_per_minute` defaults to **60**. An ESP delivering a burst of bounce notifications
after a large campaign exceeds that easily, and from the provider's side rejected requests look like
your endpoint being down.
:::

## Verifying the consent guarantee

One address on one list is one consent record, and the database is what enforces it.

```bash
php artisan marketing:consent-integrity            # reports, changes nothing
php artisan marketing:consent-integrity --repair
```

It reads the indexes on `marketing_subscriptions` as they are right now and the rows in them, names
any list/address pair holding more than one subscription with each row's id, status and confirmation
date, and exits non-zero if the guarantee is not in force.

It **never deletes a subscription**: which of two sign-ups is *the* consent record is a decision about
people, and `--repair` refuses to build the index while anything would have to go for it.

Run it after any update that touched migrations, and specifically on an install that came from 1.2.1
or earlier through 1.6.1–1.6.3. See the 1.6.4 changelog entry.

## What a deletion request means in practice

There is no cross-addon "erase this person everywhere" operation. Today it is three steps:

1. Unsubscribe and suppress here.
2. Delete or archive the [LeadHub contact](/leadhub/contacts#archiving-and-deleting).
3. `php artisan activity:anonymize --contact=<uuid>` if you run [Activity](/activity/).

See [Privacy & retention](/guide/privacy#deletion-and-anonymisation).
