# Concepts

<AddonHeader />

## The pieces

| Term | Means |
| --- | --- |
| **Automation** | A flow: one trigger node plus connected logic and action nodes |
| **Node** | One box on the canvas. A trigger, a logic node, or an action. |
| **Run** | One execution of an automation, with node-by-node logs |
| **Context** | The data a run carries, built by the trigger and added to by nodes |
| **Token** | A reference into the context: `{{ form.email }}`, `{{ lead.full_name }}` |
| **Template** | A curated starting flow, **copied** into a user-owned automation |

## The engine

```
Statamic or application event
  └─ Trigger node matches → a Run is created and queued
      └─ Context built from the event payload
          └─ Nodes executed along the connections
              ├─ Filter   → conditions false? stop, status "stopped"
              ├─ Branch   → follow the true or false path
              ├─ Switch   → follow the matching case
              ├─ Loop     → run the body once per item, then continue
              ├─ Parallel → fan out to every branch, join, continue
              ├─ Throttle → seen this key inside the window? stop
              ├─ Delay    → persist and resume later via automations:run-due
              └─ Action   → do the thing, write input/output to the node log
                  └─ Run finishes: completed | stopped | failed
```

Each node writes its input and output to the run log, redacted per
`security.redact_keys` and optionally encrypted at rest.

## Runs are resumable, which is why delays work

A **Delay** node persists the run and stops. `automations:run-due`, registered in the
scheduler, picks it up when the delay has elapsed and continues from the next node.

That is the whole mechanism, and it has two consequences:

- **Without a scheduler, a delayed run waits forever.** No error, no failed job, no
  alert. It is the quietest failure in the suite.
- **A delay is not a sleep.** Nothing is held open, so a three-day delay costs nothing
  while it waits.

## The token resolver

Tokens read from the run context using dotted paths:

```
{{ form.email }}          {{ lead.full_name }}
{{ entry.title }}         {{ lead.status }}
{{ user.email }}          {{ secret.slack_webhook }}
```

What is in the context depends on the trigger. A *Form Submitted* trigger puts the
submission under `form`; a *Lead Created* trigger puts the contact under `lead`. The
builder's **token picker** lists what is actually available for the trigger you chose,
which is more reliable than remembering.

`{{ secret.* }}` reads from the `secrets` config map, so a credential stays in your
environment rather than in an automation definition that gets exported to JSON and
committed.

## Test mode

A test run exercises the whole flow — real trigger payload, real token resolution, real
node ordering, a full log — and by default performs **no real side effects**:

```php
'test_mode' => [
    'send_real_webhooks' => false,
    'send_real_emails' => false,
    'persist_leadhub_changes' => false,
    'persist_statamic_changes' => false,
    'call_real_ai' => false,
],
```

So "Test" answers "is my flow right" without answering "does the destination accept
this". For the second question, flip the one switch you need, deliberately and
temporarily.

## Loop protection

```php
'max_call_depth' => 3,
```

An automation whose action mutates a record that triggers the same automation is a loop,
and so is a chain of **Call Automation** nodes that comes back round. The engine refuses
past this depth.

Note what this is not. There is no loop *detection*: nothing inspects the graph and warns
you. The depth limit is a backstop, and raising it lengthens a loop rather than fixing
it. Add a Filter that excludes the state your own action produces.

Iterating deliberately is a different thing and is supported: the **Loop** node walks a
collection, and **Parallel** fans out and joins. Run inline, as both normally are, they
stay inside the run and the depth limit does not apply. Point either at a separate
automation instead and it counts like any other sub-flow.

## Where this addon stops

It orchestrates. It does not own transport, consent or the CRM.

| Concern | Owner |
| --- | --- |
| One reliable HTTP request, with retries, signing, delivery records | [Webhook Manager](/webhook-manager/) |
| Lists, consent, tracking, unsubscribes | [Marketing](/marketing/) |
| Contacts, timelines, pipelines | [LeadHub](/leadhub/) |
| A durable notification with preferences | [Notifications](/notifications/) |

The **Send Webhook (via Webhook Manager)** action is the intended shape of the first
row: the automation decides *whether* and *when*, and the transport layer handles
*how*. An automation that posts directly gets none of the retries, signing or delivery
log.

::: warning One place per concern
Both addons attach their own listener to the same Statamic events. If an automation
already fires a webhook for an event, do not also configure a Webhook Manager trigger
for that same event and destination — you will double-fire, and both configurations
will look individually correct. See [Boundaries](/guide/boundaries).
:::

## A trigger that is not what it sounds like

**Entry Published** is `EntrySaved` gated on `published()`, because Statamic 6 has no
`EntryPublished` event. It fires on **every save of a published entry**, not only on
the draft-to-published transition.

This was a real bug in an earlier release, where the trigger fired on every save. It is
now gated the same way Webhook Manager gates its own. If you need the transition
specifically, add a Filter node comparing the previous state.

## Multi-brand

Automations, runs and templates are brand-scoped. In multi-brand mode a flow belongs to
the brand that created it and reacts only to that brand's events.

Console commands have no session, so they take `--brand=`:

```bash
php artisan automations:run-due --brand=acme
php artisan automations:run-scheduled --brand=acme
```
