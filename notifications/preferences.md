# Preferences

<AddonHeader />

Per type × channel, stored **only as deviations**.

```php
$preferences = app(PreferenceResolver::class);

$preferences->set($user, 'community.mention', 'mail', false);
$preferences->matrixFor($user);   // for a preference centre
```

## Absence means "use the default"

This is the design decision that matters most here.

A preference row exists **only** when somebody has expressed an opinion. Absence means "use the type's
default", which means **changing a default actually reaches everyone who never expressed one**.

The alternative — writing a row per user per type at first login — quietly freezes your defaults forever: you
change `defaultChannels()` and nothing happens for anybody who has ever logged in.

## The asymmetry

::: tip The persisted row is always written
Preferences govern how somebody is **reached**, not whether the thing happened.

Turning off `in_app` silences the realtime nudge. It does not erase history, and the notification still appears
in the CP inspector — which is what lets support answer "did this person get it".
:::

## Building a preference centre

`matrixFor($user)` gives you the grid: every registered type × every registered channel, with the effective
value and whether it is a deviation.

```php
$matrix = app(PreferenceResolver::class)->matrixFor($user);
```

Then render it however your front end works, and write back with `set()`:

```php
$preferences->set($user, 'community.mention', 'mail', $request->boolean('mail'));
```

::: warning There is no front-end preference screen in this addon
`matrixFor()` is what you build one from. That is deliberate — the wording, the grouping and the layout belong
to your site, the same reason [rendering is a callback](/notifications/types#rendering-is-a-callback-not-a-template).
:::

Link to it from your notification mails:

```dotenv
NOTIFICATIONS_PREFERENCES_URL=https://example.com/account/notifications
```

Set that. A mail with no way to change how often you get one is a mail people mark as spam.

### Group by namespace

Type handles use a domain prefix (`community.`, `crm.`, `lms.`), which is what makes a preference centre
groupable. Use it:

```
Community
  ☑ Mentions          in-app  ☑ email  ☐ digest
  ☑ Replies           in-app  ☐ email  ☑ digest

CRM
  ☑ Lead assigned     in-app  ☑ email  ☐ digest
```

Forty ungrouped checkboxes is a screen nobody changes anything on.

## Required types ignore preferences

A type marked `required()` is delivered regardless. Show it in the matrix as fixed rather than hiding it —
somebody who cannot turn it off should at least be able to see why.

```php
$type->required();   // account security and legal notices only
```

## Uniqueness

One preference row per recipient, per type, per channel — enforced by a unique index.

```bash
php artisan notifications:uniqueness-integrity [--repair]
```

::: danger Installs created before 1.0.4 could hold duplicate rows
Because the unique of the day led with `user_id`, and **no engine constrains a NULL** — so for contact
recipients, where `user_id` is null, it constrained nothing.

Where those rows exist, `migrate` **stops and names them** rather than choosing between them: which of two
preferences is the one a person currently holds is not a decision a schema change gets to make.

Delete the rows that are not the ones to keep, then run `migrate` again. `--repair` rebuilds the index alone
once nothing is in the way, and refuses while anything is.

`php artisan migrate` reporting success means the migrations ran. It does not mean the constraints they were
supposed to leave behind are in place, and it says nothing about the rows. That is what this command is for,
and `migrate` itself will point you at it.
:::

## Contact recipients

A recipient may be a Statamic user, an Eloquent user, or a LeadHub contact. For a contact, `user_id` is null
and the join key is `contact_uuid`.

That is the shape that caused the 1.0.4 defect, and it is worth remembering in your own code: a recipient key
is not always a user id.

## A user id is a string

`$user->id()` is a **UUID** under the file users repository and a numeric key under the Eloquent one. Never
cast it to `int` — on a file-driver install that turns every UUID into `0`, collapsing every recipient onto
one.

See [Identity](/guide/identity#a-user-id-is-a-string).

## Choosing defaults instead of relying on preferences

Most people never open a preference centre. So the defaults you set in
[`defaultChannels()`](/notifications/types#default-channels) are, in practice, what almost everybody gets.

The rule that follows: **put high-frequency types in the digest by default.** Then somebody who wants more can
opt up to mail, rather than the other way round — and nobody has to opt out of forty emails to keep using your
site.
