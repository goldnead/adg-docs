# Timelines & events

<AddonHeader />

Every contact has one chronological log: submissions, notes, status changes, tag changes,
follow-ups, score changes and anything you record through the
[ingestion API](/leadhub/ingestion).

It is the answer to "what is going on with this person", in the order a salesperson wants to
read it.

<Figure
  src="leadhub-timeline"
  alt="A contact's timeline showing a score change, a tag, a status change and the originating form submission, alongside the attribution panel"
  caption="The timeline, with the attribution captured from the originating submission on the right." />

## What lands on a timeline

| Entry | Written when |
| --- | --- |
| `submission_received` | A mapped form is submitted |
| Note | Somebody adds one |
| Status change | The lead status changes |
| Tag added / removed | |
| Follow-up set / completed | |
| Score change | With `features.scoring` and `scoring.timeline` on |
| Source event | Through `LeadHub::ingest()` |
| Sync attempt | A CRM connector push, success or failure |

Timeline entries are deduplicated by `dedupe_key`, which is unique **per brand**. That is
what makes ingestion idempotent: a producer may be as noisy as it likes.

## The event surface

LeadHub does not ship its own webhook-sending UI. It fires plain Laravel events, which makes
it an event source for any webhook addon, queue or listener you already run.

```php
// namespace Goldnead\Leadhub\Events

LeadHubContactCreated            LeadHubFollowupSet
LeadHubContactUpdated            LeadHubFollowupCompleted
LeadHubSubmissionAttached        LeadHubFollowupDue
LeadHubStatusChanged             LeadHubContactArchived
LeadHubTagAdded                  LeadHubContactDeleted
LeadHubTagRemoved                LeadHubContactsMerged
LeadHubNoteAdded                 LeadHubContactScoreChanged
LeadHubSourceIngested            LeadHubEmailLinkClicked
LeadHubContactEnteredSegment     LeadHubContactLeftSegment
LeadHubTaskCreated               LeadHubTaskAssigned
LeadHubTaskCompleted             LeadHubCompanyCreated
LeadHubOpportunityCreated        LeadHubOpportunityStageChanged
LeadHubOpportunityWon            LeadHubOpportunityLost
```

Each carries `$contact`, an optional `$actor` (the acting user, if any) and optional
`$metadata`.

## Rolling your own listener

```php
use Goldnead\Leadhub\Events\LeadHubStatusChanged;
use Illuminate\Support\Facades\Event;

Event::listen(LeadHubStatusChanged::class, function (LeadHubStatusChanged $event) {
    // $event->contact, $event->actor, $event->metadata
    MyExternalSystem::sync($event->contact);
});
```

Note that **your** listener is not covered by LeadHub's fail-safe guarantee. If it throws,
it throws where LeadHub dispatched the event. Wrap it, and queue anything that talks to the
network.

## Pairing with Webhook Manager

Install both addons and **it just works** — no glue code. When LeadHub boots and detects
[Webhook Manager](/webhook-manager/), it registers every lifecycle event as a trigger:

```
leadhub.contact.created      leadhub.followup.set         leadhub.tag.added
leadhub.contact.updated      leadhub.followup.completed   leadhub.tag.removed
leadhub.status.changed       leadhub.note.added           leadhub.contact.archived
leadhub.submission.attached  leadhub.contact.deleted      leadhub.score.changed
leadhub.segment.entered      leadhub.segment.left
```

Each fires a `TriggerDetected` carrying the contact as the payload plus `actor`, `metadata`
and the event handle. So you create a webhook in **Webhook Manager → Webhooks**, choose
*"LeadHub — status changed"*, and you are done.

```
LeadHubStatusChanged ─► LeadHub bridge ─► WebhookManager::registerTrigger
                                          + TriggerDetected ─► your endpoint
```

The bridge is **fail-safe**: a Webhook Manager error is logged and never breaks the LeadHub
pipeline. Opt out with `'features' => ['webhook_manager' => false]`.

Under the hood it lives in `src/Integrations/WebhookManager/` and only loads that addon's
classes once they are present, so LeadHub never depends on it.

::: warning The boot-order bug worth knowing about
This bridge once booted **before** Webhook Manager existed, and all fourteen trigger
registrations were lost with nothing but log warnings to show for it. It now uses a deferred
boot with a retry and an idempotency guard.

If you write a bridge between two addons, copy that pattern. Statamic calls `bootAddon()`
inside an `app->booted()` callback of its own, so nesting another one fires immediately and
is still too early.
:::

## Pairing with Automations

[Automations](/automations/) detects LeadHub on **its** side and offers five LeadHub
triggers and seven LeadHub actions in the visual builder. No configuration in LeadHub.

Automations sees the curated set of bridged LeadHub events, **not** raw ingestion source
events. For anything outside that set — `LeadHubOpportunityWon`, `LeadHubContactsMerged`,
`LeadHubSourceIngested` — register the event class as a
[custom event trigger](/automations/extending#turning-an-application-event-into-a-trigger).
One call, and the node appears with a generated config form.

## The built-in webhook driver, instead

If you do not run a separate webhook addon, LeadHub's own
[`webhook` CRM driver](/leadhub/crm-connectors) covers the common case directly: an
HMAC-signed JSON POST on create, update or status change, with a sync log.

| Use | When |
| --- | --- |
| Webhook Manager | you want CP-managed routing, templating, retries and replay across many event types |
| the built-in `webhook` driver | you just need contacts pushed to one URL |

## Timeline or activity ledger

`leadhub_events` is not replaced by the [Activity](/activity/) ledger and is not migrated
into it.

The bundled Activity producer records `crm.*` facts for a different purpose: cross-domain
questions that a per-contact timeline cannot answer. Both records stay, deliberately. See
[Boundaries](/guide/boundaries#crm-timeline-vs-activity-ledger).

## Redaction

```php
'timeline_payload_redaction' => [
    'password', 'passwort', 'token', 'secret',
    'api_key', 'credit_card', 'card_number',
],
```

Applied to the submission payload copy before it is written. Add your own field names — this
list knows nothing about `iban` or `kundennummer`.
