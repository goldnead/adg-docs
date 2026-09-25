# Your own routes

<AddonHeader />

An app has endpoints of its own: the thing it actually does. The middlewares of this addon give
them the same error shape, the same two-factor and token rules, the team from the header, and
access or quota checks from [Entitlements](/entitlements/).

```php
Route::middleware(['auth:sanctum', 'app-api.json', 'app-api.ability:scores', 'app-api.team', 'app-api.entitled:pro,team-plan'])
    ->get('/api/scores/{score}', /* … */);     // 402 payment_required without access

Route::middleware(['auth:sanctum', 'app-api.json', 'app-api.ability:analyses', 'app-api.team', 'app-api.quota:analyses'])
    ->post('/api/analyses', /* … */);          // 429 quota_exceeded when nothing is left
```

**Order matters:** the auth middleware first, then `app-api.json`.

| Middleware | |
| --- | --- |
| `app-api.json` | The error shape, and once somebody is signed in, the two rules that hold everywhere: Statamic's enforced two-factor (403 `two_factor_setup_required`) and no token while `areas.tokens` is off (401 `tokens_disabled`). |
| `app-api.ability:<area>` | A token's ability, `<area>:read` for GET and `<area>:write` for the rest. A session passes. Name your own areas (`scores:read`) and allow them in `tokens.abilities`. |
| `app-api.2fa` | The two-factor rule alone, for a route that does not want `app-api.json`. |
| `app-api.team` | Reads the team header and checks membership, like [Teams' `teams.current`](/teams/current-team). |
| `app-api.entitled:<product>,…` | 402 `payment_required` unless the user or the current team holds one of the products; `details.products` names them. |
| `app-api.quota:<key>` | 429 `quota_exceeded` when the user's or team's quota for `<key>` is used up. The middleware checks; booking the usage (`Entitlements::consume()`) is your controller's. |
