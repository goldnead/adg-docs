# Configuration

<AddonHeader />

```bash
php artisan vendor:publish --tag=statamic-automations-config
```

## Queue

```php
'queue' => env('STATAMIC_AUTOMATIONS_QUEUE', 'default'),
'queue_connection' => env('STATAMIC_AUTOMATIONS_QUEUE_CONNECTION', null),
```

Give runs their own queue so a backlog does not delay transactional mail — and remember
to run a worker for it.

## Storage

```php
'storage' => [
    'driver' => env('STATAMIC_AUTOMATIONS_STORAGE', 'database'),  // database | flat_file
    'flat_file' => [
        'path' => env('STATAMIC_AUTOMATIONS_DEFINITIONS_PATH', null),  // default: resources/automations
    ],
],
```

Governs where automation **definitions** live. Runs are always in the database.

Unlike the other addons in the suite, the flat option here is a mirror rather than a
different source of truth: see
[Export, import & file sync](/automations/export-import#file-sync).

## `max_call_depth`

```php
'max_call_depth' => env('STATAMIC_AUTOMATIONS_MAX_CALL_DEPTH', 3),
```

How deep automations may nest before the engine refuses. Two things count against it: the
**Call Automation** node, which runs a second automation as a sub-flow, and an automation
whose action mutates a record that re-triggers the same automation.

This is the backstop for both. Raising it does not fix a loop; it lengthens it.

## Failure alerts

```php
'alerts' => [
    'enabled' => true,
    'channels' => ['log'],
    'mail_to' => env('STATAMIC_AUTOMATIONS_ALERT_MAIL_TO', null),
    'throttle_minutes' => 15,
],
```

What happens when a run fails. `channels` takes `log`, `mail`, or both.

The default is `log` only, so out of the box a failure goes to your Laravel log and
nobody is emailed. Add `'mail'` **and** set `mail_to` — with one but not the other,
nothing is sent.

`throttle_minutes` is per automation. A flow failing on every one of a hundred runs
produces one alert per window rather than a hundred, which is what keeps the mailbox
usable and the alert meaningful.

## Versioning

```php
'versioning' => [
    'enabled' => true,
    'keep' => 25,
],
```

Every save snapshots the automation's graph so a change can be rolled back. Snapshots are
stored as **Statamic Revisions** — flat-file YAML in the revisions store, under a key that
namespaces automation history away from entry and term revisions.

`keep` caps the retained revisions per automation. Setting `enabled` to `false` stops
snapshotting, which also means there is nothing left to revert to. See
[Version history](/automations/building#version-history).

## Switching individual nodes off

```php
'builtin_nodes' => [
    'entry_saving' => false,
    'ai_generate' => false,
],
```

One switch per built-in trigger, logic node and action, keyed by its handle. **A handle
absent from the map is on**, so the published file lists a subset and everything else
still registers.

Use it to keep a node out of the library entirely rather than relying on people not
picking it: `delete_entry` on a site where nothing should ever delete content,
`ai_generate` where there is no key. The handles are in the
[node catalogue](/automations/nodes).

This is narrower than `features.*`, which switches off whole capabilities.

## Runs

```php
'runs' => [
    'store_context' => true,
    'store_full_context' => true,
    'store_node_io' => true,
    'prune_after_days' => 30,
    'keep_failed_runs_days' => null,   // null = same as prune_after_days
    'encrypt_context' => env('STATAMIC_AUTOMATIONS_ENCRYPT_CONTEXT', false),
],
```

`store_node_io` is what makes the node-by-node log useful, and also what makes the
table grow. Turning it off costs you the main debugging tool; prune harder instead.

`keep_failed_runs_days` is worth setting higher than `prune_after_days`. Successful
runs from six weeks ago are noise; the failure from six weeks ago is evidence.

### `encrypt_context`

```dotenv
STATAMIC_AUTOMATIONS_ENCRYPT_CONTEXT=true
```

Encrypts `AutomationRun.context` and `AutomationNodeRun.input`/`output` at rest with
Laravel's `Crypt` (so, with `APP_KEY`). Reads are transparent and the API response
shape is unchanged, and pre-existing unencrypted rows keep working after you enable it.

Worth turning on for any flow that carries personal data through a run log.

::: danger It depends on `APP_KEY`
Rotating `APP_KEY` without re-encrypting makes existing encrypted run logs
unreadable. Set this once, early, and treat `APP_KEY` accordingly.
:::

## Test mode

```php
'test_mode' => [
    'send_real_webhooks' => false,
    'send_real_emails' => false,
    'persist_leadhub_changes' => false,
    'persist_statamic_changes' => false,
    'call_real_ai' => false,
],
```

By default a test run does **nothing real**: it exercises the flow, resolves the
tokens, produces a full node-by-node log, and performs no side effects.

Flip an individual switch when you specifically want to verify that half of an
integration works. Flipping `persist_statamic_changes` on a production site means a
test run creates entries.

## AI

```php
'ai' => [
    'api_key' => env('ANTHROPIC_API_KEY', ''),
    'model' => env('STATAMIC_AUTOMATIONS_AI_MODEL', 'claude-sonnet-4-5'),
    'base_url' => env('ANTHROPIC_BASE_URL', 'https://api.anthropic.com'),
    'version' => '2023-06-01',
    'max_tokens' => 1024,
    'timeout' => 30,
],
```

Backs the AI action, which is a Pro feature. No key means the action is unavailable
rather than failing at run time.

## Features

```php
'features' => [
    'branch_nodes' => true,
    'filter_nodes' => true,
    'delay_nodes' => true,
    'custom_actions' => true,
    'custom_actions_requires_pro' => true,
    'ai_action_requires_pro' => true,
    'custom_triggers' => true,
    'templates' => true,
    'export_import' => true,
    'file_storage' => true,
    'multisite' => true,
],
```

Each toggle removes a capability from the builder rather than hiding it decoratively.
Turning `delay_nodes` off on a site with no scheduler is honest: a delay node there
would never resume.

## Security

```php
'security' => [
    'redact_keys' => [
        'password', 'passwort', 'token', 'secret',
        'api_key', 'authorization', 'credit_card', /* … */
    ],
],
```

Patterns redacted in run logs. The defaults include German spellings, which the other
addons' lists do not — add whatever your own fields are called. A field named
`kundennummer` is not caught by anything here.

## File storage

```php
'file_storage' => [
    'enabled' => true,
    'path' => env('STATAMIC_AUTOMATIONS_FILE_PATH', null),
],
```

Where exported JSON files are written. See
[Export, import & file sync](/automations/export-import).

## License

```php
'license' => [
    'key' => env('STATAMIC_AUTOMATIONS_LICENSE_KEY', ''),
    'mode' => env('STATAMIC_AUTOMATIONS_LICENSE_MODE', 'config'),  // config | remote
    'endpoint' => env('STATAMIC_AUTOMATIONS_LICENSE_ENDPOINT', ''),
    'cache_ttl_minutes' => 360,
    'allowed_keys' => [],
    'features' => ['custom_actions', 'custom_triggers'],
],
```

`config` mode validates against `allowed_keys` locally and is the right answer for an
install that must not make outbound calls. `remote` checks an endpoint, cached for six
hours.

Independently of this, the edition also resolves through Statamic's own licensing
system, which is what the CP licensing utility reports.

## Secrets

```php
'secrets' => [
    // 'stripe_key' => env('STRIPE_KEY'),
    // 'slack_webhook' => env('SLACK_WEBHOOK_URL'),
],
```

A named secret store. Values declared here are addressable in node config as
`{{ secret.stripe_key }}`, so a credential lives in your environment rather than in an
automation definition that gets exported to JSON and committed.

Use this for anything you would not want in an export file.

## Integrations

```php
'integrations' => [
    'webhook_manager' => [ 'detect' => [...], 'facade' => [...], /* … */ ],
    'leadhub' => [ 'detect' => [...], 'emit_timeline_events' => true, /* … */ ],
],
```

Class names checked by the integration detector; the first class that exists wins.
Leave the defaults unless you run a forked sibling package. See
[Integrations](/automations/integrations).

Marketing is detected too, but has no block in the published file: the detector falls back
to `Goldnead\Marketing\Services\SubscriptionService` and `Goldnead\Marketing\ServiceProvider`.
Add `'marketing' => ['detect' => [...]]` only if you run a fork.

## Custom event triggers

```php
'event_triggers' => [
    \App\Events\OrderShipped::class => [
        'handle' => 'order_shipped',
        'label' => 'Order Shipped',
        'group' => 'Shop',
        'payload' => 'order',
        'output_schema' => ['order' => ['id' => 'string', 'total' => 'number']],
    ],
],
```

Turns any application event into a trigger with no trigger class of your own. **The array
key is the event's fully qualified class name**; `handle` lives inside the definition and
is required.

Closures are not config-serialisable, so this path takes the declarative forms only:
`payload` as a dot-path string (or `'*'` to dump the event's public properties) and
`matches` as an invokable class-string. For the closure form, call
`Automations::registerEventTrigger()` from a service provider's `boot()`. See
[Extending](/automations/extending#turning-an-application-event-into-a-trigger).

::: tip A namespace to remember
LeadHub's PSR-4 namespace is `Goldnead\Leadhub` — lowercase "hub" — even though the
brand is "LeadHub". And Automations' own namespace is
`Goldnead\StatamicAutomations`, not `Goldnead\Automations`. Both have cost real time.
:::

## Environment summary

```dotenv
STATAMIC_AUTOMATIONS_QUEUE=default
STATAMIC_AUTOMATIONS_QUEUE_CONNECTION=
STATAMIC_AUTOMATIONS_STORAGE=database
STATAMIC_AUTOMATIONS_DEFINITIONS_PATH=
STATAMIC_AUTOMATIONS_MAX_CALL_DEPTH=3
STATAMIC_AUTOMATIONS_ALERT_MAIL_TO=
STATAMIC_AUTOMATIONS_ENCRYPT_CONTEXT=false
STATAMIC_AUTOMATIONS_FILE_PATH=
STATAMIC_AUTOMATIONS_AI_MODEL=claude-sonnet-4-5
ANTHROPIC_API_KEY=
STATAMIC_AUTOMATIONS_LICENSE_MODE=config
STATAMIC_AUTOMATIONS_LICENSE_KEY=
STATAMIC_AUTOMATIONS_LICENSE_ENDPOINT=
```
