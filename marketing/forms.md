# Front-end forms

<AddonHeader />

## The subscribe tag

```antlers
{{ marketing:subscribe list="newsletter" class="newsletter-form" }}
    <input type="email" name="email" required placeholder="you@example.com">
    <input type="text" name="first_name" placeholder="First name">
    <button>Subscribe</button>
{{ /marketing:subscribe }}
```

The tag renders the `<form>` element, the action, the CSRF token and the honeypot field. You write
the inputs, so it fits any design without fighting it.

| Attribute | Purpose |
| --- | --- |
| `list` | The list handle. Required. |
| `class` | Passed through to the `<form>` |
| `redirect` | Rendered as the hidden `_redirect` field, so you can set the destination on the tag instead of writing the input yourself |

## Fields

| Name | Required | Notes |
| --- | --- | --- |
| `email` | yes | The consent key |
| `first_name` | no | Written to the LeadHub contact |
| `last_name` | no | |
| `_redirect` | no | Where to go after a successful subscribe |

Anything else you post is ignored by the subscribe endpoint. To capture more, use a
[LeadHub-mapped Statamic form](/leadhub/contacts) and subscribe from a listener — the two are
different jobs.

## The honeypot

```php
'subscriptions' => ['honeypot' => 'website'],
```

The tag renders a decoy field with that name. A submission that fills it in is silently rejected.

::: warning Rename it if `website` collides
If your form legitimately has a field called `website`, a browser autofilling it will get the human
silently rejected — which looks exactly like the form not working. Change the config value.

Keep the field visually hidden with CSS rather than `type="hidden"`: bots read the type attribute.
:::

## Posting it yourself

```antlers
<form method="POST" action="{{ marketing:subscribe_url }}">
    …
</form>
```

Post `email`, `list`, and optionally `first_name`, `last_name` and `_redirect`.

JSON clients get a JSON answer:

```json
{ "ok": true, "data": { "status": "pending|subscribed" } }
```

`pending` means a confirmation mail went out; `subscribed` means the list has double opt-in off. Show
different copy for the two — "check your inbox" is wrong when there is nothing to check.

## Handling the response

The tag renders a form and nothing else. It injects **no variables of its own** into the pair, so
there is no `success` and no `errors` inside it. What there is:

| After | What happens |
| --- | --- |
| A successful subscribe, `_redirect` set | A redirect to that URL |
| A successful subscribe, no `_redirect` | A redirect back, with `marketing.subscribed` flashed to the session, holding `pending` or `subscribed` |
| A successful subscribe, JSON request | `{ "ok": true, "data": { "status": "…" } }` |
| A validation failure | Laravel's ordinary redirect back with the error bag and the old input |

So the two readable outcomes come from Statamic's own tags rather than from this one:

```antlers
{{ if {session:value key="marketing.subscribed"} }}
    <p>Almost done. Please confirm the link in the email we just sent.</p>
{{ /if }}

{{ get_errors:all }}
    <p>{{ messages }}{{ message }} {{ /messages }}</p>
{{ /get_errors:all }}
```

The simplest path is usually neither: point `redirect` at a thank-you page and let that page carry
the copy.

::: tip Say the same thing for a new and an existing address
An "already subscribed" message tells anybody with your form whether a given address is on your
list. Return the same neutral confirmation either way.
:::

## The public endpoints

```php
'routes' => ['prefix' => env('MARKETING_ROUTE_PREFIX', '!/marketing')],
```

| Endpoint | Purpose |
| --- | --- |
| `POST {prefix}/subscribe` | Subscribe |
| `GET {prefix}/confirm/{token}` | Confirm a double-opt-in subscription |
| `GET {prefix}/unsubscribe/{token}` | Unsubscribe, then show a page saying so |
| `POST {prefix}/unsubscribe/{token}` | RFC 8058 one-click unsubscribe. `204`, no page. |
| `GET {prefix}/o/{uuid}.gif` | The open pixel. The UUID is the message's. |
| `GET {prefix}/c/{uuid}` | The click redirect. **Signed** — an unsigned request is rejected. |

There is no preference route here. Marketing served one until 1.9.0; it now belongs to the
[Preference Center](/preference-center/) addon, and no redirect stands in for the removed URL.

::: warning Changing the prefix breaks links already sent
Confirmation and unsubscribe links in delivered mail point at the old prefix. Change it before you
send anything, or keep a redirect in place.
:::

## No session, no brand — and why that works

Every one of those endpoints is hit without a session, so in multi-brand mode the fail-closed scope
would hide the record the link points at.

Two mechanisms solve it, and both are worth knowing about:

- **Tokenised links** carry the brand, because the token column is globally unique. One token, one
  record, one brand.
- **The subscribe endpoint** derives the brand from the **list handle** the form names, which is why
  list handles are unique across all brands.

See [Brand Context → Public routes](/brand-context/public-routes).

## CSRF and the one-click POST

The subscribe tag includes a CSRF token, so the normal path is ordinary Laravel.

The **RFC 8058 one-click unsubscribe** POST is different: it comes from a mail provider with no
session and no token, so it has to skip CSRF. The route excludes three middleware names —
`PreventRequestForgery`, `ValidateCsrfToken` and `App\Http\Middleware\VerifyCsrfToken` — because
Laravel has renamed that middleware and applications sometimes subclass it. Excluding a class that
is not in the stack costs nothing; missing the one that is turns every one-click unsubscribe into a
419.

::: danger A test suite cannot see a CSRF problem
Laravel's CSRF middleware skips itself automatically in unit tests, so a fully green suite says
nothing about whether the live endpoint returns **419**. This exact bug shipped in Webhook Manager's
inbound route and was only found by hitting the URL for real.

If you add your own public POST route anywhere near this, test it with `curl` against a running
server.
:::

## Styling

Nothing about the markup is imposed except the `<form>`, the token and the honeypot, so use your own
classes. Two accessibility habits worth keeping:

```antlers
{{ marketing:subscribe list="newsletter" }}
    <label for="nl-email">Email address</label>
    <input id="nl-email" type="email" name="email" required autocomplete="email">

    <div role="status" aria-live="polite">
        {{ if {session:value key="marketing.subscribed"} }}
            Please confirm the link in the email we just sent.
        {{ /if }}
    </div>

    <button>Subscribe</button>
{{ /marketing:subscribe }}
```

A real `<label>`, and an `aria-live` region so a screen reader announces the result of a submission
that did not reload the page.
