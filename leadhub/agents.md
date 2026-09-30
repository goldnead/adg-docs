# For agents (CLI)

<AddonHeader />

Two read-only Artisan commands answer the questions a script or an AI agent outside the app
asks, typically over SSH: *what do we know about this person?* and *what is new and due
today?* **2.14+**

Both write nothing, dispatch no events and log no content. A lookup does not touch
`last_activity_at`, so asking about a contact is not an activity on the contact. The tests
prove it: no `INSERT`/`UPDATE`/`DELETE` in the query log, no events, no log lines, and the
flat-file store unchanged.

```bash
php artisan leadhub:kontakt "anna" --json                 # email, id, uuid or part of a name
php artisan leadhub:kontakt anna@example.com --json --timeline=10
php artisan leadhub:heute --json
```

Both take `--json` (text otherwise) and `--brand=<handle|id>`. Without `--brand`, a
multi-brand install answers for every brand and names the brand on each match or block;
on a single-brand install `brand` is `null`. An unknown brand exits `1` with
`{"error": "Unknown brand [x]."}`.

In a container, run them as the web user so nothing is written with root's ownership:

```bash
docker exec -u www-data -e HOME=/tmp <container> php artisan leadhub:heute --json
```

## `leadhub:kontakt`

| Argument / option | Meaning |
| --- | --- |
| `suche` | An email address, an id, a uuid, or part of a name, email, phone or company |
| `--timeline=20` | How many timeline entries the profile includes |
| `--json` | JSON instead of text |
| `--brand=` | Only this brand |

An exact email, id or uuid beats a name fragment. The command exits `0` for all three
outcomes, so a script can tell "nobody by that name" from a failure:

| `status` | Meaning |
| --- | --- |
| `found` | Exactly one match; `contact` holds the profile |
| `ambiguous` | Several; `matches` holds up to ten, `total` counts all, `contact` is `null` |
| `none` | No match |

```json
{
  "query": "anna",
  "status": "found",
  "brand": null,
  "total": 1,
  "matches": [
    {"id": 42, "uuid": "…", "name": "Anna Example", "email": "anna@example.com",
     "tags": ["customer"], "last_activity_at": "2026-09-29T18:02:11+02:00",
     "archived": false, "brand": null}
  ],
  "contact": {
    "id": 42, "uuid": "…", "email": "anna@example.com", "full_name": "Anna Example",
    "status": "customer", "tags": ["customer"],
    "net_revenue_cent": 12000, "purchase_count": 1,
    "brand": null, "archived_at": null,
    "revenue": [{"reference": "payments:payment:7", "amount_cent": 12000, "net_cent": 12000,
                 "currency": "EUR", "occurred_at": "…"}],
    "timeline": {
      "entries": [{"id": "…", "source": "leadhub", "kind": "…", "at": "…", "summary": "…",
                   "badge": null, "amount": null, "detail": [], "actor": null}],
      "total": 14, "sources": {"payments": true}, "failed": [], "stats": {}
    },
    "followups": [{"id": 3, "uuid": "…", "due_at": "…", "note": "…", "is_overdue": false}],
    "tasks": [{"id": 5, "title": "Send the offer", "status": "open", "due_at": "…",
               "is_overdue": false, "is_completed": false}],
    "opportunities": [{"id": 2, "title": "10-lesson pack", "value_estimate": 900.0,
                       "stage_name": "Enquiry", "pipeline_name": "Coaching", "status": "open"}]
  }
}
```

`contact` is the [`present()` shape](/leadhub/reference#facade) plus `brand`,
`archived_at`, `revenue`, `timeline`, `followups`, `tasks` and `opportunities` (the example
shortens some of them). The timeline is the merged one from the contact screen, including
payments, entitlements, booking and consent when they are installed, without CP links and
raw payloads. `tasks` and `opportunities` list open ones only and are empty while the module
is off or under the flat-file driver.

## `leadhub:heute`

New contacts of the last 24 hours and 7 days, and follow-ups and tasks due today or overdue:
per brand, a count and the first five of each list.

```json
{
  "generated_at": "…", "multi_brand": false, "brand": null,
  "brands": [{
    "brand": null,
    "new_contacts": {
      "last_24h": {"count": 2, "items": [{"id": 43, "uuid": "…", "name": "…", "email": "…",
                                           "status": "new", "created_at": "…"}]},
      "last_7d": {"count": 9, "items": []}
    },
    "followups": {
      "due_today": {"count": 1, "items": [{"id": 3, "due_at": "…", "note": "…",
                                            "contact": {"id": 42, "uuid": "…", "name": "…", "email": "…"}}]},
      "overdue": {"count": 0, "items": []}
    },
    "tasks": {
      "available": true,
      "due_today": {"count": 1, "items": [{"id": 5, "title": "…", "priority": "normal", "due_at": "…",
                                            "contact": {"id": 42, "uuid": "…", "name": "…", "email": "…"}}]},
      "overdue": {"count": 0, "items": []}
    }
  }]
}
```

## The same reads in PHP

The commands are built on four getters that the contact screen uses as well, so the screen
and the commands cannot drift apart:

| Method | Returns |
| --- | --- |
| `LeadHub::timelineFor($contact, ?int $limit = null)` | the merged timeline with `entries`, `total`, `sources`, `failed`, `stats`; `null` for an unknown contact |
| `LeadHub::followupsFor($contact)` | open follow-ups, soonest first |
| `LeadHub::tasksFor($contact, bool $openOnly = false)` | tasks, open first, then by due date |
| `LeadHub::opportunitiesFor($contact, bool $openOnly = false)` | deals with pipeline and stage names |

`$contact` is a `Contact`, an id or a uuid. An unknown contact gives `null` or `[]`, never
an exception.
