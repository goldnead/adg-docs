# Migrating from Marketing

<AddonHeader />

**Affects every host that had `goldnead/statamic-marketing` before it had this package.** A
fresh installation with no marketing history can skip to
[After the cutover](#after-the-cutover).

For a while there were two preference pages. Marketing served its own at
`/!/marketing/preferences/{token}`, this package serves the combined one at
`/!/preference-center/t/{pcToken}`, and the two were near-identical by construction: the same
`data-list` and `data-state` contract, the same error split, the same "unsubscribe from
everything" second form. A person clicking a marketing footer link landed on the single-list
page and never learned that the same address was on four other lists of the same brand.

That is now decided. **This package owns the preference page. Marketing keeps only
unsubscribe.**

::: danger This is a breaking change that shipped as a minor version
Preference links in mail you have **already sent** point at
`/!/marketing/preferences/{token}`. Once Marketing removes that route those links 404, and
there is no redirect in either package. Decide what happens to them
[before you deploy](#links-already-in-peoples-inboxes) — this page is the only warning you
will get.
:::

## What changes on your site

| Before | After |
| --- | --- |
| `/!/marketing/preferences/{token}` renders Marketing's own page | The route is gone from Marketing |
| Marketing's footer links point at that page | Marketing asks this package for the URL, and falls back to its own unsubscribe path when this package is absent |
| Lists only | Lists, notification matrix, cadence and block state, from whichever packages are installed |
| Unsubscribing was a preference page | Unsubscribing is its own one-click path in Marketing, and works with this package uninstalled |

The one-click path staying in Marketing is deliberate. Unsubscribing is a legal obligation
and an RFC 8058 endpoint that mail providers POST to unattended; it may not depend on an
optional package being installed. Only the richer preference page moved.

## The steps

### 1. Upgrade both packages together

```bash
composer update goldnead/statamic-preference-center goldnead/statamic-marketing --with-dependencies
```

Do not upgrade one without the other. A Marketing that still serves its own page next to this
one puts two live preference pages on the same site again. A Marketing that has already
dropped its page, next to a Preference Center that predates the discovery interface, leaves
its footer links pointing nowhere.

### 2. Clear the caches that hold a route table

Not optional here. The token door in this package is registered **only** when Marketing is
installed, so a cached route table built before the upgrade disagrees with reality
afterwards, and disagrees silently.

```bash
php artisan route:clear
php artisan view:clear
php artisan config:clear
```

If you cache routes in production, rebuild the cache after deploying — and rebuild it again
any time you add or remove `goldnead/statamic-marketing`.

### 3. Point the Notifications footer at the combined page

```dotenv
NOTIFICATIONS_PREFERENCES_URL="https://example.com/!/preference-center"
```

### 4. Move any forked view

Only if you published and edited
`resources/views/vendor/marketing/partials/preferences.blade.php`. Those edits are now dead:
the partial no longer has a route rendering it.

```bash
php artisan vendor:publish --tag=preference-center-views
```

The two templates use the same class names and the same `data-*` contract, so most
customisations transplant directly. What is new here and has no counterpart in Marketing's
partial: the notification matrix (`data-cell`), the cadence radios (`data-frequency`), the
page-level suppression banner (`data-suppression`) and the empty state for a host with
nothing installed (`data-block="none"`).

### 5. Check your own code for the removed route

```bash
grep -rn "marketing.preferences" app resources config
```

Anything that built a preference URL by hand should go through the
[discovery interface](/preference-center/extending) instead:

```php
use Goldnead\PreferenceCenter\PreferenceCenter;

$url = class_exists(PreferenceCenter::class)
    ? app(PreferenceCenter::class)->urlForToken($subscription->token)
    : null;

$url ??= route('marketing.unsubscribe', $subscription->token);
```

Probe `class_exists()` on that class, not `method_exists()` on the facade. A facade answers
through `__callStatic`, so the check is `false` while the method exists.

## Links already in people's inboxes

Nothing you can recall. Mail that is already delivered still carries
`/!/marketing/preferences/{token}` URLs, and once Marketing removes that route those links
404.

Pick one of the two before you deploy.

**Redirect them.** One route in your own application, kept for as long as your oldest live
campaign is worth honouring. A year is a reasonable default for a newsletter footer.

```php
Route::get('/!/marketing/preferences/{token}', function (string $token) {
    $url = class_exists(\Goldnead\PreferenceCenter\PreferenceCenter::class)
        ? app(\Goldnead\PreferenceCenter\PreferenceCenter::class)->urlForToken($token)
        : null;

    return redirect($url ?? route('marketing.unsubscribe', $token));
})->name('marketing.preferences.legacy');
```

The token is the same value in both packages, which is what makes this a redirect rather than
a migration.

**Or accept the 404**, if you have never sent a mail carrying that URL. Check before you
assume: the link lived in Marketing's own campaign footers.

The unsubscribe links in old mail are unaffected. That path did not move.

## After the cutover

Verify, in this order.

1. `php artisan route:list --name=preference-center` lists **seven** routes, including
   `preference-center.token`. If the token routes are missing, Marketing is not installed or
   `preference-center.sources.marketing` is `false`.
2. Open a real token URL from a real subscription. The page shows the lists block *and*
   whichever of the notification and cadence blocks your installation supports.
3. Send yourself a campaign and click the preference link in the footer. It should land on
   `/!/preference-center/t/…`, not on anything under `/!/marketing/`.
4. Click the unsubscribe link in the same mail. It should still work, and it should still
   work with this package temporarily uninstalled.

## Earlier versions

Nothing before 1.3.0 needed an upgrade guide. Versions 1.0.0 through 1.2.0 were additive, and
no published route, config key, view path or facade method changed in them.

Cross-version upgrade notes for the whole suite are in [Upgrading](/guide/upgrading).
