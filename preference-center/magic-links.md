# Magic links

<AddonHeader />

The third door. A person who has no account and no recent mail types their address into
`/!/preference-center/request` and receives a signed, expiring link to their own preferences.

That endpoint is public and unauthenticated by definition — that is the whole point of it —
which is why almost everything about it is a defence rather than a feature.

## What the link is

A signed, expiring URL and nothing else. **No table.**

That is a decision rather than an omission. This package is a view over three sources; a
token table would make it the owner of a fourth, with its own migration, its own index and
its own pruning job, to hold a fact Laravel can already carry in the URL and verify without
a query.

What the URL carries is **encrypted, not merely signed**. The signature already makes it
unforgeable; the encryption keeps the address out of access logs, `Referer` headers and
browser history, which a signed-but-plain link would scatter it across. The blob decodes to
an address, a brand and an issue timestamp.

::: warning What this design does not give you
Single use, and revocation. A link is good for its lifetime, which is minutes. Shorten
`ttl_minutes` rather than reaching for a table. The Marketing token that opens the same page
is good forever, and that is the threat that actually governs.
:::

## The five outcomes

`MagicLinkRequests::request()` returns one of five words. They exist for logs and tests and
**none of them reaches the visitor**:

| Outcome | Meaning |
| --- | --- |
| `sent` | The address is known and not blocked. A mail is queued |
| `unknown` | Malformed, or no source has heard of this address |
| `blocked` | Known, but suppressed in every brand that knows it |
| `throttled` | One of the two limiters was already at its ceiling |
| `disabled` | `magic_link.enabled` is `false` |

The page says the same sentence for all five. It says so out loud, too: *for privacy reasons
we do not say here whether an address is known to us.*

## Enumeration is defended twice

**By wording.** An endpoint that answers "unknown address" politely is an address
verification service for whoever asks it hardest. Every outcome returns the same page with
the same sentence.

**By clock.** The fast paths (nothing to do) and the slow one (mail queued) are held open to
a floor, `min_response_ms`, default 350 ms. Without it a stopwatch tells them apart and the
wording buys nothing.

The input is not validated as an email address on the request either. A rejected field would
answer faster and differently than an accepted one; malformed input takes the same path and
gets the same page. The shape of an address is the one thing about it this endpoint is
willing to reveal, and it reveals it by requiring `type="email"` in the browser, not by
answering differently on the server.

Both limiters are also hit for addresses nobody has ever heard of. Counting only real
addresses would turn the limiter itself into the oracle the rest of the endpoint is built to
avoid.

## Two limiters, and why one is not enough

```php
'per_address' => ['max' => 3,  'decay_minutes' => 60],
'per_origin'  => ['max' => 10, 'decay_minutes' => 60],
```

Per address, so one mailbox cannot be flooded. Per origin, so the endpoint cannot be pointed
at a list of addresses somebody else owns.

One without the other is not a limit. Per-address alone lets one client mail ten thousand
different people. Per-origin alone lets ten thousand clients mail one person.

Both keys are `sha256` hashes, so the rate limiter's own store does not become a list of
addresses that have asked.

::: danger The address key is the address, and nothing else
It used to carry the brand id as well, which read like tidy namespacing and was a hole: a
mailbox is one mailbox however many brands a host runs, and a key of `brand|address` gave
every brand its own budget of three — 3×N mails an hour into the same inbox, bounded only by
the origin limiter. A limit that protects a key instead of a person protects nobody. Fixed in
1.1.0.
:::

## A blocked address is not written to

The gate exists because a mailbox bounced or its owner complained. "Here is your link to
manage preferences" is still mail, and sending it to that mailbox is the behaviour that gets
a domain listed.

The check runs per brand, because the gate is per brand for complaints and global for
bounces: a hard bounce closes the address everywhere, a complaint only where it was made. A
brand that may still write gets its link either way.

"Nobody knows this address" and "we are not allowed to write to it" stay separate lines in
the log, and the same sentence on the page.

## Why the form has no brand field

Every other entrance derives its brand from something the visitor could not have chosen: a
token, a signature. This one has nothing to derive from, because whether an address belongs
anywhere is precisely the question being asked.

Three answers were available and two of them are wrong.

A **silent default brand** is a bet. On a multi-brand host it searches one audience and gives
everybody else the same reassuring sentence, which is then untrue for every person who
belongs to one of the others. Version 1.0.0 did something worse than bet: with no brand
current at all the scope failed closed, the lookup answered false for *every* address, and
the form mailed nothing to anybody on any brand while saying exactly what it says when it
works. The silence was the design working as intended, which is how a total outage stayed
invisible for a release.

A **visible brand field** publishes the brand list to anyone who loads the page, and asks
somebody who was mailed by one of several sister sites to remember which company that was.

So **the address answers it**. The lookup runs in every brand, and the mail carries one link
per brand that has heard of this address — normally exactly one, and then the mail is the
mail it always was.

This reveals nothing. The page says the same sentence either way, and the only person who
learns which brands know the address is whoever reads that mailbox, who already receives mail
from all of them. The per-address limiter counts requests rather than brands, so N brands do
not become N times the mail.

`?pcBrand={handle}` still narrows the search and still cannot widen it. It is a hint for a
page that belongs to one site, not the mechanism the endpoint depends on.

## What counts as "known"

In order:

1. Marketing has a subscription with that normalised address, or
2. LeadHub has a contact with it, or
3. `allow_unknown_addresses` is `true`.

The third is off by default and should stay off. On, this endpoint mails a signed link to
anything typed into it. It exists for one honest case: a fresh installation with neither
Marketing nor LeadHub, where nobody is known yet.

## Following the link

`GET /!/preference-center/link/{pcLink}` opens the blob, **regenerates the session id**,
writes a short-lived note, and redirects to `/!/preference-center/`.

The link cannot be posted to. A form submission would have to carry the signature back, and
every redirect after it would carry it further. So the link is spent once on arrival and the
note takes over, with its own expiry (`session_minutes`, default 60) independent of the
session lifetime the host configured for signed-in people.

::: danger The session id must be regenerated, and it is
Without that, whoever handed over the session id gets the note. A link followed in a session
somebody else fixed — a shared machine, a `?PHPSESSID` in a forwarded URL, a cookie written
by a neighbouring subdomain — writes the address into *their* session, and the id they
already hold now opens the page.

Measured on the QA hub against v1.0.0: the cookie captured before the click, replayed from a
separate browser context, answered 200 with a stranger's address on it. Fixed in 1.1.0. It is
the same move `Auth::login()` makes, for the same reason.
:::

The note is also cleared on `Illuminate\Auth\Events\Login`. Whoever signs in is the person at
the keyboard now, and a note left from an earlier magic link would otherwise outlive them.

## Surviving a click counter

A magic link leaves as a signed, expiring URL and does not always arrive as one. Providers
that count clicks rewrite every `href` in the HTML part onto their own redirector and append
their own parameters when they forward the reader. Laravel signs the whole query string, so
one appended parameter is a **403**.

Measured on staging: the button in a real mail, opened from a real mailbox, produced

```
302 …sendibt3.com/tr/cl/…  →  403 …/link/…?_se=…&expires=…&signature=…
```

The plain-text link in the same message, which Brevo leaves alone, worked. This is not
specific to this package: it breaks every signed Laravel URL mailed through a provider that
counts clicks.

Two answers, and a host wants both:

- **`delivery.mail_headers`** — stop the rewriting at the source, with the per-message
  tracking header your provider documents.
- **`delivery.ignored_query_parameters`** — survive it when it happens anyway.

On Brevo the second is not defence in depth. Brevo has no header that switches click tracking
off per message, so the ignore list is the only thing that works there.

Both lists, what ignoring costs, and why `expires` can never be added to the ignore list, are
in [Configuration](/preference-center/configuration#delivery).

## The mail itself

`MagicLinkMail` ships a plain-text part and an HTML part. It sends from
`magic_link.from` where that is configured, and from the application default otherwise, and
it carries whatever `delivery.mail_headers` names.

Both templates publish with `--tag=preference-center-views`.
