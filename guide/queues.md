# Queues & scheduling

Most of the suite dispatches work off the request thread, and several addons
register scheduled commands. Neither the queue worker nor the scheduler is
optional in production.

```bash
php artisan queue:work
php artisan schedule:work        # or a cron entry calling schedule:run
```

## What is queued

| Addon | Queued work | With `QUEUE_CONNECTION=sync` |
| --- | --- | --- |
| Webhook Manager | every outbound delivery, every retry | the HTTP request happens inside the request that triggered it; a slow endpoint becomes your page load |
| Automations | every automation run | a five-node flow with a delay runs inline, and the delay cannot work at all |
| LeadHub | CRM connector pushes, CSV exports past the threshold | a HubSpot outage becomes a slow form submission |
| Marketing | campaign sending, per-recipient messages | a campaign send blocks the request that started it |
| Activity | `recordLater()` only; `record()` is synchronous | fine, but see below |
| Notifications | mail channel delivery | a mail transport hiccup slows the action that notified |

Webhook Manager's own documentation puts it plainly: a queue driver other than
`sync` is strongly recommended. For Automations and Marketing it is closer to
required.

### Dedicated queues

Two addons let you isolate their work so a backlog of automation runs does not
delay your transactional mail:

```php
// config/automations.php
'queue' => env('STATAMIC_AUTOMATIONS_QUEUE', 'default'),
'queue_connection' => env('STATAMIC_AUTOMATIONS_QUEUE_CONNECTION', null),
```

Webhook Manager has the same pair under its `queue` key. If you use them,
remember to actually run a worker for that queue:

```bash
php artisan queue:work --queue=automations,default
```

### Context is captured at dispatch, not in the worker

`Activity::recordLater()` captures the actor and the request context **at dispatch
time**. By the time the job runs, the request that caused it is long gone; there
is no session, no authenticated user, and in multi-brand mode no current brand.

The same reasoning applies to anything you queue yourself against these addons:
resolve the identity and the brand while you still have them, and pass them in.

## What is scheduled

Four addons register commands with Laravel's scheduler automatically. Everything
else you schedule yourself.

| Command | Frequency | Registered by | Purpose |
| --- | --- | --- | --- |
| `marketing:send-scheduled` | every minute | Marketing | dispatches campaigns whose send time has arrived |
| `leadhub:followups:digest` | daily at `notifications.digest.time` | LeadHub | the daily due/overdue follow-up summary |
| `leadhub:followups:due` | daily | LeadHub | fires `LeadHubFollowupDue` for follow-ups that became due |
| `leadhub:segments:sweep` | daily | LeadHub | re-materialises segment membership for time-based rules |
| `automations:run-due` | frequently | Automations | resumes runs whose delay has elapsed |
| `automations:run-scheduled` | frequently | Automations | starts time-triggered automations |
| `webhook-manager:dispatch-retries` | every minute | Webhook Manager | runs the outbound deliveries whose retry is due |

And the ones you have to register yourself, which is the part most installs get
wrong:

| Command | Registered by | What happens if you never run it |
| --- | --- | --- |
| `notifications:send-digests` | nobody, by design | No digest is ever sent |
| `automations:prune` | nobody | The runs table grows without limit |
| `webhook-manager:prune` | nobody | The deliveries table grows without limit |

::: danger Retries need a working `schedule:run`
`webhook-manager:dispatch-retries` is the command that actually performs a
retry. Webhook Manager plans the retry by writing `next_retry_at`, and until
this command runs, nothing acts on it. On an install without a cron calling
`schedule:run`, a failed delivery is planned forever and never retried, the
terminal-failure event never fires, and neither alerts nor the circuit breaker
see the failure. See
[Webhook Manager → Installation](/webhook-manager/installation).
:::

The two `prune` commands were previously documented here as scheduled daily.
They never were. If your `automation_runs` or `webhook_deliveries` tables are
larger than you expected, that is why.

Notifications deliberately does not schedule itself. A send window is an audience
decision, not a package default, so register it in your own scheduler:

```php
// routes/console.php or App\Console\Kernel
Schedule::command('notifications:send-digests --frequency=daily')->dailyAt('07:00');
Schedule::command('notifications:send-digests --frequency=weekly')->mondays()->at('08:00');
```

### Without the scheduler

The failures are quiet, which is what makes this worth stating:

- Scheduled campaigns simply never send. No error, no failed job.
- Automation delays never resume. The run sits in a waiting state forever.
- Failed outbound deliveries are never retried. The Control Panel still shows
  "next retry in 30 seconds" for a delivery whose retry nothing will ever
  perform, so the display is actively misleading rather than merely idle.
- Segment membership goes stale for any rule involving time (`within_days`,
  `older_than_days`), while rules driven by mutations stay perfectly fresh —
  producing a segment that is half-correct, which is worse than obviously broken.
- Delivery and run tables grow without bound.

## Multi-brand and the console

A scheduled command has no session, so in multi-brand mode it has no current
brand, and the fail-closed scope means it sees nothing.

Most of the suite's commands handle this by iterating brands, and accept
`--brand=` to narrow the run:

```bash
php artisan automations:run-due --brand=acme
php artisan automations:run-scheduled --brand=acme
php artisan webhook-manager:health --brand=acme
php artisan webhook-manager:prune --brand=acme
php artisan marketing:send-scheduled --brand=acme
php artisan leadhub:scoring:import --brand=acme
php artisan notifications:send-digests --frequency=daily --brand=acme
```

```bash
php artisan leadhub:segments:sweep --brand=acme
php artisan leadhub:followups:digest --brand=acme
php artisan leadhub:followups:due --brand=acme
```

::: warning Before LeadHub 1.10.3, those last three did nothing
They did not iterate brands and took no `--brand`, so on a multi-brand install they
met the fail-closed scope and queried an empty database — then reported success:

```
$ php artisan leadhub:segments:sweep
Swept 0 segment(s): 0 entered, 0 left.
```

That reads as "nothing to do" and meant "I could not see anything". The visible
symptom was a segment list stuck at **0 members** for rules that clearly matched,
campaigns narrowed by a segment sending to nobody, and `LeadHubFollowupDue` never
firing.

Single-brand installs were never affected, which is why it survived four releases.
Upgrade to `^1.10.3`; if you cannot yet, wrap the call:

```php
BrandContext::runFor('acme', fn () => Artisan::call('leadhub:segments:sweep'));
```
:::

`activity:prune` and `activity:anonymize` take no `--brand=`, and there it is
deliberate: they query through `withoutGlobalScopes()` and run across all brands as
operator actions on the whole store.

## Commands that write files ask which brand

Two commands write to a directory rather than a table, and a directory has no brand
column:

```bash
php artisan leadhub:storage:migrate --from=eloquent --to=flat --brand=acme
php artisan automations:sync --from=db --brand=acme
```

They do **not** iterate brands, and that is deliberate. `content/leadhub/` and
`resources/automations/` each hold one undifferentiated set, so sweeping every brand
into one would merge contacts, or have one brand's `welcome-flow.json` overwrite
another's. On a multi-brand install both now **refuse** rather than guess, naming the
brands and the reason. Point the configured path at a directory of its own and run
them once per brand.

Single-brand installs are unaffected: no option, no prompt.

::: warning Before LeadHub 1.10.4 and Automations 1.7.1
Neither took a brand, so both met the fail-closed scope and read an empty database.

`leadhub:storage:migrate` reported `0 contact(s) processed` and `Migration complete`
— you would then switch `LEADHUB_DRIVER` and find the site empty, having been told
the move succeeded.

`automations:sync` was worse, because it asks the database a question before
deciding what to do: seeing no automations, it concluded the **files** were the
source of truth, and a bare run could import over automations it could not see.
:::

::: tip Both flat drivers isolate by directory
Since Marketing 1.6 and LeadHub **1.11**. Each ships a `…:migrate-flat-brands` command to
move an existing pre-brand layout into a brand directory; both only ever move, never
overwrite, and are a no-op on a second run.

Before LeadHub 1.11 its flat driver had no brand concept at all. See
[LeadHub → Storage drivers](/leadhub/storage#multi-brand-on-the-flat-driver).
:::

If you write your own command against these addons, wrap the work:

```php
BrandContext::runFor($handle, fn () => /* … */);
```

See [Brands & multi-tenancy](/guide/brands).

## Failed jobs

Configure Laravel's failed-job table and watch it. The suite's fail-safe
guarantee means an addon will not break the caller, but a queued job that fails
after its retries is genuinely lost work:

- Webhook Manager records the failure as a `Delivery` and, if configured, alerts
  and trips the circuit breaker. That one is visible.
- A LeadHub CRM push retries with backoff and lands in the **Sync log** either
  way. Also visible.
- A Marketing message failure is recorded per recipient.

Anything else follows Laravel's normal rules, so `queue:failed` is still part of
your operations routine.
