# Installation

<AddonHeader />

<Requirements laravel="12.40+ / 13.x" />

```bash
composer require goldnead/statamic-teams
php artisan migrate
```

The migration creates four tables: `teams`, `team_members`, `team_invitations` and
`team_roles`. There is no scheduled task and nothing is queued.

With [Email Templates](/email-templates/) installed, write the four mails into the templates
collection once:

```bash
php please teams:mail-templates
```

## What comes with it

No other goldnead package is required. Every sibling is optional:

| Package | What it adds |
| --- | --- |
| `goldnead/statamic-entitlements` | A team is a subject; its grants and limits count for every member. |
| `goldnead/statamic-payments` | A team is the buyer, with its billing address; grant, renewals and refunds belong to the team. |
| `goldnead/statamic-invoices` | The team's VAT ID is checked at checkout (VIES) and the answer frozen on the payment. |
| `goldnead/statamic-email-templates` | The four mails editable in the Control Panel. |
| `goldnead/statamic-brand-context` | The settings page under Settings → Addon settings. |
| `goldnead/statamic-automations` | Every team event as a trigger (group "Teams"). |
| `goldnead/statamic-webhook-manager` | Every team event as a webhook trigger (source type `team`). |
| `goldnead/statamic-activity` | Every team event as an entry under the subject `team:<id>`. |
| `goldnead/statamic-accounts` | Memberships in the customer overview and the data export; deleting an account leaves or deletes the person's teams. |

## Permissions

Under **Teams** in a role's permissions:

| Permission | Allows |
| --- | --- |
| `view teams` | **Users → Teams**: the list, a team, the wiring screen |
| `manage teams` | invite, change roles, remove members, edit a team from the Control Panel |
| `manage teams settings` | the settings section (with Brand Context) |

These are Control Panel permissions. What a member may do inside a team is the team role; see
[Roles, invitations, codes](/teams/concepts).

## Publishable tags

| Tag | What it publishes |
| --- | --- |
| `teams-config` | `config/teams.php` |
| `teams-views` | The invitation page and the mail views |
| `teams-translations` | `lang/{de,en}`, including the default mail texts |
