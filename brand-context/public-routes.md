# Public routes

<AddonHeader />

A link in an email is opened without a session, so no brand is current, so the
fail-closed scope hides the very record the link points at. Confirmation links,
unsubscribe links and download links all hit this.

The brand comes from the token in the URL instead.

```php
use Goldnead\BrandContext\Http\Middleware\SetBrandFromRouteValue;

Route::get('/confirm/{token}', ConfirmController::class)
    ->middleware(SetBrandFromRouteValue::class.':'.Subscription::class.',token,token');
```

The three arguments are:

| Argument | Meaning |
| --- | --- |
| `Subscription::class` | the model to look the value up on |
| `token` | the **column** to look it up in |
| `token` | the **route parameter** (or input field) carrying the value |

The second and third are usually the same word, which is why they look redundant.
They are not: the route parameter can be named anything.

## The column must be globally unique

**The lookup column must carry a unique index across all brands.** One token, one
record, one brand — that is the entire safety argument.

If two records answer, `brandForUnique()` throws `AmbiguousBrandRecord` rather than
guessing, because guessing means serving one brand's record to another brand's
visitor.

::: danger Never pass a per-brand unique column
A column that is unique only *within* a brand cannot identify a brand. Two brands
could each own a list called `newsletter`, and every request for that handle would
raise `AmbiguousBrandRecord` — the form dead in both brands at once, and no way to
tell from the outside which brand the visitor meant.

This is why Marketing list handles are unique across all brands rather than per
brand: they are used exactly this way by the public subscribe endpoint.
:::

Tokens are the natural fit here, because a random token is globally unique by
construction. A slug, a handle or an email address usually is not.

## Nothing is aborted

The middleware does not 404, 403 or throw on a value it cannot resolve. An unknown
value simply sets no brand, the scope stays closed, and your controller produces
the response it always produced for an unknown token.

That is the right division of labour: deciding what an expired confirmation link
should say is the controller's job, and a middleware that aborted first would take
that decision away from you.

```php
public function __invoke(string $token)
{
    $subscription = Subscription::where('token', $token)->first();

    // With an unknown token, no brand was set, the scope is closed, and this is
    // null — the same null you would get from an expired token. Handle both.
    if (! $subscription) {
        return view('newsletter.link-expired');
    }

    // …
}
```

## The brand is set per request, never inherited

The middleware sets the brand explicitly on every request and never carries it over
from the last one.

That matters the moment the app runs in a long-lived process — Octane, a
persistent worker, a test suite that shares a container. An inherited brand there
would be a cross-tenant leak that only appears on the second request, which is the
worst kind of bug to find.

## The other two middleware

For completeness, since they solve the same problem at different entry points:

| Middleware | Alias | Entry point | Behaviour |
| --- | --- | --- | --- |
| `SetBrandFromSession` | `brand.session` | Control Panel | Reads the brand the switcher stored |
| `ResolveBrandFromToken` | `brand.token` | API | Resolves a bearer token to a brand; **fail-closed with a 401** in multi-brand mode |
| `SetBrandFromRouteValue` | — | public links | As above; sets nothing on an unknown value, aborts nothing |

Note the difference in failure behaviour, which is deliberate. An API client that
presents no resolvable token gets a **401**: it is a machine, and a clear error is
the useful answer. A visitor clicking a link in an email gets **your page**, because
"401" is not something to show a person who clicked a two-week-old newsletter.

## A worked unsubscribe route

```php
Route::get('/newsletter/abmelden/{token}', UnsubscribeController::class)
    ->middleware([
        'web',
        SetBrandFromRouteValue::class.':'.Subscription::class.',token,token',
    ]);
```

```php
Route::post('/newsletter/abmelden/{token}', UnsubscribeController::class)
    ->middleware([
        SetBrandFromRouteValue::class.':'.Subscription::class.',token,token',
    ])
    ->withoutMiddleware(ValidateCsrfToken::class);
```

The `POST` variant is what RFC 8058 one-click unsubscribe requires, and it has to
skip CSRF because the request comes from a mail client with no session and no token.

::: warning CSRF is invisible in tests
Laravel's CSRF middleware skips itself automatically in unit tests, so a test suite
is blind to a missing `withoutMiddleware()` and the live endpoint returns **419**
anyway. This exact bug shipped in Webhook Manager's inbound route and was only
found by hitting the URL for real. If you build a public POST endpoint, test it
against a running server, not only in PHPUnit.
:::
