# Configuration

<AddonHeader />

`config/teams.php`, published with:

```bash
php artisan vendor:publish --tag=teams-config
```

With [Brand Context](/brand-context/) installed, the invitation lifetime, the matching-email
rule, the join code length, the personal team on registration and the four mail switches are
editable under **Settings → Addon settings**.

## Roles and types

| Key | Default | |
| --- | --- | --- |
| `roles` | `owner`, `admin`, `member` | Label and permissions per role. See [Roles, invitations, codes](/teams/concepts#roles). |
| `owner_role` | `owner` | The role that holds everything and cannot leave a team ownerless. |
| `default_role` | `member` | For invitations without a role, and for an invitation whose sender lost the right to give its role. |
| `permissions` | the six of `admin` | Every permission a role may name. Add your own. |
| `types` | `team`, `personal` | Team types with labels. |
| `default_type` | `team` | |
| `personal.create_on_registration` | `false` | A personal team on Statamic's registration. |

## Invitations and join codes

| Key | Default | |
| --- | --- | --- |
| `invitations.expires_after_days` | `7` | |
| `invitations.require_matching_email` | `true` | The accepting account must carry the invited address, so a forwarded mail is no key to the team. |
| `invitations.accept_url` | `null` | Where the mail's link points; `{token}` is replaced. Null: `/teams/invitations/{token}`. |
| `invitations.login_url` | `/login` | Where a guest goes first; the current URL is appended as `?redirect=`. |
| `invitations.after_accept` | `/` | Where the invitation page sends somebody after accepting. |
| `join_codes.length` | `10` | |
| `join_codes.alphabet` | no `0`, `O`, `1`, `I`, `L` | Characters a code is drawn from. |

## The current team

| Key | Default | |
| --- | --- | --- |
| `current.header` | `X-Team-ID` | |
| `current.parameter` | `team_id` | Query or body field. |
| `current.route_parameters` | `['team', 'team_id']` | |
| `current.fallback_to_current` | `true` | Off: without a named team the request has none. See [The current team](/teams/current-team). |

## Everything else

| Key | Default | |
| --- | --- | --- |
| `entitlements.user_types` | `[]` | Extra subject types that name a user, for the subject expander. |
| `meta_labels` | `[]` | Labels for membership `meta` fields, e.g. `['voice_part' => 'Voice part']`. |
| `meta_value_labels` | `[]` | Labels for their values. |
| `mail.*.enabled`, `mail.*.template` | see [Mails](/teams/mails-and-events#mails) | |
| `routes.enabled` | `true` | The front-end form routes and the invitation page. |
| `routes.prefix` | `teams` | |
| `routes.middleware` | `['web']` | |
| `routes.join_limits.per_user` / `per_ip` | `10` / `30` | Attempts per hour at joining by code. |
| `integrations.*` | `true` | Automations, Webhook Manager, Activity, Entitlements, Email Templates. Read while booting. |
