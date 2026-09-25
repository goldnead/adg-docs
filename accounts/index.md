# Accounts

<AddonHeader />

The account features Statamic leaves to you: email verification, changing the address,
deleting the account with a grace period, a personal data export, and a customer overview
in the Control Panel.

Login, registration, the profile and password forms, password reset, two-factor
authentication, passkeys, OAuth, elevated sessions and impersonation are Statamic's own.
This addon replaces none of them. It adds what core does not have, and it works with
Statamic's file users and with Eloquent users (integer or uuid ids).

## What it is

- **Email verification** for frontend users: a signed link, a "send again" form, and the
  `accounts.verified` middleware that holds unconfirmed users back. See
  [Tags and forms](/accounts/frontend).
- **Changing the address** with confirmation: the new address is active only after its
  link is opened, and the old one is told.
- **Deleting the account** with a grace period, 14 days by default. The customer can
  withdraw until then. A daily run deletes the account **and what every addon holds about
  the person**, keeps what the law says must be kept (payments, invoices), and records
  which was which. See [Deleting an account](/accounts/deletion).
- **A personal data export** (GDPR Art. 15 and 20): a ZIP with one JSON file per addon. See
  [The data export](/accounts/export).
- **A customer overview** in the Control Panel: payments, subscriptions, access grants,
  teams and history of one person on one screen, with "Sign in as" through core's
  impersonation. See [The Control Panel](/accounts/control-panel).
- **Ten events**, each an automation trigger and a webhook trigger where those addons are
  installed. See [Events](/accounts/events).
- **Six mails**, each an Email Templates slug with a shipped default. See
  [Mails](/accounts/mails).

## What it is not

- **Not a login system.** Sign-in, registration, passwords, two-factor and passkeys stay
  with Statamic. The confirmation step before a sensitive action is core's elevated
  session.
- **Not a retention policy engine.** What each addon deletes or keeps is decided by that
  addon's eraser. This addon runs them in one transaction and records the outcome.
- **Not a team manager.** Teams are [statamic-teams](https://github.com/goldnead/statamic-teams);
  this addon shows memberships and blocks a deletion that would orphan a team.

## How it fits

```
customer → {{ accounts:delete_form }}        elevated session first (core)
  → AccountDeletionRequested, mail with a withdraw link
     … grace period …
accounts:purge (daily 03:40)
  ├─ something in the way (subscription, sole team owner)
  │    → blocked, one mail, AccountDeletionBlocked, retried daily
  └─ one transaction:
       every eraser → AccountDeleting → user deleted → AccountDeleted
       payments and invoices kept, the request row keeps the record

admin → Accounts → Customers → overview       payments, grants, teams, history
      → Sign in as                              core's impersonation, recorded
```

## Limits in this release

- **Team grants stay when a team is deleted.** When a deletion removes a team the person
  held alone, the team's access grants in Entitlements are not revoked with it.
- **The moment a Stripe subscription ends under the `cancel` policy has not been checked
  against Stripe itself.** It goes through Payments' own `Subscriptions::cancel()`, which
  is tested; the provider's side is not.
- **The customer list shows at most 1000 accounts.**

## Next

- [Installation](/accounts/installation)
- [Configuration](/accounts/configuration)
- [Tags and forms](/accounts/frontend)
- [Deleting an account](/accounts/deletion)
- [The data export](/accounts/export)
- [Events](/accounts/events)
- [Mails](/accounts/mails)
- [The Control Panel](/accounts/control-panel)
- [Reference](/accounts/reference): PHP API, routes, permissions, table
