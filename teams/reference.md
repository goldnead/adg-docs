# Reference

<AddonHeader />

## The facade

Everything goes through `Goldnead\Teams\Facades\Teams` (root: `Goldnead\Teams\TeamsManager`).
These are the operations [App API](/app-api/) exposes as JSON.

Methods that change something take an optional `$actor`. With an actor (the signed-in user),
the actor's role in the team must allow it. Without one the call is trusted: Control Panel,
console, import. `$user` is anything that names a user: a Statamic user, an Authenticatable, or
its id.

```php
use Goldnead\Teams\Facades\Teams;

// Teams
Teams::create(string $name, $owner = null, array $attributes = []): Team   // type, join_method, settings, billing, meta
Teams::update(Team $team, array $attributes, $actor = null): Team          // name, join_method, settings (merged), billing (merged)
Teams::delete(Team $team, $actor = null): void
Teams::find(int|string $idOrUuid): ?Team
Teams::personalTeam($user): Team                                          // created on first use
Teams::regenerateJoinCode(Team $team, $actor = null): string
Teams::transferOwnership(Team $team, $to, $actor = null): Team            // old owner becomes admin

// Members
Teams::teamsOf($user): Collection
Teams::members(Team $team): Collection                                   // of Membership
Teams::addMember(Team $team, $user, ?string $role = null, array $meta = [], $actor = null): Membership
Teams::removeMember(Team $team, $user, $actor = null): void               // actor === user means leaving
Teams::leave(Team $team, $user): void
Teams::changeRole(Team $team, $user, string $role, $actor = null): Membership
Teams::updateMemberMeta(Team $team, $user, array $meta, $actor = null): Membership  // null removes a key

// Current team
Teams::current($user = null): ?Team
Teams::currentOrFail($user = null): Team   // or TeamsException team_required (422)
Teams::switch($user, Team $team): Membership

// Invitations and codes
Teams::invite(Team $team, string $email, ?string $role = null, array $meta = [], $actor = null): IssuedInvitation  // ->invitation, ->token, ->url
Teams::invitation(string $token): Invitation          // peek; throws if no longer usable
Teams::acceptInvitation(string $token, $user): Membership
Teams::revokeInvitation(Invitation $invitation, $actor = null): Invitation
Teams::resendInvitation(Invitation $invitation, $actor = null): IssuedInvitation
Teams::pendingInvitationsFor($user): Collection
Teams::pendingInvitationsOf(Team $team): Collection
Teams::joinByCode(string $code, $user, array $meta = []): Membership
Teams::guardJoining(Closure $guard): void             // fn (Team $team, string $userKey, string $via): ?string reason

// Roles
Teams::can($user, Team $team, string $permission): bool
Teams::roleOf($user, Team $team): ?string
Teams::roles(?Team $team = null): array               // scope, source, overrides_global per role
Teams::permissions(): array                            // handle => label
Teams::registerPermission(string $handle, ?string $label = null): void
Teams::createRole(string $handle, string $label, array $permissions = [], ?Team $team = null, $actor = null): array
Teams::updateRole(string $handle, array $attributes, ?Team $team = null, $actor = null): array
Teams::deleteRole(string $handle, ?Team $team = null, ?string $reassignTo = null, $actor = null): int
Teams::resetRole(string $handle): array
Teams::roleUsage(string $handle, ?Team $team = null): array

// Entitlements and payments
Teams::entitlementSubject(Team $team)                 // SubjectReference('team', id)
Teams::entitlementSubjectsFor($user): array
Teams::allows($user, string $product, $personalSubject = null): bool
Teams::checkoutBuyer(Team $team, $payer = null): array
Teams::checkoutDetails(Team $team, $payer = null): array
Teams::checkout(Team $team, string|array $products, $payer = null, ?string $returnUrl = null): ?object

// Import
Teams::import(array $data): Team
```

`Team` offers `hasMember($user)`, `roleOf($user)`, `membershipOf($user)`, `isOwner($user)`,
`isPersonal()`, `isReadOnly()`, `allowsJoinCode()`, `setting($key)` and `summary()` (the fields
events and APIs carry; never the join code).

## Refusals

A refusal is a `Goldnead\Teams\Exceptions\TeamsException` with a stable `reason` and an HTTP
`status()`:

| Reason | Status | |
| --- | --- | --- |
| `not_member` | 403 | actor or user is not in the team |
| `forbidden` | 403 | the role does not allow it |
| `already_member` | 422 | |
| `invitation_not_found` | 404 | |
| `invitation_expired`, `invitation_used`, `invitation_revoked` | 410 | |
| `invitation_wrong_email` | 403 | the account's address differs from the invited one |
| `join_code_invalid` | 404 | |
| `join_disabled` | 403 | the team does not accept codes |
| `unknown_role`, `last_owner`, `already_owner`, `personal_team`, `team_mismatch`, `team_required` | 422 | |
| `import_collision` | 409 | a fixed id belongs to another team |
| `read_only` | 423 | |
| `role_exists`, `role_protected`, `unknown_permission`, `wildcard_not_allowed`, `invalid_role_handle` | 422 | role editor |
| `role_in_use` | 409 | `details`: `members`, `invitations` |
| anything a join guard returns, e.g. `team_full` | 422 | |

## Middleware

| Alias | |
| --- | --- |
| `teams.current` | Resolves the team of the request; `:required` makes naming one mandatory. See [The current team](/teams/current-team). |
| `teams.writable` | 423 `read_only` on writes in a read-only team. |

## Tables

| Table | |
| --- | --- |
| `teams` | `id`, `uuid`, `name`, `type`, `owner_id`, `join_method`, `join_code`, `settings`, `billing` |
| `team_members` | one row per user and team: `role`, `meta`, `is_current`, `joined_at` |
| `team_invitations` | address, role, `meta`, the token as a sha256 hash, expiry, accepted or revoked |
| `team_roles` | roles a team defined for itself |
| `team_global_roles` | global roles as changed in the Control Panel; `removed` keeps a deleted config role deleted |

## Permissions

| Permission | Allows |
| --- | --- |
| `view teams` | **Users → Teams** and the wiring screen |
| `manage teams` | changes from the Control Panel |
| `manage team roles` | **Teams → Roles** and the roles panel of a team |
| `manage teams settings` | the settings section (with Brand Context) |

## Commands

| Command | |
| --- | --- |
| `php please teams:import <file> [--dry-run]` | See [Importing teams](/teams/import). |
| `php please teams:mail-templates` | Writes the four mails into the Email Templates collection. |
