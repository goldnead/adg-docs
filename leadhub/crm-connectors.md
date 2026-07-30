# CRM connectors

<AddonHeader />

Push contacts to external systems when they are **created**, **updated**, or their **status
changes**.

```php
'features' => ['crm_destinations' => true],

'crm' => [
    'destinations' => [
        'hubspot' => [
            'driver'   => 'hubspot',
            'enabled'  => true,
            'token'    => env('LEADHUB_HUBSPOT_TOKEN'),   // private-app token
            'triggers' => ['created', 'status_changed'],
        ],
        'brevo' => [
            'driver'   => 'brevo',
            'enabled'  => true,
            'api_key'  => env('LEADHUB_BREVO_KEY'),
            'list_id'  => env('LEADHUB_BREVO_LIST'),      // optional
        ],
        'zapier' => [
            'driver'   => 'webhook',
            'enabled'  => true,
            'url'      => env('LEADHUB_WEBHOOK_URL'),
            'secret'   => env('LEADHUB_WEBHOOK_SECRET'),  // optional HMAC signing
        ],
    ],
],
```

## Built-in drivers

| Driver | Behaviour |
| --- | --- |
| `hubspot` | Upserts via the HubSpot CRM v3 API — creates, or patches the existing contact on a 409 conflict |
| `brevo` | Upserts via the Brevo (Sendinblue) API, optionally adding to a list |
| `webhook` | POSTs the normalised contact as JSON to any URL. With a `secret`, the body is signed and sent as `X-LeadHub-Signature: sha256=<hmac>` |

## Triggers

`triggers` controls which lifecycle events a destination listens for: any of `created`,
`updated`, `status_changed`. Omit it to listen for all three.

Be deliberate here. `updated` on a chatty install means a push on every field edit, which is
both an API-quota problem and a way to make the sync log unreadable. Most destinations want
`created` and `status_changed`.

## Consent

**Opted-out contacts (`do_not_contact`) are never pushed.** Every driver honours it, including
custom ones that go through the destination manager.

`LeadHub::optOut()` goes further and actively **removes** the contact from supported
destinations, for example a Brevo list. That distinction matters: suppressing locally does
nothing about the copy already sitting in an ESP, and "we deleted them from our CRM" is not an
answer if the newsletter provider still has them.

## The sync log

Every attempt runs on the queue and is recorded **twice**: once on the contact's timeline, and
once in a dedicated log under **LeadHub → Sync log**.

| Column | |
| --- | --- |
| Contact | who |
| Destination | which |
| Event | created, updated, status_changed |
| Status | success or failure |
| HTTP code | what the destination returned |
| Message | the error, if any |
| Timestamp | |

Failed jobs retry with backoff.

::: warning On the flat driver, the log table is skipped
Gracefully — the timeline entry is still written, so nothing is lost, but the **Sync log**
screen has nothing in it. If you rely on the log, use the eloquent driver.
:::

## A queue is required

```dotenv
QUEUE_CONNECTION=redis
```

```bash
php artisan queue:work
```

Syncs are queued so a HubSpot outage does not become a slow form submission. With `sync`, the
form submitter waits for the API timeout — the pipeline is fail-safe so nothing breaks, but the
page is slow for a reason nobody can see.

## Custom drivers

Register your own from a service provider:

```php
use Goldnead\Leadhub\Crm\DestinationManager;

app(DestinationManager::class)->extend('salesforce', function (string $key, array $config) {
    return new \App\Leadhub\SalesforceDestination($key, $config);
});
```

Implement `Goldnead\Leadhub\Contracts\CrmDestination`:

```php
interface CrmDestination
{
    public function driver(): string;
    public function push(Contact $contact): SyncResult;
}
```

Return a `SyncResult` rather than throwing where you can — it is what populates the sync log's
status, HTTP code and message, and a thrown exception gives the log less to show.

## Connectors or Webhook Manager

Both can push a contact to a URL. The distinction:

| Use | When |
| --- | --- |
| the built-in `webhook` driver | you just need contacts pushed to one URL, signed, with a log |
| [Webhook Manager](/webhook-manager/) | you want CP-managed routing, payload templating, retries and replay across many event types |

Install Webhook Manager and LeadHub together and every lifecycle event becomes a trigger
automatically, with no glue code. See
[Timelines & events](/leadhub/timelines#pairing-with-webhook-manager).

Do not do both for the same destination. Two mechanisms pushing the same contact to the same
place is a double-write, and both configurations look individually correct.

## Verifying an HMAC-signed webhook

On the receiving end, recompute over the **raw body**:

```php
$expected = 'sha256='.hash_hmac('sha256', $request->getContent(), $secret);

if (! hash_equals($expected, $request->header('X-LeadHub-Signature'))) {
    abort(401);
}
```

Recomputing over a re-serialised parsed body will never match, because key order and whitespace
change. That is the single most common cause of "the signature is always wrong".

## What is not built

**Bidirectional sync.** Contacts are pushed out; status and owner changes are not pulled back
from the CRM. It is on the roadmap and not shipped, so if two systems both edit a contact, you
are the reconciliation.

**More connectors.** Pipedrive, ActiveCampaign and Salesforce are on the list. Custom drivers
are already supported through `DestinationManager::extend()`, which is the faster route if you
need one now.
