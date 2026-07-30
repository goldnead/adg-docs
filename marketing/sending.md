# Sending

<AddonHeader />

Sending is queued, batched and throttled, with one `Message` row per recipient.

```php
'sending' => [
    'mailer' => env('MARKETING_MAILER'),
    'queue' => env('MARKETING_QUEUE', 'default'),
    'chunk' => 200,
    'messages_per_minute' => (int) env('MARKETING_PER_MINUTE', 0),
],
```

## How a send runs

```
Send now, or the scheduler reaches the send time
  └─ audience resolved: subscribed list members ∩ segment members
      └─ chunked into batches of `chunk`
          └─ one Message row created per recipient
              └─ queued, throttled to `messages_per_minute`
                  ├─ delivered → tracking identity attached
                  └─ failed → recorded on that Message
                      └─ batch completes → campaign finalises automatically
```

The audience is resolved **at send time**, not when the campaign was created. Somebody who
unsubscribed in between is not mailed.

## A queue worker is required

```bash
php artisan queue:work
```

With `sync`, the whole campaign runs inside the request that pressed the button: one message at a
time, blocking, until the browser gives up.

Give bulk sending its own queue so a large campaign does not delay transactional mail:

```dotenv
MARKETING_QUEUE=marketing
```

```bash
php artisan queue:work --queue=marketing,default
```

## Throttling

```dotenv
MARKETING_PER_MINUTE=120
```

`0` disables it. Set it **below** your ESP's rate limit, with a margin.

Exceeding the limit means the provider rejects messages. The addon records each rejection on that
recipient's `Message` row, which is honest and not the same as having sent it — those people did not
get the email, and there is no automatic re-run.

Worth doing the arithmetic before a big send: 4,000 recipients at 120 a minute is about half an hour.
That is fine, and it is worth knowing so you do not conclude the send has stalled.

## Choosing a mailer

```dotenv
MARKETING_MAILER=postmark
```

Defaults to your app's mailer. **Using a separate one is worth the setup**: bulk and transactional
sending have different reputations, and a campaign complaint should not put your password-reset mail
in a spam folder.

Whatever you pick, deliverability is still the provider's job. This addon sends through Laravel;
SPF, DKIM, DMARC and reputation are configured with your ESP.

## The from address

```php
'from' => [
    'name' => env('MARKETING_FROM_NAME'),
    'email' => env('MARKETING_FROM_EMAIL'),
],
```

Set both, and use an address that accepts replies. A list can override them per list.

## Message records

One row per recipient, carrying its own tracking identity. That is what makes per-recipient reporting
possible, and what the campaign report aggregates.

It is also where a failure lives: a rejected or bounced message is recorded there rather than in a
generic log, so "did this person get it" is answerable.

## Automatic finalisation

When the batch completes, the campaign finalises itself and the report becomes final. You do not have
to do anything, and a campaign stuck in a sending state means the batch did not complete — look at
`queue:failed`.

## RFC 8058 headers

Every campaign message carries `List-Unsubscribe` and `List-Unsubscribe-Post`, so a mail client's own
unsubscribe button works. That is a deliverability feature as much as a courtesy: providers weight it,
and a person who cannot find your unsubscribe link presses "spam" instead.

## Before a large send

A short checklist that has caught real problems:

1. **Test send**, and read it in a real mail client, not only a browser.
2. Confirm `{{ unsubscribe_url }}` is present and resolves. Put it in the template so it cannot be
   forgotten.
3. Check the audience count. A segment that matches nobody sends to nobody; a segment silently
   ignored by an old LeadHub sends to **everybody**.
4. Confirm the queue worker is running and watching the right queue.
5. Confirm the throttle is below your ESP's limit.
6. Check `marketing:consent-integrity` if you have not since the last migration.

## When something goes wrong mid-send

- **Pause the worker** to stop further delivery. Messages already handed to the ESP are gone.
- Look at the per-recipient `Message` rows to see how far it got.
- `queue:failed` for jobs that died.

There is no recall and no undo, which is the main argument for the test send.

## Suppression is enforced at send time

An address that hard-bounced or complained is suppressed and is not mailed again, even if it is still
a `subscribed` member. See [Unsubscribes & suppression](/marketing/suppression).

```php
'leadhub' => [
    'hard_bounce_opt_out' => true,
    'complaint_opt_out' => true,
],
```

Leave both on. Continuing to mail an address that hard-bounced damages your sending reputation;
continuing after a complaint is worse.
