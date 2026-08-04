# Extending

<AddonHeader />

A facade with seven methods, four domain events, and five bridges whose target class is a
`protected` method. That is the whole surface, and it is deliberately small.

## The facade

```php
use Goldnead\LeadMagnets\Facades\LeadMagnets;   // alias: LeadMagnets

resource(string $handle): ?Resource
request(Resource $resource, string $email, array $meta = []): Grant
confirm(string $token): ?Grant
findGrant(Resource $resource, string $email): ?Grant
downloadUrl(Grant $grant): string
revoke(Grant $grant): Grant
reinstate(Grant $grant): Grant
```

Semver-locked from the first release, and deliberately small: request, confirm, deliver, look up.
Anything a host application needs beyond this is a case for an event listener, not a new method
here.

```php
$resource = LeadMagnets::resource('warmup-routine');

$grant = LeadMagnets::request($resource, 'name@example.com', [
    'source' => 'checkout',
]);

if ($grant->isRedeemable()) {
    $url = LeadMagnets::downloadUrl($grant);
}
```

`request()` does the whole thing: it creates or reuses the grant, sends the confirmation mail when
one is needed, and delivers immediately when one is not.

**No method on the facade throws.** The exceptions in this package are HTTP aborts in controllers,
plus a query exception when two brands try to claim the same resource handle.

::: warning `resource()` does not filter `published`
The public request endpoint does; the facade does not. Calling `request()` with an unpublished
resource works. Filter it yourself if that matters:

```php
$resource = LeadMagnets::resource($handle);

if ($resource === null || ! $resource->published) {
    abort(404);
}
```
:::

`downloadUrl()` mints a fresh signed link every time it is called. It does not check
redeemability, so ask first.

## The four events

```php
use Goldnead\LeadMagnets\Events\ResourceRequested;
use Goldnead\LeadMagnets\Events\ResourceConfirmed;
use Goldnead\LeadMagnets\Events\ResourceDelivered;
use Goldnead\LeadMagnets\Events\ResourceDownloaded;
```

| Event | Fires |
| --- | --- |
| `ResourceRequested` | On every accepted request, including a repeat and including one against a revoked grant |
| `ResourceConfirmed` | Only on the activation that changed exactly one row. Once per grant |
| `ResourceDelivered` | After the delivery mail was handed to the mailer and `delivered_at` stamped |
| `ResourceDownloaded` | Once per redemption, **before** the file is streamed |

All four carry the grant. `ResourceDownloaded` also carries the `Download` row.

```php
Event::listen(ResourceDownloaded::class, function (ResourceDownloaded $event) {
    $event->grant;      // Grant
    $event->download;   // Download
    $event->payload();  // the safe, flat array
});
```

`payload()` is what the bridges pass on:

```php
[
    'grant_id' => …,
    'email' => …,
    'contact_id' => …,
    'state' => …,
    'download_count' => …,
    'brand_id' => …,
    'resource' => ['id' => …, 'handle' => …, 'title' => …, 'delivery_type' => …],
]
```

`ResourceDownloaded` adds `download_id` and `downloaded_at`.

**No payload contains `token_hash`, the plaintext token or a signed URL.** A test asserts it.
Build your own payloads the same way if you forward these events anywhere.

None of the four is queued or broadcast.

::: tip `ResourceRequested` is not "a new person asked"
It fires on repeats too. If you want "somebody new", listen to `ResourceConfirmed`, which fires
once per grant and only on the activation that won.
:::

## Replacing a bridge

Each bridge names its target through a `protected` method:

```php
namespace Goldnead\LeadMagnets\Integrations;

class LeadhubBridge extends Bridge
{
    protected function facade(): string
    {
        return \Goldnead\Leadhub\Facades\LeadHub::class;
    }
}
```

Subclass it and rebind:

```php
class OurCrmBridge extends LeadhubBridge
{
    protected function facade(): string
    {
        return \App\Crm\Facades\Crm::class;
    }
}

$this->app->singleton(LeadhubBridge::class, OurCrmBridge::class);
```

Your class needs `findByEmail`, `create` and `addTag` on the object behind the facade, because
that is what the bridge probes for.

::: danger Bind bridges as singletons
The bridges' boot guards hold per instance. A per-resolution bridge re-registers its listeners on
every container `make` and fires each event as many times as it was resolved.
:::

The Marketing bridge names two classes instead, a service and a repository, through `service()`
and `repository()`.

## Writing through the service

`GrantService` is the state machine and is resolved by autowiring rather than bound:

```php
use Goldnead\LeadMagnets\Services\GrantService;

$grants = app(GrantService::class);

$grants->request($resource, $email, $meta);   // Grant
$grants->findByToken($token);                 // ?Grant, in any state
$grants->activate($grant);                    // bool: true only for the call that won
$grants->revoke($grant);                      // Grant
$grants->reinstate($grant);                   // Grant
$grants->sweepExpired();                      // int, rows marked expired
$grants->recordDownload($grant, $context);    // Download
```

`activate()` returning `false` is not an error. It means somebody else got there first, which is
the property the whole confirm step is built on. Do not retry on it.

`revoke()` and `reinstate()` dispatch **no event**. If you need to hear about them, listen to the
model or wrap the calls.

`findByToken()` returns the grant in any state, including revoked and expired. The manager is
what turns a lapsed pending grant into "show the lapsed page, do not activate".

## What is deliberately not extensible

- **No Antlers tags**, and no plan for any. The form is three fields and a route.
- **No interfaces.** The package declares none. The seams are `protected` methods.
- **No grant issuance from outside.** Nothing but `GrantService` creates a grant, and there is no
  public `grant()` another package could call. That is one of the things
  [Entitlements](/entitlements/) does and this does not.
- **No fieldtypes and no widgets.**
- **No `entitlements` bridge.** It is named in prose and in the `GrantState` docblock, and it
  exists nowhere in code. See [Grant state](/lead-magnets/grant-state#the-deviation).
