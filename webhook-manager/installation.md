# Installation

<AddonHeader />

<Requirements
  laravel="12.x / 13.x"
  queue="Required in practice. Anything but sync." />

```bash
composer require goldnead/statamic-webhook-manager
php please vendor:publish --tag=webhook-manager-config
php artisan migrate
```

The Webhook Manager appears in the CP sidebar as **Webhooks**.

::: danger Retries need a cron
Without a `schedule:run` cron entry, a failed delivery is planned for a retry that
never runs, and no failure alert is sent either. This is the one piece of setup that
costs you data if you skip it. Read
[Retries need the scheduler](#retries-need-the-scheduler) before you go live.
:::

## What comes with it

`goldnead/statamic-brand-context` is a hard dependency, not an option. Composer
installs it with the package and its migrations run alongside the addon's own. You do
not have to use multi-brand mode; single-brand is the default and needs no
configuration. See [Brand Context](/brand-context/).

`inertiajs/inertia-laravel` comes along too, because the Control Panel screens are
Inertia pages. Statamic 6 already ships it in most installs.

Two packages are suggested and neither is required:

| Package | Adds |
| --- | --- |
| `goldnead/statamic-leadhub` | the `upsert_lead` inbound action, turning a payload into a CRM contact |
| `goldnead/statamic-automations` | multi-step workflows that send their webhooks through this addon |

## What you can publish

| Tag | Publishes |
| --- | --- |
| `webhook-manager-config` | `config/webhook-manager.php` |
| `webhook-manager-lang` | the translation files, for overriding CP strings |

```bash
php please vendor:publish --tag=webhook-manager-lang
```

The CP bundle is not a publish tag; Statamic publishes it on install (see below).

## Node is not needed

The pre-built CP bundle ships with the package under `resources/dist/build/`, and
Statamic publishes it on install. There is no front-end build step.

You only need Node if you cloned the repo directly, for example via a path
repository:

```bash
npm install
npm run build
```

## A queue driver

Outbound deliveries default to the queue ("queue-first") to keep the Control Panel
responsive.

```dotenv
QUEUE_CONNECTION=redis
```

```bash
php artisan queue:work
```

With `sync`, the HTTP request happens inside the request that triggered it, so a
slow or hanging endpoint becomes your page load. The addon will run this way, and you
should not run it this way.

Retries do not depend on the queue driver. They are dispatched by a scheduled command
and go through the queue only for hooks that have queueing enabled.

Optionally give it its own queue so a backlog of deliveries does not delay your
transactional mail:

```dotenv
WEBHOOK_MANAGER_QUEUE_NAME=webhooks
```

```bash
php artisan queue:work --queue=webhooks,default
```

## Retries need the scheduler

**Automatic retries only happen if your site runs Laravel's scheduler.** This is not
optional configuration. It is the difference between a failed delivery being retried
and a failed delivery being lost.

The addon registers `webhook-manager:dispatch-retries` on the scheduler itself, every
minute. What it cannot do is run the cron entry that drives the scheduler. That is
yours:

```
* * * * * cd /path/to/site && php artisan schedule:run >> /dev/null 2>&1
```

Locally, `php artisan schedule:work` does the same thing in the foreground.

Verify it with:

```bash
php artisan schedule:list
```

`webhook-manager:dispatch-retries` should appear with `* * * * *`.

::: danger What happens without it
A delivery that fails on a retryable error gets a `next_retry_at` written and the CP
shows "next retry in 30 seconds". Nothing then runs it. The row sits there, and:

- the payload is never delivered, and nothing says so;
- because the attempts are never exhausted, `DeliveryFailedTerminally` never fires;
- so **no failure alert is sent and the circuit breaker never counts** — the two
  mechanisms meant to tell you about a dead destination stay silent.

Installations without a cron have lost every retryable delivery since 1.0. If you are
upgrading to 1.10 on such a site, check for stranded rows: **Deliveries**, filtered to
`failed`, with a next attempt in the past.
:::

You can run it by hand at any time, and take it off the scheduler if you would rather
drive it yourself:

```bash
php please webhook-manager:dispatch-retries
php please webhook-manager:dispatch-retries --limit=500 --brand=acme
```

```php
// config/webhook-manager.php
'retry' => ['schedule' => false],
```

The command claims each delivery before it hands off the attempt, so an overlapping
run cannot send the same webhook twice. See
[Deliveries](/webhook-manager/deliveries#retries).

## Pruning is not scheduled for you

`webhook-manager:prune` purges deliveries after 30 days and logs after 60. The addon
does **not** put it on the scheduler, so add it to your own `routes/console.php`:

```php
use Illuminate\Support\Facades\Schedule;

Schedule::command('webhook-manager:prune')->daily();
```

Without it those two tables grow without bound, and they are the fastest-growing
tables the addon owns.

## Failure alerting

Worth setting up on day one rather than after the first silent outage. A hook whose
destination has been down for a week produces nothing but rows in a table nobody is
looking at.

```dotenv
WEBHOOK_MANAGER_ALERT_EMAILS="ops@example.com,team@example.com"
WEBHOOK_MANAGER_ALERT_SLACK_URL=https://hooks.slack.com/services/…
```

Alerts fire when a delivery fails **after all retries**, and are throttled per hook
(15 minutes by default) so a dead endpoint does not mail you a hundred times. A hook
is auto-disabled after 10 consecutive terminal failures. See
[Deliveries](/webhook-manager/deliveries#alerting-and-the-circuit-breaker).

## Verifying the install

```bash
php please webhook-manager:seed-examples
php please webhook-manager:health
```

`seed-examples` installs sample fixtures so the CP has something in it, and `health`
prints counts and recent failures. Then create a hook against a request-bin URL,
publish an entry, and look at **Deliveries**.

## Optional: which modules you want

Each major module can be switched off, which hides its CP screens, navigation
entries and runtime wiring. Running outbound-only is a supported configuration:

```php
// config/webhook-manager.php
'features' => [
    'outbound' => true,
    'inbound' => false,
    'rules' => false,
    'templates' => true,
    'debug_tools' => false,
],
```

## Choosing a storage driver

The default is `eloquent`, which needs the migration you already ran. If you would
rather have your webhook config in git:

```dotenv
WEBHOOK_MANAGER_DRIVER=flat
```

Delivery history stays in the database either way. You can also switch drivers from
the Control Panel, which migrates the existing config as it goes. See
[Storage drivers](/webhook-manager/storage).

## Licence

MIT. No key, no licence check.
