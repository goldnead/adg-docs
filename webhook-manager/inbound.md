# Inbound endpoints

<AddonHeader />

An inbound endpoint is a stable HTTPS URL that receives an external request, verifies
it, and routes it to a named **action handler**.

```
https://example.com/!/webhooks/inbound/<endpoint-handle>
```

The `!` prefix is Statamic's convention for addon routes. The prefix is configurable:

```php
'inbound' => ['route_prefix' => '!/webhooks/inbound'],
```

## Creating one

**Webhooks → Inbound → Create**:

1. **Handle** — becomes the last URL segment. Pick something unguessable if the
   endpoint has no auth.
2. **Verifier** — how the request is authenticated. See
   [Authentication & signing](/webhook-manager/auth#inbound-verifiers).
3. **Action** — what happens with a verified request.
4. **Save**, then give the counterparty the URL.

## Built-in actions

| Action | Does |
| --- | --- |
| Create entry | Creates an entry from the payload |
| Update entry | Updates an entry by id |
| Create form submission | Writes a Statamic form submission |
| Send email | Sends a token-resolved mail |
| Send outbound webhook | Fires one of your outbound hooks |
| Send Slack webhook | Posts to a chat destination |
| Set field value | Sets a field on a record |
| Write log note | Writes to your Laravel log channel |
| Dispatch event | Dispatches a Laravel event, so your own listeners take over |

**Dispatch event** is the escape hatch, and often the right choice: it turns an
inbound webhook into a domain event in your application, and everything after that is
ordinary Laravel that you can test.

Register your own handler by implementing
`Goldnead\WebhookManager\Contracts\InboundActionHandlerInterface`; see
[Extending](/webhook-manager/extending).

## Limits and protection

```php
'inbound' => [
    'middleware' => ['web'],
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

::: warning 60 a minute is a real limit
An ESP delivering a burst of bounce notifications after a campaign can exceed it
easily, and the rejected requests look to the ESP like your endpoint being down.
Raise it before wiring up a high-volume provider.
:::

## The 419 trap

`middleware => ['web']` includes CSRF. A POST from an external system has no session
and no token, so it gets a **419**.

The addon's route handles this with `withoutMiddleware(ValidateCsrfToken::class)`,
which is why the shipped endpoint works. It is worth knowing because:

- Laravel's CSRF middleware **skips itself automatically in unit tests**, so a fully
  green test suite says nothing about whether the live endpoint 419s.
- This exact bug shipped in 1.0.0 and was only found by hitting the URL for real
  (correct token → 200, wrong token → 401).

If you add your own public POST route anywhere, test it against a running server.

## Verifying a working endpoint

Test the two cases that matter, in this order:

```bash
# correct credential → 200
curl -X POST https://example.com/!/webhooks/inbound/esp-events \
  -H 'Content-Type: application/json' \
  -H 'X-Webhook-Token: <the secret>' \
  -d '{"event":"bounce","email":"a@example.com"}'

# wrong credential → 401
curl -X POST https://example.com/!/webhooks/inbound/esp-events \
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
| URL | `https://example.com/!/webhooks/inbound/esp-events` |
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
