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
| `{{ marketing:subscribe list="…" class="…" redirect="…" }}…{{ /marketing:subscribe }}` | Renders the form, action, CSRF token, list handle, optional `_redirect` and honeypot |
| `{{ marketing:subscribe_url }}` | The POST endpoint, for a form you build yourself |

The subscribe tag injects **no variables** into the pair. A successful subscribe without a redirect
flashes `marketing.subscribed` to the session, holding the resulting status; a validation failure is
Laravel's ordinary redirect back with the error bag and old input. See
[Front-end forms](/marketing/forms#handling-the-response).

## Campaign variables

| Variable | Resolves to |
| --- | --- |
| `{{ first_name }}` / `{{ last_name }}` | Contact's names, empty string when unset |
| `{{ name }}` | Full name, falling back to the address |
| `{{ email }}` | Recipient address |
| `{{ subject }}` / `{{ preheader }}` | The campaign's own |
| `{{ unsubscribe_url }}` | Where a **person** manages what they receive. **Required in the template.** |
| `{{ one_click_unsubscribe_url }}` | This addon's own endpoint, used for the RFC 8058 header |

`unsubscribe_url` resolves through `Support\PreferenceLink`: the
[Preference Center](/preference-center/) where that addon is installed, this addon's unsubscribe
page otherwise. `one_click_unsubscribe_url` is always this addon's own.

Campaign bodies are Antlers, so ordinary conditionals work.

## Public endpoints

Prefix from `routes.prefix`, default `!/marketing`.

| Endpoint | Purpose |
| --- | --- |
| `POST {prefix}/subscribe` | Subscribe. Fields: `email`, `list`, `first_name`, `last_name`, `_redirect` |
| `GET {prefix}/confirm/{token}` | Confirm a double-opt-in subscription |
| `GET {prefix}/unsubscribe/{token}` | Unsubscribe on arrival, then show a page saying so |
| `POST {prefix}/unsubscribe/{token}` | RFC 8058 one-click. Skips CSRF, answers `204`. |
| `GET {prefix}/o/{uuid}.gif` | Open pixel |
| `GET {prefix}/c/{uuid}` | Click redirect, **signed** |

JSON response shape: `{ "ok": true, "data": { "status": "pending|subscribed" } }`.

`GET`/`POST {prefix}/preferences/{token}` was removed in 1.9.0 with no redirect. See
[Unsubscribes & suppression](/marketing/suppression#where-the-link-points).

## Control Panel routes

Under Statamic's CP prefix, all behind the permissions below.

| Route | Purpose |
| --- | --- |
| `marketing` | Dashboard |
| `marketing/lists` · `/create` · `/{handle}` · `/{handle}/edit` | List index, create, show, edit |
| `marketing/lists/{handle}/subscribers` | Add a subscriber by hand (`POST`) |
| `marketing/lists/{handle}/subscribers/{subscription}/unsubscribe` | Unsubscribe one by hand (`POST`) |
| `marketing/campaigns` · `/create` · `/{handle}` · `/{handle}/edit` | Campaign index, create, show, edit |
| `marketing/campaigns/{handle}/send` · `/schedule` · `/unschedule` · `/test` | Send now, schedule, unschedule, test send (`POST`) |
| `marketing/campaigns/{handle}/preview` | Rendered preview |
| `marketing/templates` · `/create` · `/{handle}/edit` | Template CRUD |

## Publish tags

| Tag | Publishes |
| --- | --- |
| `marketing-config` | `config/marketing.php` |
| `marketing-views` | the public confirmation and unsubscribe pages, and the double-opt-in mail |
| `marketing-translations` | the addon's language files |

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

**Out:** six outbound trigger handles.

```
marketing.subscriber.subscribed | subscriber.pending | subscriber.unsubscribed
marketing.campaign.sent
marketing.message.bounced | message.complained
```

**In:** inbound action `marketing.process_esp_event`, mapping Mailgun and Postmark bounce and complaint
payloads onto subscriptions. Requires `MARKETING_ESP_WEBHOOK_SECRET`; the endpoint stays disabled until
it is set.

## Activity event types

Recorded by the producer that **ships with the [Activity](/activity/) addon**, not with this one.

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

<Requirements laravel="12.x or 13.x" queue="Required. Campaign sending is queued." />

Hard dependencies: `goldnead/statamic-leadhub ^1.4`, `goldnead/statamic-suppression ^1.0`,
`goldnead/statamic-brand-context ^1.4`, plus `inertiajs/inertia-laravel` and `symfony/yaml`.
Segment targeting needs LeadHub `^1.4`.

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
| Unsubscribe | tokenised link plus RFC 8058 one-click headers on every campaign, the one-click endpoint working with no optional package installed |

## Not extensible

No custom sending driver · no custom tracking backend · no custom subscription states.
