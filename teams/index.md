# Teams

<AddonHeader />

Workspaces with members. A team is a choir, a company, a household: people are in it with a
role that counts in that team only, they come in by invitation link or join code, and access
or a purchase can belong to the team instead of one person.

Works with Statamic's file users and Eloquent users alike.

## What it is

- **Teams and memberships** with a role and free `meta` per member (a voice part, a
  department), invitations whose token is stored only as a hash, and join codes that survive
  being read aloud. See [Roles, invitations, codes](/teams/concepts).
- **Roles and permissions per team**, not global. Statamic's roles stay for the Control Panel.
  Roles are managed in the Control Panel, globally or for one team. See
  [Managing roles](/teams/roles).
- **The current team of a request**: the `teams.current` middleware reads it from a header,
  the query, the body or the route and checks that the user is in it. See
  [The current team](/teams/current-team).
- **A team holds access and buys.** It is a subject in [Entitlements](/entitlements/): access
  granted to the team holds for every member and ends when they leave. It is the buyer in
  [Payments](/payments/), with its own billing address. See
  [Access and purchases](/teams/access-and-payments).
- **Antlers tags and forms** for the usual account pages. See [Tags and forms](/teams/frontend).
- **Four mails and thirteen events**, each mail an Email Templates slug, each event a trigger in
  Automations and Webhook Manager and an entry in Activity. See
  [Mails and events](/teams/mails-and-events).
- **Personal team per user** (optional), read-only teams, and an import with fixed ids for
  moving an existing app. See [Importing teams](/teams/import).

## What it is not

- **Not a Control Panel permission system.** Team roles decide what someone may do *in a
  team*. Who may open the Control Panel is still Statamic's roles.
- **Not tenancy.** Teams do not partition content or brands; that is
  [Brand Context](/brand-context/). A team is a group of users that holds things together.
- **Not a checkout.** `Teams::checkout()` hands the team's billing details to Payments; the
  till is Payments.

## How it fits

```
owner → Teams::invite() / {{ teams:invite_form }}
          → mail with a link (token stored as sha256)
invitee → /teams/invitations/{token} → POST accept
          → member with the invited role, TeamMemberJoined

request → teams.current (X-Team-ID, team_id, {team})
          → 403 stranger, 422 two different teams
          → Teams::current()

Entitlements::allows($user, 'plan')      counts the user's teams (subject expander)
Teams::checkout($team, 'plan', $payer)   Payments, for: team, billing from the team
```

## Limits in this release

- **A team's grants stay when the team is deleted.** Revoke them in Entitlements first if they
  should end with it.
- **The VAT ID on a team is not verified by Teams.** With [Invoices](/invoices/) installed the
  checkout asks its VIES check and freezes the answer on the payment; without it, no check is
  claimed.

## Next

- [Installation](/teams/installation)
- [Configuration](/teams/configuration)
- [Roles, invitations, codes](/teams/concepts)
- [The current team](/teams/current-team)
- [Tags and forms](/teams/frontend)
- [Access and purchases](/teams/access-and-payments)
- [Mails and events](/teams/mails-and-events)
- [Importing teams](/teams/import)
- [Reference](/teams/reference): facade, refusals, tables, permissions
