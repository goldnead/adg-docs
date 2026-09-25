# Sessions, confirmation and tokens

<AddonHeader />

## Sessions need a stateful origin

Login, two-factor, passkeys, registration, the forgotten password and the elevated session live
in the session. A request from a domain outside `sanctum.stateful` gets 400
`stateful_origin_required`. Fetch `/sanctum/csrf-cookie` once and send the `XSRF-TOKEN` cookie
back as `X-XSRF-TOKEN` with every write; axios does that with `withCredentials` and
`withXSRFToken`.

## Two-factor at login

`POST session/login` answers `{two_factor: true}` when the account has two-factor
authentication; the code (or a recovery code) follows at `POST session/two-factor`.

**Enforced two-factor.** With `statamic.users.two_factor_enforced_roles`, a user without 2FA
gets `two_factor_setup_required: true` at login, and every endpoint except the session ones,
`me`, logout and the 2FA setup answers 403 `two_factor_setup_required`, as Statamic's own
`RedirectIfTwoFactorSetupIncomplete` does for its pages. The same rule applies to a site's own
routes behind `app-api.json` or `app-api.2fa`.

## Confirmation (elevated session)

With `statamic.users.elevated_sessions_enabled`, changing the address, deleting, exporting,
setting up two-factor and creating a token answer 423 `elevation_required` until the user
confirms:

1. `GET session/elevation` says how this user confirms (`details.method`).
2. Ask for the password; or, for `verification_code`, `POST session/elevation/code` and ask for
   the mailed code; or run a passkey assertion with `GET session/elevation/passkey-options`.
3. `POST session/elevation`.
4. Repeat the request.

A login elevates the session, as in Statamic.

## While an admin is signed in as the user

Account changes answer 403 `impersonation_locked` while an impersonation through
[Accounts](/accounts/control-panel#sign-in-as) is active: address, deletion and export are the
person's own decisions.

## Personal access tokens

For clients without a browser. Switch them on with `areas.tokens`, run Sanctum's migration and
add `HasApiTokens` to the user model. `POST tokens` needs a confirmed session and answers the
`plain_text_token` once; it is never shown again. Send it as `Authorization: Bearer …`.

### Token abilities

A token reaches an area only with `<area>:read` (GET) or `<area>:write` (everything else), for
example `teams:read` or `checkout:write`, or `*`. The areas are `session`, `account`, `teams`,
`access`, `checkout` and `tokens`. `tokens.abilities` limits what a token may ask for;
`tokens.expires_after_days` how long it lives. Switching `areas.tokens` off also refuses tokens
handed out before (401 `tokens_disabled`).

A session passes every ability check; abilities are a token's limit, not a user's.
