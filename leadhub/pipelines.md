# Pipelines & tasks

<AddonHeader />

Two opt-in modules, both eloquent-only, that turn LeadHub from lead capture into deal
tracking.

```php
'features' => [
    'pipelines' => true,
    'tasks' => true,
    'companies' => true,
],
```

## Pipelines and opportunities

A **pipeline** is an ordered set of stages with terminal won and lost outcomes. Multiple
pipelines are supported, so "New business" and "Renewals" can have different stages.

An **opportunity** is a deal on a contact, in a pipeline, at a stage, with a value and a
confidence, and with full stage-transition history.

| Screen | What it is for |
| --- | --- |
| **Kanban board** | Drag opportunities between stages |
| **Pipeline management** | Define pipelines and their stages |

<Figure
  src="leadhub-pipeline"
  alt="The Kanban board with Discovery, Proposal sent, Negotiation, Won and Lost columns, each card showing a value and a confidence percentage"
  caption="The board. Won and Lost are terminal, and the header totals open, won and lost value separately." />

Pipeline slugs are unique **per brand**.

### Events

```
LeadHubOpportunityCreated
LeadHubOpportunityStageChanged
LeadHubOpportunityWon
LeadHubOpportunityLost
```

Every stage transition is recorded, so "how long did deals sit in Proposal" is answerable
from the data rather than from memory.

### Owners

An opportunity owner comes from the same list as a lead owner: users who may `view leadhub`
**and** belong to the current brand. See
[Assignment & notifications](/leadhub/assignment#who-can-be-picked).

### Designing stages

Two habits that keep a pipeline useful:

**Stages are states, not activities.** "Proposal sent" is a state. "Follow up" is an
activity, and belongs in a task or a follow-up.

**Keep won and lost terminal.** A deal that comes back is a new opportunity, not a resurrected
one — otherwise the stage history stops meaning anything and your cycle-time numbers become
fiction.

## Tasks

Many tasks per contact, each with a priority, an assignee and a due date. This is the plural
counterpart to the single **follow-up**.

| | Follow-up | Task |
| --- | --- | --- |
| Per contact | exactly one | many |
| Has | a due date | priority, assignee, due date |
| Surfaced on | the dashboard, due/overdue | the contact, and the assignee's list |
| Needs | nothing | `features.tasks`, eloquent driver |

Use follow-ups for a lead pipeline where the question is always "what next". Use tasks when
several people owe several things on the same contact.

### Task notifications

When [`goldnead/statamic-notifications`](/notifications/) is installed, assigning a task
notifies the assignee there — in-app, mail or digest, per **their** preferences — and open
tasks are contributed to that addon's digest.

```php
'notifications' => ['on_task_assignment' => true],
```

- Assigning a task to yourself notifies nobody.
- Without the Notifications addon the whole path is a **no-op**, not a fallback to mail.

### Events

```
LeadHubTaskCreated
LeadHubTaskAssigned
LeadHubTaskCompleted
```

## Companies

```php
'features' => ['companies' => true],
```

B2B company records, deduplicated by **domain or name**, linked to contacts with a primary
flag.

Domain is the reliable key. Name deduplication has the problem you would expect —
"Acme GmbH", "Acme G.m.b.H." and "ACME" are three companies to a string comparison — so map a
domain wherever your forms can capture one.

`LeadHubCompanyCreated` fires on creation.

## Contact merge

```php
'features' => ['merge' => true],
```

```php
LeadHub::merge($duplicate, $survivor);
```

Re-parents the duplicate's timeline, notes, tasks and opportunities onto the survivor, and
fires `LeadHubContactsMerged`.

::: warning There is no merge UI yet
The API exists; the Control Panel screen does not. Merging today means a tinker session or a
command of your own. It is on the roadmap.
:::

## Why these need the eloquent driver

All four modules are relational: an opportunity belongs to a pipeline and a contact, a task
to a contact and an assignee, a company to many contacts. The flat driver stores a contact as
one YAML file with its notes embedded, which is the right shape for lead capture and the wrong
shape for joins.

On the flat driver these modules are **unavailable**, not degraded. Migrate first:

```bash
php artisan leadhub:storage:migrate --from=flat --to=eloquent --dry-run
php artisan leadhub:storage:migrate --from=flat --to=eloquent
```

## Automations and webhooks

The opportunity events are in neither curated set. Automations does not expose them, and the
Webhook Manager bridge does not register them either: of the seven opportunity and task
events, only `LeadHubTaskAssigned` becomes a webhook trigger (`leadhub.task.assigned`).

For an automation on `LeadHubOpportunityWon`, register it as a
[custom event trigger](/automations/extending#turning-an-application-event-into-a-trigger):

```php
Automations::registerEventTrigger(\Goldnead\Leadhub\Events\LeadHubOpportunityWon::class, [
    'handle' => 'leadhub_opportunity_won',
    'label' => 'Opportunity Won',
    'group' => 'LeadHub',
    'payload' => 'opportunity',
]);
```

One call, and the node appears in the library with a generated config form.

::: tip The namespace is `Goldnead\Leadhub`
Lowercase "hub", even though the brand is LeadHub.
:::
