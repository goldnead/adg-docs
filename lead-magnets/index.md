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
activates once**. That is not a check in PHP, it is one conditional statement in the database:

```php
$changed = Grant::query()
    ->whereKey($grant->getKey())
    ->where('state', GrantState::PENDING)
    ->update([
        'state' => GrantState::ACTIVE,
        'confirmed_at' => $confirmedAt,
        'expires_at' => $expiresAt,
        'token_hash' => null,
        'updated_at' => $confirmedAt,
    ]);

if ($changed !== 1) {
    return false;
}
```

It holds against a double-clicked link, a mail scanner prefetching the URL, a queue retry and
two web workers at once, because there is no window between reading the state and writing it.

## It carries its own grant state, and that is a deviation

The platform's target architecture puts grants in a package of their own,
`goldnead/statamic-entitlements`, and has every consumer read them from there. When this addon
was built, that package did not exist: it was deferred until a second consumer justified
designing the shared abstraction.

So this addon owns `pending`, `active`, `revoked` and `expired` itself.

| | |
| --- | --- |
| **The cost** | When entitlements arrives there are two grant models and a migration between them |
| **The benefit** | The addon exists, and it is exactly the second consumer entitlements was waiting for |
| **The alternative** | Build entitlements first, which designs the abstraction before the second real use case |

That is stated here rather than buried, because it is the kind of decision that looks like an
oversight to the next reader. [Grant state](/lead-magnets/grant-state) has the full account,
including what the local model deliberately does not do and what a future migration would have
to move.

[Entitlements](/entitlements/) has since been built. The bridge between the two has not, and
this package still does not require it.

## It runs with none of its siblings

Five optional integrations, each detected with `class_exists()` on the one class the bridge
actually calls, each switchable in config. None is a Composer requirement.

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
