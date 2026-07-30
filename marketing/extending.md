# Extending

<AddonHeader />

Marketing has no node or driver registry of its own. It is extended by **listening to its events** and
by the two sibling integrations it detects automatically.

## Events

```php
namespace Goldnead\Marketing\Events;
```

| Event | Fired when |
| --- | --- |
| `SubscriptionPending` | A subscription is created, awaiting confirmation |
| `MarketingSubscribed` | A subscription is confirmed, or created with double opt-in off |
| `MarketingUnsubscribed` | Somebody opted out |
| `CampaignSending` | A send has started |
| `CampaignSent` | A send has finished and finalised |
| `MessageSent` | One recipient's message was handed to the mailer |
| `MessageOpened` | The tracking pixel was fetched |
| `MessageClicked` | A tracked link was followed |
| `MessageBounced` | The ESP reported a bounce |
| `MessageComplained` | The ESP reported a spam complaint |

```php
use Goldnead\Marketing\Events\MarketingSubscribed;
use Illuminate\Support\Facades\Event;

Event::listen(MarketingSubscribed::class, function (MarketingSubscribed $event) {
    // …
});
```

::: warning Your listener is not covered by a fail-safe guarantee
Marketing catches its own errors so a subscribe request never breaks. Your listener throws where the
event was dispatched. Wrap it, and **queue anything that talks to the network** — a listener that calls
an API synchronously turns a signup form into a proxy for that API's uptime.
:::

A real example of doing this well, from the suite's own history: syncing the `newsletter` list into a
Brevo list is wired as `MarketingSubscribed`/`MarketingUnsubscribed` → a **queued** listener → the
Brevo service, behind a `BREVO_SYNC_ENABLED` gate so a migration command can mute it.

## Webhook Manager

```php
'integrations' => ['webhook_manager' => true],
```

Two directions, both auto-detected:

**Out.** Marketing events become outbound webhook triggers, so you configure the destination in the
Control Panel rather than writing a listener.

**In.** The inbound action `marketing.process_esp_event` maps Mailgun and Postmark bounce and complaint
webhooks onto subscriptions. Without this path, **your bounce and complaint numbers stay at zero
regardless of reality**. Set it up. See
[Suppression → ESP feedback webhooks](/marketing/suppression#esp-feedback-webhooks).

## Automations

```php
'integrations' => ['automations' => true],
```

Marketing contributes to the flow builder:

| Triggers | Actions |
| --- | --- |
| `marketing.subscribed` | `marketing.subscribe` |
| `marketing.unsubscribed` | `marketing.unsubscribe` |
| `marketing.campaign_sent` | `marketing.send_campaign` |

Which makes a drip sequence buildable visually: subscribed → wait two days → send, without code.

::: danger `marketing.send_campaign` sends a real campaign
To a whole list, or a list narrowed by a segment. Not a transactional email. Filter the automation
hard, and remember that **consent comes from the list** — an automation cannot grant it, and pointing
one at the wrong list is not recoverable.
:::

::: warning `marketing.subscribe` as an action is a consent claim
An automation that subscribes somebody is asserting that they agreed. If the trigger is a form they
filled in with a checkbox, fine. If it is "somebody bought something", that is not newsletter consent
in most jurisdictions.
:::

## Email Templates

Optional in both directions, with a fallback:
`EmailTemplates::resolve($slug, $fallback)` prefers a managed CP entry and falls back to the
caller-supplied file body. So adding [Email Templates](/email-templates/) later keeps un-migrated
slugs working, and removing it does not break a campaign.

To move your existing file-based templates into CP-editable entries:

```bash
php artisan email-templates:import
```

## Activity

With [Activity](/activity/) installed, a bundled producer records Marketing facts into the ledger:

```
marketing.subscription_pending | subscription_confirmed | unsubscribed
marketing.campaign_sending | campaign_sent
marketing.email_sent | email_opened | email_clicked | email_bounced | email_complained
```

The producer attaches itself only when Marketing is present, and event type names follow the platform
catalogue rather than PHP class names, so consumers survive a class rename.

This is not a duplication of Marketing's own message events: those are per-campaign reporting; the
ledger is the site's cross-domain record. See
[Boundaries](/guide/boundaries#ledger-vs-analytics).

## Detection is passive and one-way

The addon that *offers* an integration checks at boot whether the other is present, with
`class_exists` plus a capability check. Nothing needs enabling on the other side, and install order
does not matter.

Two rules if you write your own bridge:

```php
// check the facade ROOT, never the facade class
method_exists(LeadHub::getFacadeRoot(), 'segmentMemberIds');
```

```php
// register from boot(), and do NOT nest app->booted() —
// Statamic already calls bootAddon() inside one, so a nested
// callback fires immediately and is still too early.
```

Both are lessons from real bugs in this suite. See
[Extending the suite](/guide/extending).

## What you cannot extend

Named plainly, so you do not go looking:

- **No custom sending driver.** Sending goes through a Laravel mailer; configure the mailer.
- **No custom tracking backend.** Opens and clicks are the addon's endpoints, on or off.
- **No custom subscription states.** `pending`, `subscribed`, `unsubscribed`. These are consent states,
  not a workflow — use [LeadHub tags](/leadhub/contacts#tags) or a
  [segment](/leadhub/segments) for anything else.
