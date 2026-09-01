# Deliveries, retries & replay

<AddonHeader />

A **delivery** is one attempt to deliver a webhook, recorded with a full snapshot:
request headers and body, response status and body, error classification, attempt
number, retry schedule and timing.

One row per attempt. A hook that succeeds on the third try leaves three rows, not one
with a counter, because the first two failures are the evidence you need when the
destination's owner says nothing was wrong.

<Figure
  src="webhook-manager-delivery-detail"
  alt="A failed delivery showing the trigger, three attempts, the duration, the full request with a masked signature header, and a 502 response"
  caption="A terminal failure. The signature header is masked; reading it unmasked is the separate `view sensitive payloads` permission." />

## Reading a delivery

**Webhooks → Deliveries**, filterable by hook, status and date range.

| Field | What it tells you |
| --- | --- |
| Status | queued, success, failed, retrying |
| HTTP status | what the destination actually returned |
| Error class | network, timeout, HTTP error, evaluator rejection |
| Attempt | which of `max_attempts` this was |
| Next attempt | when the retry is scheduled |
| Request body | the rendered payload, masked |
| Response body | the first 4 KB, by default |

Bodies are masked according to `logging.mask_payload_keys` and `logging.mask_headers`.
Reading them unmasked is the separate `view sensitive payloads` permission, which is
what lets a support role read status and error messages without reading customer
data.

## Retries

```php
'retry' => [
    'schedule' => true,
    'strategy' => 'exponential',        // none | linear | exponential
    'max_attempts' => 3,
    'base_delay_seconds' => 30,
    'max_delay_seconds' => 3600,
    'retry_on_status' => [408, 425, 429, 500, 502, 503, 504],
    'retry_on_network_errors' => true,
],
```

Global defaults; each hook can override them, except `schedule`, which is global.

With the defaults, a failing delivery is retried after 30 seconds, then 60, then
stops. The cap matters on a long strategy: exponential backoff from 30 seconds is at
1,920 seconds on the seventh attempt and hits the one-hour cap on the eighth, where it
stays.

::: danger Retries only run if the scheduler runs
The retry is *planned* by the delivery engine and *executed* by
`webhook-manager:dispatch-retries`, which the addon registers on Laravel's scheduler
every minute. If your site has no `schedule:run` cron entry, nothing executes it: the
delivery keeps a `next_retry_at`, the screen keeps saying "next retry in 30 seconds",
and the payload is never sent.

Worse, the attempts are then never exhausted, so `DeliveryFailedTerminally` never
fires — **no alert is sent and the circuit breaker never counts**. A destination can
be dead for a week without any of the machinery on this page reacting.

See [Installation](/webhook-manager/installation#retries-need-the-scheduler).
:::

### How the dispatcher works

```bash
php please webhook-manager:dispatch-retries
php please webhook-manager:dispatch-retries --limit=500 --brand=acme
```

Every minute it picks up the deliveries whose `next_retry_at` is due, up to `--limit`
(200 by default), and sends each one — through `ProcessOutboundDeliveryJob` for hooks
with queueing on, straight through the delivery engine for the rest. It runs per
brand, because a scheduled run has no session and therefore no current brand.

Each row is **claimed** before the attempt is handed off: `next_retry_at` is cleared
in a conditional update, so a second overlapping run no longer sees the row. That
makes a double delivery impossible and makes one specific loss possible instead — a
process killed between the claim and the dispatch drops that one retry. For a webhook
whose receiver may not be idempotent, that is the safe direction.

Set `retry.schedule` to `false` to take the command off the scheduler and drive it
yourself.

### Why that status list

4xx codes other than 408, 425 and 429 mean the **request** is wrong, and retrying an
unchanged request against a 400 or a 422 is noise that fills your table and delays the
alert. Add a code only when the destination genuinely uses it for a transient
condition.

`retry_on_network_errors` covers DNS failures, connection refused and timeouts, which
are the cases most worth retrying.

## Replay

Replay re-sends a delivery, one at a time, from the delivery list or its detail
screen. There is no bulk replay in the Control Panel; for a whole window of failures,
use `webhook-manager:replay-failed` below.

The choice that matters is **whether to re-render**:

| Mode | Sends | Use when |
| --- | --- | --- |
| As recorded | the original payload snapshot | the destination was down; the event's data is what you want |
| Re-rendered | the template rendered against **current** data | the payload was wrong, or the record has since been corrected |

Re-rendering is not a rollback: if the entry has changed since, the destination
receives the new state under the old event. That is usually right for a "sync the
current truth" destination and wrong for an append-only one.

```bash
php please webhook-manager:replay-failed
```

Bulk-replays failures from the last N hours, which is the practical answer to "the
destination was down overnight".

## Deliveries on the object

A delivery records what was sent and where. It also records **what it was about**: `subject_type` and `subject_id` on every row, indexed together, so "every
attempt for payment 77" is one lookup instead of a search through request bodies.

The subject is resolved once, when the snapshot is written, in this order:

1. The payload names it outright with `subject_type` and `subject_id`.
2. A key configured for a type is present in the payload (`payment_id`, `payment.id`).
3. The trigger handle matches a configured pattern (`payments.*`) and the event carries
   a source reference, else a top-level `id` in the payload.
4. The event's own source type and reference. This is how the built-in entry, user,
   asset and form-submission triggers get a subject with no configuration.

The map lives in `config/webhook-manager.php`:

```php
'subjects' => [
    'payment' => ['keys' => ['payment_id', 'payment.id'], 'triggers' => ['payment.*', 'payments.*']],
    'offer'   => ['keys' => ['offer_id', 'offer.id'],     'triggers' => ['offer.*', 'offers.*']],
    'funnel'  => ['keys' => ['funnel_id', 'funnel.id'],   'triggers' => ['funnel.*', 'funnels.*']],
    'contact' => ['keys' => ['contact_id', 'contact.id'], 'triggers' => ['contact.*', 'contacts.*', 'leadhub.*']],
],
```

Add your own types there. Labels come from `webhook-manager::messages.subject_types.<type>`
when a translation exists and fall back to the capitalised handle.

In the Control Panel the delivery listing has a subject filter above the table and a
**Subject** column; the detail screen shows the subject next to the trigger and links back
to the filtered listing. From PHP, read the log through the facade:

```php
use Goldnead\WebhookManager\Facades\WebhookLog;

WebhookLog::forSubject('payment', $payment->id);       // newest first, default limit 50
WebhookLog::countForSubject('payment', $payment->id);
```

To show the same log on another addon's page, see
[Embedding deliveries in another addon](/webhook-manager/extending#embedding-deliveries-in-another-addon).

## Alerting and the circuit breaker

```php
'alerts' => [
    'enabled' => true,
    'throttle_minutes' => 15,
    'mail' => ['enabled' => true, 'recipients' => [/* … */]],
    'slack' => ['webhook_url' => null],
],
'circuit_breaker' => ['enabled' => true, 'threshold' => 10],
```

An alert fires when a delivery fails **terminally** — after the retries are exhausted
— and is throttled per hook, so a dead endpoint does not mail you a hundred times.

```dotenv
WEBHOOK_MANAGER_ALERT_EMAILS="ops@example.com,team@example.com"
WEBHOOK_MANAGER_ALERT_SLACK_URL=https://hooks.slack.com/services/…
```

The Slack URL accepts any Slack-compatible incoming webhook, so Discord and Teams
work too.

After **10 consecutive terminal failures** the hook is disabled. Automatic
re-enabling deliberately does not exist: a hook that silently resumed after a week of
failures would deliver a week of stale events to a destination that has moved on.
Re-enable it yourself once the destination is back, then replay what you want.

::: tip Set the alert recipients on day one
The failure mode without them is the worst kind: a hook whose destination has been
down for a week produces nothing but rows in a table nobody is looking at, and the
first you hear of it is from the person who expected the data.
:::

## Insights

**Webhooks → Insights** shows delivery volume, the success-rate trend, latency
percentiles (p50, p95, p99), an error breakdown and the top-failing endpoints,
filterable by day range and by webhook.

<Figure
  src="webhook-manager-insights"
  alt="The insights dashboard with delivery volume bars, a success-rate trend line and latency percentile bars"
  caption="p50 189 ms against a p99 of 8.9 s: one destination timing out, which a mean would have hidden completely." />

p95 and p99 are the useful ones. A p50 of 120 ms with a p99 of 14 seconds means one
destination in a hundred is timing out, which a mean would hide completely.

## Health check

```bash
php please webhook-manager:health
php please webhook-manager:health --brand=acme
```

Prints counts and recent failures. This is the command to paste into a bug report,
and a reasonable thing to run from a monitoring check.

## Pruning

```php
'pruning' => [
    'deliveries_after_days' => 30,
    'logs_after_days' => 60,
],
```

`webhook-manager:prune` applies these, and the addon does **not** schedule it for you.
Add it to your own `routes/console.php`, or these two tables — the fastest-growing the
addon owns — grow without bound.

```php
Schedule::command('webhook-manager:prune')->daily();
```

```bash
php please webhook-manager:prune
```

If you need a longer audit trail than 30 days, raise the setting rather than
disabling the prune — an unbounded delivery table eventually makes the Deliveries
screen unusable, which costs you the debugging tool you were trying to preserve.

## Logging modes

```php
'logging' => ['mode' => 'partial', 'partial_bytes' => 4096],
```

| Mode | Stores |
| --- | --- |
| `partial` (default) | the first 4 KB of each body |
| `full` | everything |
| `none` | no bodies at all |

`partial` is almost always enough to debug a failure and bounds the table's growth.
`full` is for a debugging session. `none` is for a payload you must not store, and it
costs you the ability to replay as-recorded.
