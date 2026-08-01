# Extending

<AddonHeader />

LeadHub exposes a stable facade, two contracts you can implement, and a large event surface.
There is no node registry or plugin system: the extension model here is **listen and push**.

## The facade

```php
use Goldnead\Leadhub\Facades\LeadHub;
```

| Method | Purpose |
| --- | --- |
| `find($id)` · `findByEmail($email)` | Look a contact up; `null` when there is none |
| `create($attributes)` · `update($id, $attributes)` | Write a contact |
| `changeStatus($id, $status)` | Move a contact through the status list |
| `addTag($id, $tag)` · `removeTag($id, $tag)` | Tag a contact |
| `addNote($id, $body, $userId = null)` | Append a note, timelined |
| `createFollowUp($id, $data)` · `completeFollowUp($id, $followUpId)` | Follow-ups |
| `ingest($event)` | Turn any source into a contact plus a timeline entry |
| `registerSourceProjector($projector)` · `projectAndIngest($model)` | Ingest one of your own models |
| `merge($loserId, $winnerId)` | Re-parent a duplicate's history onto a survivor; returns the survivor |
| `optOut($id)` | Set `do_not_contact` **and** remove from supported destinations |
| `adjustScore($contact, $delta, $reason = null)` · `setScore($contact, $score, $reason = null)` | Engagement score; returns the new score or `null` |
| `segments()` | `[{ id, name, handle, is_active, members_count }, …]` |
| `segmentMemberIds($handle)` | Contact **UUIDs**, resolved live from the rules |
| `contactInSegment($contactOrId, $handle)` | `bool`, cheap reactive check |
| `createPipeline($name, $stages = [], $slug = null)` | Build a pipeline with its stages |
| `upsertOpportunity($contactId, $pipeline, $attributes = [])` · `moveStage($opportunityId, $stage, $note = null)` | Deal tracking |
| `createTask($attributes, $contactId = null)` · `completeTask($taskId, $completedBy = null)` | Tasks |
| `createCompany($attributes)` · `linkCompany($contactId, $company, $label = null, $primary = false)` | B2B records |
| `resolveEmailTemplate($slug, $fallback = null)` | Resolve a managed template, or `null` |

Contact-returning methods return the normalised array shape, not the Eloquent model. Full
signatures in [Reference](/leadhub/reference#facade).

::: warning The CRM-core methods do not check the feature flags
`createTask`, `createPipeline`, `createCompany` and their neighbours write straight to the
relational tables. `features.tasks`, `features.pipelines` and `features.companies` gate the
Control Panel screens, not the facade. Check the flag yourself if your integration should
respect the site's configuration.
:::

::: tip The namespace is `Goldnead\Leadhub`
Lowercase "hub", even though the brand is LeadHub. And check the facade **root** for capability
detection:

```php
method_exists(LeadHub::getFacadeRoot(), 'segmentMemberIds');
```

`method_exists()` on the facade class returns `false` for everything forwarded through
`__callStatic`. Getting this wrong is how every LeadHub action node in Automations once failed
silently on every real install.
:::

## Custom CRM destinations

Register from a service provider. `extend()` takes a driver name and a **class name**, not a
factory closure:

```php
use Goldnead\Leadhub\Crm\DestinationManager;

app(DestinationManager::class)->extend('salesforce', \App\Leadhub\SalesforceDestination::class);
```

The manager constructs it as `new $class($key, $config)`, where `$key` is the destination's
key under `crm.destinations` and `$config` is that entry.

Implement `Goldnead\Leadhub\Contracts\CrmDestination`:

```php
interface CrmDestination
{
    public function driver(): string;
    public function push(Contact $contact): SyncResult;
}
```

Return a `SyncResult` rather than throwing where you can: it is what populates the sync log's
status, HTTP code and message. A thrown exception gives the log less to show.

Opted-out contacts are filtered before your driver is called, so you do not have to check
`do_not_contact` yourself.

## Source projectors

Teach LeadHub to map one of your models, so the call site does not build the array:

```php
use Goldnead\Leadhub\Contracts\SourceProjector;

class OrderProjector implements SourceProjector
{
    public function source(): string
    {
        return 'shop';
    }

    public function project($order): array
    {
        return [
            'event' => 'purchase.completed',
            'email' => $order->email,
            'dedupe_key' => 'order:'.$order->id,
            'data' => ['amount' => $order->total],
        ];
    }
}
```

The mapping then lives in one place rather than at every call site, which matters as soon as
three parts of your application ingest orders. Ingestion writes to the relational tables, so
it needs the eloquent driver.

## Listening to events

Twenty-six events, each carrying `$contact`, an optional `$actor` and optional `$metadata`.
Full list in [Timelines & events](/leadhub/timelines#the-event-surface).

```php
use Goldnead\Leadhub\Events\LeadHubStatusChanged;
use Illuminate\Support\Facades\Event;

Event::listen(LeadHubStatusChanged::class, function (LeadHubStatusChanged $event) {
    MyExternalSystem::sync($event->contact);
});
```

::: warning Your listener is not covered by the fail-safe guarantee
LeadHub's **own** pipeline catches its own exceptions so a form submission never breaks. Your
listener throws where LeadHub dispatched the event.

Wrap it, and queue anything that talks to the network.
:::

## Writing a bridge to another addon

If your own addon wants to integrate with LeadHub optionally, copy the pattern LeadHub uses for
Webhook Manager: a `suggest` entry in `composer.json`, no `require`, and a capability check at
boot.

```php
public function boot(): void
{
    if (! class_exists(\Goldnead\Leadhub\Facades\LeadHub::class)) {
        return;
    }

    if (! method_exists(\Goldnead\Leadhub\Facades\LeadHub::getFacadeRoot(), 'segmentMemberIds')) {
        return;   // too old; degrade rather than fail
    }

    // …
}
```

::: danger The boot-order trap
Register from `boot()`, never `register()`. And do **not** nest an `app->booted()` callback:
Statamic already calls `bootAddon()` inside one, so a nested callback fires *immediately* and is
still too early.

LeadHub's own Webhook Manager bridge once booted before Webhook Manager existed and lost
every trigger registration, with nothing but log warnings to show for it. It now uses a
deferred boot with a retry and an idempotency guard. If you write a bridge, use the same shape.
:::

## Reaching events Automations does not expose

Automations offers a curated set of five LeadHub triggers. For anything else —
`LeadHubOpportunityWon`, `LeadHubContactsMerged`, `LeadHubSourceIngested`,
`LeadHubContactEnteredSegment` — register the event class as a custom event trigger:

```php
use Goldnead\StatamicAutomations\Facades\Automations;

Automations::registerEventTrigger(\Goldnead\Leadhub\Events\LeadHubOpportunityWon::class, [
    'handle' => 'leadhub_opportunity_won',
    'label' => 'Opportunity Won',
    'group' => 'LeadHub',
    'payload' => 'opportunity',
    'output_schema' => ['opportunity' => ['id' => 'string', 'value' => 'number']],
]);
```

One call, and the node appears in the library with a generated config form. See
[Automations → Extending](/automations/extending).

## Statuses, tags and scoring rules are data, not code

Three things people reach for a code extension for, and should not:

- **Statuses** are config (`leadhub.statuses`).
- **Tags** are records, created in the CP or by a listener.
- **Scoring rules** are a per-brand database table, edited under **LeadHub → Scoring**, with
  the config file as a fallback while a brand has no rules. See
  [Lead scoring](/leadhub/scoring).

## Permission checks in your own code

```php
$user->can('view leadhub');
```

Never `hasPermission()`, `isSuper()` or `id()` on the raw auth user: an install using Eloquent
users with a custom user model returns something that has none of those, and a testbench will
never show you that because it always hands you a Statamic user.

Use `Statamic\Facades\User::fromUser()` if you genuinely need `isSuper()`, and
`getAuthIdentifier()` in place of `id()`. See
[Identity](/guide/identity#the-eloquent-users-trap).

## Assignability, if you build your own assignee UI

The rule is **membership and permission**:

```php
use Goldnead\BrandContext\Facades\BrandMembers;

BrandMembers::usersOf()
    ->filter(fn ($user) => $user->can('view leadhub'))
    ->map(fn ($user) => ['value' => (string) $user->id(), 'label' => $user->email()]);
```

Use `usersOf()`, not `assignedUserIdsOf()`. The latter returns raw rows and deliberately does
not apply the every-brand membership rule, which on a fresh install means an empty dropdown that
looks exactly like a permissions bug. See [Brand members](/brand-context/members).
