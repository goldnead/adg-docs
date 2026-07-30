# Concepts

<AddonHeader />

| Term | Means |
| --- | --- |
| **Contact** | A person, deduplicated by normalised email within a brand |
| **Timeline event** | One row in a contact's chronological log |
| **Follow-up** | The **single** next action on a contact, with a due date |
| **Task** | One of **many** to-dos on a contact (opt-in module) |
| **Tag** | A label, applied manually or by rule |
| **Form mapping** | Which Statamic form feeds LeadHub, and how its fields map |
| **Opportunity** | A deal in a pipeline, with a stage and an outcome |
| **Segment** | A dynamic, rule-defined group of contacts |
| **Destination** | An external system contacts are pushed to |

## How a submission becomes a contact

```
Statamic form submission
  └── SubmissionCreated event
      └── CreateOrUpdateLeadFromSubmission listener
          ├── Look up the form mapping — skip if missing or disabled
          ├── SubmissionMapper → ContactDto
          ├── ContactResolver → find by email_normalized, or create
          ├── TimelineService → record a submission_received event
          ├── TagService → attach mapped and default tags
          └── Fire LeadHubContactCreated / LeadHubSubmissionAttached
                 → notifications, CRM sync, webhooks, your listeners
```

Two properties of that chain matter more than the rest.

**The listener is fail-safe.** Any exception is caught and logged. A LeadHub error never
breaks the original form submission — the visitor still gets their thank-you page, and the
Statamic submission is still saved.

The corollary: when a submission does not become a contact, **`laravel.log` is the only
place the reason exists.**

**A missing mapping is a skip, not an error.** Installing LeadHub does not silently start
harvesting every form on the site. It also means "nothing happened" usually means "no
mapping".

## Deduplication

Contacts are deduplicated on `email_normalized`:

```php
'email_normalization' => ['trim' => true, 'lowercase' => true],
```

A repeat inquiry from the same address attaches to the existing contact and adds a timeline
event, rather than creating a second contact. That is the core behaviour the addon exists
for.

Uniqueness is **per brand**: two brands may legitimately hold the same address with
independent state.

## Existing fields are not overwritten

```php
'overwrite_existing_fields_from_submissions' => false,
```

The default is deliberate. A second submission does not overwrite a contact somebody has
since corrected by hand, because the newest form is not automatically the most accurate
record.

Turn it on only if your forms are the authority.

## Follow-up or task

A **follow-up** is the one next action, with a due date, surfaced on the dashboard as due
or overdue. There is exactly one per contact.

A **task** is one of many, with a priority, an assignee and its own due date. Tasks are an
opt-in module and need the eloquent driver.

Use follow-ups for a lead pipeline where the question is always "what next". Use tasks when
several people owe several things on the same contact.

## The event surface

LeadHub does not ship its own webhook-sending UI. It fires plain Laravel events across the
whole lifecycle, which makes it a first-class event source for any webhook addon, queue or
listener you already run.

Twenty-five-plus events, each carrying `$contact`, an optional `$actor` and optional
`$metadata`. See [Timelines & events](/leadhub/timelines#the-event-surface).

When [Webhook Manager](/webhook-manager/) is installed, LeadHub registers every lifecycle
event as a trigger automatically. No glue code, no configuration on either side.

## Assignability is membership plus permission

The users offered as a lead owner, a task assignee or an opportunity owner are those who:

- may `view leadhub`, **and**
- belong to the current brand per
  [`BrandMembers`](/brand-context/members)

**Superusers are not exempt** from the second condition. And a user with no membership
anywhere counts as a member of every brand, so an install that has recorded no memberships
— every install, until somebody records one — sees the same list it always saw.

The same list backs all three roles, and the same list is what a write is validated
against.

## Timeline or activity ledger

`leadhub_events` is the CRM's own contact timeline. It is **not** replaced by the
[Activity](/activity/) ledger, and installing Activity migrates nothing.

The bundled Activity producer records the same facts into the ledger for a different
purpose — cross-domain questions no single addon's log can answer — and the two are
allowed to overlap. See [Boundaries](/guide/boundaries#crm-timeline-vs-activity-ledger).

## Consent

`do_not_contact` on a contact is honoured by **every** CRM connector: an opted-out contact
is never pushed anywhere.

`LeadHub::optOut()` goes further and actively removes the contact from supported
destinations, for example a Brevo list. That distinction matters: suppressing locally does
nothing about the copy already sitting in an ESP.

## Multi-brand

Everything is brand-scoped, and five identifiers are unique **per brand** rather than
globally: a contact's normalised email, a tag slug, a pipeline slug, an event `dedupe_key`,
a form mapping's `form_handle`, and a segment handle.

```bash
php artisan leadhub:brand-integrity          # is the database enforcing that?
php artisan leadhub:brand-integrity --repair
```

`migrate` reporting success is a different question from whether the indexes are in place.
