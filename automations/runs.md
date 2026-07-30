# Runs & debugging

<AddonHeader />

A **run** is one execution of an automation. Every run records its context and, node by
node, what each node was handed and what it produced.

## Run statuses

| Status | Means |
| --- | --- |
| `running` | In progress |
| `waiting` | Parked at a Delay node, awaiting `automations:run-due` |
| `completed` | Reached the end |
| `stopped` | A Filter or Stop node ended it deliberately |
| `failed` | A node threw |

`stopped` is a **normal outcome**, not a failure. Keeping it distinct from `completed`
is what lets you answer "did this fire and choose not to act, or did it never fire at
all" — which is the question you actually have when a customer says nothing happened.

## The node log

Each node writes its input and output:

```php
'runs' => [
    'store_context' => true,
    'store_full_context' => true,
    'store_node_io' => true,
],
```

`store_node_io` is what makes the log useful and also what makes the table grow. Turning
it off costs you the main debugging tool; prune harder instead.

Sensitive values are redacted per `security.redact_keys`, whose defaults include
`password`, `passwort`, `token`, `secret`, `api_key`, `authorization` and
`credit_card`. Add whatever your own fields are called — nothing here catches a field
named `kundennummer`.

### Encryption at rest

```dotenv
STATAMIC_AUTOMATIONS_ENCRYPT_CONTEXT=true
```

Encrypts the run context and node input/output with Laravel's `Crypt`. Reads are
transparent, the API response shape is unchanged, and pre-existing unencrypted rows keep
working.

::: danger It depends on `APP_KEY`
Rotating `APP_KEY` without re-encrypting makes existing encrypted run logs unreadable.
Turn this on once, early.
:::

## Test runs

**Test** exercises the real flow — real trigger payload, real token resolution, real node
ordering, a full log — and by default performs no real side effects:

```php
'test_mode' => [
    'send_real_webhooks' => false,
    'send_real_emails' => false,
    'persist_leadhub_changes' => false,
    'persist_statamic_changes' => false,
    'call_real_ai' => false,
],
```

A green test therefore proves your **flow** is right. It does not prove the destination
accepts your payload, or that the LeadHub field you are writing exists.

For that second question, flip the one switch you need, run the test, and flip it back.
Leaving `persist_statamic_changes` on means every test run creates entries on a
production site.

## Partial retry

A failed run can be retried **from the failing node** rather than from the start.

This matters more than it sounds. A flow that creates a lead, tags it, and then fails on
a webhook would, on a full retry, create a duplicate lead and add the tag twice. Partial
retry resumes with the context the run already had.

Behind the `retry automation runs` permission.

## Debugging in order

When an automation "does nothing", work through this:

**1. Is there a run at all?**

No run means the trigger never matched. Check that the automation is **enabled**, that
the trigger's scope covers your event, and — in multi-brand mode — that a brand is
current. Also check whether Webhook Manager is doing the job instead.

**2. Is the run `waiting`?**

A Delay node parked it. Is the scheduler running?

```bash
php artisan schedule:work
php artisan automations:run-due
```

**3. Is the run `stopped`?**

A Filter said no. Open the node log and look at what the filter was handed — usually the
token resolved to empty because the field handle is wrong, or the trigger does not
provide that namespace.

**4. Is the run `failed`?**

The log names the node and shows its input. The most common causes are a token that
resolved to nothing where a value was required, and an integration action running
against an addon version that does not have the method.

**5. Did it run twice?**

Both this addon and Webhook Manager are wired to the same event. See
[Boundaries](/guide/boundaries).

## Pruning

```php
'runs' => [
    'prune_after_days' => 30,
    'keep_failed_runs_days' => null,   // null = same as prune_after_days
],
```

`automations:prune` is scheduled daily. `null` on `prune_after_days` disables pruning
entirely, which is a decision rather than a default.

Set `keep_failed_runs_days` higher than `prune_after_days`. Successful runs from six
weeks ago are noise; the failure from six weeks ago is evidence.

```bash
php artisan automations:prune
```

## The scheduled commands

| Command | Purpose |
| --- | --- |
| `automations:run-due [--brand=]` | Resume runs whose delay has elapsed |
| `automations:run-scheduled [--brand=]` | Start time-triggered automations |
| `automations:prune` | Delete runs past the retention window |

All three take `--brand=` in multi-brand mode, because a console command has no session
and therefore no current brand.

## Reading a run when the trigger was custom

For an automation started by `registerEventTrigger()` or an `event_triggers` config
entry, the context contains whatever the payload mapper returned — under the key you
named in `payload`.

If tokens like `{{ order.id }}` resolve to nothing, the mapper is the place to look, not
the node. With no mapper the listener serialises the event via `toArray()` or its public
properties, which for an event holding a whole Eloquent model produces every column,
and for an event holding a private property produces nothing.
