# Roles, invitations, codes

<AddonHeader />

| | |
| --- | --- |
| **Team** | `Goldnead\Teams\Models\Team`: `id`, `uuid`, `name`, `type` (`team`, `personal`, or your own), `owner_id`, `join_method` (`invitation_only` or `join_code`), `join_code`, `settings`, `billing`. |
| **Membership** | One user in one team: `role`, `meta` (free fields, e.g. a voice part), `is_current`, `joined_at`. Users are stored by string key, so uuids (file users) and integers (Eloquent) both work. |
| **Invitation** | Addressed to an email, with a role and `meta` copied onto the membership. Expires (7 days by default), is bound to its address, works once. Inviting the same address again replaces the link. |
| **Role** | Starts from `teams.roles`, changed in the Control Panel, and a team can add or adjust its own. `owner` holds every permission and cannot be taken from the last owner. See [Managing roles](/teams/roles). |

## Roles

Three ship with the package:

| Role | Permissions |
| --- | --- |
| `owner` | `*` |
| `admin` | `invite members`, `remove members`, `change roles`, `update team`, `view billing`, `manage billing` |
| `member` | none |

Add your own permissions to `teams.permissions` or with `Teams::registerPermission()` and check
them with `Teams::can($user, $team, 'your permission')`. Roles are created and changed in the
Control Panel, globally or for one team, for example a section leader who may invite. See
[Managing roles](/teams/roles).

## Nobody hands out more than they hold

Whoever assigns a role, invites into it or removes someone holding it must hold every
permission of that role. A role with `*`, and the owner role, only an owner can hand out.
Changing one's own role, and demoting or removing an owner, is an owner's business. The
last-owner check runs inside the write's transaction with the owner rows locked. The same rule
covers editing someone else's membership fields (`updateMemberMeta`).

## An invitation grants what its sender may still give

On acceptance, the person who invited must still be in the team and hold every permission of
the invited role. If not, the invitation is not refused, because the invitee acted in good
faith, but it grants only `default_role`; the team can raise it later. Invitations from the
Control Panel or an import have no sender and keep their role.

**Nobody is put into a team without consent.** The Control Panel and the front end invite,
they do not add. `Teams::addMember()` exists for code that has its own consent: an import, a
checkout.

The link in the mail opens `/teams/invitations/{token}`. A guest is sent to
`invitations.login_url` first. Accepting is a POST from that page, so a mail scanner that
follows the link accepts nothing.

## Join codes

A team with `join_method = join_code` can be joined with its code. Codes are drawn from an
alphabet without look-alike characters (no `0`/`O`, `1`/`I`/`L`), are normalised on input, and
can be regenerated at any time. Joining by code is limited to 10 attempts per hour per account
and 30 per address (`routes.join_limits`).

A site can refuse a join for its own reasons, a full team for example:

```php
Teams::guardJoining(function (Team $team, string $userKey, string $via): ?string {
    return $team->members()->count() >= 40 ? 'team_full' : null;   // a reason refuses, null allows
});
```

## Personal teams and read-only teams

`Teams::personalTeam($user)` creates a team of type `personal` on first use; with
`personal.create_on_registration` one is created on Statamic's registration. There is one per
user, and nobody else can be invited into it or join it (`personal_team`).

A team whose `settings.read_only` is true answers writes behind `teams.writable` with 423, for
a team that has stopped paying, for instance.
