# Inbound endpoints

<AddonHeader />

An inbound endpoint is a stable HTTPS URL that receives an external request, verifies
it, and routes it to a named **action handler**.

```
https://example.com/webhooks/inbound/<endpoint-handle>
```

The prefix is configurable:

```php
'inbound' => ['route_prefix' => 'webhooks/inbound'],
```

::: warning Changed in 1.8.0
Before 1.8.0 the endpoint answered on `/!/webhooks/inbound/...`. `!/` is Statamic's
prefix for its own utility routes, which is not something you type into a provider's
webhook field, so the addon moved off it. The old prefix stays routable through
`inbound.legacy_route_prefixes` so existing senders keep working. Empty that array
once every sender points at the new URL.
:::

The endpoint does not run on the `web` middleware stack. It has no session and no
CSRF token, so putting it there makes every external delivery fail with a 419.

## Creating one

**Webhooks → Inbound → Create**:

1. **Handle** — becomes the last URL segment. Pick something unguessable if the
   endpoint has no auth.
2. **Verifier** — how the request is authenticated. See
   [Authentication & signing](/webhook-manager/auth#inbound-verifiers).
3. **Action** — what happens with a verified request.
4. **Save**, then give the counterparty the URL.

## Built-in actions

Eight handlers ship with the addon. An endpoint picks exactly one.

| Handle | Does |
| --- | --- |
| `create_entry` | Creates an entry from the mapped payload |
| `update_entry` | Updates an entry by id |
| `upsert_entry` | Updates a matching entry, creates one if there is none |
| `create_form_submission` | Writes a Statamic form submission |
| `dispatch_event` | Dispatches a Laravel event, so your own listeners take over |
| `audit_log` | Records the request and stops there |
| `upsert_lead` | Creates or updates a LeadHub contact. Inert when LeadHub is absent |
| `noop` | Accepts and does nothing |

`noop` and `audit_log` are how you bring an integration up in two steps: point the
counterparty at the endpoint, confirm real payloads arrive and look the way you were
promised, then switch the action to the one that writes something.

**`dispatch_event`** is the escape hatch, and often the right choice: it turns an
inbound webhook into a domain event in your application, and everything after that is
ordinary Laravel that you can test.

These are not the same list as the **rule** actions (send email, send outbound
webhook, set field value, and so on). Rules and inbound endpoints have separate action
sets; see [Rules](/webhook-manager/rules).

Other addons register their own. Marketing adds `marketing.process_esp_event`, used in
the worked example below.

Register your own handler by implementing
`Goldnead\WebhookManager\Contracts\InboundActionHandlerInterface`; see
[Extending](/webhook-manager/extending).

## Limits and protection

```php
'inbound' => [
    'middleware' => [SubstituteBindings::class],
    'max_payload_kb' => 512,
    'rate_limit_per_minute' => 60,
    'replay_protection_ttl_seconds' => 600,
],
```

| Setting | Guards against |
| --- | --- |
| `max_payload_kb` | a caller posting something enormous |
| `rate_limit_per_minute` | a caller looping |
| `replay_protection_ttl_seconds` | a captured request being resent |

### The rate limit

The limit is enforced as the **first** step of the inbound pipeline, ahead of the
method allowlist and ahead of authentication, so an over-eager caller cannot make the
endpoint do work by getting the credential wrong quickly.

- Counted **per endpoint**, keyed by the endpoint's id. One noisy integration does not
  throttle the others, and renaming an endpoint does not reset a live counter.
- Exceeding it answers **429** with a `Retry-After` header.
- **Every** response out of the endpoint carries `X-RateLimit-Limit` and
  `X-RateLimit-Remaining`, so a well-behaved sender can slow down before it is
  rejected rather than after.
- Rejections are logged as `inbound_rate_limited`, which is what distinguishes a limit
  from an outage when the counterparty asks.

An endpoint can override the global default:

```json
{ "per_minute": 300 }
```

in its **Rate limit** config. The per-endpoint value wins; `0` disables throttling for
that endpoint. Setting `inbound.rate_limit_per_minute` to `0` disables it everywhere.

The legacy `!/webhooks/inbound` prefix shares the same counter as the canonical URL,
because the key is the endpoint rather than the route. The old URL is not a way around
the limit.

::: warning 60 a minute is a real limit
An ESP delivering a burst of bounce notifications after a campaign can exceed it
easily, and the rejected requests look to the ESP like your endpoint being down.
Raise it before wiring up a high-volume provider.
:::

## Why the endpoint is not on the `web` stack

`inbound.middleware` is the **complete** middleware stack of the route, not a list
appended to `web`. It holds one entry, `SubstituteBindings`, and that is deliberate.

The `web` group is built for a browser with a session. A webhook sender has neither,
so `ValidateCsrfToken` answers every real delivery with a **419** before authentication
is ever consulted, `StartSession` writes a session file per delivery that nothing ever
reads, and the host application's own additions (Inertia, redirect handling) run on a
machine endpoint that cannot use them.

Up to 1.7 the addon dealt with this by removing one member of the group with
`withoutMiddleware(ValidateCsrfToken::class)`. Since 1.8.0 it declares the whole stack
instead, so nothing is inherited and nothing has to be undone. Putting `'web'` back
into `inbound.middleware` restores the 419.

The endpoint is not unprotected by this. Authentication is the endpoint's own
verifier, enforced before parsing, mapping or action dispatch.

::: warning A test suite cannot see a 419
Laravel's CSRF middleware skips itself automatically in unit tests, so a fully green
suite says nothing about whether a live endpoint 419s. This exact bug shipped in 1.0.0
and was only found by hitting the URL for real. If you add your own public POST route
anywhere, test it against a running server.
:::

## Verifying a working endpoint

Test the two cases that matter, in this order:

```bash
# correct credential → 200
curl -X POST https://example.com/webhooks/inbound/esp-events \
  -H 'Content-Type: application/json' \
  -H 'X-Webhook-Token: <the secret>' \
  -d '{"event":"bounce","email":"a@example.com"}'

# wrong credential → 401
curl -X POST https://example.com/webhooks/inbound/esp-events \
  -H 'X-Webhook-Token: nope' -d '{}'
```

A 401 for the wrong token is as important as the 200 for the right one. An endpoint
that accepts everything looks identical to a working one from the first test alone.

## A worked example: ESP bounce webhooks

When Marketing is installed, it registers an inbound action
`marketing.process_esp_event` that maps Mailgun and Postmark bounce and complaint
payloads onto subscriptions.

| Field | Value |
| --- | --- |
| URL | `https://example.com/webhooks/inbound/esp-events` |
| Verifier | static header, `X-Webhook-Token` |
| Secret | `MARKETING_ESP_WEBHOOK_SECRET` from your environment |
| Action | `marketing.process_esp_event` |

The endpoint is created **disabled** until the secret is set, which is deliberate: an
enabled endpoint with an empty secret accepts everything.

Then enter that URL and header in the ESP's own webhook settings. A hard bounce or a
complaint arriving there suppresses the address and opts the LeadHub contact out. See
[Suppression](/marketing/suppression).

## Multi-brand

Inbound endpoints are brand-scoped, and an incoming request has no session to derive a
brand from. The brand comes from the endpoint itself, which belongs to one brand, so
handles are effectively unique across brands.

If you need the same integration for two brands, create two endpoints with two
handles and two secrets. That is better than one endpoint that has to guess, which is
the failure mode
[`AmbiguousBrandRecord`](/brand-context/public-routes#the-column-must-be-globally-unique)
exists to prevent.

## Turning the module off

```php
'features' => ['inbound' => false],
```

Hides the screens, the navigation entry **and** the runtime route registration. On a
site that only sends webhooks, this removes a public POST endpoint you were not using,
which is worth doing.
