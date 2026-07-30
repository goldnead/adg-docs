# Extending

<AddonHeader />

The addon exposes a full public extensibility API. A third-party addon or your host app
registers custom nodes and data sources from any service provider's `boot()` — the same
surface the built-ins are registered through.

**Server-registered nodes appear in the CP node library with no front-end build**, and
their `schema()` becomes the config form automatically.

```php
use Goldnead\StatamicAutomations\Facades\Automations;

public function boot(): void
{
    // Nodes. The handle-less overload reads ::handle() from the class.
    Automations::registerAction(SendToInternalApiAction::class);
    Automations::registerTrigger(InvoicePaidTrigger::class);
    Automations::registerLogicNode(BusinessHoursGate::class);

    // Populate a custom <select> picker (options_source: 'shop.products').
    Automations::registerOptionSource('shop.products', fn ($request) =>
        \App\Models\Product::all()->map(fn ($p) => ['value' => $p->id, 'label' => $p->name])->all()
    );

    // Turn any application event into a trigger — one call registers the node
    // AND subscribes a listener that funnels the event into the dispatcher.
    Automations::registerEventTrigger(\App\Events\OrderShipped::class, [
        'handle' => 'order_shipped',
        'label' => 'Order Shipped',
        'group' => 'Shop',
        'payload' => 'order',                                   // → {{ order.id }}
        'output_schema' => ['order' => ['id' => 'string', 'total' => 'number']],
    ]);
}
```

::: tip The namespace is `Goldnead\StatamicAutomations`
Not `Goldnead\Automations`. This has cost real time.
:::

## The contracts

| You are writing | Implement | Register with |
| --- | --- | --- |
| An action | `AutomationAction` | `registerAction()` |
| A trigger | `AutomationTrigger` | `registerTrigger()` |
| A logic node | `AutomationLogicNode` | `registerLogicNode()` |
| A select's options | — | `registerOptionSource()` |
| An event as a trigger | — | `registerEventTrigger()` or `event_triggers` config |

All three node contracts extend the shared `AutomationNode`.

## Schema-driven config forms

A node declares its configuration, and the Control Panel renders it. You write PHP and a
Vue form appears — no build step, no front-end code, no rebuilding the CP bundle.

This is the single most important property of the extension API, and it is why extending
Automations does not mean forking it. A node you register in a service provider is a
first-class node: it appears in the library, it has a working config form, its values are
validated, and it participates in export and import.

`options_source` on a schema field connects that form back to your data:

```php
// in the node's schema()
'product_id' => [
    'type' => 'select',
    'label' => 'Product',
    'options_source' => 'shop.products',
],
```

The built-in nodes populate their collection pickers, form pickers and Webhook Manager
destination pickers exactly this way.

## Register from `boot()`, never `register()`

Statamic boots addon service providers **before** application providers, so by the time
your `boot()` runs the Automations registries exist and are seeded with the built-in
defaults.

::: warning The nesting trap
Statamic calls `bootAddon()` itself inside an `app->booted()` callback. Wrapping your
registration in another `app->booted()` therefore fires *immediately*, not later, and is
still too early.

If you need to defer — a bridge waiting for a sibling addon — queue a retry with an
idempotency guard rather than nesting the callback.
:::

## Registration errors are loud

A malformed registration **throws immediately**, and never silently no-ops.

When a node does not appear, ask the registry rather than guessing at the front end:

```php
Automations::describe();
```

That is the first debugging step for "my custom action is missing", and it usually ends
the investigation.

## Handles replace, they do not add

Registering a node whose handle matches an existing one **replaces** it. That is the
supported way to override a built-in — and the way to clobber one by accident, so pick a
distinctive handle: `shop_order_shipped`, not `order_shipped`.

## Turning an application event into a trigger

One call registers the node **and** subscribes a listener that funnels the event into the
dispatcher. No listener class of your own, no boilerplate.

```php
Automations::registerEventTrigger(\App\Events\OrderShipped::class, [
    'handle' => 'order_shipped',
    'label' => 'Order Shipped',
    'group' => 'Shop',
    'payload' => 'order',
    'output_schema' => ['order' => ['id' => 'string', 'total' => 'number']],
]);
```

| Key | Purpose |
| --- | --- |
| `handle` | The trigger handle |
| `label` · `group` | How it appears in the node library |
| `payload` | Which key the event data lands under in the run context |
| `output_schema` | What the token picker offers, so `{{ order.id }}` is discoverable |

`output_schema` is worth filling in. Without it the trigger works and the token picker has
nothing to show, so whoever builds the flow has to know the shape by heart.

The same thing declaratively, which is often the better answer for a project rather than
an addon:

```php
// config/automations.php
'event_triggers' => [
    'order_shipped' => [
        'event' => \App\Events\OrderShipped::class,
        'label' => 'Order Shipped',
        'group' => 'Shop',
        'payload' => 'order',
    ],
],
```

This is also how you reach LeadHub events that the curated trigger set does not expose —
`LeadHubSourceIngested`, `LeadHubOpportunityWon`, `LeadHubContactsMerged` and the rest.
Register the event class and you have a node.

## Custom nodes are a Pro feature

```php
'features' => [
    'custom_actions' => true,
    'custom_actions_requires_pro' => true,
    'custom_triggers' => true,
],
```

Registration requires a Pro licence by default. `registerOptionSource()` and
`registerEventTrigger()` sit behind the same gate as the node types they serve.

## Keeping credentials out of exports

An automation exports to JSON, and a literal API key typed into a node's config travels
with it. Declare a named secret instead:

```php
// config/automations.php
'secrets' => [
    'internal_api_key' => env('INTERNAL_API_KEY'),
],
```

```
{{ secret.internal_api_key }}
```

Your custom action then reads a resolved value, and the export file holds a name. If you
ship a node that takes a credential, document this rather than a config field.

## Full reference

Interface definitions, the schema-field vocabulary, the option-source reference and worked
copy-paste examples for every extension point live in the addon repository's
`docs/extending.md`.
