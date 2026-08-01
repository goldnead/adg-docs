# Reference

<AddonHeader />

## Console commands

| Command | Purpose |
| --- | --- |
| `webhook-manager:dispatch-retries [--limit=200] [--brand=]` | Run the deliveries whose retry is due |
| `webhook-manager:prune` | Purge old deliveries and logs |
| `webhook-manager:replay-failed` | Bulk replay failures from the last N hours |
| `webhook-manager:health [--brand=]` | Counts and recent failures |
| `webhook-manager:seed-examples` | Install sample fixtures |
| `webhook-manager:storage:migrate --from= --to= [--dry-run]` | Move config between drivers |
| `webhook-manager:migrate-flat-brands [--brand=] [--dry-run]` | Move a pre-1.9 flat layout into a brand directory |

All available as `php please …` or `php artisan …`.

**Only `dispatch-retries` is scheduled by the addon** — every minute, with
`withoutOverlapping()`, unless `retry.schedule` is `false`. It still needs your site
to run `schedule:run` from cron. Everything else on this list, `prune` included, is
yours to schedule.

## Built-in triggers

| Handle | Fires on |
| --- | --- |
| `entry.saved` | An entry is saved |
| `entry.published` | An entry is saved **while published** — see the note below |
| `entry.unpublished` | An entry is unpublished |
| `entry.deleted` | An entry is deleted |
| `form.submitted` | A Statamic form receives a submission |
| `user.saved` | A user is saved |
| `asset.saved` | An asset is saved |

::: warning `entry.published` is not a transition
Statamic 6 has no `EntryPublished` event. This trigger is `EntrySaved` gated on
`published()`, so it fires on every save of a published entry. Express the
draft-to-published transition as a condition.
:::

When LeadHub is installed, eleven more are registered automatically:
`leadhub.contact.created`, `leadhub.contact.updated`, `leadhub.status.changed`,
`leadhub.submission.attached`, `leadhub.note.added`, `leadhub.tag.added`,
`leadhub.tag.removed`, `leadhub.followup.set`, `leadhub.followup.completed`,
`leadhub.contact.archived`, `leadhub.contact.deleted`, plus
`leadhub.segment.entered` / `leadhub.segment.left` and `leadhub.score.changed`.

## Template namespaces

| Namespace | Available for |
| --- | --- |
| `entry` | `entry.*` |
| `form` | `form.submitted` |
| `user` | `user.saved` |
| `asset` | `asset.saved` |
| `site` | always |
| `system` | always |
| `trigger` | always |
| `payload` | custom event triggers |

An unavailable namespace resolves to empty rather than throwing.

## Outbound auth schemes

`none`, `bearer`, `basic`, `header`, `hmac`.

## Inbound verifiers

`none`, `bearer`, `static_header`, `basic`, `hmac`, `ip_allowlist`.

The `ip_allowlist` config key is `ips` (`allow` is read as a legacy alias). It fails
closed: an empty list rejects everything.

## Rule actions

Available to **rules**:

Create entry · Update entry · Create form submission · Send email · Send outbound
webhook · Send Slack webhook · Set field value · Write log note · Dispatch event.

## Inbound action handlers

Available to **inbound endpoints**. A separate set from the rule actions above:

| Handle | Does |
| --- | --- |
| `create_entry` | Creates an entry from the mapped payload |
| `update_entry` | Updates an entry by id |
| `upsert_entry` | Updates a matching entry, creates one if there is none |
| `create_form_submission` | Writes a Statamic form submission |
| `dispatch_event` | Dispatches a Laravel event |
| `audit_log` | Records the request and stops there |
| `upsert_lead` | Creates or updates a LeadHub contact; inert without LeadHub |
| `noop` | Accepts and does nothing |

## Integration presets

Slack · Discord · Microsoft Teams · Zapier · Make · n8n · Generic JSON.

## Facade

```php
use Goldnead\WebhookManager\Facades\WebhookManager;
```

| Method | Contract |
| --- | --- |
| `registerTrigger($trigger)` | `TriggerInterface` |
| `registerCondition($condition)` | `ConditionInterface` |
| `registerAction($action)` | `ActionInterface` |
| `registerAuthScheme($scheme)` | `AuthVerifierInterface` |
| `registerVariableResolver($resolver)` | `TemplateVariableResolverInterface` |
| `registerSuccessEvaluator($evaluator)` | `SuccessEvaluatorInterface` |
| `registerPreset($preset)` | `PresetInterface` |
| `registerInboundActionHandler($handler)` | `InboundActionHandlerInterface` |
| `registerEventTrigger($eventClass, array $config)` | — |

Contracts live under `Goldnead\WebhookManager\Contracts`. Register from `boot()`.
Handles **replace** rather than add.

## Events

| Event | Fired when |
| --- | --- |
| `TriggerDetected` | A trigger matched; carries the payload, actor and metadata |
| `DeliveryFailedTerminally` | Retries are exhausted; drives alerts and the circuit breaker |

Namespace `Goldnead\WebhookManager\Events`.

## Permissions

| Permission | Grants |
| --- | --- |
| `view webhooks` | the section |
| `manage outbound webhooks` | outbound CRUD |
| `test outbound webhooks` | the send-test button |
| `view webhook deliveries` | the delivery list and detail |
| `view sensitive payloads` | unmasked request and response bodies |
| `replay webhook deliveries` | the replay button |
| `manage inbound endpoints` | inbound CRUD |
| `manage webhook rules` | the rule builder |
| `manage webhook templates` | template CRUD |
| `manage webhook settings` | settings, including the storage driver |
| `use webhook debug tools` | the debug utilities |

## Configuration

| Key | Default |
| --- | --- |
| `features.outbound` / `.inbound` / `.rules` / `.templates` / `.debug_tools` | all `true` |
| `event_triggers` | `[]` |
| `storage.driver` | `eloquent` |
| `storage.flat.path` | `content/webhooks` |
| `queue.connection` / `queue.name` | app default / `default` |
| `queue.sync_in_console` | `false` |
| `retry.schedule` | `true` |
| `retry.strategy` | `exponential` |
| `retry.max_attempts` | `3` |
| `retry.base_delay_seconds` | `30` |
| `retry.max_delay_seconds` | `3600` |
| `retry.retry_on_status` | `408, 425, 429, 500, 502, 503, 504` |
| `retry.retry_on_network_errors` | `true` |
| `logging.mode` | `partial` |
| `logging.partial_bytes` | `4096` |
| `logging.mask_headers` | `authorization, x-api-key, x-auth-token, cookie, set-cookie` |
| `logging.mask_payload_keys` | `password, secret, token, api_key, apikey` |
| `pruning.deliveries_after_days` | `30` |
| `pruning.logs_after_days` | `60` |
| `inbound.route_prefix` | `webhooks/inbound` |
| `inbound.middleware` | `[SubstituteBindings::class]` |
| `inbound.legacy_route_prefixes` | `['!/webhooks/inbound']` |
| `inbound.max_payload_kb` | `512` |
| `inbound.rate_limit_per_minute` | `60` |
| `inbound.replay_protection_ttl_seconds` | `600` |
| `security.hash_algorithms` | `sha256, sha512` |
| `security.default_hash_algorithm` | `sha256` |
| `security.signature_header` | `X-Webhook-Signature` |
| `security.timestamp_header` | `X-Webhook-Timestamp` |
| `security.timestamp_tolerance_seconds` | `300` |
| `security.mask_secrets_in_ui` | `true` |
| `http.timeout_seconds` | `15` |
| `http.connect_timeout_seconds` | `5` |
| `http.follow_redirects` / `max_redirects` | `true` / `3` |
| `http.user_agent` | `Statamic-Webhook-Manager/1.0` |
| `http.verify_ssl` | `true` |
| `alerts.enabled` | `true` |
| `alerts.throttle_minutes` | `15` |
| `alerts.mail.enabled` / `recipients` | `true` / from `WEBHOOK_MANAGER_ALERT_EMAILS` |
| `alerts.slack.webhook_url` | `null` |
| `circuit_breaker.enabled` / `threshold` | `true` / `10` |
| `debug.expose_full_response_in_dev` | `true` |

## Environment variables

```dotenv
WEBHOOK_MANAGER_DRIVER=eloquent
WEBHOOK_MANAGER_FLAT_PATH=
WEBHOOK_MANAGER_QUEUE_CONNECTION=
WEBHOOK_MANAGER_QUEUE_NAME=default
WEBHOOK_MANAGER_ALERTS=true
WEBHOOK_MANAGER_ALERT_MAIL=true
WEBHOOK_MANAGER_ALERT_EMAILS=
WEBHOOK_MANAGER_ALERT_SLACK_URL=
WEBHOOK_MANAGER_ALERT_THROTTLE=15
WEBHOOK_MANAGER_CIRCUIT_BREAKER=true
WEBHOOK_MANAGER_CIRCUIT_THRESHOLD=10
```

## Publish tags

| Tag | Publishes |
| --- | --- |
| `webhook-manager-config` | `config/webhook-manager.php` |
| `webhook-manager-lang` | the translation files |

## Requirements

<Requirements
  laravel="12.x / 13.x"
  queue="Required in practice. Anything but sync." />

A `schedule:run` cron entry is required as well: without it, retries do not run.

`goldnead/statamic-brand-context` and `inertiajs/inertia-laravel` are hard
dependencies and install with the package. `goldnead/statamic-leadhub` and
`goldnead/statamic-automations` are suggested, not required.

Node 18+ only if you rebuild the CP bundle from a clone.

## Guarantees

| | |
| --- | --- |
| Delivery | queue-first; one record per attempt |
| Retries | executed by a scheduled command, claimed before dispatch: never twice, and lost rather than duplicated if the process dies mid-claim. Needs the host's `schedule:run` cron |
| Inbound rate limit | per endpoint, first step of the pipeline; shared across the canonical and legacy prefixes |
| Failure isolation | a delivery failure never breaks the event that triggered it |
| Config storage | eloquent or flat; a CP choice outranks config and env |
| Telemetry storage | always the database |
| Circuit breaker | disables after 10 consecutive terminal failures; never re-enables itself |
| Masking | applies in the CP; unmasking is a separate permission |
| Brand scoping | hooks, endpoints, rules and templates are brand-scoped |
