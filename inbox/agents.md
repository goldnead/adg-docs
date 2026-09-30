# For agents (CLI)

<AddonHeader />

`inbox:summary` answers *what is in the inbox?* per mailbox, for a script or an AI agent
outside the app, typically over SSH. **0.2.3+**

It is read only: it writes nothing (not even `unread`, so a summary never marks mail as
read), dispatches no events and logs nothing. The numbers come from the same query class
as the tabs in the Control Panel, so `open` here is "Offen" there.

```bash
php artisan inbox:summary                      # one line per mailbox and a total
php artisan inbox:summary --json               # counts only
php artisan inbox:summary --json --details     # plus the first five conversations per number
php artisan inbox:summary --json --wartet=14 --brand=choir
```

In a container, run it as the web user:

```bash
docker exec -u www-data -e HOME=/tmp <container> php artisan inbox:summary --json
```

| Option | Meaning |
| --- | --- |
| `--json` | JSON instead of text |
| `--details` | The first five conversations behind each number: subject, other side, age. Never a message body |
| `--wartet=7` | Days after which a conversation in "Wartet" counts as waiting too long |
| `--brand=` | Only this brand (handle or id). An unknown brand exits `1` with `{"error": "Unknown brand [x]."}` |

Without `--brand` the command covers every mailbox of every brand, and each mailbox names
its brand.

## The numbers

| Key | Meaning |
| --- | --- |
| `new` | First contacts in the "Neu" tab |
| `open` | The "Offen" tab |
| `open_unread` | Of those, unread |
| `waiting` | The "Wartet" tab: you answered last |
| `waiting_over_days` | Of those, nothing has moved for longer than `--wartet` days |
| `snoozed` | The "Geschlummert" tab |
| `snoozed_due_today` | Of those, the snooze ends before midnight in the app timezone |

`problems` reports what stops mail from arriving: the mailbox's `last_error`, per-folder
errors, and the messages the fetch gave up on (`failures_given_up`).

```json
{
  "generated_at": "2026-09-30T08:00:00+02:00", "multi_brand": true, "brand": null, "waiting_days": 7,
  "mailboxes": [{
    "id": 1, "name": "Office", "email": "office@example.com", "brand": "default", "active": true,
    "last_fetched_at": "2026-09-30T07:59:00+02:00",
    "counts": {"new": 2, "open": 5, "open_unread": 1, "waiting": 3, "waiting_over_days": 1,
               "snoozed": 2, "snoozed_due_today": 1},
    "problems": {"has_problems": false, "last_error": null, "last_error_scope": null,
                 "folder_errors": {}, "failures_given_up": 0},
    "details": null
  }],
  "totals": {"new": 2, "open": 5, "open_unread": 1, "waiting": 3, "waiting_over_days": 1,
             "snoozed": 2, "snoozed_due_today": 1, "mailboxes_with_problems": 0}
}
```

With `--details`, `details` has the same keys as `counts`, each a list of up to five
`{"id", "subject", "counterpart_email", "last_message_at", "age_days"}`.
