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
| **Deal screen** | One opportunity: its data, its stage, its history, its tasks. **2.4.0** |
| **Pipeline management** | Define pipelines and their stages |

<Figure
  src="leadhub-pipeline"
  alt="The Kanban board with Discovery, Proposal sent, Negotiation, Won and Lost columns, each card showing a value and a confidence percentage"
  caption="The board. Won and Lost are terminal, and the header totals open, won and lost value separately." />

Pipeline slugs are unique **per brand**.

### The deal screen

**2.4.0.** Until then a deal had no place of its own: every link that pointed at one — the
opportunity list on the contact screen, the cards themselves — led to the board. The board
answers "what is in this column", not "what happened to this deal".

```
GET /cp/leadhub/pipelines/opportunities/{opportunity}
```

Route name `leadhub.pipelines.opportunities.show`. Reading it is the same authority as
reading the board it sits on, `view leadhub`.

It shows four things:

| | |
| --- | --- |
| **The data** | Title, the contact **as a link**, company, pipeline, value, confidence, owner, timestamps |
| **The current stage** | With a stage-change form, including a note |
| **The history** | Every stage transition: from, to, when, by whom, with the note, and how long the deal sat in each stage |
| **The tasks** | The tasks on this deal, open work first, with `features.tasks` on |

The board and the contact screen link here now instead of to the board, and the edit form
returns here on save and on cancel.

#### The note is the only "why"

A stage change writes a row into `leadhub_stage_transitions`, and the note on that row is
the only place anybody ever writes down *why* the deal moved. It is not copied to the
contact timeline, and no other screen collects it.

The stage-change form on the deal screen posts to the same endpoint the board's drag & drop
uses, because that endpoint is the only path that records a note at all. Drag a card and the
note is empty by construction; change the stage from here and you can say what happened.

The note is capped at **2000 characters** and rendered in full in the history — it is not
truncated, so a long one is a long paragraph on somebody else's screen.

::: tip Moving a deal onto the stage it is already on does nothing
The form prevents it in the browser; a second tab or a plain POST does not. The endpoint
answers with a success message and writes no row, because a history entry reading
"Proposal → Proposal" is exactly the noise that makes a history unreadable.
:::

#### Time in stage

Each history row carries the distance to the **next** transition, so "how long did this sit
in Proposal" is read off the screen rather than computed by hand.

The topmost row is the open end, and what it means depends on the deal:

- an **open** deal's newest stage runs until now, and is marked as still running;
- a **closed** deal's last stretch ends at the close (`closed_at`, falling back to `won_at`
  or `lost_at`), not today.

That distinction matters more than it looks. Left running, the top row of a deal won in
April would read "115 days" and grow by one every morning, in the same column and the same
type as the real dwell times below it, while answering a different question.

A deal that was never moved has no transition row at all. Its entry into the starting stage
comes from `opportunities.created_at` and is a full first history entry, not a gap.

### Who may move a deal

The move endpoint (`POST /pipelines/opportunities/{opportunity}/move`) accepts **either**
`manage leadhub opportunities` **or** `edit leadhub contacts`, and the board draws its drag
handle for both.

Before 2.4.0 it required `edit leadhub contacts` alone, which fitted none of its neighbours:
viewing the board is `view leadhub`, and creating, editing or deleting a deal is
`manage leadhub opportunities`. Somebody with a pipeline-only role could delete a deal and
not move it.

Accepting both rather than narrowing to the correct one is deliberate: a narrowing would have
taken drag & drop away, on upgrade day, from every install whose roles carry only the old
permission. Nobody loses anything; one group gains what it should have had.

The stage-change form on the deal screen is offered to holders of
`manage leadhub opportunities`, alongside the edit and delete actions on that screen.

### Won and lost timestamps

::: warning 2.4.0 repairs stored data. Read this if you report on `won_at`.
`won_at` and `lost_at` were set on a stage transition and never cleared again, while
`status`, `outcome` and `closed_at` beside them were. A reopened deal therefore carried a
win date and was open, and a deal moved from Won straight to Lost carried both. No screen
rendered those columns, so nothing showed it — but `won_at` is the column a revenue report
groups by, and a stale one inflates every period it lands in.

The service now sets both stamps on every transition, the applicable one to `now()` and the
other to `null`. The migration
`2026_08_15_000001_repair_leadhub_opportunity_outcome_stamps` cleans up what is already
stored: an open deal loses both, a closed one keeps the one its `outcome` names.

**The old values are parked before they are cleared**, in the deal's `metadata_json` under
`repaired_outcome_stamps`, together with the date the repair ran. `down()` is deliberately
empty — there is no earlier state worth restoring, only the contradiction — so that column
is where you look if a number changed and you want to know what it was.
:::

Until you migrate, the deal screen shows each stamp only where the status agrees with it, so
the screen stays honest on an install that has not run the migration yet.

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
