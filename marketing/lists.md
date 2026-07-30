# Lists & subscriptions

<AddonHeader />

A **list** is a mailing list, and it is where consent lives. A **subscription** is one address on
one list, and it *is* the consent record.

**Marketing → Lists**, behind `manage marketing lists`.

<Figure
  src="marketing-lists"
  alt="The mailing list screen showing two lists with their handles, double-opt-in setting and subscriber counts"
  caption="Two lists, one relationship each. A campaign narrows a list with a segment rather than adding a second list." />

## Creating a list

| Field | Notes |
| --- | --- |
| Name | Shown in the CP |
| Handle | Used by the subscribe form and the public endpoint. **Unique across all brands.** |
| Double opt-in | Per list; defaults from `subscriptions.double_opt_in` |
| From name / email | Optional override of the global sender |

::: warning The handle is a public identifier
The subscribe endpoint derives the brand from the handle the form names — no brand in the URL, no
session, nothing for a visitor to get wrong. That only works while a handle has exactly one owner,
so **list handles are unique across all brands** and creating a duplicate is refused with a message
naming the brand that holds it.

It is also in your page's HTML, so pick something you are happy to publish: `newsletter`, not
`main-list-v2-migrated`.
:::

## Subscription states

| State | Mailable | Means |
| --- | --- | --- |
| `pending` | **no** | Subscribed, awaiting double-opt-in confirmation |
| `subscribed` | yes | Confirmed |
| `unsubscribed` | no | The person opted out |

A campaign only goes to `subscribed` members. A `pending` row is a record that somebody started,
not permission to mail them.

With double opt-in off, a subscription goes straight to `subscribed`.

## Double opt-in

On by default for new lists, and worth leaving on: an unconfirmed address is not consent, and in
several jurisdictions is not defensible.

Subscribing sends a confirmation mail with a **tokenised** link. Clicking it moves the subscription
to `subscribed` and records the confirmation date, which is the thing you want to be able to produce
if anybody asks.

The token also carries the brand, because the link is opened without a session and the fail-closed
scope would otherwise hide the record. See
[Brand Context → Public routes](/brand-context/public-routes).

## What subscribing does

1. Upserts the LeadHub contact
2. Creates or updates the subscription row
3. Records `marketing.subscribed` on the contact's timeline
4. Tags the contact `list:{handle}`

```php
'leadhub' => [
    'tag_subscribers' => true,
    'tag_prefix' => 'list:',
],
```

That tag is more useful than it looks: it makes "everyone on the newsletter" expressible as a tag
condition in a [LeadHub segment](/leadhub/segments), without Marketing having to expose anything.

## Managing subscribers by hand

Behind `manage marketing subscribers`. You can subscribe, unsubscribe and inspect state.

::: danger Adding an address by hand is a consent claim
Nothing stops you creating a `subscribed` subscription for an address that never asked. The
addon will send to it, and the confirmation date will be empty — which is exactly the evidence gap
that matters if anybody ever asks.

Import addresses as `pending` and let people confirm, unless you can genuinely account for where
the consent came from.
:::

## Uniqueness, and how to verify it

One address on one list is one subscription, enforced by a unique index.

```bash
php artisan marketing:consent-integrity            # reports, changes nothing
php artisan marketing:consent-integrity --repair
```

It reads the indexes on `marketing_subscriptions` as they are right now **and the rows in them**,
names any list/address pair holding more than one subscription with each row's id, status and
confirmation date, and exits non-zero if the guarantee is not in force.

It never deletes a subscription. `--repair` rebuilds the index alone, and refuses while anything
would have to go for it.

Run it after any update that touched migrations, and specifically on an install that came from
1.2.1 or earlier through 1.6.1–1.6.3. See the 1.6.4 changelog entry.

## Storage

```php
'storage' => [
    'driver' => env('MARKETING_DRIVER', 'flat'),
    'flat' => ['path' => env('MARKETING_FLAT_PATH', base_path('content/marketing'))],
],
```

| Driver | Lists, campaigns, templates |
| --- | --- |
| `flat` (default) | YAML under `content/marketing/`, git-versionable |
| `eloquent` | database tables |

**Subscriptions, messages and events are always Eloquent.** Configuration belongs in git;
per-recipient telemetry does not.

```
content/marketing/
  lists/newsletter.yaml
  campaigns/2026-07-newsletter.yaml
  templates/default.yaml
```

::: tip Flat lists, database consent
This split is the right way round for a reason: a list definition is something you review in a pull
request, and a consent record is something you must not be able to edit in a text editor and push.
:::

## Multi-brand

Both drivers isolate per brand — eloquent by `brand_id`, flat by directory:

```
content/marketing/
  acme/lists/newsletter.yaml
  contoso/lists/updates.yaml
```

Single-brand installs keep the plain layout, and files still in it are read as the **default
brand's** even after multi-brand is switched on. Move them when a second brand exists:

```bash
php artisan marketing:migrate-flat-brands --dry-run
php artisan marketing:migrate-flat-brands --brand=acme
```

Only ever moves, never overwrites, never deletes, no-op on a second run.

**Consent is per brand.** The same address can hold independent state in two brands, because
somebody who unsubscribed from Acme has said nothing about Contoso. List *handles*, as above, are
the deliberate exception.

## Designing lists

**One list per relationship, not per campaign.** "Newsletter" is a relationship. "Spring 2026
launch" is a campaign — use a [segment](/marketing/segments) to narrow the newsletter, not a second
list, or every recipient has to consent again.

**Do not use lists as tags.** If somebody would reasonably be on five of your lists at once, those
are tags on one list.

**Name the list for what the reader signed up to.** It appears in the confirmation mail and, in most
designs, in the unsubscribe page. `Newsletter` is honest; `Leads-DE-2026` is not something anybody
agreed to.
