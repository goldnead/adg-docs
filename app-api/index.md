# App API

<AddonHeader />

A JSON layer for single-page apps on Statamic, over
[Laravel Sanctum](https://laravel.com/docs/sanctum). A React or Vue app signs in, reads its user,
its teams, its access and quotas, starts a purchase and opens the customer portal, all as JSON
under one prefix.

It translates and decides nothing itself. Login, two-factor, passkeys, registration, passwords
and the elevated session are Statamic's own controllers; account, teams, access and checkout
are the sibling addons' services. **An area whose addon is not installed has no routes.**

## What it is

- **Session** through Statamic's auth: login with the two-factor step, passkey login, logout,
  registration, forgotten and reset password, the current user, the elevated session.
- **Account** from [Accounts](/accounts/): address confirmation, change of address, deletion
  with grace period and blockers, data export.
- **Teams** from [Teams](/teams/): list, switch, members, invitations, join codes, roles,
  leave. The current team comes from a header.
- **Access and quotas** from [Entitlements](/entitlements/), for the user and the current
  team, plus the middlewares `app-api.entitled` (402) and `app-api.quota` (429) for a site's own
  routes. See [Your own routes](/app-api/own-routes).
- **Checkout** from [Payments](/payments/) and [Offers](/offers/): answers `{checkout_url}`
  instead of a redirect, and the same request twice gives the same checkout; a link into the
  customer portal.
- **Personal access tokens** (optional) for clients without a browser.
- **One error shape** and an **OpenAPI 3.1 description** of every endpoint. See
  [Endpoints](/app-api/endpoints) and [Errors](/app-api/errors).
- **A Control Panel page** listing every endpoint and what is wired.

## What it is not

- **Not an auth system.** Every sign-in path is Statamic's own; this addon puts JSON in front of
  it. Two-factor enforcement and elevated sessions behave exactly as on Statamic's pages.
- **Not a content API.** Entries, collections and assets are Statamic's REST or GraphQL API.
  This addon is about the person using an app: account, team, access, purchase.
- **Not a place for business rules.** Who may do what in a team is Teams, what someone may open
  is Entitlements, what a purchase costs is Payments and Offers.

## How it fits

```
SPA  → GET  /sanctum/csrf-cookie                once
     → POST /api/app/session/login              Statamic's login (2FA step if needed)
     → GET  /api/app/me                          the user
     → GET  /api/app/access      X-Team-ID: 7   products and quotas, user and team
     → POST /api/app/checkout    X-Team-ID: 7   {checkout_url} from Payments / Offers
     → POST /api/app/account/deletion           423 elevation_required
     → POST /api/app/session/elevation          confirm, then repeat

your routes → auth:sanctum, app-api.json, app-api.team, app-api.entitled:pro   402 without access
```

## Next

- [Installation](/app-api/installation), including the SPA side
- [Configuration](/app-api/configuration), with an example for a team app
- [Endpoints](/app-api/endpoints) and the OpenAPI description
- [Sessions, confirmation and tokens](/app-api/sessions)
- [Errors](/app-api/errors)
- [Your own routes](/app-api/own-routes)
- [Reference](/app-api/reference): Control Panel, events, commands, permissions
