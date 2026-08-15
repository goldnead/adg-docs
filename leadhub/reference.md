# Reference

<AddonHeader />

## Console commands

| Command | Purpose |
| --- | --- |
| `leadhub:followups:digest [--brand=]` | The daily due/overdue summary mail. Scheduled. |
| `leadhub:followups:due [--brand=]` | Fires `LeadHubFollowupDue`. Scheduled daily. |
| `leadhub:segments:sweep [--brand=]` | Re-materialise time-based segment rules. Scheduled daily. |
| `leadhub:storage:migrate --from= --to= [--brand=] [--dry-run]` | Move data between drivers. `--brand` required on a multi-brand install; `--to=flat` refuses with more than one brand. |
| `leadhub:stache:warm [--clear]` | Rebuild the flat-driver JSON indexes |
| `leadhub:migrate-flat-brands [--brand=] [--dry-run]` | Move the pre-brand flat layout into a brand directory. Only moves; never overwrites; no-op on a second run. **1.11+** |
| `leadhub:brand-integrity [--repair]` | Verify the per-brand unique indexes and rows |
| `leadhub:scoring:import [--dry-run] [--force] [--brand=]` | Copy the config point table into the per-brand table |

That is the complete list: the addon registers eight commands and no others.

All brand-aware commands iterate every brand by default and take `--brand=<handle|id>`
to narrow the run. The three scheduled ones gained that in **1.10.3**; before it they
saw an empty database on a multi-brand install and reported success.

## Facade

```php
use Goldnead\Leadhub\Facades\LeadHub;
```

Anything that returns "the contact" returns the same normalised array shape produced by
`present()` — `id`, `uuid`, `email`, names, phone, status, tags and the rest — not the
Eloquent model.

**Contacts**

| Method | Returns |
| --- | --- |
| `find(int\|string $id)` | the contact, or `null` |
| `findByEmail(string $email)` | the contact, or `null` |
| `create(array $attributes)` | the contact |
| `update(int\|string $id, array $attributes)` | the contact |
| `changeStatus(int\|string $id, string $status)` | the contact |
| `optOut(int\|string $id)` | **the contact** (`array`); sets `do_not_contact` and removes from supported destinations |
| `merge(int\|string $loserId, int\|string $winnerId)` | **the survivor** (`array`); fires `LeadHubContactsMerged` |
| `present(Contact $contact)` | a model normalised into that same array shape |

**Statuses, tags, notes, follow-ups**

| Method | Returns |
| --- | --- |
| `statuses()` | the configured status map |
| `tags()` | the tag list for the current brand |
| `addTag(int\|string $id, string $tag)` · `removeTag(…)` | the contact |
| `addNote(int\|string $id, string $body, ?string $userId = null)` | the contact |
| `createFollowUp(int\|string $id, array $data)` | the contact |
| `completeFollowUp(int\|string $id, int\|string $followUpId)` | the contact |

**Scoring**

| Method | Returns |
| --- | --- |
| `adjustScore(Contact\|string $contact, int $delta, ?string $reason = null)` | the new score, or `null` |
| `setScore(Contact\|string $contact, int $score, ?string $reason = null)` | the new score, or `null` |

**Segments**

| Method | Returns |
| --- | --- |
| `segments()` | `[{ id, name, handle, is_active, members_count }, …]` |
| `segmentMemberIds(string $handle)` | contact **UUIDs**, live from the rules; `[]` if unknown or inactive |
| `contactInSegment($contactOrId, string $handle)` | `bool` |

**Pipelines, tasks and companies**

These read and write the relational CRM-core tables, so they need the eloquent driver. They
do **not** check `features.pipelines`, `features.tasks` or `features.companies` themselves —
those flags gate the Control Panel screens, which `abort(404)` when the flag is off. A call
through the facade goes through whether the screen is reachable or not.

| Method | Returns |
| --- | --- |
| `createPipeline(string $name, array $stages = [], ?string $slug = null)` | the pipeline |
| `upsertOpportunity(int\|string $contactId, int\|string $pipeline, array $attributes = [])` | the opportunity |
| `moveStage(int\|string $opportunityId, int\|string $stage, ?string $note = null)` | the opportunity |
| `createTask(array $attributes, int\|string\|null $contactId = null)` | the task |
| `completeTask(int\|string $taskId, ?string $completedBy = null)` | the task |
| `createCompany(array $attributes)` | the company |
| `linkCompany(int\|string $contactId, int\|string\|array $company, ?string $label = null, bool $primary = false)` | the contact |

**Ingestion**

| Method | Returns |
| --- | --- |
| `ingest(SourceEvent\|array $event)` | the timeline entry, or the existing one for a known `dedupe_key` |
| `registerSourceProjector(SourceProjector $projector)` | `void` |
| `projectAndIngest(mixed $model)` | the timeline entry, or `null` when no projector matches |

**Email templates**

| Method | Returns |
| --- | --- |
| `resolveEmailTemplate(string $slug, ?callable $fallback = null)` | `[slug, title, subject, body, plain_text, description, source]`, or `null` — also `null`, never fatal, when [Email Templates](/email-templates/) is not installed |

Capability-check via `method_exists(LeadHub::getFacadeRoot(), '…')`, never on the facade class.
The `@method` block on the facade covers a subset of the manager; the manager is the surface.

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
leadhub.status.changed       leadhub.followup.due         leadhub.contact.archived
leadhub.submission.attached  leadhub.note.added           leadhub.contact.deleted
leadhub.score.changed        leadhub.contacts.merged      leadhub.source.ingested
leadhub.segment.entered      leadhub.segment.left         leadhub.task.assigned
```

Eighteen triggers. The opportunity events are **not** among them; of the task events only
`LeadHubTaskAssigned` is bridged.

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

Sixteen, and that is the complete list: the addon registers no others.

Assignability = `view leadhub` **and** brand membership. Superusers are not exempt from the
membership half.

Two of them overlap on one endpoint. Moving a deal to another stage
(`POST /pipelines/opportunities/{opportunity}/move`, the board's drag & drop and the deal
screen's stage form) accepts **either** `manage leadhub opportunities` **or**
`edit leadhub contacts`. Before 2.4.0 it accepted only the second; both are honoured so that
no install loses drag & drop on upgrade day. See
[Who may move a deal](/leadhub/pipelines#who-may-move-a-deal).

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
`leadhub_segments` · `leadhub_segment_contact` · plus `leadhub_tasks`,
`leadhub_companies`, `leadhub_contact_company`, `leadhub_opportunities`,
`leadhub_pipelines`, `leadhub_stages`, `leadhub_stage_transitions`,
`leadhub_scoring_rules` and `leadhub_sync_logs` when those modules are on.

`leadhub_settings` is the exception to the driver rule: it holds the Control Panel's
[settings overrides](/leadhub/configuration#settings-in-the-control-panel), one row per
changed key, and it is the **only** table a flat-driver install is offered — `php artisan
migrate` there creates it and nothing else. It is not brand-scoped.

`leadhub_stage_transitions` is one row per stage change, with the note that says why, and it
is what the [deal screen](/leadhub/pipelines#the-deal-screen) reads.

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
| `features.webhooks` · `crm_destinations` · `scoring` · `companies` · `tasks` · `pipelines` · `click_tracking` | `false` |
| `scoring.default` | `1` |
| `scoring.timeline` | `true` |
| `scoring.events` | see [Lead scoring](/leadhub/scoring) |
| `click_tracking.dedupe_window` | `60` minutes |
| `attribution.fields` | UTM ×5, referrer, landing_page |
| `notifications.enabled` | `LEADHUB_NOTIFICATIONS`, default `true` |
| `notifications.new_lead` · `on_assignment` · `on_task_assignment` | `true` |
| `notifications.recipients` | `LEADHUB_NOTIFY_EMAILS`, split on commas |
| `notifications.digest.enabled` / `time` | `true` / `LEADHUB_DIGEST_TIME`, default `08:00` |
| `notifications.digest.fallback_recipients` | `LEADHUB_DIGEST_EMAILS`, split on commas |
| `crm.destinations` | `[]` |
| `email_normalization.trim` / `lowercase` | `true` / `true` |
| `storage.driver` | `eloquent` |
| `storage.flat.path` | `content/leadhub` |
| `storage.flat.index_disk` / `index_path` | `local` / `leadhub/index` |
| `segments.sweep_time` | `03:00` — **read, but not present in the published config file** |

`segments.sweep_time` is read by the scheduler with a hard-coded `'03:00'` default and is
not written into `config/leadhub.php`, so publishing the config does not surface it. To move
the sweep, add the key yourself:

```php
// config/leadhub.php
'segments' => [
    'sweep_time' => '04:30',
],
```

## Environment variables

```dotenv
LEADHUB_DRIVER=eloquent
LEADHUB_FLAT_PATH=
LEADHUB_INDEX_DISK=local
LEADHUB_INDEX_PATH=leadhub/index
LEADHUB_NOTIFICATIONS=true
LEADHUB_NOTIFY_EMAILS=
LEADHUB_DIGEST_TIME=08:00
LEADHUB_DIGEST_EMAILS=
LEADHUB_HUBSPOT_TOKEN=
LEADHUB_BREVO_KEY=
LEADHUB_BREVO_LIST=
LEADHUB_WEBHOOK_URL=
LEADHUB_WEBHOOK_SECRET=
STATAMIC_PRO_ENABLED=true
```

## Front-end routes

LeadHub mounts one public route at the site root. It is not behind CP authentication,
because the person clicking a link in an email is not logged into the Control Panel.

| Route | |
| --- | --- |
| `GET /lh/track/click` | Signed redirect. Scores an `email_link_clicked` event, then 302s to the target URL. |

The URL is built by `app(ClickTrackingLinker::class)->trackedUrl($url, $contact, $context)`
and signed with Laravel's `URL::signedRoute()`. Signatures do not expire, because marketing
emails outlive any sensible expiry.

**The recipient always reaches their link.** The redirect happens first; everything else is a
best-effort side effect wrapped in a `try`. Scoring passes three gates in order:
`features.click_tracking` must be on, the signature must be valid, and the contact must have
`consent` and not `do_not_contact`. A forged link still redirects and is never scored. A
dedupe window (`click_tracking.dedupe_window`, 60 minutes) then collapses repeat clicks of
the same link by the same contact into one scored event.

The route is registered unconditionally, so it answers even with the feature off. It is not
an open redirect: only `http://` and `https://` targets are forwarded, and anything else
falls back to the site root.

## Requirements

<Requirements laravel="12.x or 13.x" database="MySQL, PostgreSQL or SQLite — eloquent driver only" queue="Required for CRM pushes and queued exports" />

Statamic 5 is not supported from 0.3.0 onward; pin `^0.2.x` if you need it.
Laravel 11 is not supported from **1.12.0** onward.

## Package dependencies

Everything below is a hard `require`, installed automatically by
`composer require goldnead/statamic-leadhub`:

| Package | Constraint |
| --- | --- |
| `php` | `^8.2` |
| `laravel/framework` | `^12.0\|^13.0` |
| `statamic/cms` | `^6.0` |
| `inertiajs/inertia-laravel` | `^1.0\|^2.0` |
| `symfony/yaml` | `^6.0\|^7.0` |
| [`goldnead/statamic-brand-context`](/brand-context/) | `^1.6` |

Suggested, never required: [Webhook Manager](/webhook-manager/) and
[Automations](/automations/).

## Driver capability matrix

| | `eloquent` | `flat` |
| --- | --- | --- |
| Contacts, timelines, notes, tags, follow-ups | yes | yes |
| Ingestion · companies · tasks · pipelines · merge · scoring | yes | **no** |
| Segments | pivot table | mirrored onto contact YAML |
| Sync log table | yes | skipped; timeline entry still written |
| Queued exports | yes | no |
| Brand isolation | global scope | by directory, **1.11+** (none before) |
| Recommended size | any | ≤500 contacts, ≤10k events |

## Not built yet

Bidirectional CRM sync · a manual contact-merge UI · GDPR anonymisation · connectors for
Pipedrive, ActiveCampaign and Salesforce (custom drivers are supported).
