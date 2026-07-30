# Integrations

<AddonHeader />

Sibling addons are detected automatically through `class_exists`. The package keeps
working without them, and nothing needs to be enabled on the other side.

| Integration | Detected class | Adds |
| --- | --- | --- |
| Webhook Manager | `Goldnead\WebhookManager\Facades\WebhookManager` | the *Send Webhook (via Webhook Manager)* action, with its destinations, plus the *Webhook Received* trigger |
| LeadHub | `Goldnead\Leadhub\Facades\LeadHub` | 5 LeadHub triggers and 7 LeadHub actions |

Class names are configurable under `integrations` in `config/automations.php`, so you can
swap implementations or use a fork. Leave the defaults otherwise.

## Webhook Manager

Two things arrive.

**Outbound.** The *Send Webhook (via Webhook Manager)* action lists your configured
outbound webhooks as destinations and dispatches one by handle. The delivery goes through
the real delivery engine, so it inherits the auth scheme, the retry policy, the delivery
snapshot and the replay button.

Prefer it over *Send Webhook (Simple)* wherever the destination matters. The simple
action is a direct POST with no retries, no signing and no delivery record.

**Inbound.** The *Webhook Received* trigger listens for the event Webhook Manager fires
when it receives a **validated** inbound request. So an external system can start an
automation, and the signature verification, rate limiting and replay protection are
handled before your flow ever sees it.

```php
'integrations' => [
    'webhook_manager' => [
        'detect' => ['Goldnead\WebhookManager\Facades\WebhookManager', /* … */],
        'outbound_repository' => 'Goldnead\WebhookManager\Contracts\Repositories\OutboundWebhookRepositoryInterface',
        'dispatch_action' => 'Goldnead\WebhookManager\Domain\OutboundWebhook\Actions\DispatchOutboundWebhookAction',
        'inbound_event' => 'Goldnead\WebhookManager\Events\WebhookReceived',
    ],
],
```

Note that destinations live in Webhook Manager's outbound **repository**, not on its
facade, which is why the adapter resolves an interface rather than calling a static.

## LeadHub

Five triggers and seven actions, listed in the [node catalogue](/automations/nodes).

```php
'integrations' => [
    'leadhub' => [
        'detect' => ['Goldnead\Leadhub\Facades\LeadHub', 'Goldnead\Leadhub\LeadHubManager'],
        'emit_timeline_events' => true,
        'score_changed_event' => 'Goldnead\Leadhub\Events\LeadHubContactScoreChanged',
    ],
],
```

`emit_timeline_events` is on by default and means an automation that changes a lead
writes a timeline entry on it. Leave it on: the CRM timeline then shows that an
automation did this, not a person, which is the difference between a useful history and a
confusing one.

::: tip Two namespaces that have cost real time
LeadHub's PSR-4 namespace is `Goldnead\Leadhub` — **lowercase "hub"** — even though the
brand is "LeadHub". And this addon's own namespace is `Goldnead\StatamicAutomations`, not
`Goldnead\Automations`.
:::

## What Automations does *not* see

LeadHub emits a large event surface; the flow builder exposes a curated subset of it as
triggers.

Notably: **Automations sees the bridged LeadHub events, not raw ingestion source
events.** A purchase arriving through `LeadHub::ingest()` produces a
`LeadHubSourceIngested` event and a timeline entry, and an automation can react to the
lead changes that result — but there is no trigger for "any raw source event of type X".

If you need that, register the LeadHub event you care about as a
[custom event trigger](/automations/extending#turning-an-application-event-into-a-trigger).
That is a one-call registration and it puts the node in the library with a generated
config form.

## Marketing

Marketing detects **this** addon rather than the other way round, and contributes:

- Triggers: `marketing.subscribed`, `marketing.unsubscribed`,
  `marketing.campaign_sent`
- Actions: `marketing.subscribe`, `marketing.unsubscribe`,
  `marketing.send_campaign`

So they appear in the node library when Marketing is installed, with no configuration in
either addon. See [Marketing → Extending](/marketing/extending).

::: warning `marketing.send_campaign` is a real send
An automation action that sends a campaign to a list is not a transactional email. Filter
it hard, and remember that consent comes from the list — an automation cannot grant it.
See [Privacy & retention](/guide/privacy#consent).
:::

## Notifications and Activity

Neither is wired into the flow builder in v1. They integrate with LeadHub and Marketing
directly, so an automation that changes a lead ends up in the Activity ledger and can
trigger a notification without going through a node.

If you want an automation to notify somebody through the Notifications addon, the current
answer is a custom action:

```php
Automations::registerAction(NotifyViaNotificationsAction::class);
```

See [Extending](/automations/extending).

## Detection is one-way and passive

The addon that *offers* the integration checks whether the other is present, at boot,
with `class_exists`. There is no handshake and no configuration on the other side.

Two consequences worth knowing:

- **Install order does not matter.** Detection happens at boot, not at install.
- **A too-old sibling degrades rather than fails.** The capability check is
  `method_exists(Facade::getFacadeRoot(), 'theMethod')` — on the facade **root**, because
  `method_exists` on a facade class returns `false` for everything it forwards through
  `__callStatic`. Getting that wrong is how every LeadHub action node once failed silently
  on every real install.

## Turning an integration off

Remove the class name from `detect`, or uninstall the sibling. There is no separate
enable flag, because the presence of the class *is* the flag.
