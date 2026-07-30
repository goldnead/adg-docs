# Installation

<AddonHeader />

<Requirements laravel="11.x, 12.x or 13.x" queue="Required. Campaign sending is queued." />

```bash
composer require goldnead/statamic-marketing
php artisan migrate
```

Requires PHP 8.2+, Statamic 6, and **`goldnead/statamic-leadhub`** — a subscriber *is* a LeadHub
contact, so Composer will pull it in if you do not already have it.

Publish the config to tweak defaults:

```bash
php artisan vendor:publish --tag=marketing-config
```

## A queue worker and the scheduler

Both are required, not recommended.

```bash
php artisan queue:work
php artisan schedule:work    # or a cron entry calling schedule:run
```

| Without | What happens |
| --- | --- |
| a queue worker | a campaign send blocks the request that started it, one message at a time |
| the scheduler | `marketing:send-scheduled` never runs, so **scheduled campaigns silently never send** |

`marketing:send-scheduled` is registered to run every minute.

## Sender identity

```dotenv
MARKETING_FROM_NAME="Adrian Goldner"
MARKETING_FROM_EMAIL=newsletter@example.com
MARKETING_MAILER=postmark
```

`MARKETING_MAILER` defaults to your app's mailer. Pointing marketing mail at a separate mailer
is worth doing: bulk sending and transactional sending have different reputations, and mixing
them means a campaign complaint can affect your password-reset deliverability.

## Throttling

```dotenv
MARKETING_PER_MINUTE=120
```

`0` disables the throttle. Set it to whatever your ESP's rate limit is minus a margin —
exceeding it means rejected messages, which the addon records per recipient but cannot undo.

## First list, first send

1. **Marketing → Lists → Create.** Handle `newsletter`, double opt-in on.
2. Put the [subscribe form](/marketing/forms) on a page.
3. Subscribe yourself and confirm. That exercises the whole opt-in path.
4. **Marketing → Campaigns → Create**, write it, **test send** to yourself, then send.

Do the test send. It renders the real template through the real path, which catches a missing
`{{ unsubscribe_url }}` before four thousand people see it.

## Verifying the consent guarantee

One address on one list is one consent record, and the database is what enforces it.
`php artisan migrate` reporting success says the migrations ran; it does not say the constraints
they were supposed to leave behind are there.

```bash
php artisan marketing:consent-integrity            # reports, changes nothing
php artisan marketing:consent-integrity --repair
```

It reads the indexes on `marketing_subscriptions` as they are now and the rows in them, names any
list/address pair holding more than one subscription with each row's id, status and confirmation
date, and exits non-zero if the guarantee is not in force.

It **never deletes a subscription**: which of two sign-ups is *the* consent record is a decision
about people, and `--repair` refuses to build the index while anything would have to go for it.

Worth running once after any update that touched migrations, and in particular on an install that
came from 1.2.1 or earlier through 1.6.1–1.6.3. See the 1.6.4 changelog entry.

## Choosing a storage driver

The default is **flat**: lists, campaigns and templates as YAML under `content/marketing/`,
version-controllable, the Statamic way. Runtime data — subscriptions, messages, events — is
always Eloquent.

```dotenv
MARKETING_DRIVER=eloquent
```

See [Lists & subscriptions](/marketing/lists#storage).

## Multi-brand

Optional and off by default. With
[`goldnead/statamic-brand-context`](/brand-context/) in multi-brand mode both drivers isolate
lists, campaigns and templates per brand — the eloquent driver by `brand_id`, the flat driver by
directory:

```
content/marketing/
  acme/lists/newsletter.yaml
  contoso/lists/updates.yaml
```

**Single-brand installs need to do nothing.** They keep the plain `content/marketing/lists/…`
layout, and files still in it are read as the default brand's even after multi-brand is switched
on. Once a second brand exists, move them:

```bash
php artisan marketing:migrate-flat-brands --dry-run   # show the moves
php artisan marketing:migrate-flat-brands             # do them
```

It only ever moves, never overwrites, never deletes, and a second run is a no-op. `--brand=`
picks a different target brand.

::: warning List handles are unique across **all** brands
The public subscribe endpoint derives the brand from the list handle the form names — no brand in
the URL, no session, nothing for a visitor to get wrong — and that only holds while a handle has
exactly one owner.

Creating a duplicate is refused with a message naming the brand that holds it. This is a
deliberate exception to the per-brand uniqueness used everywhere else in the suite. See
[Brand Context → Public routes](/brand-context/public-routes#the-column-must-be-globally-unique).
:::

## Licence

MIT.
