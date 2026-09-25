# Managing roles

<AddonHeader />

Since 0.3.0 roles are managed, not only configured: in the Control Panel, per team on the team
page, and through the facade.

## Three layers

| Layer | Where | |
| --- | --- | --- |
| Config | `teams.roles` | The starting point. Ships `owner`, `admin`, `member`. |
| Global, changed in the CP | table `team_global_roles` | Wins over the config role of the same handle, or adds a role. **Reset to default** drops the change. |
| One team | table `team_roles` | A role for that team only. With the handle of a global role it replaces it for that team. |

`Teams::roles($team)` returns the result, each role with `scope` (`global` or `team`),
`source` (`config`, `customised`, `cp`, `team`) and `overrides_global`.

## In the Control Panel

**Users → Teams → Roles** lists the global roles with one column per permission, a tick where
the role holds it, and how many members hold it. **Create role** and **Edit** open the core
publish form with a checkbox per permission. The row menu resets a changed config role or deletes
a role.

The team page has a **Roles** panel: every role that applies in that team, marked **Global** or
**This team**. From there a role is created for this team, a global role is adjusted for it, and
a team role is deleted (or, if it replaces a global one, taken back to the global role).

Both need the Statamic permission `manage team roles`. `manage teams` is not enough: moving
people between roles and deciding what a role may do are separate trusts.

## The rules

They hold for every caller, the Control Panel and the API alike.

- **`*` belongs to the owner role.** No other role can be given every permission. The owner role
  keeps `*` and can only be renamed.
- **Owner role and default role stay.** Neither can be deleted, and nobody is moved into the
  owner role by a deletion.
- **A role somebody holds is deleted only with a place to go.** Without `reassign_to` the
  refusal is `role_in_use` (409) with the number of members and open invitations in `details`;
  the Control Panel asks **Move members first** and offers the other roles. Deleting a team's
  version of a global role moves nobody: they get the global role back.
- **Only known permissions.** A role lists permissions from `teams.permissions` and from
  `Teams::registerPermission()`.
- **Global roles are site business.** With an actor (a signed-in member) every global call is
  `forbidden`.
- **No widening through the editor.** A member changes the roles of their team only with the team
  permission `manage team roles` (owners hold it through `*`, `admin` does not by default), and
  only within what they hold: every permission they write, and every permission of a role they
  change, replace, delete or move people into, must be theirs. Their own role is an owner's
  business. An admin with `change roles` alone cannot touch a role definition.

## Your own permissions

```php
// A service provider's boot()
Teams::registerPermission('edit scores', 'Edit scores');

// Anywhere
Teams::can($user, $team, 'edit scores');
```

The permission then shows up as a column on the roles page and a checkbox in the editor. Labels
go through the translator; the shipped ones are in `lang/*/permissions.php` under
`teams::permissions.<handle>`. Adding them to `teams.permissions` in the config works as well.

## From code

```php
Teams::createRole('section_leader', 'Section leader', ['invite members']);                 // global
Teams::createRole('treasurer', 'Treasurer', ['view billing', 'manage billing'], $team);   // this team
Teams::updateRole('treasurer', ['label' => 'Kassenwart'], $team);
Teams::deleteRole('treasurer', $team, reassignTo: 'member');                               // returns members moved
Teams::resetRole('admin');                                                                 // back to the config
Teams::roleUsage('admin');                                                                 // ['members' => 3, 'invitations' => 1]
```

With a signed-in member as the last argument (`$actor`) the rules above apply; without one the
call is trusted, as everywhere in Teams.

## Over App API

[App API](/app-api/) does not expose role management yet. An endpoint is a thin controller in
the shape of its `changeRole`: resolve the team the caller belongs to and pass the user as
`$actor`, so `manage team roles` and the no-widening rule apply. A `TeamsException` answers with
its `status()` and `toArray()` (`reason`, `message`, `details`).

## Events

`teams.role.created`, `teams.role.updated` (`changes`: `label`, `permissions`) and
`teams.role.deleted` (`reassigned_to`, `reassigned`) carry `role` (`handle`, `label`,
`permissions`, `scope`) and `team`, which is `null` for a global role. They are triggers in
Automations and Webhook Manager, entries in Activity, and rows on the Wiring page. See
[Mails and events](/teams/mails-and-events).
