# The page

<AddonHeader />

Four public URLs, no Control Panel, no Antlers tag. Everything a visitor sees comes out of
two Blade templates on a shared layout, and all of it is public: these pages are opened from
a mail client by somebody who has never signed in.

## The four URLs

| Method | URL | Route name | What happens |
| --- | --- | --- | --- |
| `GET` | `/!/preference-center/t/{pcToken}` | `preference-center.token` | The page, entered with a Marketing subscription token |
| `POST` | `/!/preference-center/t/{pcToken}` | `preference-center.token.update` | Applies a change made through that door |
| `GET` | `/!/preference-center/` | `preference-center.show` | The page, entered from a session or a followed magic link |
| `POST` | `/!/preference-center/` | `preference-center.update` | Applies a change made through that door |
| `GET` | `/!/preference-center/request` | `preference-center.request` | The "send me a link" form |
| `POST` | `/!/preference-center/request` | `preference-center.request.send` | Requests a link |
| `GET` | `/!/preference-center/link/{pcLink}` | `preference-center.link` | Spends a magic link and redirects to the page |

Seven routes, four of them `GET`, and one of those four renders nothing — the link route
opens the token, writes the session note and redirects.

An entrance that cannot establish who the visitor is answers **404**, not 403. An expired
magic link, an unknown subscription token and a session with no note behind it all produce
the same page, because distinguishing them out loud would tell an anonymous caller which
tokens exist.

## Every parameter is prefixed `pc`

`{pcToken}`, `{pcLink}`, `pcBrand`. That is not house style, it is a defence.

A `Route::bind()` is **application-wide, not per package**. A binding another addon registers
for `{token}` or `{link}` applies to every route with that parameter name in every installed
addon, including this one, and resolves it against a repository that has never heard of these
values. That is exactly how `goldnead/statamic-leadhub` 1.8.0 shipped a delete button that
did nothing.

`tests/Feature/RouteParameterCollisionTest.php` is what keeps the prefix from being tidied
away.

::: tip This applies to your application too
If you register a global `Route::bind('token', …)`, this package is unaffected. If you build
a public route of your own next to it, give its parameter a prefix for the same reason.
:::

## The blocks of the page

The page is one form with an optional second form under it. Each block is rendered only when
its source is installed, and carries a hidden `blocks[]` marker naming itself.

That marker exists because a browser omits an unchecked checkbox entirely. Without it, "the
lists block was rendered and everything in it was switched off" and "the lists block was
never on this page" arrive at the server as the same empty request. With it, an absent key
means "nothing posted for this block" and a present-but-empty one means "everything off".

### Suppression banner

Rendered above the form whenever the address is blocked, with `data-suppression="blocked"`
or `data-suppression="unavailable"`.

`unavailable` is not a third opinion between blocked and clear. It is the closed answer: when
the gate cannot be queried the page treats the address as blocked, exactly as every send path
in this family does, because the alternative is handing consent back on the strength of a
database error.

The banner says once, at the top, what a block means. The individual controls are not
silently rewritten to match it.

### `lists`

`data-block="lists"`, one row per mailing list, `data-list="{handle}"` and
`data-state="active|inactive|blocked"`.

A blocked row **stays checked and goes grey** rather than pretending the person asked for
nothing. That is the same choice Marketing made, and it is the honest one: the stored wish is
still the stored wish, even where a block means it will not be honoured.

The block is omitted entirely when Marketing is absent. When Marketing is present but the
address has no subscriptions, the block renders with a sentence saying there is no mailing
list set up for this address.

### `frequency`

`data-block="frequency"`, `data-frequency="{choice}"`, one radio per choice with
`data-choice` and `data-selected`.

Four cadences, expressed in storage that holds two of the words:

| Choice | Stored as |
| --- | --- |
| `immediate` | mail on, digest off |
| `daily` | mail off, digest on, frequency `daily` |
| `weekly` | mail off, digest on, frequency `weekly` |
| `never` | mail off, digest off |

Four distinct stored states, so the choice reads back as the choice that was made. `never`
leaves the in-app channel alone: it is a cadence for mail, and a page inside the product is
not a mailbox. Required types are not touched by any of the four, because they are not a
cadence question.

There is a fifth value the control can **display but never store**: `mixed`. The per-type
matrix can produce a state that is none of the four — some types mailed as they happen,
others collected — and defaults alone are enough to do it. The honest display for that is to
select none of the four and say so, marked `data-frequency-mixed="yes"`. Picking `weekly`
because a digest exists somewhere would put a caption on the page that its own data
contradicts.

### `types`

`data-block="types"`, one row per notification type with `data-type`, and one cell per
channel with `data-cell="{type}.{channel}"`, `data-state` and `data-reason`.

`data-state` is one of `on`, `off`, `locked-on`, `locked-off`. A locked cell also emits a
hidden input carrying its current value, so that a lock does not read as "the person cleared
this".

Three reasons a cell locks:

| `data-reason` | Meaning |
| --- | --- |
| `required` | Account security and legal notices. Not switchable on any channel |
| `blocked` | The address is suppressed, so `mail` and `digest` cannot be honoured. `in_app` is untouched |
| `unidentified` | There is no account and no contact for this address, so nothing can be stored |

The lock is computed in the source **and enforced again in the writer**. A lock that lives
only in the view is a `disabled` attribute, and `disabled` is a suggestion the browser makes
to itself.

`unidentified` deserves the explanation the page gives it. Notification preferences are keyed
on `user_id` and `contact_uuid`, both NULL for a person who could not be placed. Writing that
row would not fail — it would succeed, once, and then be shared by every other unplaced
visitor on the installation. So an unidentified visitor reads defaults and writes nothing.

### The empty state

`data-block="none"`, rendered when neither the lists block nor the types block is present.
One sentence, no form controls. It is the correct page for a host that has installed this
package and none of its sources yet.

### Unsubscribe from everything

A second, separate form below the first, `data-action="unsubscribe-all"`, rendered only when
the lists block exists and has at least one row.

It ends every mailing list of the current brand at once. Mail that does not rest on consent,
such as an order confirmation, is unaffected — this is a consent switch, not a send switch.

It is a second form rather than a button inside the first so that it cannot be reached by
accidentally submitting the page.

### The footer

`data-proof="{proof}"`, one sentence naming how the visitor got here. It is on the page for
the same reason it is in the audit record: the person changing their settings should be able
to see what the system thinks authorised them.

## What a submission answers with

Both `POST` routes redirect back to the page they came from, carrying a status line and, when
something was refused, an error bag.

The status counts **applied changes**, not posted fields. Submitting the form without
touching anything says "Nothing was changed" and adds no refusals — a page that answered a
no-op with a wall of explanations was a real defect, fixed in 1.1.0.

Refusals are grouped by reason rather than repeated per control:

| Reason | Sentence |
| --- | --- |
| `blocked` | The setting was not changed because the address is suppressed |
| `required` | The notification cannot be switched off |
| `unidentified` | There is no account or contact, so nothing can be stored |
| `unknown` | A posted setting does not exist and was ignored |
| `source_absent` | That section is not set up on this installation |

## Restyling it

```bash
php artisan vendor:publish --tag=preference-center-views
```

Three files: `layout.blade.php` with the CSS inlined, `center.blade.php` and
`request.blade.php`. The mail templates publish with them.

Style against the `data-*` attributes rather than the class names. They are the part of the
markup this package treats as stable, and they are the reason a forked template survives an
upgrade.

All copy comes from `preference-center::public`, so wording changes belong in the
translations rather than in a forked view:

```bash
php artisan vendor:publish --tag=preference-center-translations
```
