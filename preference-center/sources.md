# Sources

<AddonHeader />

Every block on the page comes from a package that may or may not be installed. This addon
stores nothing of its own; it reads three sources, writes back through them, and renders
whatever it found.

| Source | Package | Provides |
| --- | --- | --- |
| `marketing` | `goldnead/statamic-marketing` | The mailing-list block, and the token door |
| `notifications` | `goldnead/statamic-notifications` | The notification matrix and the cadence block |
| `suppression` | `goldnead/statamic-suppression` | The block state |

LeadHub is a fourth participant but not a source: it lets a magic link and a session resolve
to a contact, and it receives the audit entry.

## How presence is decided

By asking the **class map**, never by reading a composer manifest. The three packages are
`suggest`, not `require`, and a host running a fork, a path repository or a `replace` still
has the classes.

Each source names one marker:

| Source | Marker |
| --- | --- |
| `marketing` | `Goldnead\Marketing\Services\SubscriptionPreferences` |
| `notifications` | `Goldnead\Notifications\Preferences\PreferenceResolver` |
| `suppression` | `Goldnead\Suppression\Contracts\Gate` |

The check is `class_exists() || interface_exists()`. The second half is not decoration: the
suppression marker is an **interface**, and `class_exists()` answers false for one. Getting
that wrong does not throw — it silently decides the package is absent and renders a page
with no block state on it.

Config is a switch, not an override:

```php
'sources' => [
    'marketing' => 'auto',      // ask the class map
    'notifications' => false,   // off, even where the package is installed
],
```

`false` turns a block off where the package is present. Nothing turns a block on where the
classes are missing, because there would be nothing to call.

## The read order is a rule

```
suppression  →  lists  →  types  →  cadence
```

Suppression is resolved first because its answer changes what the other two blocks are
allowed to show. A list the gate has closed is not offered back; a mail or digest channel is
locked off. Reading it last would mean rendering choices and then withdrawing them.

## Marketing

The mailing-list block, and the only source that also decides a route.

This source **does not reimplement Marketing's rules**. It asks `SubscriptionPreferences`
for the person's lists and hands writes back to `apply()` and `unsubscribeFromEverything()`.
The two-source read Marketing performs — the contact's own opt-out *and* the suppression
table, batched, per row, fail-closed — is the rule this page has to obey, and a second
implementation of it is a second thing to get wrong.

How the person is found depends on the door:

- **With a token**, the token addresses exactly one subscription and, through its contact,
  that person's other subscriptions in that one brand.
- **Without one**, by normalised address inside the brand that is already current, newest row
  first. An unsubscribed row and a live one can both exist for one address, and the live one
  is the person's current relationship.

### Marketing decides whether the token door exists

`/!/preference-center/t/{pcToken}` is registered **only when this source is available**. The
middleware that derives the brand from the token names a Marketing model, and a route
referring to a class that is not there would fail at the first request rather than at boot,
which is the worst of both.

The practical consequences are worth stating plainly:

- `php artisan route:list --name=preference-center` shows five routes, not seven, on a host
  without Marketing.
- A cached route table freezes that decision. Rebuild it after adding or removing Marketing.
- `PreferenceCenter::urlForToken()` returns `null` in exactly this situation, which is why a
  caller must handle `null` rather than assume a URL. See
  [Extending](/preference-center/extending).

## Notifications

The per-type, per-channel matrix and the cadence control.

Two things are decided here that the Notifications addon deliberately does not decide.

**What is locked.** `PreferenceResolver::allows()` returns `true` for a required type on
every channel before it reads anything. That is correct for a sender and useless for a form:
a cell that is on and must stay on looks exactly like a cell that is on and may be turned
off. The lock is computed in this source and enforced again in the writer, because a lock
that lives only in the view is a `disabled` attribute, and `disabled` is a suggestion the
browser makes to itself.

**What suppression does to a channel.** A blocked address gets no mail and no digest, so
those two cells lock off. `in_app` is untouched: the block is a property of a mailbox, and a
page inside the product is not one.

The channel list comes from `config('notifications.channels')`, so a host that has added a
channel gets a column for it without touching this package.

### Cadence over storage that holds two words

Notifications stores `daily` and `weekly`. There is no `immediate` and no `never` in that
addon, and inventing columns for them would have made this package the owner of a data model
it is supposed to be a view over. So the other two are expressed as the channel state they
actually describe. The mapping is in [The page](/preference-center/the-page#frequency),
together with the fifth value the control can display but never store.

### Unidentified visitors write nothing

`notification_preferences` is keyed on `user_id` and `contact_uuid`. Both are NULL for a
person who could not be placed, and a hash of two NULLs is the same hash every time — the
row would not fail, it would succeed once and then be shared by every other unplaced visitor
on the installation.

So an unidentified visitor reads defaults and writes nothing, the cells are marked
`unidentified`, and the source throws rather than storing if it is called anyway.

## Suppression

One question: may this address be mailed. It is the only source whose answer the visitor
cannot change. A bounce, a complaint or a manual opt-out survives every door into this page.

The gate resolves the brand itself. Passing one from here would let a page decide which
brand's blocks apply to it, and the brand this page runs in was already established by the
token, the signed link or the session.

Three states, and the third is not a middle:

| State | Page behaviour |
| --- | --- |
| Clear | Nothing locked |
| Blocked | Banner, mail and digest cells locked, blocked lists cannot be switched back on |
| Unavailable | The same as blocked |

`SuppressionCheckFailed` is caught and turned into the unavailable state, which
`blocksMail()` reports as blocked. Any other throwable is re-thrown. That is deliberate: the
gate is fail-closed by design, and this page respects the closure rather than converting a
database error into restored consent.

An empty or missing address is treated as blocked before the gate is asked at all. An address
we do not have cannot be cleared.

## Nothing installed

`hasLists()` and `hasTypes()` are false, the page renders one sentence, and no form control
appears. That is a real state and the correct answer for a host that has this package and
none of its sources.

The distinction between `null` and `[]` is load-bearing throughout: a block whose source is
missing is `null`, a block whose source has nothing to show is `[]`, and the page makes
different sentences out of them.

## Writes refuse an absent source

Turning a source off does not merely hide it. The writer refuses input for a source that is
not available and records `source_absent` in the refusal list, so a hand-crafted `POST`
against a block that is not on the page changes nothing and says why.
