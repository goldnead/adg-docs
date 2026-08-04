# The request flow

<AddonHeader />

Three public routes, opened by strangers, so each of them says as little as it can.

| Method | URI | Name |
| --- | --- | --- |
| `POST` | `!/lead-magnets/request` | `lead-magnets.request` |
| `GET` | `!/lead-magnets/confirm/{token}` | `lead-magnets.confirm` |
| `GET` | `!/lead-magnets/download/{grant}` | `lead-magnets.download` |

## The form

There is no Antlers tag. Write the form yourself:

```html
<form method="POST" action="/!/lead-magnets/request">
    @csrf
    <input type="hidden" name="resource" value="warmup-routine">

    <label for="email">Your email address</label>
    <input id="email" type="email" name="email" required>

    {{-- The honeypot. Never shown, never filled by a person. --}}
    <input type="text" name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px">

    <button type="submit">Send me the file</button>
</form>
```

Two fields are validated:

| Field | Rules |
| --- | --- |
| `email` | `required`, `email` |
| `resource` | `required`, `string`, `max:191`. The resource **handle** |

The route is inside the `web` group, so `@csrf` is required.

### The honeypot

`requests.honeypot` names a field a human never fills and a bot always does. Default `website`.

A filled honeypot returns a **believable success**: the same response shape, the state `pending`,
and nothing else. No grant is created, no mail is sent, no event fires.

Hide it with CSS rather than `type="hidden"`, and give it `tabindex="-1"` and
`autocomplete="off"` so a password manager does not fill it for a real person.

Set `requests.honeypot` to an empty string to switch the check off.

### Responses

```json
{ "ok": true, "data": { "state": "pending" } }
```

with `Accept: application/json`. Otherwise the controller redirects: to `_redirect` when the form
posts one, and back to the referring page otherwise, with the state flashed as
`lead-magnets.requested`.

```blade
@if (session('lead-magnets.requested') === 'pending')
    <p>Check your inbox. We have sent you a link to confirm.</p>
@elseif (session('lead-magnets.requested') === 'active')
    <p>On its way. Check your inbox.</p>
@endif
```

The state is safe to return: it says whether a confirmation is on its way, which the visitor
needs, and it says nothing about whether this address had asked before.

::: warning A third state is reachable
The README's example says the state is "`pending` or `active`". Asking for a resource whose grant
was **revoked** returns `revoked`, and the visitor sees that string. A revoked grant stays
revoked, and reinstating it is a Control Panel action rather than something a repeated request can
trigger.
:::

### 404 and 422

An unknown handle, or a handle whose resource is unpublished, is a **404**. Both look the same
from outside.

A missing or malformed email is a validation failure: 422 with JSON, a redirect with errors
otherwise.

### The throttle

`throttle:10,1` by default: ten attempts per minute per client, from `requests.throttle`.

The string is read from config once, when the route file runs, so changing it needs
`php artisan route:clear` to take effect.

## What a request does

`GrantService::request()` normalises the address, finds the existing grant for this resource and
address, or builds one, and then takes one of four paths:

| Situation | What happens |
| --- | --- |
| The grant is `revoked` | Nothing changes. `ResourceRequested` fires and the revoked grant is returned |
| The resource needs no confirmation | The grant goes straight to `active` and the file is delivered |
| The grant is `active` and not lapsed | The lifetime is extended. No new token, no second confirmation |
| Anything else | A fresh token is minted, the grant becomes `pending`, and a confirmation mail goes out |

`ResourceRequested` fires on every accepted request, including a repeat for a grant that is
already active and including one for a revoked grant. Asking three times leaves **one** grant.

The third row is worth noticing: a person who lost the mail and asks again gets a fresh delivery
rather than a fresh confirmation, because they already confirmed.

## The confirmation link

```
https://example.com/!/lead-magnets/confirm/9f2c…64 hex characters
```

The token is `bin2hex(random_bytes(32))`, stored only as a SHA-256 hash, and the hash column is
unique across all brands. That uniqueness is what lets the route derive a brand from the token
alone, with no session.

The page renders the same whether the click is the first or the fifth. The difference, whether the
file was sent, is decided by the conditional update in the service rather than by the controller,
so a mail client that prefetches the URL and a reader who clicks afterwards together produce **one
activation and one delivery mail**.

Three outcomes:

| Outcome | Page |
| --- | --- |
| First valid click | `data-state="active"`, the delivery mail is on its way |
| Token expired, grant still pending | `data-state="lapsed"`. The grant stays pending and no event fires |
| Unknown, other brand, or already consumed | **404** |

The last row is one response for three different situations. An unknown token, a token from
another brand and a token that was already used are three things behind the scenes and one thing
here: nothing to confirm.

That is also why a second click on a working link answers 404 rather than "already confirmed": the
token is cleared on activation, so by then it is a token that does not resolve.

A lapsed request is not an error the visitor has to understand. The page says the window closed;
they ask again and get a fresh token.

## The confirmation page

`lead-magnets::confirmed`, on a plain layout that carries `noindex, nofollow`, inlines its CSS and
does not extend the site layout. It is a page somebody lands on from a mail client, so it has to
render on the first byte.

Every state is exposed as a `data-state` attribute, so a fork can be restyled without the
selectors moving. Publish it to change it:

```bash
php artisan vendor:publish --tag=lead-magnets-views
```

## Suppression holds a send without failing the request

If [Suppression](/suppression/) is installed and the gate refuses the address, the confirmation or
the delivery mail is **held**. The grant is still created and the request still succeeds; the
reason is written into `meta` as `last_hold` with a timestamp.

```json
{ "source": "form", "last_hold": "confirmation_suppressed", "last_hold_at": "2026-08-03T09:12:44+00:00" }
```

Two reasons exist and no others: `confirmation_suppressed` and `delivery_suppressed`.

The gate **fails open** when Suppression is not installed, because there is nothing to ask, and
**fails closed** when it is installed and throws.
