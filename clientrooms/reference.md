# Reference

<AddonHeader />

## Facade

`Goldnead\ClientRooms\Facades\ClientRooms`

| Method | Returns | Notes |
| --- | --- | --- |
| `open(string\|object $who, ?string $ownerUserId = null, array $attributes = [])` | `ClientRoom` | Address, LeadHub contact, or any object with an `email`. Idempotent; reopens a closed room. `$attributes`: `name`, `brand_id`, `contact_id`, `notes`, `meta`. |
| `close(ClientRoom\|int $room)` | `ClientRoom` | No-op on a closed room. |
| `reopen(ClientRoom\|int $room)` | `ClientRoom` | The same as `open()` on its address and brand. |
| `forEmail(string $email)` | `?ClientRoom` | Open or closed, in the current brand. |
| `forUser(?User $user)` | `?ClientRoom` | By the Statamic user's address. |
| `find(string $email, int $brandId)` | `?ClientRoom` | Across the brand scope, by explicit brand. |
| `addTask($room, string $title, ?DateTimeInterface $dueAt = null, ?string $createdBy = null)` | `ClientRoomTask` | Empty title throws `InvalidArgumentException`. |
| `completeTask($task, ?string $doneBy = null)` | `ClientRoomTask` | Idempotent; the event fires once. |
| `reopenTask($task)` | `ClientRoomTask` | |
| `attach($room, UploadedFile $file, ?string $title = null, bool $visibleToClient = true, ?string $uploadedBy = null)` | `ClientRoomFile` | Throws `RuntimeException` when the container is missing. |
| `downloadUrl(ClientRoomFile $file)` | `string` | Signed, expires after `download_ttl_minutes`. |
| `timeline($room, ?int $limit = null)` | `array` | `mode`, `entries`, `sources`, `failed`, `stats`, `total`. |
| `files()` | `RoomFiles` | The container helper. |

User arguments (`$ownerUserId`, `$createdBy`, `$doneBy`, `$uploadedBy`) accept a Statamic
user id or an e-mail address; both are resolved to the id.

## Events

| Event | Payload | When |
| --- | --- | --- |
| `Goldnead\ClientRooms\Events\ClientRoomOpened` | `room`, `reopened` (bool) | First opening, and every reopening. Not on `open()` of an open room. |
| `Goldnead\ClientRooms\Events\ClientRoomClosed` | `room` | On the transition only. |
| `Goldnead\ClientRooms\Events\ClientRoomTaskCompleted` | `room`, `task` | Once per task. |

## The listener

`Goldnead\ClientRooms\Listeners\OpenRoomOnPayment` handles
`Goldnead\StatamicPayments\Events\PaymentPaid`. Registered by class name, so it costs nothing
where Payments is absent. See [What a room is](/clientrooms/concepts#how-a-purchase-opens-a-room)
for the matching rules.

## The tag

`{{ client_room }} … {{ /client_room }}` — the signed-in user's open room. No user, no room,
or a closed room: the block parses once with `no_results`.

| Variable | |
| --- | --- |
| `id`, `name`, `email`, `status`, `opened_at` | The room. `name` falls back to the address. |
| `owner_name` | The owner's display name, or null. |
| `notes_for_client` | `client_notes`. Internal notes are never yielded. |
| `tasks` | `id`, `title`, `due_at`, `done`, `done_at` |
| `files` | `id`, `title`, `filename`, `url` (signed), `uploaded_at` — visible files only |

`{{ client_room:exists }}` — `true` when the signed-in user has an open room. Use it inside
a condition: `{{ if {client_room:exists} }} … {{ /if }}`.

The starter view is `statamic-clientrooms::room`
(`resources/views/room.antlers.html`), publishable with `--tag=statamic-clientrooms-views`.

## Routes

### Control Panel

All under `/cp/client-rooms`, all behind `can:view client rooms`; the write routes also
behind `can:edit client rooms`. Route names are `client-rooms.*`.

| Method | Path | Name |
| --- | --- | --- |
| GET | `/` | `index` — Inertia page, or the listing JSON with `Accept: application/json` |
| POST | `/` | `store` — `email` (required), `name`, `owner_user_id` |
| GET | `/{room}` | `show` |
| PATCH | `/{room}` | `update` — `name`, `owner_user_id`, `notes`, `client_notes` |
| POST | `/{room}/close`, `/{room}/reopen` | `close`, `reopen` |
| POST | `/{room}/tasks` | `tasks.store` — `title`, `due_at` |
| PATCH | `/{room}/tasks/{task}` | `tasks.update` — `done` (bool) |
| DELETE | `/{room}/tasks/{task}` | `tasks.destroy` |
| POST | `/{room}/files` | `files.store` — multipart `file` (≤ 50 MB), `title`, `visible_to_client` |
| PATCH | `/{room}/files/{file}` | `files.update` — `visible_to_client`, `title` |
| DELETE | `/{room}/files/{file}` | `files.destroy` — removes the asset too |
| GET | `/{room}/files/{file}/download` | `files.download` — the coach's download |

`{room}`, `{task}` and `{file}` are integers resolved through the brand-scoped query. A task
or file of another room, or a room of another brand, answers 404.

### Web

| Method | Path | Name | Middleware |
| --- | --- | --- | --- |
| GET | `/!/statamic-clientrooms/files/{file}` | `statamic-clientrooms.download` | `signed` |

| Code | When |
| --- | --- |
| `200` | Signature valid, file visible, room open — the file, `Cache-Control: private, no-store` |
| `403` | Signature missing, tampered or expired |
| `404` | File hidden again, room closed, row or asset gone |

## Listing JSON

`GET /cp/client-rooms` with `Accept: application/json`:

| Parameter | |
| --- | --- |
| `search` | Matches name and address |
| `status` | `open` or `closed` |
| `sort` | `name`, `email`, `status`, `open_tasks`, `last_activity_at` (default), `opened_at`, `brand` |
| `order` | `asc` or `desc` (default) |
| `perPage` | Statamic's usual |

Rows carry `id`, `name`, `has_name`, `email`, `status`, `status_label`, `is_open`,
`open_tasks`, `last_activity_at`, `last_activity_human`, `opened_at`, `opened_human`,
`brand`, `show_url`. `meta.columns` is present on every response.

## Console

| Command | |
| --- | --- |
| `php please clientrooms:install` | Creates the asset container on the configured disk if it does not exist. Safe to repeat. |

## Storage

### `client_rooms`

| Column | Type | |
| --- | --- | --- |
| `brand_id` | unsigned bigint, default 0 | Zero on a single-brand install |
| `contact_id` | unsigned bigint, nullable | LeadHub's contact |
| `email` | string(191) | Normalised; unique with `brand_id` |
| `name` | string(191), nullable | |
| `owner_user_id` | string(64), nullable | Statamic user id |
| `status` | string(16) | `open`, `closed` |
| `opened_at`, `closed_at`, `last_activity_at` | timestamp, nullable | |
| `notes`, `client_notes` | text, nullable | |
| `meta` | json, nullable | `opened_by`, `payment_id`, `product` when opened by a purchase |

### `client_room_tasks`

`room_id` (cascade), `title`, `due_at`, `done_at`, `done_by`, `created_by`, `position`.

### `client_room_files`

`room_id` (cascade), `container`, `path`, `title`, `visible_to_client` (default true),
`uploaded_by`.

## Config keys

| Key | Default | |
| --- | --- | --- |
| `container` | `clientrooms` | Asset container handle |
| `disk` | `local` | Disk the container is created on |
| `open_on_product_types` | `['sessions']` | Product kinds that open a room |
| `open_on_products` | `[]` | Product handles that open a room |
| `default_owner` | `null` | User id or address for automatically opened rooms |
| `download_ttl_minutes` | `30` | Lifetime of a client's download link |
| `timeline_limit` | `100` | Entries shown at most |

## Publish tags

`statamic-clientrooms` (the CP bundle), `statamic-clientrooms-config`,
`statamic-clientrooms-migrations`, `statamic-clientrooms-views`.
