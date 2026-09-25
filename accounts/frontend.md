# Tags and forms

<AddonHeader />

The tags are shaped like Statamic's `user:*` tags. Form tags render a `<form>` with CSRF
around their contents and hand it `success`, `errors` (a list) and `error` (by field).
`redirect` sets where to go after submitting, as a path on the site.

```antlers
{{# Only renders for a signed-in user whose address is not confirmed. #}}
{{ accounts:verify_notice }}
    {{ if success }}<p>{{ success }}</p>{{ /if }}
    <p>Please confirm {{ email }}.</p>
    <button>Send the link again</button>
{{ /accounts:verify_notice }}

{{ accounts:change_email_form redirect="/account" }}
    {{ if pending_email }}<p>Waiting for {{ pending_email }} until {{ pending_expires }}.</p>{{ /if }}
    <input type="email" name="email">
    {{ error:email }}
    <button {{ if locked }}disabled{{ /if }}>Change address</button>
{{ /accounts:change_email_form }}

{{ accounts:delete_form }}
    {{ if pending }}
        <p>Your account will be deleted on {{ scheduled_for }}.</p>
        <button>Keep my account</button>
    {{ elseif blockers }}
        <ul>{{ blockers }}<li>{{ value }}</li>{{ /blockers }}</ul>
    {{ else }}
        {{ error:account }}
        <button>Delete my account in {{ grace_days }} days</button>
    {{ /if }}
{{ /accounts:delete_form }}

<a href="{{ accounts:export_url }}">Download my data</a>

{{# The outcome of a link from a mail: confirmed, expired, withdrawn. #}}
{{ accounts:status }}<p class="{{ kind }}">{{ message }}</p>{{ /accounts:status }}

{{ accounts:impersonating }}
    <p>{{ impersonator }} is signed in as you. <a href="{{ stop_url }}">Stop</a></p>
{{ /accounts:impersonating }}

{{ if {accounts:verified} }}…{{ /if }}
```

| Tag | Variables |
| --- | --- |
| `accounts:verify_notice` | `email`, `success`, `errors`, `error` |
| `accounts:change_email_form` | `email`, `pending_email`, `pending_expires`, `elevated`, `locked`, `cancel_url`, `success`, `errors`, `error`, `old` |
| `accounts:delete_form` | `pending`, `scheduled_for`, `grace_days`, `blockers`, `elevated`, `locked`, `success`, `errors`, `error` |
| `accounts:export_url` | the URL |
| `accounts:status` | `kind` (`success` or `error`), `message` |
| `accounts:impersonating` | `stop_url`, `impersonator` |
| `accounts:verified` | bool |

## Confirmation is Statamic's elevated session

Changing the address, deleting the account and downloading the data need an elevated
session (`statamic.users.elevated_sessions_enabled`). Without one, the visitor is sent to
core's confirmation page (password, passkey or mailed code, whatever the account has) and
comes back to where they were; the download then starts on its own. `elevated` tells a
template whether the session already is elevated.

With elevated sessions switched off in Statamic there is no second confirmation, the same as
for core's own sensitive actions.

## Nothing of this while an admin is signed in as the customer

While an impersonation is active, `locked` is true and all three forms answer 403: they are
the person's own decisions. The services refuse as well (`AccountException` with
`field = impersonation`), so an API layer calling them directly cannot skip it.

## The middleware

```php
Route::middleware(['web', 'auth', 'accounts.verified'])->group(function () {
    // …
});
```

A signed-in user without a confirmed address goes to `verification.notice_url`. A JSON
request gets 403. Guests pass: keeping them out is what `auth` is for.

## The links in the mails

Every link in a mail is a Laravel temporary signed URL. A changed parameter or an expired
link is refused with 403 before any code of this addon runs. Where the link lands afterwards
is `verification.redirect`, `email_change.redirect` and `deletion.redirect`; put
`{{ accounts:status }}` on those pages to tell the visitor what happened.

All routes are listed in the [Reference](/accounts/reference#routes).
