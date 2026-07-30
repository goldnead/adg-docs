# Outbound webhooks

<AddonHeader />

An outbound webhook is the configuration for one HTTP request, fired by one trigger.
Create them under **Webhooks → Outbound**.

## Creating one

1. **Trigger** — pick one, and scope it. An `entry.published` hook scoped to a
   collection fires only for that collection.
2. **Destination** — URL and method (`POST`, `PUT`, `PATCH`).
3. **Auth** — none, bearer, basic, custom header or HMAC signature. See
   [Authentication & signing](/webhook-manager/auth).
4. **Payload** — a JSON template with tokens, or a preset. See
   [Payload templates](/webhook-manager/templates).
5. **Conditions** — optional; the hook is skipped when they do not match.
6. **Retry policy** — optional override of the global defaults.
7. **Save**, then use **Send test** before enabling.

## Integration presets

Rather than hand-writing a payload for a destination whose format you have to look
up, pick a preset and fill in the URL. Presets ship for:

| Preset | Notes |
| --- | --- |
| Slack | Incoming-webhook format |
| Discord | Accepts Slack-shaped payloads at `/slack` endpoints; the preset targets Discord's own |
| Microsoft Teams | MessageCard format |
| Zapier | Generic JSON, catch-hook shaped |
| Make | Generic JSON |
| n8n | Generic JSON |
| Generic JSON | A sane default envelope |

A preset supplies the payload template, the method and the headers. You can still
edit the template afterwards: a preset is a starting point, not a locked mode.

::: tip Which one for a chat destination
All three chat platforms accept an incoming-webhook URL you create on their side.
The difference is only the payload shape, which is exactly what the preset is for.
If you find yourself editing a Slack preset into a Teams payload, you picked the
wrong preset.
:::

## Scoping a trigger

Scoping is what keeps a hook from firing on everything. The available scopes depend
on the trigger:

| Trigger | Scope by |
| --- | --- |
| `entry.*` | collection, site, blueprint |
| `form.submitted` | form handle |
| `user.saved` | — |
| `asset.saved` | asset container |

Scope narrowly and add a second hook rather than writing a condition to undo a broad
scope. A hook that fires and is then filtered out still costs a rendered payload and
a decision; a hook that never matched costs nothing.

## Conditions

Conditions are evaluated **before** the payload is rendered and before anything is
queued, so a hook that does not match is genuinely free.

Typical uses:

- Only fire for entries with a particular field value.
- Only fire when a status changed to something specific, rather than on every save.
- Only fire in production, by testing a value you put in the payload context.

Register your own condition types from a service provider; see
[Extending](/webhook-manager/extending).

::: warning `entry.published` fires on every save
Statamic 6 has no `EntryPublished` event, so this trigger is `EntrySaved` gated on
`published()`. Every save of an already-published entry fires it. If you want the
draft-to-published transition, express that as a condition.
:::

## The "Send webhook" entry action

Any enabled outbound webhook can be fired for selected entries straight from the
native CP action toolbar. Select entries in a collection listing, choose **Send
webhook**, pick the hook.

This is the practical answer to "the destination was down yesterday, resend these
forty". It goes through the same delivery engine, so the results appear under
Deliveries like any other delivery.

## Testing before enabling

The **Send test** button runs the real pipeline: real template rendering, real auth,
real HTTP, and a real `Delivery` record. It is not a dry run and it is not a
different code path — the same domain layer serves the test button and the async
delivery.

So a green test means the thing genuinely works, and a red one gives you a delivery
snapshot with the response body in it.

## Disabling and the circuit breaker

A hook can be disabled by hand, and it is disabled automatically after 10
consecutive terminal failures.

Automatic re-enabling deliberately does not exist. A hook that silently resumed after
a week of failures would deliver a week of stale events to a destination that has
moved on. Re-enable it yourself once you have checked the destination.

## Multi-brand

Outbound webhooks are brand-scoped. In multi-brand mode a hook belongs to the brand
that created it and fires only for that brand's events, and a console command with no
current brand sees none of them.

```bash
php please webhook-manager:health --brand=acme
```

## A worked example

Notify Slack when a blog post is published, but only for posts flagged as
announcements:

| Field | Value |
| --- | --- |
| Trigger | `entry.published`, scoped to collection `blog` |
| Condition | field `is_announcement` is true |
| Preset | Slack |
| URL | your Slack incoming-webhook URL |
| Auth | none — the URL is the secret |
| Retry | default (exponential, 3 attempts) |

```json
{
  "text": "New announcement: *{{ entry:title }}*\n{{ entry:permalink }}"
}
```

Note the auth choice: for Slack, Discord and Teams the webhook URL **is** the
credential. Adding HMAC on top does nothing, because the destination does not verify
it. Treat the URL as a secret and rotate it if it leaks.
