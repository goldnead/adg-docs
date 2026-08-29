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
| A starting flow | — | `template()`, see [Templates](/automations/templates#registering-your-own-template) |

All three node contracts extend the shared `AutomationNode`, which is where `handle()`,
`label()`, `description()`, `group()` and `schema()` live.

::: tip A logic node does not strictly need the contract
`registerLogicNode()` accepts any `AutomationNode` that exposes an `execute()` or an
`evaluate()` method, even without implementing `AutomationLogicNode`. That is how the
built-in *Set Variable* and *Call Automation* nodes are registered as logic while
carrying an action's `execute()`. Implement the contract in your own code anyway — the
relaxed rule exists for back-compatibility, not as an invitation.
:::

## The full surface

Everything on the facade, so nothing has to be found by reading the source:

| Method | Purpose |
| --- | --- |
| `registerAction($handleOrClass, ?$class = null)` | Register an action |
| `registerTrigger($handleOrClass, ?$class = null)` | Register a trigger |
| `registerLogicNode($handleOrClass, ?$class = null)` | Register a logic node |
| `registerOptionSource($handle, callable\|string $resolver)` | Populate a select |
| `registerEventTrigger(string $eventClass, array $definition)` | An event as a trigger |
| `template(array $template)` | Add a template to the CP catalogue |
| `registerBuiltIn(string $handle)` | Exempt a handle from the Pro gate |
| `isBuiltIn(string $handle): bool` | Ask whether one is exempt |
| `trigger($handle, $class)` · `action($handle, $class)` · `node($handle, $class)` | The two-argument primitives the `register*` methods delegate to, without the class validation |
| `describe(string $class, ?string $expectedKind = null): array` | Validate **one** class |
| `triggers()` · `actions()` · `nodes()` | The registries |
| `optionSources(): OptionSourceRegistry` | The option-source registry |
| `eventTriggers(): array` | Registered event-trigger definitions, keyed by handle |
| `bootEventTriggersFromConfig()` | Registers the `event_triggers` config map; called at boot |
| `license(): LicenseManager` | Licence state |

The registries are readable, which is what makes "is my node actually registered" a
question with an answer:

```php
array_keys(Automations::nodes()->all());     // every registered handle
Automations::optionSources()->has('shop.products');
Automations::eventTriggers();                 // handle => definition
```

Handles on the option-source registry are plain strings, and the built-in Statamic
sources are registered twice — under the bare name (`collections`) and under a
`statamic.`-prefixed spelling (`statamic.collections`) — so both spellings work in a
schema field.

## More than one output <Badge type="tip" text="1.7.0" />

An edge leaves a node from an **output handle**, so a node with one handle can only ever
continue in one direction. Before 1.7.0 the canvas gave every third-party node exactly one
`default` handle no matter what its class declared, which made a custom switch impossible to
wire up.

Declare `outputSpec()` and the canvas, the validator and the node itself all read that one
declaration:

```php
use Goldnead\StatamicAutomations\Support\NodeOutputs;

public static function outputSpec(): array
{
    return NodeOutputs::spec([[
        'outputs' => [
            ['handle' => 'matched', 'label' => 'Matched'],
            ['handle' => 'default', 'label' => 'Everything else'],
        ],
    ]], primary: 'matched');
}
```

Outputs may depend on config — a switch with three cases has different handles from one with
five — and the canvas has to follow that while the user is typing, without a round trip. So
what crosses to the browser is not a list of handles but a small spec both sides evaluate
against the node's live config. A clause may derive its handles from a `key_value` field:

```php
NodeOutputs::spec([[
    'from' => [
        'field' => 'cases',           // a key_value config field
        'handle' => 'value',          // which side of the pair is the handle
        'label' => 'key',
        'handle_fallback' => 'default',
    ],
    'append' => [['handle' => 'default', 'label' => 'Default']],
]]);
```

Clauses are first-match-wins, and `when` gates one on a config field (`is` / `not`, compared
as strings, with `default` standing in for an empty value). Leave the last clause
unconditional — a node whose clauses all miss has no outputs at all.

`primary` names the handle **Duplicate** attaches to. Omit it and duplication keeps attaching
to the first output, which is the pre-1.7.0 behaviour.

::: tip You usually do not need this
Nodes without an `outputSpec()` still work. A single `default` handle is the default, a type
ending in `.branch` still gets `true`/`false`, and a legacy `outputs()` method is honoured as a
fixed list. Only declare a spec when the handles depend on config.
:::

The payload carries `version` (currently `1`). A canvas that meets a **higher** version than it
understands falls back to a single `default` handle and logs a console warning rather than
guessing — so a node built against a future grammar degrades instead of drawing wrong edges.

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

## A malformed registration throws. A failed licence gate does not.

Two different failure modes, and telling them apart saves the whole investigation.

**Malformed throws.** `registerAction()`, `registerTrigger()` and `registerLogicNode()`
run `describe()` on the class first, and it raises an `InvalidArgumentException` when the
class does not exist, does not implement `AutomationNode`, returns an empty `handle()`,
or does not satisfy the contract for the kind you registered it as. You get a stack trace
at boot, which is the point.

So: node missing and nothing threw → check whether the registration code ran at all,
and whether it ran in `boot()`.

`registerOptionSource()` and `registerEventTrigger()` are **not** gated. They register
regardless of licence state.

When a node does not appear, ask the registries rather than guessing at the front end:

```php
array_keys(Automations::nodes()->all());          // every registered handle
Automations::nodes()->has('shop_order_shipped');  // one specific handle
Automations::describe(SendToInternalApiAction::class);  // is this class even valid?
```

::: warning `describe()` takes a class
`describe(string $class, ?string $expectedKind = null)` validates **one** class and
returns `['handle' => …, 'kind' => …, 'class' => …]`, or throws explaining what is wrong
with it. It does not list the registry, and calling it with no argument is a `TypeError`.
:::

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
an addon. **The array key is the event class**, and the definition holds the handle:

```php
// config/automations.php
'event_triggers' => [
    \App\Events\OrderShipped::class => [
        'handle' => 'order_shipped',
        'label' => 'Order Shipped',
        'group' => 'Shop',
        'payload' => 'order',                  // {{ order.id }} etc.
        'output_schema' => ['order' => ['id' => 'string', 'total' => 'number']],
    ],
],
```

A definition without a non-empty `handle` throws an `InvalidArgumentException` at boot.

The config path is the same registration, so anything it can express behaves identically.
What it cannot express is a closure — config is not serialisable that way — so `payload`
here is a dot-path string (or `'*'` to dump the event's public properties) and `matches`
is an invokable class-string. For the closure form, call `registerEventTrigger()` from a
service provider's `boot()`.

This is also how you reach LeadHub events that the curated trigger set does not expose —
`LeadHubSourceIngested`, `LeadHubOpportunityWon`, `LeadHubContactsMerged` and the rest.
Register the event class and you have a node.

## Custom nodes are not licence-gated

```php
'features' => [
    'custom_actions' => true,
    'custom_triggers' => true,
],
```

Registering a node — action, trigger or logic node — needs no licence. Automations
carried a Pro gate on this until 2.0.0, along with a licence manager of its own; both
were removed. The switches above turn the capability off entirely if you want that, and
they are on by default.

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
