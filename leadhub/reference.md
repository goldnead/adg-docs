# Reference

<AddonHeader />

## Console commands

| Command | Purpose |
| --- | --- |
| `leadhub:followups:digest [--brand=]` | The daily due/overdue summary mail. Scheduled. |
| `leadhub:followups:due [--brand=]` | Fires `LeadHubFollowupDue`. Scheduled daily. |
| `leadhub:segments:sweep [--brand=]` | Re-materialise time-based segment rules. Scheduled daily. |
| `leadhub:storage:migrate --from= --to= [--dry-run]` | Move data between drivers |
| `leadhub:stache:warm [--clear]` | Rebuild the flat-driver JSON indexes |
| `leadhub:brand-integrity [--repair]` | Verify the per-brand unique indexes and rows |
| `leadhub:scoring:import [--dry-run] [--force] [--brand=]` | Copy the config point table into the per-brand table |
| `crm:backfill-leadhub [--source=] [--dry-run]` | Replay historical rows through ingestion |
| `crm:migrate-to-leadhub` | Migrate a bespoke CRM into LeadHub |

All brand-aware commands iterate every brand by default and take `--brand=<handle|id>`
to narrow the run. The three scheduled ones gained that in **1.10.3**; before it they
saw an empty database on a multi-brand install and reported success.

## Facade

```php
use Goldnead\Leadhub\Facades\LeadHub;
```

| Method | Returns |
| --- | --- |
| `ingest(array $payload)` | the timeline entry, or the existing one for a known `dedupe_key` |
| `merge($duplicate, $survivor)` | void; fires `LeadHubContactsMerged` |
| `optOut($contact)` | void; sets `do_not_contact` and removes from supported destinations |
| `segments()` | `[{ id, name, handle, is_active, members_count }, …]` |
| `segmentMemberIds($handle)` | contact **UUIDs**, live from the rules; `[]` if unknown or inactive |
| `contactInSegment($contactOrId, $handle)` | `bool` |

Capability-check via `method_exists(LeadHub::getFacadeRoot(), '…')`, never on the facade class.

## Events

```php
namespace Goldnead\Leadhub\Events;
```

**Contact** — `LeadHubContactCreated` · `LeadHubContactUpdated` · `LeadHubSubmissionAttached` ·
`LeadHubStatusChanged` · `LeadHubContactArchived` · `LeadHubContactDeleted` ·
`LeadHubContactsMerged` · `LeadHubContactScoreChanged`

**Tags & notes** — `LeadHubTagAdded` · `LeadHubTagRemoved` · `LeadHubNoteAdded`

**Follow-ups** — `LeadHubFollowupSet` · `LeadHubFollowupCompleted` · `LeadHubFollowupDue`

**Tasks** — `LeadHubTaskCreated` · `LeadHubTaskAssigned` · `LeadHubTaskCompleted`

**Pipelines** — `LeadHubOpportunityCreated` · `LeadHubOpportunityStageChanged` ·
`LeadHubOpportunityWon` · `LeadHubOpportunityLost`

**Segments** — `LeadHubContactEnteredSegment` · `LeadHubContactLeftSegment` (both carry
`segment_handle` and `segment_id` in `metadata`)

**Other** — `LeadHubSourceIngested` · `LeadHubCompanyCreated` · `LeadHubEmailLinkClicked`

Each carries `$contact`, optional `$actor`, optional `$metadata`.

## Webhook Manager triggers

Registered automatically when that addon is installed:

```
leadhub.contact.created      leadhub.followup.set         leadhub.tag.added
leadhub.contact.updated      leadhub.followup.completed   leadhub.tag.removed
leadhub.status.changed       leadhub.note.added           leadhub.contact.archived
leadhub.submission.attached  leadhub.contact.deleted      leadhub.score.changed
leadhub.segment.entered      leadhub.segment.left
```

## Contracts

| Contract | Implement to |
| --- | --- |
| `Goldnead\Leadhub\Contracts\CrmDestination` | add a CRM destination driver |
| `Goldnead\Leadhub\Contracts\SourceProjector` | map one of your models for ingestion |

Register destinations via `app(DestinationManager::class)->extend(…)` from a provider's
`boot()`.

## Permissions

| Permission |
| --- |
| `view leadhub` — the section, **and** eligibility to be assigned a lead |
| `view leadhub contacts` |
| `create leadhub contacts` · `edit leadhub contacts` |
| `delete leadhub contacts` · `archive leadhub contacts` |
| `export leadhub contacts` |
| `manage leadhub tags` |
| `manage leadhub form mappings` |
| `manage leadhub settings` |
| `view leadhub segments` · `manage leadhub segments` |
| `manage leadhub scoring` |
| `manage leadhub tasks` · `manage leadhub opportunities` · `manage leadhub companies` |

Assignability = `view leadhub` **and** brand membership. Superusers are not exempt from the
membership half.

## Segment rule vocabulary

**`field`** — `status`, `source`, `source_form`, `assigned_to`, `engagement_score`,
`do_not_contact`, `created_at`, `last_activity_at`, `full_name`, `first_name`, `last_name`,
`email`, `company`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`

**Operators** — `eq`, `neq`, `in`, `not_in`, `contains`, `starts_with`, `gt`, `gte`, `lt`,
`lte`, `is_set`, `is_empty`, `is_true`, `is_false`, `before`, `after`, `within_days`,
`older_than_days`

**`tag`** — `has` / `has_not`, by id, slug or name

**`event`** — `has` / `has_not` a timeline event key, optional `within_days`

An empty rule set matches **nobody**. `SegmentService::MAX_DEPTH = 1`.

## Database tables (eloquent driver)

`leadhub_contacts` · `leadhub_events` · `leadhub_notes` · `leadhub_tags` ·
`leadhub_contact_tag` · `leadhub_followups` · `leadhub_form_mappings` ·
`leadhub_segment_contact` · plus tables for tasks, companies, opportunities, pipelines,
scoring rules and the sync log when those modules are on.

**Unique per brand:** contact `email_normalized`, tag slug, pipeline slug, event `dedupe_key`,
form mapping `form_handle`, segment handle.

## Configuration

| Key | Default |
| --- | --- |
| `statuses` | new, contacted, qualified, won, lost, archived |
| `default_status` | `new` |
| `overwrite_existing_fields_from_submissions` | `false` |
| `store_full_submission_payload` | `true` |
| `timeline_payload_redaction` | `password, passwort, token, secret, api_key, credit_card, card_number` |
| `exports.queue_threshold` | `1000` |
| `exports.disk` / `directory` | `local` / `leadhub/exports` |
| `features.manual_contacts` · `csv_export` · `attribution` · `webhook_manager` | `true` |
| `features.ingestion` · `merge` | `true` |
| `features.webhooks` · `crm_destinations` · `scoring` · `companies` · `tasks` · `pipelines` | `false` |
| `scoring.default` | `1` |
| `scoring.timeline` | `true` |
| `scoring.events` | see [Lead scoring](/leadhub/scoring) |
| `click_tracking.dedupe_window` | `60` minutes |
| `attribution.fields` | UTM ×5, referrer, landing_page |
| `notifications.emails` | `LEADHUB_NOTIFY_EMAILS` |
| `notifications.digest.enabled` / `time` | `true` / `08:00` |
| `notifications.on_task_assignment` | `true` |
| `crm.destinations` | `[]` |
| `email_normalization.trim` / `lowercase` | `true` / `true` |
| `storage.driver` | `eloquent` |
| `storage.flat.path` | `content/leadhub` |
| `storage.flat.index_disk` / `index_path` | `local` / `leadhub/index` |

## Environment variables

```dotenv
LEADHUB_DRIVER=eloquent
LEADHUB_FLAT_PATH=
LEADHUB_INDEX_DISK=local
LEADHUB_INDEX_PATH=leadhub/index
LEADHUB_NOTIFY_EMAILS=
LEADHUB_HUBSPOT_TOKEN=
LEADHUB_BREVO_KEY=
LEADHUB_BREVO_LIST=
LEADHUB_WEBHOOK_URL=
LEADHUB_WEBHOOK_SECRET=
STATAMIC_PRO_ENABLED=true
```

## Requirements

<Requirements laravel="11.x, 12.x or 13.x" database="MySQL, PostgreSQL or SQLite — eloquent driver only" queue="Required for CRM pushes and queued exports" />

Statamic 5 is not supported from 0.3.0 onward; pin `^0.2.x` if you need it.

## Driver capability matrix

| | `eloquent` | `flat` |
| --- | --- | --- |
| Contacts, timelines, notes, tags, follow-ups | yes | yes |
| Ingestion · companies · tasks · pipelines · merge · scoring | yes | **no** |
| Segments | pivot table | mirrored onto contact YAML |
| Sync log table | yes | skipped; timeline entry still written |
| Queued exports | yes | no |
| Recommended size | any | ≤500 contacts, ≤10k events |

## Not built yet

Bidirectional CRM sync · a manual contact-merge UI · GDPR anonymisation · connectors for
Pipedrive, ActiveCampaign and Salesforce (custom drivers are supported).
