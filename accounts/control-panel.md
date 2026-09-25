# The Control Panel

<AddonHeader />

Two screens under **Users → Accounts**, both behind `view accounts`.

## Customers

Every account with its confirmation state and, where there is one, a scheduled or blocked
deletion with its date. A blocked deletion has its own badge. The list shows at most 1000
accounts, ordered by address.

The overview is also reachable from core's **Users** listing, through the row action
**Customer overview**.

## The customer overview

One person on one screen: the account, payments, subscriptions, access grants, teams and the
latest activity entries, each section present when its addon is installed.

| Action | Needs |
| --- | --- |
| Send the confirmation link | `manage accounts` |
| Mark as confirmed | `manage accounts` |
| Schedule a deletion | `delete users` (core); a super admin only by a super admin |
| Withdraw a deletion | `manage accounts` |
| Export the data | `export account data` |
| Sign in as | `impersonate users` (core) |

A deletion scheduled here follows the same path as one the customer asked for: grace
period, mail, the daily purge. See [Deleting an account](/accounts/deletion).

## Sign in as

"Sign in as" runs core's own `Statamic\Actions\Impersonate`: the same permission, the same
elevated session, the same "Stop impersonating". This addon adds two things:

- **Every start and end is recorded**, from the overview and from core's user listing, in
  [Activity](/activity/), or in the application log without it.
- **While it lasts, the customer is the actor.** With
  [Identity Contracts](/identity-contracts/) installed, the customer is reported as the actor
  with `meta.impersonated_by` set to the admin, so every addon that records an actor shows who
  really acted.

While an impersonation is active, the customer's own decisions (address, deletion, export)
answer 403. Put `{{ accounts:impersonating }}` in the site layout so it is visible who is
signed in. See [Tags and forms](/accounts/frontend).

A customer without Control Panel access lands on `impersonation.redirect`.

## Wiring

**Users → Accounts → Wiring** shows what is connected, so nobody has to read the code to find
out:

- every event, its mail template (your own entry or the shipped text),
- how many automations and webhooks listen to it,
- which sibling addons are installed,
- which export contributors are registered.
