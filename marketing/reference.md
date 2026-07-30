# Reference

<AddonHeader />

## Console commands

| Command | Purpose |
| --- | --- |
| `marketing:send-scheduled` | Dispatch campaigns whose send time has arrived. **Scheduled every minute.** |
| `marketing:consent-integrity [--repair]` | Verify one address = one subscription per list |
| `marketing:migrate-flat-brands [--dry-run] [--brand=]` | Move flat files into a brand directory |

## Antlers tags

| Tag | Purpose |
| --- | --- |
| `{{ marketing:subscribe list="…" class="…" }}…{{ /marketing:subscribe }}` | Renders the form, action, CSRF token and honeypot |
| `{{ marketing:subscribe_url }}` | The POST endpoint, for a form you build yourself |

Inside the subscribe tag: `success`, `errors`, `old:email`.

## Campaign variables

| Variable | Resolves to |
| --- | --- |
| `{{ first_name }}` | Contact's first name |
| `{{ name }}` | Full name |
| `{{ email }}` | Recipient address |
| `{{ unsubscribe_url }}` | Recipient's tokenised unsubscribe link. **Required.** |

Campaign bodies are Antlers, so ordinary conditionals work.

## Public endpoints

Prefix from `routes.prefix`, default `!/marketing`.

| Endpoint | Purpose |
| --- | --- |
| `POST {prefix}/subscribe` | Subscribe. Fields: `email`, `list`, `first_name`, `last_name`, `_redirect` |
| `GET {prefix}/confirm/{token}` | Confirm a double-opt-in subscription |
| `GET {prefix}/unsubscribe/{token}` | Unsubscribe page |
| `POST {prefix}/unsubscribe/{token}` | RFC 8058 one-click. Skips CSRF. |
| `GET {prefix}/open/{token}` | Open pixel |
| `GET {prefix}/click/{token}` | Signed click redirect |

JSON response shape: `{ "ok": true, "data": { "status": "pending|subscribed" } }`.

## Subscription states

| State | Mailable |
| --- | --- |
| `pending` | no |
| `subscribed` | yes |
| `unsubscribed` | no |

Suppressed addresses (hard bounce, complaint) and contacts with `do_not_contact` are excluded at send
time regardless of state.

## Events

```php
namespace Goldnead\Marketing\Events;
```

`SubscriptionPending` · `MarketingSubscribed` · `MarketingUnsubscribed` · `CampaignSending` ·
`CampaignSent` · `MessageSent` · `MessageOpened` · `MessageClicked` · `MessageBounced` ·
`MessageComplained`

Base classes: `SubscriptionEvent`, `CampaignEvent`, `MessageEventBase`.

## Automations integration

| Triggers | Actions |
| --- | --- |
| `marketing.subscribed` | `marketing.subscribe` |
| `marketing.unsubscribed` | `marketing.unsubscribe` |
| `marketing.campaign_sent` | `marketing.send_campaign` |

## Webhook Manager integration

**Out:** marketing events as outbound triggers.
**In:** inbound action `marketing.process_esp_event`, mapping Mailgun and Postmark bounce and complaint
payloads onto subscriptions. Requires `MARKETING_ESP_WEBHOOK_SECRET`; the endpoint stays disabled until
it is set.

## Activity producer

```
marketing.subscription_pending | subscription_confirmed | unsubscribed
marketing.campaign_sending | campaign_sent
marketing.email_sent | email_opened | email_clicked | email_bounced | email_complained
```

## Permissions

| Permission | Grants |
| --- | --- |
| `view marketing` | the section |
| `manage marketing lists` | list CRUD, including double-opt-in settings |
| `manage marketing subscribers` | subscription state by hand |
| `manage marketing campaigns` | composing and scheduling |
| `send marketing campaigns` | actually sending |
| `manage marketing templates` | template CRUD |

`send marketing campaigns` is deliberately separate from `manage marketing campaigns`.

## Configuration

| Key | Default |
| --- | --- |
| `storage.driver` | `flat` (`flat` \| `eloquent`) |
| `storage.flat.path` | `content/marketing` |
| `sending.mailer` | app default |
| `sending.queue` | `default` |
| `sending.chunk` | `200` |
| `sending.messages_per_minute` | `0` (off) |
| `from.name` / `from.email` | unset |
| `subscriptions.double_opt_in` | `true` |
| `subscriptions.honeypot` | `website` |
| `unsubscribe.global_opt_out` | `false` |
| `tracking.opens` / `tracking.clicks` | `true` / `true` |
| `routes.prefix` | `!/marketing` |
| `leadhub.tag_subscribers` | `true` |
| `leadhub.tag_prefix` | `list:` |
| `leadhub.hard_bounce_opt_out` | `true` |
| `leadhub.complaint_opt_out` | `true` |
| `integrations.automations` | `true` |
| `integrations.webhook_manager` | `true` |

## Environment variables

```dotenv
MARKETING_DRIVER=flat
MARKETING_FLAT_PATH=
MARKETING_MAILER=
MARKETING_QUEUE=default
MARKETING_PER_MINUTE=0
MARKETING_FROM_NAME=
MARKETING_FROM_EMAIL=
MARKETING_ROUTE_PREFIX=!/marketing
MARKETING_ESP_WEBHOOK_SECRET=
```

## Storage split

| What | Where |
| --- | --- |
| Lists, campaigns, templates | `flat` (default) or `eloquent` |
| Subscriptions, messages, message events | **always Eloquent** |

## Requirements

<Requirements laravel="11.x, 12.x or 13.x" queue="Required. Campaign sending is queued." />

Hard dependency: `goldnead/statamic-leadhub`. Segment targeting needs LeadHub `^1.1`.

## Guarantees

| | |
| --- | --- |
| Consent | one address on one list = one subscription, enforced by a unique index |
| Segments | narrow only; never add a recipient |
| Audience | resolved at send time |
| Suppression | enforced at send time, regardless of subscription state |
| List handles | unique across **all** brands, so the public endpoint can derive the brand |
| Consent state | per brand |
| Sending | queued, chunked, throttled; one `Message` per recipient; auto-finalising |
| Unsubscribe | tokenised link plus RFC 8058 one-click headers on every campaign |

## Not extensible

No custom sending driver · no custom tracking backend · no custom subscription states.
