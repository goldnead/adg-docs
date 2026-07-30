# Rules

<AddonHeader />

A rule is a `When → If → Then` flow: a trigger, a set of conditions, and a set of
actions.

**Webhooks → Rules**, behind the `manage webhook rules` permission.

```
When   entry.published, collection = blog
If     field is_announcement is true
       and site is en
Then   send outbound webhook "slack-announcements"
       and write log note
```

## Rules or outbound hooks

Both react to a trigger and both can send a webhook, so the distinction is worth
stating.

| | Outbound webhook | Rule |
| --- | --- | --- |
| Sends | exactly one HTTP request | zero or more actions, not all of them HTTP |
| Records | a `Delivery` per attempt | actions record their own outcomes |
| Retries | yes, per hook policy | only for the actions that are deliveries |
| Good for | "tell this URL about this event" | "do these two or three things about this event" |

Use an outbound hook when the answer is one request. Use a rule when one event should
produce a small, fixed set of effects — a webhook **and** a log note, or a webhook
whose target depends on a condition.

## Rules or Automations

A rule has no delays, no branching and no state between events. It is a flat list of
actions for one trigger.

If you need "wait three days, then check whether they replied", that is
[Automations](/automations/), which has a run log, a canvas and a resumable
execution model. A rule that grows a fourth and fifth action is usually a sign it
wants to be an automation.

::: warning Do not wire the same event in both
Rules, outbound hooks and automations all attach to the same Statamic events.
Configure a given event and destination in exactly one place. See
[Boundaries](/guide/boundaries).
:::

## Conditions

Conditions are evaluated before any action runs, so a rule that does not match costs
nothing.

The condition types available depend on the trigger, in the same way payload token
namespaces do: an `entry.*` trigger offers field comparisons on the entry, and
`form.submitted` offers them on the submission.

Register your own from a service provider:

```php
use Goldnead\WebhookManager\Facades\WebhookManager;

WebhookManager::registerCondition(new WithinBusinessHoursCondition());
```

Implement `Goldnead\WebhookManager\Contracts\ConditionInterface`. A condition whose
handle matches an existing one **replaces** it.

## Actions

The same action library the inbound endpoints use:

| Action | Notes |
| --- | --- |
| Send outbound webhook | Delegates to one of your hooks, inheriting its auth, retries and delivery log |
| Send Slack webhook | Direct post to a chat destination |
| Send email | Token-resolved subject and body |
| Create entry · Update entry | From token-resolved data |
| Create form submission | |
| Set field value | |
| Write log note | To your Laravel log channel |
| Dispatch event | Dispatches a Laravel event; your listeners take over |

**Send outbound webhook** is the one to reach for by default. A rule that posts
directly gets none of the delivery machinery; a rule that fires a configured hook gets
all of it.

**Dispatch event** is the escape hatch: it turns the rule into a domain event, and
everything after that is ordinary Laravel you can unit-test.

## Ordering and failure

Actions run in the order listed. There is no branching and no conditional per action —
if two actions need different conditions, that is two rules.

An action that throws is recorded and does not prevent the remaining actions from
running. That is the right default for a notify-and-log rule and the wrong one for a
sequence where step two depends on step one; if you have a dependency, you want an
automation with its run log and its partial retry.

## Registering an action

```php
WebhookManager::registerAction(new SendToInternalApiAction());
```

Implement `Goldnead\WebhookManager\Contracts\ActionInterface`. Register from `boot()`,
never `register()`: Statamic boots addon providers first, so by the time your `boot()`
runs the registries exist and are seeded with the built-in defaults.

Pick a distinctive handle. Registering an action whose handle matches a built-in
replaces it, which is the supported way to override one and an easy way to clobber one
by accident. See [Extending](/webhook-manager/extending).

## Turning the module off

```php
'features' => ['rules' => false],
```

Hides the screens, the navigation entry and the runtime wiring. If every integration
on your site is a single request to a single destination, you do not need rules, and
switching them off removes a place where behaviour can hide.
