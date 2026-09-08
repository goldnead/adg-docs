# Lead Magnets

<AddonHeader />

A visitor asks for a file, confirms their address, and receives a download link that is signed,
time-boxed, capped and audited. That flow existed on one site and was the cleanest reusable thing
in the estate, so it was lifted out rather than rebuilt a fourth time.

::: warning The Control Panel bundle is not in the repository
The built assets are attached to each GitHub release rather than committed, so an install from
a checkout has no Control Panel styling and no error to say so. See
[Installation](/lead-magnets/installation).
:::

## Confirm first, deliver once

```
POST /!/lead-magnets/request        →  grant: pending, confirmation mail sent
GET  /!/lead-magnets/confirm/{token} →  grant: active, delivery mail sent
GET  /!/lead-magnets/download/{grant} →  signed, counted, audited, streamed
```

Double opt-in is switchable per resource. A resource that needs no confirmation activates
immediately and the first two steps collapse into one.

The property that matters is at the second step: **a confirmation that arrives four times
activates once**. It is one conditional statement in the database, and since 3.0 it lives in
[Entitlements](/entitlements/):

```php
$won = Entitlement::query()
    ->whereKey($entitlement->getKey())
    ->where('status', EntitlementState::Pending->value)
    ->update([
        'status' => EntitlementState::Active->value,
        'starts_at' => $now,
        // revoked_at, revoked_reason, announced_state, updated_at
    ]) === 1;
```

It holds against a double-clicked link, a mail scanner prefetching the URL, a queue retry and
two web workers at once, because there is no window between reading the state and writing it.
Only the caller whose update changed one row proceeds, and it sends the mail.

Before that claim this package writes the access window, under the same `pending` condition,
and it deliberately does not read the winner out of that first statement's row count. Why not
is in [Grant state](/lead-magnets/grant-state#activation-is-two-statements-in-this-order), and
the short version is that the count means different things on MySQL and on SQLite.

## Access state lives in Entitlements

Until 3.0 this package owned `pending`, `active`, `revoked` and `expired` itself, because
`goldnead/statamic-entitlements` did not exist yet. [Grant state](/lead-magnets/grant-state)
has that history.

**Entitlements is a hard Composer requirement**, not an optional bridge, and it answers every
access question this package used to answer for itself. A grant row is now the delivery
record: the address, the resource, the confirmation token, the download counter and the audit
trail. Whether that address may have the file is one column in another table, read through one
API.

| | |
| --- | --- |
| **What moved** | The four states, the conditional activation, and every access decision |
| **What stayed** | The grant row, the token, the download counter, the mails, the Control Panel |
| **The link** | `lead_magnet_grants.entitlement_id`, unique, one grant to one entitlement |

Existing installs are carried across by `php artisan lead-magnets:migrate-grants`, which is
idempotent, and a second migration refuses to drop the legacy column while any grant is still
unlinked. [Grant state](/lead-magnets/grant-state) has the full account.

## It runs with none of its optional siblings

Two packages are Composer requirements: `goldnead/statamic-entitlements`, for the reason
above, and `goldnead/statamic-brand-context`. Beyond those, five optional integrations, each
detected with `class_exists()` on the one class the bridge calls, each switchable in config.

```
goldnead/statamic-leadhub          contact and tags on activation
goldnead/statamic-marketing        mailing-list subscription
goldnead/statamic-email-templates  editor-authored mail bodies
goldnead/statamic-suppression      the send gate
goldnead/statamic-activity         the ledger
```

A sixth, [Insights](/insights/what-the-family-reports#lead-magnets), is detected the same
way and takes four figures from this package when it is there.

Install none of them and the whole flow still works: the request, the confirmation over this
package's own mail, and the download. That claim is not a footnote, it is a structural test.
`tests/Feature/NoSiblingsInstalledTest.php` runs in a process where none of the five classes
exists, because none of the five is in `require` or `require-dev`.

## Where this addon stops

| Concern | Owner |
| --- | --- |
| Whether this address may have this file, and for how long | [Entitlements](/entitlements/) |
| Who the contact is, and their timeline | [LeadHub](/leadhub/) |
| Whether the address may be mailed at all | [Suppression](/suppression/) |
| Mailing lists and consent to them | [Marketing](/marketing/) |
| The wording of the two mails, authored in the CP | [Email Templates](/email-templates/) |
| Recording the four events as facts | [Activity](/activity/) |
| Which brand a resource belongs to | [Brand Context](/brand-context/) |

**A resource request is not a mailing-list opt-in.** The confirmation this package sends is
consent to receive one file. Where a resource names a list, the subscription is a separate step
that runs after activation, and the package deliberately does not borrow Marketing's double
opt-in to cover the file request.

## Not in v1

Account-based access instead of a download, which needs identity decisions this package does not
make. Follow-up sequences, which belong in Marketing. Segments. Analytics conversion events.

There are also **no Antlers tags**. The request form is hand-written HTML posting to a documented
endpoint. See [The request flow](/lead-magnets/request-flow).
