# Audit trail and pruning

<AddonHeader />

Every refusal and every opening of a file is written to one table. A pile of `no_access` is
either somebody probing or a checkout whose grant did not arrive, and without the row neither
shows.

## The table

`private_media_access_log`, renamed with [`audit.table`](/private-media/configuration#audit)
before migrating.

| Column | |
| --- | --- |
| `user_id` | the signed-in user's id, a string without a foreign key |
| `resource` | the resource slug from the link |
| `path` | the requested path |
| `allowed` | `true` only for `served` |
| `reason` | `served`, or one of the [refusal codes](/private-media/security#refusal-codes) |
| `delivery` | `stream` or `redirect`, for a served request |
| `range` | the `Range` header, if any |
| `ip_address`, `user_agent` | from the request |
| `created_at` | |

`user_id` is a string without a foreign key because a Statamic user may be a flat file, and a
deleted user's trail should outlive the user.

## What is written, and what is not

- **Refusals, always**, as long as somebody is signed in.
- **Anonymous refusals go to the log, not the table.** Without a signed-in user only
  `signature` and `unauthenticated` can happen, anybody can send those as often as the
  [throttle](/private-media/configuration#routes) allows, and a row each would let an anonymous
  caller fill the database. The log line carries the reason, resource, path and IP.
- **The opening of a playback.** A player asks for a file in many byte ranges; only the request
  without a range or starting at byte 0 is written, unless `audit.log_ranges` is on.
- **Nothing at all** with `audit.enabled` off. The events still fire.

## Events

| Event | Payload | When |
| --- | --- | --- |
| `MediaServed` | `$user`, `$resource`, `$path`, `$delivery`, `$opening`, `$range` | every served request, range continuations included |
| `MediaRefused` | `$user`, `$resource`, `$path`, `$reason` | every refusal |

Count views on `$opening`, not on the event. For `wrong_user`, `$user` is whoever was signed
in, not the link's owner. Where the source site wrote an activity entry on a download, a site
listens to `MediaServed`.

## Pruning

```php
Schedule::command('private-media:prune')->daily();
```

Deletes rows older than `audit.retention_days` (90), in chunks of a thousand so a table that
was never pruned does not lock for minutes. `--days=` overrides the retention for one run;
anything below one day is refused.

```bash
php artisan private-media:prune --days=30
```
