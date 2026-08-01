# Concepts

<AddonHeader />

Five nouns and one pipeline.

| Term | Means |
| --- | --- |
| **Outbound webhook** | Config for an HTTP request fired by an internal trigger |
| **Trigger** | An internal event, e.g. `entry.published`, `form.submitted` |
| **Delivery** | One attempt to deliver a webhook, with a full snapshot |
| **Rule** | A `When → If → Then` flow with conditions and actions |
| **Inbound endpoint** | A stable HTTPS URL that receives and validates external requests |

## The outbound pipeline

```
Statamic event (EntrySaved, SubmissionCreated, …)
  └─ Trigger normalises it → TriggerDetected
      └─ matching enabled webhooks are collected
          └─ conditions evaluated → skip or continue
              └─ payload template rendered through the variable resolvers
                  └─ auth scheme applied (headers, signature)
                      └─ Delivery record created, job queued
                          └─ HTTP request
                              ├─ success evaluator says ok → Delivery = success
                              └─ retryable → retry planner writes next_retry_at
                                  └─ webhook-manager:dispatch-retries runs it (scheduler)
                                  └─ attempts exhausted → Delivery = failed
                                      ├─ alert (throttled per hook)
                                      └─ circuit breaker counts toward threshold
```

Every stage in that chain is a **registry** you can add to. See
[Extending](/webhook-manager/extending).

Two properties of the pipeline are worth stating explicitly:

**Queue-first.** The HTTP request happens in a job, not in the request that
triggered it. That is what keeps a slow destination from becoming your page load.

**Retries are planned in one place and executed in another.** The delivery engine
records *when* the next attempt is due; the scheduled command
`webhook-manager:dispatch-retries` is what actually makes it. A site without a
`schedule:run` cron therefore plans retries it never runs. See
[Deliveries](/webhook-manager/deliveries#retries).

**One delivery record per attempt.** A hook that succeeds on the third try leaves
three rows, not one with a counter. That is deliberate: the first two failures are
the evidence you need when the destination's owner says nothing was wrong.

## Built-in triggers

| Handle | Fires on |
| --- | --- |
| `entry.saved` | An entry is saved |
| `entry.published` | An entry is published |
| `entry.unpublished` | An entry is unpublished |
| `entry.deleted` | An entry is deleted |
| `form.submitted` | A Statamic form receives a submission |
| `user.saved` | A user is saved |
| `asset.saved` | An asset is saved |

::: warning `entry.published` is not a Statamic event
Statamic 6 has no `EntryPublished` event. `entry.published` is `EntrySaved` gated on
`published()`, which means it fires on **every save of a published entry**, not only
on the transition from draft to published.

If you need the transition specifically, add a condition comparing the previous
state. This exact confusion produced a real bug in Automations, where the same
trigger fired on every save.
:::

Anything else — your own domain events, another addon's — becomes a trigger through
[custom event triggers](/webhook-manager/extending#custom-event-triggers), with no
listener class of your own.

When LeadHub is installed, it registers all of its lifecycle events as triggers
automatically: `leadhub.contact.created`, `leadhub.status.changed`,
`leadhub.segment.entered` and eleven more. No configuration on either side.

## The domain layer is plain Laravel

Controllers, models, services, jobs and the queue path contain no Vue and no Inertia
coupling. The same code path serves an async delivery and the CP's "send test"
button, which is why the test button is meaningful evidence rather than a separate
mechanism that might behave differently.

The Control Panel is a Vue 3 + Inertia SPA using Statamic's own `@ui` component
library, so it inherits dark mode, the command palette and listing presets from the
host.

## Success is a decision, not a status code

Whether a response counts as success is decided by a **success evaluator**, not by a
hard-coded `2xx` check. The default is the obvious one, but a destination that
returns `200` with `{"ok": false}` in the body is a real thing, and so is one that
returns `202` for "queued" and `409` for "already have it, that's fine".

Register your own evaluator rather than trying to express this in retry config. See
[Extending](/webhook-manager/extending).

## Config and telemetry are stored differently

**Configuration** — outbound webhooks, inbound endpoints, rules, templates — can live
in the database or as YAML under `content/webhooks/`, because it is authored,
reviewed and deployed.

**Telemetry** — deliveries and logs — always lives in the database, because it is
high-volume, append-heavy and useless in a diff.

So "flat driver" never means "no database". See
[Storage drivers](/webhook-manager/storage).

## Where this addon stops

It delivers and receives HTTP. It does not run multi-step workflows, has no notion of
a delay or a branch, and holds no state between events.

If a save should trigger three things, or one thing in three days, that is
[Automations](/automations/) — which can hand its HTTP calls back to this addon and
inherit signing, retries and delivery logging.

Both addons attach their own listener to the same Statamic events. **Configure a
given event and destination in exactly one of them**, or you will double-fire, and
both configurations will look individually correct. See
[Boundaries](/guide/boundaries).
