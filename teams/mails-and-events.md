# Mails and events

<AddonHeader />

## Mails

| Key (`mail.*`) | Template slug | To | Default |
| --- | --- | --- | --- |
| `invitation` | `teams-invitation` | the invited address | on |
| `member_joined` | `teams-member-joined` | the team's owners | on |
| `member_removed` | `teams-member-removed` | whoever was removed by someone else | on |
| `role_changed` | `teams-role-changed` | the member | off |

With [Email Templates](/email-templates/), the Control Panel entry wins. Without it, or before
`php please teams:mail-templates` has run, the shipped text (`lang/*/mail.php`) is sent. The
variables of each mail are listed on the wiring screen.

With an Email Templates version that has the template registry (2.8 and later), each mail is
registered there with its occasion, event, placeholders and default text: the template list
shows "Sent on: Teams: …" and Live Preview fills in the examples. Older versions get the
defaults through the `email-templates.sources` import tag instead.

## Events

Every event extends `Goldnead\Teams\Events\TeamEvent` with a stable `handle()` and a
`payload()` of ids and plain fields: no tokens, no join codes.

| Handle | |
| --- | --- |
| `teams.team.created` | |
| `teams.team.updated` | |
| `teams.team.deleted` | |
| `teams.team.ownership_transferred` | |
| `teams.member.joined` | `via`: `created`, `added`, `invitation`, `join_code` |
| `teams.member.left` | `reason`: `left`, `removed` |
| `teams.member.role_changed` | |
| `teams.invitation.sent` | |
| `teams.invitation.accepted` | |
| `teams.invitation.revoked` | |

With [Automations](/automations/) each is a trigger (group "Teams"), with
[Webhook Manager](/webhook-manager/) a webhook trigger (source type `team`), with
[Activity](/activity/) an entry under the subject `team:<id>`. Each integration can be switched
off under `integrations.*`.

**Users → Teams → Wiring** shows, per event, its mail and how many enabled automations and
webhooks listen to it.
