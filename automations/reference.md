# Reference

<AddonHeader />

## Console commands

| Command | Purpose |
| --- | --- |
| `automations:run-due [--brand=]` | Resume runs whose delay has elapsed |
| `automations:run-scheduled [--brand=]` | Start time-triggered automations |
| `automations:prune` | Delete runs past the retention window |
| `automations:sync [--brand=]` | Synchronise definitions with `resources/automations/*.json`. `--brand` required on a multi-brand install. |

All are registered in the scheduler except `automations:sync`, which is a deploy step.

## Triggers

| Handle group | Trigger | Requires |
| --- | --- | --- |
| Manual | Manual Trigger | — |
| Statamic | Form Submitted | — |
| Statamic | Entry Published (= saved **while** published) | — |
| LeadHub | Lead Created | LeadHub |
| LeadHub | Lead Status Changed | LeadHub |
| LeadHub | Lead Tag Added | LeadHub |
| LeadHub | Lead Note Added | LeadHub |
| LeadHub | Lead Follow-up Due | LeadHub |
| Webhook Manager | Webhook Received | Webhook Manager |
| Marketing | `marketing.subscribed` · `marketing.unsubscribed` · `marketing.campaign_sent` | Marketing |

## Logic nodes

Filter · Branch · Stop · Delay.

## Actions

**Notifications and HTTP** — Send Email Notification · Send Webhook (Simple) · Send
Webhook (via Webhook Manager) · Add Log Entry

**Statamic** — Create / Update Entry · Publish / Unpublish / Delete Entry · Create Term ·
Create / Update User · Assign User Role · Add User to Group · Set Global Value

**LeadHub** — Create or Update Lead · Change Lead Status · Add Lead Tag · Remove Lead Tag ·
Add Lead Note · Create Follow-up · Complete Follow-up

**Marketing** — `marketing.subscribe` · `marketing.unsubscribe` ·
`marketing.send_campaign`

**Logic** — Stop Flow

**Pro** — AI

## Facade

```php
use Goldnead\StatamicAutomations\Facades\Automations;
```

| Method | Purpose |
| --- | --- |
| `registerAction($class)` | Register a custom action |
| `registerTrigger($class)` | Register a custom trigger |
| `registerLogicNode($class)` | Register a custom logic node |
| `registerOptionSource($handle, $callable)` | Populate a select |
| `registerEventTrigger($eventClass, array $config)` | Any event as a trigger |
| `describe()` | What the registries actually hold. First debugging step. |

Contracts: `AutomationAction`, `AutomationTrigger`, `AutomationLogicNode`, all extending
`AutomationNode`. Register from `boot()`. Handles **replace** rather than add. A malformed
registration throws immediately.

## Run statuses

`running` · `waiting` · `completed` · `stopped` · `failed`

`stopped` is a normal outcome: a Filter or Stop node ended the flow deliberately.

## Tokens

```
{{ form.* }}     {{ entry.* }}     {{ user.* }}
{{ lead.* }}     {{ secret.* }}    {{ <payload key>.* }}
```

What is available depends on the trigger. The builder's token picker lists it.

## Permissions

| Permission | Grants |
| --- | --- |
| `view automations` | the section |
| `create automations` · `edit automations` · `delete automations` | authoring |
| `enable automations` | flipping a flow live |
| `run automation tests` | test runs |
| `view automation runs` | run history and node logs |
| `retry automation runs` | partial retry from a node |
| `manage automation settings` | the settings screen |

`enable automations` is separate from `edit automations` on purpose: it lets you give
somebody the builder without the ability to point a live flow at production.

## HTTP API

| Endpoint | Purpose |
| --- | --- |
| `GET /cp/automations/api/automations/{id}/export` | Export as JSON |
| `POST /cp/automations/import` | Import a JSON file |

The full CP JSON API is documented in the addon repository's `docs/api.md`.

## Configuration

| Key | Default |
| --- | --- |
| `queue` | `default` |
| `queue_connection` | `null` |
| `storage.driver` | `database` (`database` \| `flat_file`) |
| `storage.flat_file.path` | `resources/automations` |
| `max_call_depth` | `3` |
| `runs.store_context` · `store_full_context` · `store_node_io` | `true` |
| `runs.prune_after_days` | `30` (`null` disables) |
| `runs.keep_failed_runs_days` | `null` (= `prune_after_days`) |
| `runs.encrypt_context` | `false` |
| `test_mode.send_real_webhooks` | `false` |
| `test_mode.send_real_emails` | `false` |
| `test_mode.persist_leadhub_changes` | `false` |
| `test_mode.persist_statamic_changes` | `false` |
| `test_mode.call_real_ai` | `false` |
| `ai.model` | `claude-sonnet-4-5` |
| `ai.max_tokens` · `ai.timeout` | `1024` · `30` |
| `features.branch_nodes` · `filter_nodes` · `delay_nodes` | `true` |
| `features.custom_actions` · `custom_triggers` | `true` |
| `features.custom_actions_requires_pro` | `true` |
| `features.ai_action_requires_pro` | `true` |
| `features.templates` · `export_import` · `file_storage` · `multisite` | `true` |
| `file_storage.enabled` | `true` |
| `security.redact_keys` | `password, passwort, token, secret, api_key, authorization, credit_card, …` |
| `license.mode` | `config` (`config` \| `remote`) |
| `license.cache_ttl_minutes` | `360` |
| `secrets` | `[]` |
| `integrations.leadhub.emit_timeline_events` | `true` |

## Environment variables

```dotenv
STATAMIC_AUTOMATIONS_QUEUE=default
STATAMIC_AUTOMATIONS_QUEUE_CONNECTION=
STATAMIC_AUTOMATIONS_STORAGE=database
STATAMIC_AUTOMATIONS_DEFINITIONS_PATH=
STATAMIC_AUTOMATIONS_MAX_CALL_DEPTH=3
STATAMIC_AUTOMATIONS_ENCRYPT_CONTEXT=false
STATAMIC_AUTOMATIONS_FILE_PATH=
STATAMIC_AUTOMATIONS_AI_MODEL=claude-sonnet-4-5
ANTHROPIC_API_KEY=
ANTHROPIC_BASE_URL=https://api.anthropic.com
STATAMIC_AUTOMATIONS_LICENSE_MODE=config
STATAMIC_AUTOMATIONS_LICENSE_KEY=
STATAMIC_AUTOMATIONS_LICENSE_ENDPOINT=
```

## Requirements

<Requirements laravel="11.x, 12.x or 13.x" queue="Required. Anything but sync." />

Node 18+ only if you rebuild the CP bundle from a clone.

## Editions

| Edition | Includes |
| --- | --- |
| Free | The full builder, all triggers, all logic nodes, the core actions |
| Pro | The AI action and custom node registration |

Resolved through Statamic's own licensing system; the CP licensing utility shows the
status.

## Not in v1

Loops · parallel execution · code nodes · loop detection in branches · registering your
own templates into the template library.
