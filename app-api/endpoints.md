# Endpoints

<AddonHeader />

**The authoritative description is the OpenAPI 3.1 file:**
[`openapi.json` for 0.1.0](https://github.com/goldnead/statamic-app-api/blob/v0.1.0/openapi.json)
(every area, 45 paths, request and response bodies, error codes per operation). A running site
serves its own at `{prefix}/openapi.json`, listing only the areas active there, and
`php artisan app-api:openapi` writes it to a file. The table below is the overview.

All paths are below the prefix, `/api/app` by default.

- *session/token*: 401 without.
- *confirmation*: Statamic's elevated session, 423 `elevation_required` without. See
  [Sessions, confirmation and tokens](/app-api/sessions#confirmation-elevated-session).
- *team header*: the team named in the header; 403 `not_member` for a team the user is not in,
  whether it exists or not.

## Session

| Method | Path | Needs | |
| --- | --- | --- | --- |
| GET | `/` | | Active areas, team header, CSRF cookie path. |
| GET | `/openapi.json` | | This description. |
| POST | `/session/login` | | Statamic's login. `{two_factor: true}` when a code follows. |
| POST | `/session/two-factor` | | Code or recovery code. |
| POST | `/session/two-factor/setup` | confirmation | Start the 2FA setup (Statamic's action): secret, QR (SVG), confirm URL. |
| POST | `/session/two-factor/confirm` | confirmation | Confirm with a code; answers the recovery codes. |
| DELETE | `/session/two-factor` | confirmation | Switch 2FA off. |
| GET, POST | `/session/two-factor/recovery-codes` | confirmation | Show or renew the recovery codes. |
| GET | `/session/passkey/options` | | WebAuthn options. |
| POST | `/session/passkey` | | Passkey login. |
| POST | `/session/register` | | Statamic's registration, signs in. 201. |
| POST | `/session/logout` | session/token | Ends the session. 204. |
| GET | `/me` | session/token | The user. |
| POST | `/password/forgot` | | Reset mail through Statamic's broker. 202, the same for unknown addresses. |
| POST | `/password/reset` | | New password with the mailed token. |
| GET | `/session/elevation` | session/token | Elevated or not, and how this user confirms. |
| POST | `/session/elevation` | session/token | Confirm with `password`, `verification_code` or a passkey assertion. |
| POST | `/session/elevation/code` | session/token | Mail a code (accounts without a password). |
| GET | `/session/elevation/passkey-options` | session/token | WebAuthn options for confirming. |

## Account

Needs [Accounts](/accounts/).

| Method | Path | Needs | |
| --- | --- | --- | --- |
| GET | `/account` | session/token | Confirmation, pending change, deletion, blockers. |
| POST | `/account/verification` | session/token | Send the confirmation mail again. 202. |
| POST | `/account/email` | confirmation | Change the address (confirmed by mail). 202. |
| DELETE | `/account/email` | session/token | Withdraw it. |
| POST | `/account/deletion` | confirmation | Schedule the deletion. 202, or 409 `deletion_blocked` with `details.blockers`. |
| DELETE | `/account/deletion` | session/token | Withdraw it. |
| POST | `/account/export` | confirmation | Build the export, answer a signed `download_url`. 201. |
| GET | `/account/export/{export}` | session/token | The file, once, for its owner. |

## Teams

Needs [Teams](/teams/).

| Method | Path | Needs | |
| --- | --- | --- | --- |
| GET | `/teams` | session/token | Teams with role, `current_team_id`. |
| POST | `/teams` | session/token | Create a team. 201. |
| GET | `/teams/current` | team header | The team of this request. |
| PUT | `/teams/current` | session/token | Switch (`team`: id or uuid). |
| POST | `/teams/join` | session/token | Join with `code`. |
| GET | `/teams/invitations/{token}` | | What an invitation is for. |
| POST | `/teams/invitations/{token}/accept` | session/token | Accept it. |
| GET | `/teams/{team}` | session/token | One team with role and permissions. |
| GET | `/teams/{team}/members` | session/token | Members. |
| PUT | `/teams/{team}/members/{user}/role` | session/token | Change a role. |
| DELETE | `/teams/{team}/members/{user}` | session/token | Remove a member. 204. |
| POST | `/teams/{team}/leave` | session/token | Leave. 204. |
| GET | `/teams/{team}/invitations` | session/token | Pending invitations. |
| POST | `/teams/{team}/invitations` | session/token | Invite (`email`, `role`). 201, with the link. |
| DELETE | `/teams/{team}/invitations/{invitation}` | session/token | Withdraw. 204. |
| POST | `/teams/{team}/join-code` | session/token | New join code. |

## Access

Needs [Entitlements](/entitlements/).

| Method | Path | Needs | |
| --- | --- | --- | --- |
| GET | `/access` | team header | Products and quotas, user and team. |
| GET | `/access/products/{product}` | team header | `allowed`, with the decision for user and team. |
| GET | `/access/quotas/{key}` | team header | One quota for user and team (`?current=` for stock limits). |

## Checkout

Needs [Payments](/payments/); offers need [Offers](/offers/).

| Method | Path | Needs | |
| --- | --- | --- | --- |
| GET | `/checkout/terms` | session/token | `?product=` or `?offer=`: consent text (digital content only), `consent_version`, `button_label`. |
| POST | `/checkout` | team header | Start a purchase: `product` or `offer`, `for: user` or `team`, `confirmed` accepted, `consent_version` from the terms. 201 `{checkout_url, payment}`; the same request again 200 with `reused: true`. `Idempotency-Key` narrows it; the same key with another body is 422. |
| GET | `/checkout/{payment}` | session/token | State of an own checkout. |
| POST | `/portal` | session/token | Signed link into the customer portal. 403 `email_unverified` for an unconfirmed address. |

### The order form

Before the order button, `GET checkout/terms` says what to show. For digital content (`digital`
in the catalogue of [Products](/products/) or Offers) that is the consent to an immediate start
that ends the right of withdrawal: the offer's own waiver, else the wording of Payments. For
anything else there is no consent text. The checkbox is `confirmed` (strictly accepted), and
`consent_version` is the version the form showed; a different version is 409 `consent_changed`
with the current wording in `details`.

**The order button must read "zahlungspflichtig bestellen"** or an equally unambiguous wording
(§ 312j BGB). That part is the app's.

## Tokens

Needs `areas.tokens = true` and Sanctum's migration.

| Method | Path | Needs | |
| --- | --- | --- | --- |
| GET | `/tokens` | session/token | Own tokens. |
| POST | `/tokens` | confirmation | New token; `plain_text_token` only in this answer. 201. |
| DELETE | `/tokens/{token}` | session/token | Revoke. 204. |
