# Forms & contacts

<AddonHeader />

## Connecting a form

**LeadHub → Forms** lists every Statamic form. **Configure** one:

1. Toggle **Enable LeadHub for this form**.
2. Map the **email field** — required. It is the deduplication key.
3. Map anything else you want on the contact: name, phone, company, message.
4. Optionally attach default tags for this form.
5. Save.

::: warning No mapping, no contact
A form with no mapping, or a disabled mapping, is skipped silently. Installing LeadHub does
not start harvesting every form on the site.

This is by far the most common cause of "LeadHub does nothing".
:::

A form mapping's `form_handle` is unique **per brand**, so two brands can each map their own
form of the same handle.

## Deduplication

Contacts are deduplicated on `email_normalized`:

```php
'email_normalization' => ['trim' => true, 'lowercase' => true],
```

`  Adrian@Example.com ` and `adrian@example.com` are one contact. Turning either
normalisation off makes them two, which is almost never what you want.

A repeat inquiry attaches to the existing contact and adds a timeline event. That is the
behaviour the addon exists for.

## Existing fields are not overwritten

```php
'overwrite_existing_fields_from_submissions' => false,
```

The default protects manual edits: a salesperson correcting a misspelled company name is not
undone by the next form the same person fills in.

Turn it on only when your forms are genuinely the authority on the data.

## The submission payload

```php
'store_full_submission_payload' => true,
'timeline_payload_redaction' => [
    'password', 'passwort', 'token', 'secret',
    'api_key', 'credit_card', 'card_number',
],
```

LeadHub stores a **reference** to the original Statamic submission plus a redacted copy of
its payload on the timeline. The original submission is never modified.

Add your own field names to the redaction list. The defaults catch the obvious ones and know
nothing about `iban`, `kundennummer` or `geburtsdatum`.

## Statuses

```php
'statuses' => [
    'new' => 'New', 'contacted' => 'Contacted', 'qualified' => 'Qualified',
    'won' => 'Won', 'lost' => 'Lost', 'archived' => 'Archived',
],
'default_status' => 'new',
```

Every change writes a timeline entry and fires `LeadHubStatusChanged`, which is available as
the `leadhub.status.changed` webhook trigger and as an Automations trigger.

Retire a status by no longer using it rather than by deleting the key: contacts already
holding it would otherwise show a value the UI cannot label.

## Tags

Manual, mapped per form, or applied by an automation or a listener. Tag slugs are unique per
brand.

Tags are the cheapest segmentation there is, and worth using for anything you would
otherwise encode in a status. Statuses are a pipeline; tags are facts.

## Follow-ups

One next action per contact, with a due date. The dashboard surfaces what is due today and
what is overdue, and the daily digest emails it.

```bash
php artisan leadhub:followups:due       # fires LeadHubFollowupDue, scheduled daily
php artisan leadhub:followups:digest    # the summary mail
```

For more than one open item per contact, use [tasks](/leadhub/pipelines#tasks) instead.

## Manual contacts

```php
'features' => ['manual_contacts' => true],
```

Create a contact by hand — a phone inquiry, a business card, a conversation at an event. It
goes through the same resolver, so an existing address attaches rather than duplicates.

## Filtering and CSV export

Filter the list by status, source, tag, follow-up state, assignee and — with scoring on —
engagement score range.

```
?assigned_to=<id>
?assigned_to=none
?mine
```

```php
'exports' => ['queue_threshold' => 1000, 'disk' => 'local', 'directory' => 'leadhub/exports'],
```

Export respects the current filter, so "export the qualified leads from the spring campaign"
is a filter plus a button. Above the threshold the export is queued, which needs a worker
and the eloquent driver.

Exports include the attribution fields, which is usually the point.

## Marketing attribution

```php
'features' => ['attribution' => true],
```

| Contact field | Default submission source |
| --- | --- |
| `utm_source` | `utm_source` |
| `utm_medium` | `utm_medium` |
| `utm_campaign` | `utm_campaign` |
| `utm_term` | `utm_term` |
| `utm_content` | `utm_content` |
| `referrer` | `referrer` |
| `landing_page` | `landing_page` |

Capture works as long as those values **reach the submission**, which normally means hidden
fields on your form populated from the query string and `document.referrer`. LeadHub cannot
recover a UTM parameter that the form never received.

Remap any field name:

```php
'attribution' => [
    'fields' => [
        'utm_campaign' => 'campaign',   // ← your own form field name
    ],
],
```

The captured values appear in an **Attribution** panel on the contact, and are included in
CRM payloads and exports.

## Archiving and deleting

Archiving keeps the contact and its history and takes it out of the working list. Deleting
removes it.

::: warning There is no anonymisation command
LeadHub has no GDPR anonymisation and no manual merge UI in the current release. A deletion
request today means: delete or archive the contact here, unsubscribe and suppress in
[Marketing](/marketing/suppression), and run `activity:anonymize --contact=<uuid>` if you
run [Activity](/activity/). See [Privacy & retention](/guide/privacy).
:::

## Merging duplicates

```php
'features' => ['merge' => true],
```

```php
LeadHub::merge($duplicate, $survivor);
```

Re-parents the duplicate's timeline, notes, tasks and opportunities onto the survivor. The
API exists; the Control Panel screen for it does not yet.
