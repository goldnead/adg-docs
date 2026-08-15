# Runs & debugging

<AddonHeader />

A **run** is one execution of an automation. Every run records its context and, node by
node, what each node was handed and what it produced.

<Figure
  src="automations-runs"
  alt="The run history listing runs with completed, stopped, failed and waiting statuses, each with a trigger and a duration"
  caption="`stopped` is a normal outcome, not a failure. Keeping it distinct from `completed` is what answers &quot;did this fire and choose not to act&quot;." />

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

## The activity view

The run list answers "did this fire". Since 2.6.0 the builder has a third view next to **Flow** and
**Mails** that answers the more useful question: *where* in the automation people are, and where they
stop.

Open an automation and switch to **Activity**. Everything on it is behind `view automation runs`,
including the export.

### Numbers on the canvas

Each node card carries three figures for the chosen timeframe: how many reached it, how many got
through it, and how many broke on it.

**A node with no runs shows nothing at all — not a zero.** A fresh automation whose every card reads
`0 / 0 / 0` looks broken rather than new, so absent means "nothing to say yet" and the card says
nothing.

### The timeframe

Four spans: 7, 30 or 90 days, or everything. The default is 30 days.

There is no date picker, deliberately — the question this screen answers is "is this flow working
*now*", and four options that are always valid and always comparable between two automations beat two
text inputs and a format nobody agrees on. Each span is a lower bound only; every one of them ends at
now. An unrecognised value in the URL falls back to "everything" rather than erroring, because URLs
get hand-edited and pasted between installs.

### The funnel

Enrolled, in progress, ran to the end, exited, failed — the same rows narrowed by the same timeframe,
so you can see **where** people stop rather than only how many did.

::: warning What the numbers count is runs, not rows
A **run** is one enrolment: one subject, one pass through the automation. The figures count distinct
runs (`COUNT(DISTINCT automation_run_id)`), which is what makes them a count of people.

`COUNT(*)` over `automation_node_runs` was not that. A loop writes one row per body node per pass and
a wait-until node is written again when the run resumes, so a loop over ten items reported its body
node ten times over — and because the bars are drawn against the busiest node, every other step then
shrank to a fraction of it. The view drew a collapse exactly where none had happened.

Counted per node rather than per node **and** outcome, for the same reason: a run that failed a step
and succeeded on a retry reached it once, not twice.
:::

Test runs are excluded throughout. An editor pressing **Test** is not somebody going through the
flow.

### The log

Every node run, filterable by step, by outcome and by timeframe, paginated on the server rather than
in the browser, and exportable as CSV — the same selection the table is showing, in the same sort
order.

A step whose node has since been deleted is marked as such, on screen and in the file.

::: tip The export is a file a spreadsheet opens
A leading `=`, `+`, `-` or `@` is neutralised: `subject` comes from the trigger context, which a
stranger fills through a form or a webhook, and a spreadsheet executes such a cell on open — for the
person holding `view automation runs`.

Backslashes survive (PHP's default CSV escape is not RFC 4180 and mangles every value containing
one, which means every error message with a class name in it), and the file carries a BOM so that
non-ASCII subjects arrive as words rather than as mojibake.
:::

### In the workflow

Who is inside the automation right now, since when, and at which step. Runs with no person attached —
a scheduled sweep, a webhook that named nobody — are counted underneath rather than silently
dropped.

::: warning This list is not narrowed by the timeframe, on purpose
"Who is in there now" is not a question about a period. Somebody enrolled 40 days ago and parked in a
60-day wait would fall out of the default 30-day window, and out of the count next to it, with
nothing on the screen to suggest anybody was missing.
:::

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

`null` on `prune_after_days` disables pruning entirely, which is a decision rather than a
default.

Set `keep_failed_runs_days` higher than `prune_after_days`. Successful runs from six
weeks ago are noise; the failure from six weeks ago is evidence.

```bash
php artisan automations:prune [--days=] [--keep-failed-days=] [--dry-run] [--brand=]
```

::: warning `automations:prune` is not scheduled for you
The addon registers two commands with Laravel's scheduler, and pruning is not one of
them. Add it to your own schedule, or the runs table grows without bound:

```php
// routes/console.php
Schedule::command('automations:prune')->daily();
```

Run it with `--dry-run` first: it prints how many rows would go without deleting
anything.
:::

## The scheduled commands

| Command | Runs | Purpose |
| --- | --- | --- |
| `automations:run-due [--brand=]` | every minute, automatically | Resume runs whose delay or wait window has elapsed |
| `automations:run-scheduled [--brand=]` | every minute, automatically | Start time-triggered automations |
| `automations:prune […]` | only when you schedule it | Delete runs past the retention window |

The first two are registered by the addon itself, both `withoutOverlapping`. All three
take `--brand=` in multi-brand mode, because a console command has no session and
therefore no current brand.

## Failure alerts

A failed run can notify someone rather than waiting to be found.

```php
'alerts' => [
    'enabled' => true,
    'channels' => ['log'],
    'mail_to' => env('STATAMIC_AUTOMATIONS_ALERT_MAIL_TO', null),
    'throttle_minutes' => 15,
],
```

`channels` takes `log`, `mail`, or both. The default is `log` only, so out of the box a
failure is written to your Laravel log and nothing is emailed. Add `mail` and set
`mail_to` to get the message.

`throttle_minutes` is per automation: a flow failing on every one of a hundred runs
produces one alert per window, not a hundred.

## The audit log

The run log answers "what did this automation do". The **audit log** answers "who changed
it".

CP → **Automations → Audit log**. Every entry carries the action, the automation, the
user and the timestamp, and the list filters by automation and by action:

| Action | Recorded when |
| --- | --- |
| `created` | An automation is created |
| `updated` | An automation is saved |
| `enabled` · `disabled` | Somebody flips it live or takes it out of service |
| `deleted` | An automation is deleted |
| `reverted` | A [version](/automations/building#version-history) is restored |

This is the screen for "the follow-ups stopped going out last Tuesday": `disabled` with a
name and a time answers it in one look, where the run list only shows an absence.

## Reading a run when the trigger was custom

For an automation started by `registerEventTrigger()` or an `event_triggers` config
entry, the context contains whatever the payload mapper returned — under the key you
named in `payload`.

If tokens like `{{ order.id }}` resolve to nothing, the mapper is the place to look, not
the node. With no mapper the listener serialises the event via `toArray()` or its public
properties, which for an event holding a whole Eloquent model produces every column,
and for an event holding a private property produces nothing.
