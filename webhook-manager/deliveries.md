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
    'strategy' => 'exponential',        // none | linear | exponential
    'max_attempts' => 3,
    'base_delay_seconds' => 30,
    'max_delay_seconds' => 3600,
    'retry_on_status' => [408, 425, 429, 500, 502, 503, 504],
    'retry_on_network_errors' => true,
],
```

Global defaults; each hook can override them.

With the defaults, a failing delivery is retried after 30 seconds, then 60, then
stops. The cap matters on a long strategy: exponential backoff from 30 seconds
reaches an hour on the seventh attempt and stays there.

### Why that status list

4xx codes other than 408, 425 and 429 mean the **request** is wrong, and retrying an
unchanged request against a 400 or a 422 is noise that fills your table and delays the
alert. Add a code only when the destination genuinely uses it for a transient
condition.

`retry_on_network_errors` covers DNS failures, connection refused and timeouts, which
are the cases most worth retrying.

### Retries need a real queue

The schedule is implemented as delayed jobs. With `QUEUE_CONNECTION=sync` there is no
delay mechanism, so a 30-second base delay cannot be honoured. Run a worker.

## Replay

Replay re-sends a delivery. Individually from its detail screen, or in batches from
the list.

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

`webhook-manager:prune` is scheduled daily. Deliveries and logs are the fastest-growing
tables the addon owns, and with no scheduler running they grow without bound.

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
