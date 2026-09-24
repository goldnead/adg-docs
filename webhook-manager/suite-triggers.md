# Triggers from the suite

<AddonHeader />

Besides its own triggers for entries, forms, users and assets, Webhook Manager offers every
moment the other addons of the suite register. Install the addon, and its triggers appear in
the trigger picker of an outbound webhook or a rule; uninstall it and they go. Nothing is
configured on either side, and none of these addons requires Webhook Manager: each one checks
for it by name at boot and registers nothing when it is missing.

This page lists them all. What each trigger sends is documented with the addon that sends it,
under its **Webhooks** page.

## The picker

From **2.10** the trigger field is a searchable list, grouped by where a trigger comes from:
Entries, Forms, Users, Assets, Payments, Invoices, Partners, Courses, Funnels, Offers, LeadHub,
Marketing. Search matches the label, the group heading and the handle, so "abo", "Zahlungen"
and `payments.subscription_paused` all find the same entry. A new webhook or rule starts
without a trigger; the field is required.

<Figure
  src="webhook-manager-trigger-picker"
  alt="The trigger field of a new outbound webhook in a German Control Panel, opened on the group Angebote with Gutschein eingelöst, Kontingent ausverkauft, Kurzlink umgeschaltet, Platz angenommen, Platz vergeben and Platz zurückgeholt"
  caption="The trigger picker in the playground, German, scrolled to the Offers group. Group headings are rows you cannot select." />

Every label has the form **Group: moment**, in English and German: "Payments: subscription
paused", "Zahlungen: Abo pausiert", "Entry: saved". The built-in labels changed to that form in
2.10 ("Eintrag — gespeichert" is now "Eintrag: gespeichert"). A site that published the
language files keeps its old strings until it publishes them again.

## Which addons send what

Handles follow the pattern `<addon>.<moment>` and match the handles of the same moments in
[Automations](/automations/suite-triggers), so a flow and a webhook on the same moment are easy
to line up.

| Addon | Triggers | Needs | Payload and details |
| --- | --- | --- | --- |
| [Payments](/payments/) | 20: `payments.paid`, `.failed`, `.refunded`, `.charged_back`, `.checkout_abandoned`, `.checkout_blocked`, `.subscription_started`, `.subscription_start_failed`, `.subscription_renewed`, `.subscription_attempt_failed`, `.subscription_payment_upcoming`, `.subscription_card_expiring`, `.subscription_card_expired`, `.subscription_paused`, `.subscription_resumed`, `.subscription_changed`, `.subscription_replaced`, `.subscription_plan_completed`, `.subscription_cancelled`, `.subscription_ended` | Payments 1.26 | [Payments → Webhooks](/payments/webhooks) |
| [Invoices](/invoices/) | 3: `invoices.issued`, `invoices.credit_note_issued`, `invoices.delivered` | Invoices 2.3 | [Invoices → Webhooks](/invoices/webhooks) |
| [Offers](/offers/) | 8: `offers.seat_pool_opened`, `.seat_invited`, `.seat_accepted`, `.seat_revoked`, `.seat_pool_closed`, `.sold_out`, `.coupon_redeemed`, `.link_switched` | Offers 1.13 | [Offers → Webhooks](/offers/webhooks) |
| [Funnels](/funnels/) | 7: `funnels.step_entered`, `.form_submitted`, `.offer_accepted`, `.offer_declined`, `.upsell_declined`, `.completed`, `.funnel_saved` | Funnels 1.18 | [Funnels → Webhooks](/funnels/webhooks) |
| [Courses](/courses/) | 12: `courses.learner_enrolled`, `.lesson_completed`, `.lesson_unlocked`, `.quiz_passed`, `.quiz_failed`, `.course_completed`, `.drip_paused`, `.drip_resumed`, `.access_suspended`, `.access_restored`, `.team_member_added`, `.team_member_removed` | Courses 0.3 | [Courses → Webhooks](/courses/webhooks) |
| [Affiliates](/affiliates/) | 4: `affiliates.commission_earned`, `.commission_reversed`, `.partner_applied`, `.partner_approved` | Affiliates 0.2 | [Affiliates → Webhooks](/affiliates/webhooks) |
| [LeadHub](/leadhub/) | contacts, tags, notes, follow-ups, segments, score | LeadHub | [LeadHub → Webhook Manager triggers](/leadhub/reference#webhook-manager-triggers) |
| [Marketing](/marketing/) | `marketing.subscriber.subscribed`, `.subscriber.pending`, `.subscriber.unsubscribed`, `marketing.campaign.sent`, `marketing.message.bounced`, `.message.complained` | Marketing | [Marketing → Webhook Manager integration](/marketing/reference#webhook-manager-integration) |

Each of the six commerce addons can switch its triggers off with one config key, on by
default: `statamic-payments.webhook_manager.enabled`, `invoices.webhook_manager.enabled`,
`statamic-offers.webhook_manager.enabled`, `statamic-funnels.webhook_manager.enabled`,
`courses.webhook_manager.enabled`, `affiliates.webhook_manager.enabled`.

## The payload

The six commerce addons send the same frame, in this order:

```json
{
  "event": "payments.subscription_paused",
  "event_id": "5b0c…",
  "occurred_at": "2026-09-24T10:15:00+02:00",
  "brand": { "id": 1, "handle": "chorwerkstatt" },
  "subject_type": "subscription",
  "subject_id": 42,
  "subscription": { "…": "…" }
}
```

- **`event`** is the trigger handle.
- **`event_id`** names the event, not the delivery: a hash over the handle, the object and the
  object's own time or reference. The same event sent twice has the same `event_id`.
- **`occurred_at`** is when it happened, never when it was sent.
- **`brand`** is `{id, handle}`, or `null` without [Brand Context](/brand-context/).
- **`subject_type`** and **`subject_id`** say what the event is about (`payment`,
  `subscription`, `invoice`, `commission`, `partner`, `course`, `funnel`, `offer`, `seat`,
  `seat_pool`, `coupon`); the deliveries list shows them in its Object column, with German and
  English labels from 2.10.
- Then one or more blocks, named after what they hold: `payment`, `subscription`, `invoice`,
  `partner`, `seat` and so on. Money is always `*_cent` plus `currency`, times are ISO 8601 or
  `null`, a person is `email` plus `name` inside the block.

A hook without a payload template sends the whole trigger event as JSON: `trigger`,
`source_type`, `source_reference`, `payload` (the frame above), `site`, `locale`, `replay`,
`event_at`. With a template, any field is a token: `{{ payload:subscription.product }}`,
`{{ payload:brand.handle }}`; a block addressed as a whole is written as JSON. See
[Payload templates](/webhook-manager/templates).

<Figure
  src="webhook-manager-deliveries-suite"
  alt="The Deliveries list in a German Control Panel: successful POST deliveries for Kurse: Lektion abgeschlossen, Funnels: Schritt betreten, Partner: Bewerbung eingegangen, Partner: Provision verdient and Zahlungen: Zahlung eingegangen, each with its object type and id"
  caption="Deliveries from four addons in the playground, each labelled Group: moment, with the object it is about. The receiver was a local test endpoint." />

### What never goes out

The addons choose their fields; they never serialize a whole model. Across the six, no payload
carries card digits or labels, mandates, provider raw responses, tokens of any kind (seats,
invitations, thank-you links, the portal, a funnel visit), payout details (IBAN, PayPal),
passwords, or a full IP address (a blocked checkout sends the network only). Each addon's
Webhooks page lists what it leaves out.

### Brand

Outbound webhooks are brand-scoped. The addons dispatch in the brand of the row the event is
about, so a subscription of brand B fires brand B's hooks, whichever brand the request or the
command happened to be in. A row whose brand cannot be set up logs a warning and sends nothing
rather than firing another brand's hooks.

### Order and duplicates

**The order of deliveries is not guaranteed.** Deliveries run on the queue and retry on their
own schedule, so "subscription paused" can arrive after "subscription resumed". A receiver
should sort by `occurred_at` and drop duplicates by `event_id`.

The addons dispatch after the database transaction commits, so a receiver that looks the
object up again finds it written. A transaction that rolls back sends nothing.

## Idempotency headers

From **2.10** every outbound request carries an id the receiver can dedupe on:

| Header | When | Value |
| --- | --- | --- |
| `X-Webhook-Id` | always | the delivery's idempotency key |
| `Idempotency-Key` | the hook's **Idempotency** switch is on | the same key |

When the payload has an `event_id` (a string or integer of at most 128 characters), that is
the key, so the same event keeps its key however often it is dispatched. Without one, the key is
a hash over hook, trigger, source reference and the moment the event was built. A retry, and a
replay from the stored snapshot, resend the first value. A replay with re-rendering builds a new
request, and its key differs. A header of the same name configured on the hook wins.

An `event_id` is the same for every hook the event fires, so two hooks posting the same event
to one receiver share a key. If the receiver dedupes across hooks, that is what you want; if
not, point them at different receivers.

Some moments have no time of their own, and two of them in quick succession can share an
`event_id`: an invoice mailed again, a lesson unlocked, a team seat freed, a quiz submission
without a response id. A receiver that dedupes strictly by `event_id` sees the second one as a
duplicate.
