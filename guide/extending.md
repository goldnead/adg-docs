# Extending the suite

Every extensible addon in the suite uses the same shape: a **registry** keyed by a
handle, a **contract** you implement, and a **facade call** from your service
provider's `boot()` method. Learn it once and the other addons need no
explanation.

## The pattern

```php
namespace App\Providers;

use Goldnead\WebhookManager\Facades\WebhookManager;
use Goldnead\StatamicAutomations\Facades\Automations;
use Goldnead\Activity\Facades\Activity;
use Goldnead\Notifications\Facades\Notifications;

class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        WebhookManager::registerTrigger(new MyCustomTrigger());
        Automations::registerAction(SendToInternalApiAction::class);
        Activity::registerProducer(OrderPaid::class, $mapper, 'commerce.purchase_completed');
        Notifications::registerType('shop.order_shipped', fn ($type) => $type->label('Order shipped'));
    }
}
```

## Register from `boot()`, never `register()`

Statamic boots addon service providers **before** application providers. By the
time your `boot()` runs, the addon registries exist and are already seeded with
the built-in defaults, which is exactly what you want: you can inspect them, and
you can replace one.

Registering from `register()`, or from any provider that boots earlier than the
addon, is not supported and will either throw or silently no-op depending on the
addon.

::: warning The nesting trap
Statamic calls `bootAddon()` itself inside an `app->booted()` callback. Wrapping
your own registration in another `app->booted()` therefore fires *immediately*,
not later, and is still too early. If you need to defer, queue a retry rather
than nesting the callback. This is a real bug that cost fourteen trigger
registrations once, with nothing but log warnings to show for it.
:::

## Handles replace, they do not add

Every registry is keyed by handle. Registering a trigger, condition, action, auth
scheme, resolver, evaluator, preset, node, producer or notification type whose
handle matches an existing one **replaces** it.

That is the supported way to override a built-in. It is also the way to clobber
one by accident, so pick a distinctive handle for anything genuinely new:
`shop.order_shipped`, not `order.shipped`.

Activity states it explicitly for producers: registering the same event class
again replaces the mapper, and never adds a second listener.

## Registration can fail quietly

This is the opposite of what you would hope for, and worth knowing before you
debug a missing node.

Automations gates `registerTrigger()`, `registerAction()` and
`registerLogicNode()` on the Pro licence. **A failed gate skips the
registration and does not throw**, so that a package boot never crashes when a
customer's licence has lapsed. The cost of that choice is that a custom node on
a Free install simply never appears, with nothing in the log to say so.
`registerOptionSource()` and `registerEventTrigger()` are not gated at all.

To find out what the registry actually holds, use `Automations::describe()`.
It takes the class you registered and tells you the handle and kind it resolved
to:

```php
Automations::describe(SendToInternalApiAction::class);
// ['handle' => 'send_to_internal_api', 'kind' => 'action', 'class' => …]
```

The class argument is required, and an unknown class throws. `describe()` does
not list the registry; there is no no-argument form.

## Extension points by addon

| Addon | Register | Contract |
| --- | --- | --- |
| [Webhook Manager](/webhook-manager/extending) | triggers, conditions, actions, auth schemes, variable resolvers, success evaluators, integration presets, inbound action handlers | `Goldnead\WebhookManager\Contracts\*` |
| [Automations](/automations/extending) | actions, triggers, logic nodes, option sources, event triggers | `AutomationAction`, `AutomationTrigger`, `AutomationLogicNode` |
| [LeadHub](/leadhub/extending) | CRM destinations, source projectors | `CrmDestination`, `SourceProjector` |
| [Marketing](/marketing/extending) | — mostly consumed through events | |
| [Activity](/activity/producers) | producers, a sanitizer | `ActivitySanitizer` |
| [Notifications](/notifications/types) | types, channels, digest sources, the recipient directory | `Channel`, `DigestSource`, `RecipientDirectory` |
| [Email Templates](/email-templates/importing) | import sources | `EmailTemplateSource` |
| [Preference Center](/preference-center/extending) | nothing to register; a discovery interface other packages call | `PreferenceCenter` facade |
| [Identity Contracts](/identity-contracts/extending) | identity resolvers, contact locator, anonymous id resolver | `ProvidesIdentity`, `IdentityResolver`, `ContactLocator`, `AnonymousIdResolver` |
| [Brand Context](/brand-context/scoping) | the `HasBrand` trait on your own models, plus two swappable bindings | `UserSource`, `BrandTokenResolver` |
| [Suppression](/suppression/gate) | the gate contract, if you replace the database one | `Gate` |

Notifications' registries fail closed and quietly: `SourceRegistry` skips
anything that does not implement `DigestSource`, without an error. If a digest
source you registered never contributes, check the contract first.

## Turning an application event into a trigger

Both integration addons can lift an arbitrary Laravel event into their world with
one call, no listener class of your own. This is the highest-leverage extension
point in the suite.

```php
// Automations: registers the node AND subscribes the listener
Automations::registerEventTrigger(\App\Events\OrderShipped::class, [
    'handle' => 'order_shipped',
    'label' => 'Order Shipped',
    'group' => 'Shop',
    'payload' => 'order',                       // → {{ order.id }} in the builder
    'output_schema' => ['order' => ['id' => 'string', 'total' => 'number']],
]);

// Webhook Manager: same idea, appears in the CP trigger picker
WebhookManager::registerEventTrigger(\App\Events\OrderShipped::class, [
    'handle' => 'order.shipped',
    'label' => 'Order — shipped',
    'source_type' => 'order',
    'payload' => fn (\App\Events\OrderShipped $e) => ['id' => $e->order->id],
]);
```

Both also accept the same thing declaratively under `event_triggers` in their
config file, which is often the better answer for a project rather than an addon.

When no `payload` mapper is given, the event is serialised through its
`toArray()` if it has one, otherwise from its public properties.

## Schema-driven config forms

Automations goes one step further: a server-registered node's `schema()` becomes
its configuration form in the Control Panel automatically, with **no front-end
build**. You write PHP, and a Vue form appears. `registerOptionSource()`
populates any `<select>` in that form from your own data:

```php
Automations::registerOptionSource('shop.products', fn ($request) =>
    Product::all()->map(fn ($p) => ['value' => $p->id, 'label' => $p->name])->all()
);
```

This is why "extending Automations" does not mean forking it.

## Detecting a sibling addon

If your own package wants to integrate optionally, copy the suite's own pattern:
a `suggest` entry in `composer.json`, no `require`, and a capability check at
boot.

```php
if (class_exists(\Goldnead\Leadhub\Facades\LeadHub::class)
    && method_exists(\Goldnead\Leadhub\Facades\LeadHub::getFacadeRoot(), 'segmentMemberIds')) {
    // segments are available
}
```

Check the **facade root**, not the facade. `method_exists()` on a facade class
returns `false` for everything it forwards through `__callStatic`, and getting
this wrong is how every LeadHub action node once failed silently on every real
install.
