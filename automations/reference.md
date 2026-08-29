# Reference

<AddonHeader />

## Console commands

| Command | Options | Purpose |
| --- | --- | --- |
| `automations:run-due` | `--brand=` | Resume runs whose delay or wait window has elapsed |
| `automations:run-scheduled` | `--brand=` | Start time-triggered automations |
| `automations:prune` | `--days=` · `--keep-failed-days=` · `--dry-run` · `--brand=` | Delete runs past the retention window |
| `automations:sync` | `--from=auto\|files\|db` · `--strategy=db_wins\|file_wins` · `--brand=` · `--dry-run` · `--watch` | Synchronise definitions with `resources/automations/*.json`. `--brand` required on a multi-brand install. |

Only `automations:run-due` and `automations:run-scheduled` are registered with the
scheduler, both every minute and `withoutOverlapping`. `automations:prune` is **not**
scheduled — add it to your own schedule if you want retention enforced. `automations:sync`
is a deploy step.

## Triggers

Eighteen ship built in. Every handle below is also a key under `builtin_nodes` in
`config/automations.php`.

| Group | Trigger | Handle | Requires |
| --- | --- | --- | --- |
| Manual | Manual Trigger | `manual` | — |
| Statamic | Schedule | `scheduled` | — |
| Statamic | Form Submitted | `form_submitted` | — |
| Statamic | Entry Published (= saved **while** published) | `entry_published` | — |
| Statamic | Entry Saved | `entry_saved` | — |
| Statamic | Entry Created | `entry_created` | — |
| Statamic | Entry Saving (before save) | `entry_saving` | — |
| Statamic | Entry Deleted | `entry_deleted` | — |
| Statamic | Term Saved | `term_saved` | — |
| Statamic | Term Deleted | `term_deleted` | — |
| Statamic | User Registered | `user_registered` | — |
| Statamic | User Saved | `user_saved` | — |
| Statamic | User Deleted | `user_deleted` | — |
| Statamic | Asset Uploaded | `asset_uploaded` | — |
| Statamic | Asset Saved | `asset_saved` | — |
| Statamic | Asset Deleted | `asset_deleted` | — |
| Statamic | Global Set Saved | `global_set_saved` | — |
| Statamic | Navigation Saved | `nav_saved` | — |
| Webhook Manager | Webhook Received | `webhook_received` | Webhook Manager |
| LeadHub | Lead Created | `leadhub.lead_created` | LeadHub |
| LeadHub | Lead Status Changed | `leadhub.lead_status_changed` | LeadHub |
| LeadHub | Lead Tag Added | `leadhub.lead_tag_added` | LeadHub |
| LeadHub | Lead Note Added | `leadhub.lead_note_added` | LeadHub |
| LeadHub | Lead Follow-up Due | `leadhub.lead_follow_up_due` | LeadHub |
| LeadHub | Contact score changed | `contact_score_changed` | LeadHub |
| Marketing | Subscriber Confirmed · Unsubscribed · Campaign Sent | `marketing.subscribed` · `marketing.unsubscribed` · `marketing.campaign_sent` | Marketing |

## Logic nodes

| Node | Handle |
| --- | --- |
| Filter | `filter` |
| Branch | `branch` |
| Switch | `switch` |
| Stop Flow | `stop` |
| Delay | `delay` |
| Wait Until | `wait_until` |
| Loop (for each) | `loop` |
| Parallel (fan-out / join) | `parallel` |
| Throttle / Deduplicate | `throttle` |
| Set Variable | `set_variable` |
| Call Automation | `call_automation` |

`call_automation` is the node `max_call_depth` governs.

## Actions

**Notifications and HTTP** — Send Email Notification (`send_email`) · Send Webhook
(Simple) (`send_webhook`) · Send Webhook (via Webhook Manager) (`webhook_manager.send`) ·
Add Log Entry (`add_log_entry`)

**Statamic** — Create Entry (`create_entry`) · Update Entry (`update_entry`) · Publish /
Unpublish / Delete Entry (`publish_entry`, `unpublish_entry`, `delete_entry`) · Create
Term (`create_term`) · Create User (`create_user`) · Update User (`update_user`) · Assign
User Role (`assign_user_role`) · Add User to Group (`add_user_to_group`) · Set Global
Value (`set_global_value`)

**LeadHub** — `leadhub.create_or_update_lead` · `leadhub.change_status` ·
`leadhub.add_tag` · `leadhub.remove_tag` · `leadhub.add_note` ·
`leadhub.create_follow_up` · `leadhub.complete_follow_up` · `leadhub.create_task` ·
`leadhub.change_score` · `leadhub.create_or_update_opportunity` · `leadhub.move_stage`
(eleven)

**Marketing** — `marketing.subscribe` · `marketing.unsubscribe` ·
`marketing.send_campaign`

**Pro** — AI (`ai_generate`)

## Facade

```php
use Goldnead\StatamicAutomations\Facades\Automations;
```

**Registering**

| Method | Purpose |
| --- | --- |
| `registerAction(string $handleOrClass, ?string $class = null)` | Register a custom action |
| `registerTrigger(string $handleOrClass, ?string $class = null)` | Register a custom trigger |
| `registerLogicNode(string $handleOrClass, ?string $class = null)` | Register a custom logic node |
| `registerOptionSource(string $handle, callable\|string $resolver)` | Populate a select |
| `registerEventTrigger(string $eventClass, array $definition)` | Any application event as a trigger |
| `template(array $template)` | Add a template to the CP template catalogue |
| `registerBuiltIn(string $handle)` | Mark a handle as built-in, exempting it from the Pro gate |

The one-argument overload of the three `register*` node methods reads the handle from
`$class::handle()`. `trigger()`, `action()` and `node()` are the two-argument primitives
those methods delegate to; they take an explicit handle and skip the class validation.

**Inspecting**

| Method | Returns |
| --- | --- |
| `describe(string $class, ?string $expectedKind = null): array` | `['handle', 'kind', 'class']` for **one** class, or throws |
| `triggers(): TriggerRegistry` | The trigger registry |
| `actions(): ActionRegistry` | The action registry |
| `nodes(): NodeRegistry` | The node registry, all three kinds |
| `optionSources(): OptionSourceRegistry` | The option-source registry |
| `eventTriggers(): array` | Registered event-trigger definitions, keyed by handle |
| `isBuiltIn(string $handle): bool` | Whether a handle is exempt from the Pro gate |
| `license(): LicenseManager` | The licence manager |
| `bootEventTriggersFromConfig(): self` | Registers everything in `event_triggers`; called at boot |

::: warning `describe()` takes a required argument
`describe()` validates a single class. It is not a registry dump, and calling it with no
argument is a `TypeError`. To see what is registered, use `Automations::nodes()`,
`triggers()` or `actions()`.
:::

Contracts: `AutomationAction`, `AutomationTrigger`, `AutomationLogicNode`, all extending
`AutomationNode`. Register from `boot()`. Handles **replace** rather than add.

A malformed registration throws — a class that does not exist, does not implement
`AutomationNode`, returns an empty `handle()`, or does not satisfy the contract for the
kind you registered it as. A **failed licence gate does not throw**: registration is
skipped silently so a lapsed licence never crashes a boot.

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
| `POST /cp/automations/api/automations/import` | Import a JSON definition |
| `GET /cp/automations/api/automations/{id}/versions` | List stored versions |
| `POST /cp/automations/api/automations/{id}/versions/{timestamp}/revert` | Restore one |
| `GET /cp/automations/api/audit` | The audit log |
| `GET /cp/automations/api/email-templates` | Templates offered by the email-template picker |
| `GET /cp/automations/api/email-templates/preview` | Render one with sample data |

`GET /cp/automations/import` is the upload **screen**, not the endpoint. The full CP JSON
API is documented in the addon repository's `docs/api.md`.

## Configuration

| Key | Default |
| --- | --- |
| `queue` | `default` |
| `queue_connection` | `null` |
| `storage.driver` | `database` (`database` \| `flat_file`) |
| `storage.flat_file.path` | `resources/automations` |
| `max_call_depth` | `3` (nesting cap for the *Call Automation* node) |
| `alerts.enabled` | `true` |
| `alerts.channels` | `['log']` (`log` and/or `mail`) |
| `alerts.mail_to` | `null` |
| `alerts.throttle_minutes` | `15` |
| `versioning.enabled` | `true` |
| `versioning.keep` | `25` revisions per automation |
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
| `features.templates` · `export_import` · `file_storage` · `multisite` | `true` |
| `file_storage.enabled` | `true` |
| `security.redact_keys` | `password, passwort, token, secret, api_key, authorization, credit_card, …` |
| `secrets` | `[]` |
| `builtin_nodes.*` | `true` — one switch per built-in trigger, logic node and action, keyed by handle. A handle absent from the map is on. |
| `event_triggers` | `[]` — application events as triggers, keyed by **event FQCN** |
| `integrations.leadhub.emit_timeline_events` | `true` |
| `integrations.leadhub.score_changed_event` | `Goldnead\Leadhub\Events\LeadHubContactScoreChanged` |
| `integrations.webhook_manager.detect` · `.facade` · `.outbound_repository` · `.dispatch_action` · `.inbound_event` | class names the detector and adapter resolve |
| `integrations.leadhub.detect` · `.facade` | class names the detector resolves |
| `integrations.marketing.detect` | not present in the published config file, but read. Add it to point detection at a forked Marketing package; the built-in fallbacks are `Goldnead\Marketing\Services\SubscriptionService` and `Goldnead\Marketing\ServiceProvider`. |

## Environment variables

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
ANTHROPIC_BASE_URL=https://api.anthropic.com
```

## Requirements

<Requirements laravel="12.x or 13.x" database="MySQL or SQLite" queue="Required. Anything but sync." />

Composer pulls two further packages in as hard dependencies:
`goldnead/statamic-brand-context` and `inertiajs/inertia-laravel`. See
[Installation](/automations/installation).

Node 18+ only if you rebuild the CP bundle from a clone.

## Editions

| Edition | Includes |
| --- | --- |
| Free | The full builder, all triggers, all logic nodes, the core actions |
| Pro | The AI action and custom node registration |

Resolved through Statamic's own licensing system; the CP licensing utility shows the
status.

## Not included

Code nodes, and loop detection between automations — `max_call_depth` is a backstop
rather than detection. See [Node catalogue](/automations/nodes#what-is-deliberately-missing).
