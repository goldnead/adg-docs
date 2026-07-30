# Extending

<AddonHeader />

The addon is intentionally registry-driven. Eight registries, one contract each,
registered from a service provider's `boot()`.

```php
use Goldnead\WebhookManager\Facades\WebhookManager;

public function boot(): void
{
    WebhookManager::registerTrigger(new MyCustomTrigger());
    WebhookManager::registerCondition(new MyCustomCondition());
    WebhookManager::registerAction(new MyCustomAction());
    WebhookManager::registerAuthScheme(new MyCustomAuthScheme());
    WebhookManager::registerVariableResolver(new MyCustomResolver());
    WebhookManager::registerSuccessEvaluator(new MyCustomEvaluator());
}
```

## The registries

| Register | Contract | Adds |
| --- | --- | --- |
| `registerTrigger()` | `TriggerInterface` | a trigger in the CP picker |
| `registerCondition()` | `ConditionInterface` | a condition type for hooks and rules |
| `registerAction()` | `ActionInterface` | an action for rules and inbound endpoints |
| `registerAuthScheme()` | `AuthVerifierInterface` | an inbound verifier |
| `registerVariableResolver()` | `TemplateVariableResolverInterface` | a token namespace |
| `registerSuccessEvaluator()` | `SuccessEvaluatorInterface` | what counts as a successful response |
| `registerPreset()` | `PresetInterface` | an integration preset |
| `registerEventTrigger()` | — | any event class as a trigger, no listener needed |

All contracts live under `Goldnead\WebhookManager\Contracts`.

## Register from `boot()`, never `register()`

Statamic boots addon service providers **before** application providers. By the time
your `boot()` runs, the registries exist and are seeded with the built-in defaults —
which is what you want, because you can inspect them and you can replace one.

Registering from `register()`, or from any provider that boots earlier than this addon,
is **not supported**.

::: warning The nesting trap
Statamic calls `bootAddon()` itself inside an `app->booted()` callback. Wrapping your
registration in another `app->booted()` therefore fires *immediately*, not later, and
is still too early.

If you genuinely need to defer — a bridge that must wait for a sibling addon — queue a
retry with an idempotency guard rather than nesting the callback. This is a real bug
that cost fourteen trigger registrations in LeadHub's bridge, with nothing but log
warnings to show for it.
:::

## Handles replace, they do not add

Every registry is keyed by handle. Registering a trigger, condition, action, auth
scheme, resolver, evaluator, preset or inbound action handler whose `handle()` matches
an existing one **replaces** it.

That is the supported way to override a built-in. It is also the way to clobber one by
accident, so pick a distinctive handle for anything genuinely new: `shop.order_shipped`
rather than `order.shipped`.

## Custom event triggers

Out of the box the addon reacts to a fixed set of Statamic events. To make **any**
other Laravel or Statamic event fire webhooks — your own domain events, or a
third-party addon's — register it as a custom event trigger. No listener class is
required: the addon attaches one generic listener that normalises the event into the
standard dispatch pipeline, and the trigger appears in the CP trigger picker for both
outbound hooks and rules automatically.

### Config-driven

```php
// config/webhook-manager.php
'event_triggers' => [
    'order.shipped' => [
        'event'       => \App\Events\OrderShipped::class,  // required
        'label'       => 'Order — shipped',                 // shown in the picker
        'source_type' => 'order',                           // optional, default "event"
        'description' => 'Fires when an order ships',        // optional
        'payload'     => \App\Webhooks\OrderShippedPayload::class,
    ],
],
```

The array key is the trigger handle unless you set `handle` explicitly.

`payload` is optional and accepts a Closure, an invokable class-string, or a
`[class, method]` pair:

```php
class OrderShippedPayload
{
    public function __invoke(\App\Events\OrderShipped $event): array
    {
        return ['id' => $event->order->id, 'total' => $event->order->total];
    }
}
```

### Programmatic

Funnels into the exact same generic listener and registry registration, which is what
you want when shipping a preconfigured trigger with your own addon:

```php
WebhookManager::registerEventTrigger(\App\Events\OrderShipped::class, [
    'handle'      => 'order.shipped',
    'label'       => 'Order — shipped',
    'source_type' => 'order',
    'payload'     => fn (\App\Events\OrderShipped $e) => ['id' => $e->order->id],
]);
```

### Without a payload mapper

The listener builds the payload from the event's `toArray()` if it has one, otherwise
from its public properties, and passes through an event that is already an array.

That default is fine for a small value object and unwise for an event holding a whole
Eloquent model, whose `toArray()` will happily serialise every column including the
ones you did not mean to send.

## A custom variable resolver

The resolver's handle becomes the token namespace, so this makes
`{{ shop:order_total }}` available in every payload template:

```php
WebhookManager::registerVariableResolver(new ShopVariableResolver());
```

Resolvers are asked at render time for the tokens they own. A token whose namespace
does not exist resolves to empty rather than throwing, which means a typo is silent —
check a test delivery's rendered body.

## A custom success evaluator

The most under-used extension point. Whether a response counts as success is a
decision, not a status code, and real destinations get this wrong constantly:

- `200` with `{"ok": false}` in the body
- `202` for "queued", which is success
- `409` for "already have it", which is also success

```php
WebhookManager::registerSuccessEvaluator(new AcmeApiEvaluator());
```

Express this here rather than in `retry_on_status`. Retry config decides whether to try
again; the evaluator decides what happened.

## A custom inbound action

Implement `InboundActionHandlerInterface` and register it. Or reach for the built-in
**Dispatch event** action instead: it turns the inbound webhook into a domain event in
your application, and everything after that is ordinary Laravel that you can test
without HTTP.

For most projects that is the better answer.

## Reference implementation

This addon is the pattern the rest of the suite copies. If you are building your own
Statamic addon with a Vue CP, its `vite.config.js` `test` block, `tests/js/setup.js`
and `test` script are worth taking verbatim: they solve the two real problems, which
are that Statamic's Vite plugin rewrites `vue` to `window.Vue` (correct for the CP
bundle, fatal in a test process) and that `@statamic/cms/ui` destructures a
`__STATAMIC__` global that only exists at runtime.
