# Importing teams

<AddonHeader />

For moving an existing app onto Teams: `Teams::import(array $data)` or

```bash
php please teams:import teams.json [--dry-run]
```

The file is a JSON list, imported in one transaction. The import is idempotent by `uuid` and
fires no events and sends no mails.

```json
[{
  "id": 42,
  "uuid": "0b8a1c7e-2f7e-4a0e-9a54-0d1f5f7f2a11",
  "name": "Chamber Choir",
  "type": "team",
  "owner_id": "5",
  "join_code": "CHAMBER24",
  "join_method": "join_code",
  "settings": {"read_only": false},
  "billing": {"company": "Chamber Choir e.V."},
  "created_at": "2025-12-04 10:00:00",
  "roles": [{"handle": "section_leader", "label": "Section leader", "permissions": ["invite members"]}],
  "members": [
    {"user_id": "5", "role": "owner", "is_current": true},
    {"email": "alto@example.com", "role": "section_leader", "meta": {"voice_part": "alto"}}
  ],
  "invitations": [{"email": "new@example.com", "role": "member", "token": "the-token-from-the-mail", "expires_at": "2026-10-01"}]
}]
```

A plain `token` is hashed on the way in, so links already in someone's inbox keep working. An
unknown role stops the import with nothing written.

- **Only the same team is updated.** A fixed `id` held by a different team stops the import
  (`import_collision`). Without a `uuid`, the uuid is derived from the `id` (UUID v5), so a file
  with ids only imports the same way twice. An invitation token that belongs to another team is
  a collision as well. `--dry-run` checks every team, lists every problem, and writes nothing.
- **Invitation `status` is taken over.** `accepted` sets `accepted_at` (from `accepted_at`,
  `updated_at` or `created_at`), `declined` and `revoked` set `revoked_at`, `expired` sets
  `expires_at` if it is missing. An accepted or expired invitation never comes back as open; an
  open one without an end gets the standard lifetime from the day of the import. An unknown
  status is imported as withdrawn and reported.
- **A `join_method` other than `invitation_only` and `join_code`** (a "join request" flow, say)
  is imported as `invitation_only` with a warning in the report; the join code is kept.
- **On PostgreSQL**, reset the `teams_id_seq` sequence after importing fixed ids.
