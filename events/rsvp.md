# RSVP and programme

<AddonHeader />

Two additions of 2.8.0: signed-in visitors can answer whether they are coming, and every event
can carry a programme, a list of times and titles.

## RSVP

**Off by default.** Nothing changes for an install that leaves it off: the tag reports nothing
and every write is refused.

```php
// config/events.php
'rsvp' => [
    'enabled' => true,
],
```

Run `php artisan migrate` once: it adds the `event_rsvps` table.

One answer per account and event, unique per event and account:

| Status | |
| --- | --- |
| `going` | |
| `interested` | |
| `not_going` | |

### The service

```php
$rsvps = app(\Goldnead\Events\Rsvps::class);

$rsvps->toggle($event, $user);          // going, and again to take it back
$rsvps->set($event, $user, 'interested');
$rsvps->remove($event, $user);
$rsvps->counts($event);                 // numbers, public
$rsvps->list($event, $viewer);          // names, only with `manage events`
$rsvps->statusFor($event, $user);       // that account's own answer
```

### Who may do what

All three rules are in one policy, and every write goes through it, so a controller, a tag or
another addon cannot skip it.

- **Answering** needs a signed-in account and an event the account may read: published and not
  private. A draft or a private event is refused like an unknown one, so an RSVP cannot confirm
  that it exists. Anything else throws `AuthorizationException`.
- **Seeing who answered** is for those who run the calendar: `manage events`.
- **Everyone else gets the numbers**, never the names.

The counts are computed from the rows, not stored in a counter column.

### The tag

```antlers
{{ events:rsvp event="{ id }" }}
  {{ if enabled }}
    {{ going }} going, {{ interested }} interested
    {{ if can_respond }} … {{ /if }}
    {{ if status }}You answered {{ status }}.{{ /if }}
  {{ /if }}
{{ /events:rsvp }}
```

It gives one row: `enabled`, `can_respond`, `status` (the visitor's own answer, empty for
guests or without an answer), `going`, `interested` and `not_going`. It never names anybody. With
RSVP switched off, or for an event the visitor may not read, `enabled` is false and the rest is
empty. The tag only reads: the form that posts an answer is your template and your controller,
calling `Rsvps`.

### Deleting an account

The addon does not know [Accounts](/accounts/), so it ships no erasure contributor
(`composer.json` only suggests it). When an account is deleted, call
`Rsvps::eraseFor($user)` from your own code; it forgets every answer the account gave and returns
how many it removed. Deleting an event deletes its answers.

## The programme

Every event has an optional `program`: a list of rows, each with a `time` and a `title`
(required, up to 255 characters). In the Control Panel it is a grid in the event form. In code it
is `$event->program` on the `Event` model. The `{{ events }}` tag does not put it in its row,
so a template needs it from your own code, for example `$event->program` handed to the view.
