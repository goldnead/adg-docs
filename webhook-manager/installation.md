# Installation

<AddonHeader />

<Requirements queue="Required in practice. Anything but sync." />

```bash
composer require goldnead/statamic-webhook-manager
php please vendor:publish --tag=webhook-manager-config
php artisan migrate
```

The Webhook Manager appears in the CP sidebar as **Webhooks**.

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
responsive, and the retry schedule is implemented as delayed jobs.

```dotenv
QUEUE_CONNECTION=redis
```

```bash
php artisan queue:work
```

With `sync`, the HTTP request happens inside the request that triggered it, so a
slow or hanging endpoint becomes your page load, and retries with a 30-second base
delay are not possible at all. The addon will run this way, and you should not run
it this way.

Optionally give it its own queue so a backlog of deliveries does not delay your
transactional mail:

```dotenv
WEBHOOK_MANAGER_QUEUE_NAME=webhooks
```

```bash
php artisan queue:work --queue=webhooks,default
```

## The scheduler

`webhook-manager:prune` is registered daily and purges deliveries after 30 days and
logs after 60. Without a scheduler those two tables grow without bound, and they are
the fastest-growing tables the addon owns.

```bash
php artisan schedule:work    # or a cron entry calling schedule:run
```

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
