# Extending

<AddonHeader />

This package exposes a small, deliberate surface for other code to bind to: a **discovery
interface** for finding the page, an event for recording changes, and a facade for reading
the assembled view.

## The discovery interface

Three constants and two methods on `Goldnead\PreferenceCenter\PreferenceCenter`:

```php
namespace Goldnead\PreferenceCenter;

class PreferenceCenter
{
    public const ROUTE_TOKEN   = 'preference-center.token';    // the page, entered by token
    public const ROUTE_SHOW    = 'preference-center.show';     // the page, session or magic link
    public const ROUTE_REQUEST = 'preference-center.request';  // the magic-link door

    public function urlForToken(string $token): ?string;
    public function requestUrl(): ?string;
}
```

::: tip This is a public contract, bound by semver
The three route names and the two methods are a public interface from **1.3.0**, the release
that introduced them, and bound by semver from that tag onwards. Renaming either is a major
version. `tests/Feature/DiscoveryContractTest.php` is what stops them drifting.

Everything else in this package — the sources, the writer, the data objects — is internal and
may change in a minor.
:::

This is how `goldnead/statamic-marketing` finds the combined page. Marketing keeps a minimal
one-click unsubscribe path that works with this package absent, and routes every *preference*
link through a resolver that prefers this page when it is installed.

## The correct probe

```php
use Goldnead\PreferenceCenter\PreferenceCenter;

$url = class_exists(PreferenceCenter::class)
    ? app(PreferenceCenter::class)->urlForToken($token)
    : null;

$url ??= route('marketing.unsubscribe', $token);   // the path that always works
```

Two rules about that probe, both paid for in production.

### 1. Probe the class, never the facade

```php
// Correct
class_exists(\Goldnead\PreferenceCenter\PreferenceCenter::class)

// Wrong, and false even when the method is right there
method_exists(\Goldnead\PreferenceCenter\Facades\PreferenceCenter::class, 'urlForToken')
```

A facade answers its methods through `__callStatic`. They do not exist on the facade class,
so `method_exists()` reports `false` while the method sits on the underlying class. This is
the mistake that took every LeadHub action node down in `goldnead/statamic-automations`
v1.0.3.

If a facade has to be probed at all, probe `Facades\PreferenceCenter::getFacadeRoot()`.

### 2. Treat `null` as "use your own path"

Both methods are nullable, and the nullability is the useful part of the contract. `null`
means *this package cannot serve that link here*, and a caller that ignores it publishes a
dead link into a mail nobody can recall.

Three legitimate ways `urlForToken()` returns `null`:

| Cause | Why |
| --- | --- |
| The token door is not mounted | Marketing is absent, so the route was never registered, or `routes.enabled` is off |
| Marketing is installed but switched off | `sources.marketing => false`. `Route::has()` alone cannot see this, because the route table was built at boot |
| The token is empty | A caller bug worth failing quietly on rather than minting `/t/` as a URL |

`requestUrl()` returns `null` only when the routes are switched off. Unlike the token door it
needs no source at all — it is the entrance a host with only Notifications installed still
has.

Both URLs are **absolute on purpose**. They are written into mail.

::: warning Class present does not mean route present
This is the trap. The token route is registered conditionally at boot, so
`class_exists(PreferenceCenter::class)` can be `true` while `preference-center.token` does
not exist in the route table. That is why the probe is two steps — `class_exists()` to decide
whether to ask, and a `null` check on the answer — and why neither step can be dropped.

Reading the route registry yourself is not a substitute either: `Route::has()` is blind to
`sources.marketing => false`, which is exactly the case `urlForToken()` folds in for you.
:::

## The facade

```php
use Goldnead\PreferenceCenter\Facades\PreferenceCenter;

PreferenceCenter::view(Access $access): PreferenceView
PreferenceCenter::marketingCenter(Access $access): ?object
PreferenceCenter::urlForToken(string $token): ?string
PreferenceCenter::requestUrl(): ?string
```

Bound to the container alias `preference-center`, and registered as the Laravel alias
`PreferenceCenter`. Use it to read the assembled page from your own code — a custom template,
an account screen, an export for a data-subject request.

`view()` needs an `Access`, which is the object every door produces. Building one by hand
means asserting a consent proof, so build it through `AccessResolver` in
`Goldnead\PreferenceCenter\Identity` rather than by construction, unless you know exactly what
you are claiming.

## The change event

```php
use Goldnead\PreferenceCenter\Events\PreferencesChanged;

Event::listen(PreferencesChanged::class, function (PreferencesChanged $event) {
    $event->access;           // identity, address, brand, proof
    $event->consentProof();   // 'unsubscribe_token' | 'magic_link' | 'session'
    $event->changes;          // list<array{block, target, channel, to}>
});
```

An event rather than a direct write, so a host can put the record wherever it keeps such
things — an activity ledger, a warehouse, an SIEM — without this package having to know about
any of them.

It fires once per applied submission and only when something actually changed. It is not
fired for a refusal.

The shipped listener, `RecordPreferenceChange`, writes a log line on
`audit.log_channel` with the identity pseudonymised, and where LeadHub is installed also
ingests a `preference_center.changed` timeline entry against the address. Turn the second
half off with `audit.leadhub => false`.

## Replacing a source

There is no source registry and no way to add a fourth block. The three sources are concrete
classes, registered as singletons, and the page is not a plugin host.

What you can do is put your own implementation behind the marker each source resolves from
the container — a `Gate` binding that consults a shared blocklist, for instance — which is
the extension point those packages document. This one reads whatever the container gives it.

## What is deliberately not extensible

- **No Antlers tags.** The page is not composable from a template. It is a URL.
- **No Control Panel surface**, so no place to register a panel, a widget or a permission.
- **No `blocks` config.** Which blocks exist follows from which packages are installed.
- **No token store**, so nothing to hook into for revocation. See
  [Magic links](/preference-center/magic-links#what-the-link-is).
