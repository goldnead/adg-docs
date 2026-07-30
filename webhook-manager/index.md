# Webhook Manager

<AddonHeader />

A central, CP-native integration layer for Statamic 6. Manage **outbound
webhooks**, **inbound endpoints**, **deliveries**, **retries**, **replays**,
**rules** and **payload templates** from one place inside the Control Panel.

This is the **transport** layer of the suite. It owns the HTTP request: the URL, the
method, the payload, the auth, the retry policy, the delivery record and the replay
button. It does not own workflows — that is
[Automations](/automations/), and the two are not interchangeable. See
[Boundaries](/guide/boundaries#transport-vs-orchestration).

## What it does

- **Outbound webhooks** triggered by Statamic events, with conditional execution,
  payload templates, header and auth control, retry policies and queue-first
  delivery.
- **Integration presets** — a guided "pick a destination, fill in a URL" setup for
  Slack, Discord, Microsoft Teams, Zapier, Make, n8n and generic JSON, so you never
  hand-write a payload template.
- **Delivery snapshots** with full request and response bodies, status, error
  classification, attempt count, retry schedule and replay support.
- **Replay** failed deliveries individually or in batches, optionally re-rendering
  against current data.
- **Failure alerting and a circuit breaker** — throttled email and Slack alerts when
  a delivery fails for good, and automatic disabling of a hook after too many
  consecutive failures.
- **Insights** — delivery volume, success-rate trend, latency percentiles
  (p50/p95/p99), error breakdown and top-failing endpoints, filterable by day range
  and webhook.
- **A "Send webhook" entry action** in the native CP action toolbar.
- **Inbound endpoints** — stable HTTPS URLs that receive and verify external
  requests, then route them to a named action.
- **Rules** — `When → If → Then` flows.
- **Pluggable storage** — keep webhook config in the database, or as
  git-versionable YAML under `content/webhooks/`.

## The shortest useful example

1. CP → **Webhooks → Outbound → Create**.
2. Pick trigger `entry.published`, scope it to a collection.
3. Set the destination URL, the method and an HMAC secret.
4. Write the payload:

```json
{
  "id": "{{ entry:id }}",
  "title": "{{ entry:title }}",
  "site": "{{ site:handle }}",
  "updated_at": "{{ system:timestamp_iso }}"
}
```

5. Save, publish a test entry, and watch it appear under **Deliveries**.

## Concepts in one table

| Term | Means |
| --- | --- |
| **Outbound webhook** | Config for an HTTP request fired by an internal trigger |
| **Trigger** | An internal event, e.g. `entry.published`, `form.submitted` |
| **Delivery** | One attempt to deliver a webhook, with a full snapshot |
| **Rule** | A `When → If → Then` flow with conditions and actions |
| **Inbound endpoint** | A stable HTTPS URL that receives and validates external requests |

## Status

Stable on Statamic 6 with Laravel 11, 12 and 13. Outbound webhooks, the delivery
engine with retries and replay, inbound endpoints, the rule engine, payload
templates and the full Vue + Inertia Control Panel are implemented and covered by
the test suite.

This addon is the **reference implementation** for the rest of the suite: its
`vite.config.js`, its Vitest setup and its component-test approach are what the
other CP-heavy addons were ported from.

## Next

- [Installation](/webhook-manager/installation)
- [Configuration](/webhook-manager/configuration) — thirteen sections, with defaults
- [Concepts](/webhook-manager/concepts) — the delivery pipeline end to end
- [Outbound webhooks](/webhook-manager/outbound) — triggers, presets, scoping
- [Payload templates](/webhook-manager/templates) — the token renderer
- [Authentication & signing](/webhook-manager/auth) — five schemes, both directions
- [Deliveries, retries & replay](/webhook-manager/deliveries) — and the circuit breaker
- [Inbound endpoints](/webhook-manager/inbound)
- [Rules](/webhook-manager/rules)
- [Storage drivers](/webhook-manager/storage)
- [Extending](/webhook-manager/extending) — eight registries
