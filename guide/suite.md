# The suite

Twenty-six packages, six layers. Every arrow below is a Composer dependency;
anything not drawn is optional and detected at runtime with `class_exists`,
which is why you can install any addon without the rest.

All twenty-six are tagged, and twenty-four of them are published on Packagist, so
`composer require` resolves any of those and pulls in whatever it depends on.
Client Rooms and Assessments are not published yet; see
[Client Rooms → Installation](/clientrooms/installation) and
[Assessments → Installation](/assessments/installation).

```
Foundation ──────────────────────────────────────────────────────────

  brand-context          required by 13: webhook-manager, automations,
                                         leadhub, marketing, activity,
                                         notifications, suppression,
                                         preference-center, entitlements,
                                         lead-magnets, assessments, events,
                                         invoices

  identity-contracts     required by 4:  activity, notifications,
                                         preference-center, entitlements

  suppression            required by 2:  marketing, notifications
                         (and itself requires brand-context)

  flow-canvas            required by 2:  automations, funnels
                         (the editor, consumed twice)

Between the domain addons ───────────────────────────────────────────

  marketing     ──requires──▶  leadhub
  lead-magnets  ──requires──▶  entitlements

Commerce ────────────────────────────────────────────────────────────

  payments               required by 4:  products, offers, invoices, funnels

  products   ──requires──▶  payments
  offers     ──requires──▶  payments
  invoices   ──requires──▶  payments
  funnels    ──requires──▶  payments, offers, flow-canvas

  insights               requires nothing at all: every figure on its
                         screens is registered at runtime by the addon
                         that owns the table behind it

Standalone ──────────────────────────────────────────────────────────

  webhook-manager · automations · activity · notifications ·
  email-templates · preference-center · entitlements ·
  assessments · events · toc · booking · clientrooms · consent

  — none of these requires another domain addon.
```

Everything not drawn is optional and resolved at runtime with `class_exists`,
which is why any addon installs without the rest. Three of those runtime links
are worth naming, because they look like dependencies and are not:

- **`preference-center` requires none of the three addons whose preferences it
  renders.** It detects Marketing, Notifications and Suppression at boot and
  renders an empty state when none is installed.
- **`marketing` finds `preference-center`, not the other way round.** Marketing
  resolves its footer link to the preference page when that package is present,
  and to its own unsubscribe page when it is not.
- **`activity`'s producers for LeadHub and Marketing ship with Activity**, not
  with the addons they mirror.

`suppression`, by contrast, really is a Composer dependency of `marketing` and
`notifications` rather than an optional extra: both ask the gate before they
queue mail, and a gate that might not be there would be no gate at all.

## The twenty-six

### Foundation

**[Brand Context](/brand-context/)** &nbsp;·&nbsp; `goldnead/statamic-brand-context`

Optional multi-brand (multi-tenant) support. On a normal install it is a no-op:
one brand, no switcher, no visible machinery. Flip `multi_brand` on and the
global scope isolates every branded model, new records are stamped, and a brand
switcher appears in the CP. The schema is identical in both modes, so enabling
it later needs no migration.

**[Identity Contracts](/identity-contracts/)** &nbsp;·&nbsp; `goldnead/statamic-identity-contracts`

A stable answer to "who did this?". Ships one value object, four contracts and
inert defaults; owns no data, no migrations, no CP screens. It is why the rest
of the suite can record an actor without depending on your `User` model. It is
a plain Composer library rather than a Statamic addon: it requires Laravel and
nothing else, and runs in an application that has no Statamic at all.

**[Suppression](/suppression/)** &nbsp;·&nbsp; `goldnead/statamic-suppression`

The authoritative answer to "may we send to this address at all?". One gate,
one set of reason codes, shared by every addon in the suite that queues mail,
so a hard bounce recorded by one of them stops the others too. Marketing and
Notifications both require it.

### Integration & automation

**[Webhook Manager](/webhook-manager/)** &nbsp;·&nbsp; `goldnead/statamic-webhook-manager`

The **transport** layer. Outbound webhooks fired by Statamic events, inbound
endpoints with signature verification, a delivery engine with retries and
replay, payload templates, auth schemes, rules, alerting, a circuit breaker and
an insights dashboard.

**[Automations](/automations/)** &nbsp;·&nbsp; `goldnead/statamic-automations`

The **orchestration** layer. A visual node-based flow builder in the CP:
triggers, filters, branches, delays and actions, with test runs against sample
data and node-by-node run logs. It can delegate webhook delivery to Webhook
Manager rather than sending its own.

### CRM & marketing

**[LeadHub](/leadhub/)** &nbsp;·&nbsp; `goldnead/statamic-leadhub`

The CRM. Form submissions become contacts deduplicated by email, each with a
timeline, a status workflow, tags, follow-ups and an owner. Opt-in modules add a
generic ingestion API, companies, tasks, pipelines with a Kanban board, contact
merge, lead scoring and rule-based segments.

**[Marketing](/marketing/)** &nbsp;·&nbsp; `goldnead/statamic-marketing`

Email marketing on top of LeadHub contacts: mailing lists with per-list double
opt-in, campaigns composed in Antlers, queued batch sending with a throttle,
open and click tracking, RFC 8058 one-click unsubscribe, and ESP feedback
handling for bounces and complaints. It requires LeadHub, because a subscriber
*is* a LeadHub contact; it also requires Brand Context and Suppression.

**[Preference Center](/preference-center/)** &nbsp;·&nbsp; `goldnead/statamic-preference-center`

The subscriber-facing counterpart to the sending addons: one public page where
a person sees every list of the brand, the notification types they can turn
off, their sending cadence and their suppression state, and changes all of it
without an account. Reached through an encrypted magic link or a tokenised link
in an email footer. It has no Control Panel screen and no Antlers tags. From
Marketing 1.9.0 it owns the full preference page outright; Marketing keeps only
the one-click unsubscribe.

**[Lead Magnets](/lead-magnets/)** &nbsp;·&nbsp; `goldnead/statamic-lead-magnets`

Confirm-first resource delivery: a visitor asks for a file, confirms the
address, and receives a signed, time-boxed, capped and audited download link. A
repeated confirmation activates exactly once, because activation is a
conditional `UPDATE` rather than a check in PHP. How its grants relate to
[Entitlements](/entitlements/) is written down rather than buried; see
[Grant state](/lead-magnets/grant-state).

**[Assessments](/assessments/)** &nbsp;·&nbsp; `goldnead/statamic-assessments`

A questionnaire with points per answer and result levels by score. The visitor
answers, leaves an address and sees the result at once; that result becomes a
contact event in LeadHub and a trigger in Automations, which is the part a quiz
is actually for. The editor refuses levels that overlap, leave a gap, or fail to
cover every achievable score, so nobody can reach a score with no result behind
it. It requires Brand Context and nothing else; LeadHub and Automations are
detected when installed.

**[Email Templates](/email-templates/)** &nbsp;·&nbsp; `goldnead/statamic-email-templates`

Email templates as native Statamic entries with a Bard body, rendered to email
HTML at send time, with Statamic's own Live Preview wired up. Marketing and
Automations consume it optionally; neither depends on it.

### Commerce

**[Payments](/payments/)** &nbsp;·&nbsp; `goldnead/statamic-payments`

The till. Mollie checkout, a webhook that trusts nothing in the request,
fulfilment that runs exactly once, subscriptions, payment plans and trials. One
rule carries the rest: the amount is looked up in the catalogue and never comes
from a request. Mollie rather than Stripe because SEPA, iDEAL and Bancontact are
what a European buyer reaches for, and there is no monthly floor.

**[Products](/products/)** &nbsp;·&nbsp; `goldnead/statamic-products`

The thing that is sold. Payments knows what something costs, Offers knows how it
is presented, Entitlements knows that somebody may reach it — and between those
three the thing itself existed nowhere, so every site invented it again. A
table, a screen under **Utilities → Products**, and two seams onto the payment
catalogue. It delivers nothing on purpose: a product says that a course exists,
what it costs and what a paid copy opens, and what the course *shows* stays the
website's business.

**[Insights](/insights/)** &nbsp;·&nbsp; `goldnead/statamic-insights`

The reporting layer for the family. Other addons contribute the figures; this
one owns the period, the comparison against the period before, the chart, the
splits and the two screens. It owns no data at all: every number is a query
living in the addon that owns the table, which is why a figure here agrees with
the listing it came from. The coupling is optional in both directions and named
in neither package's `require`.

**[Offers](/offers/)** &nbsp;·&nbsp; `goldnead/statamic-offers`

A product *presented*: at a place, for a price that may be its own, with words
about this moment. The same product is a €29 purchase on the sales page and a
€12 upsell on the thank-you page — two offers, one product. Adds bumps and
coupon codes, and hangs into the payment catalogue through its `Catalogue`
seam rather than beside it.

**[Invoices](/invoices/)** &nbsp;·&nbsp; `goldnead/statamic-invoices`

A payment becomes a document: a gapless number per brand, VAT by the buyer's
country, reverse charge on a valid VAT ID, and the per-rate breakdown German law
wants. It renders HTML and stops there — turning that into a PDF is a decision
about infrastructure an addon should not make for its host.

**[Funnels](/funnels/)** &nbsp;·&nbsp; `goldnead/statamic-funnels`

A path somebody is standing on: pages, forms, offers and payments in one flow,
drawn on a canvas. Not an automation — an automation is event then action, a
funnel needs a page and a memory of how far each visitor got. Landing pages come
from ordinary Statamic entries rather than a second, worse page builder.

### Platform services

**[Activity](/activity/)** &nbsp;·&nbsp; `goldnead/statamic-activity`

An append-only ledger of facts, brand-scoped, with two independent idempotency
keys. It stores what happened and computes nothing: no counts, no charts, no
aggregates. Bundled producers mirror LeadHub and Marketing events into it when
those addons are installed.

**[Notifications](/notifications/)** &nbsp;·&nbsp; `goldnead/statamic-notifications`

Persisted notifications with registered types, per-type-and-channel
preferences stored only as deviations, in-app and mail delivery, and digests
with a real window and a record of the send, so an unread item is not mailed
again every week.

**[Entitlements](/entitlements/)** &nbsp;·&nbsp; `goldnead/statamic-entitlements`

Who may access what. One table of grants with a polymorphic subject, one state
machine of six states of which two are read off the clock rather than stored,
idempotency enforced by a unique index present in the first migration, and a
revocation that requires a reason. It decides access and sends nothing: the four
domain events are where a consumer hangs its mail and its account creation.

**[Booking](/booking/)** &nbsp;·&nbsp; `goldnead/statamic-booking`

Records Cal.com bookings: signed, idempotent, one event per real change. It
deliberately builds no calendar — availability, time zones, reschedules and
reminders are a solved problem, and solving them again badly is the usual way a
booking feature goes wrong. An endpoint without a secret refuses every request.

**[Client Rooms](/clientrooms/)** &nbsp;·&nbsp; `goldnead/statamic-clientrooms`

One lasting room per coaching client: tasks, shared documents, the timeline and
two kinds of note, one for the team and one for the client. Entitlements says who
may open what, Booking says how many sessions are left and LeadHub knows the
person — none of them holds the relationship itself, and that is what a room is.
A room is keyed by email address and brand, opened by hand in the Control Panel
or by the first paid coaching product where Payments is installed, and kept when
the access runs out. Documents are downloaded through a signed link that expires
and never shows the storage path. Nothing else in the suite is required: Payments,
LeadHub, Booking and Brand Context are detected with `class_exists`.

**[Flow Canvas](/flow-canvas/)** &nbsp;·&nbsp; `goldnead/statamic-flow-canvas`

The node-graph editor itself, extracted so that Automations and Funnels cannot
drift apart. Node kinds are data and the wording belongs to the host, which is
what lets one editor speak two vocabularies. Infrastructure rather than a
product: it is here for the developer building on it.

### Content tooling

**[Events](/events/)** &nbsp;·&nbsp; `goldnead/statamic-events`

A domain for dated things. One event carries the description and any number of
occurrences carry the dates, so a cancelled date stays a row and a subscriber's
calendar learns it was called off. Times are stored in UTC and shown in the
event's own zone. Three visibility levels decide what leaves the Control Panel,
and a private event never does.

**[Table of Contents](/toc/)** &nbsp;·&nbsp; `goldnead/statamic-toc`

A tag and a modifier that build a nested table of contents from a Bard field, a
Markdown field or any HTML string, and add matching anchor ids to the rendered
headings. No migrations and no CP screens; it does ship a config file and a
publishable view. It is also the one addon in the suite that still supports
Statamic 5 alongside 6.

**[Consent](/consent/)** &nbsp;·&nbsp; `goldnead/statamic-consent`

Cookie banner and two-click embed gate, both edited in the Control Panel.
Antlers and no build step, which is the difference from most consent tooling.
Per service rather than per category: somebody who agreed to a map has not
agreed to advertising. When a page has nothing that needs asking, it asks
nothing.

## Which ones talk to each other

| If you install… | …and also | You get, with no configuration |
| --- | --- | --- |
| LeadHub | Webhook Manager | Every LeadHub lifecycle event registered as a webhook trigger (`leadhub.contact.created`, `leadhub.status.changed`, …) |
| LeadHub | Automations | Six LeadHub triggers and eleven LeadHub actions in the flow builder |
| LeadHub | Notifications | Task-assignment notifications, plus overdue follow-ups contributed to the digest |
| LeadHub | Activity | `crm.*` facts recorded in the ledger |
| Marketing | Webhook Manager | Marketing events as outbound triggers, plus the `marketing.process_esp_event` inbound action for Mailgun/Postmark bounce webhooks |
| Marketing | Automations | Marketing triggers and actions in the flow builder |
| Marketing | Activity | `marketing.*` facts recorded in the ledger, through a producer that ships with Activity |
| Marketing | Preference Center | Marketing's footer links resolve to the combined preference page instead of its own unsubscribe page |
| Notifications or Suppression | Preference Center | Notification types, cadence and block state appear on the same page as the mailing lists |
| Marketing or Automations | Email Templates | CP-authored templates available to campaigns and email actions |
| Lead Magnets | LeadHub | A confirmed request becomes a contact, with the resource's tags written onto it |
| Lead Magnets | Marketing | The confirmed address is subscribed to the list the resource names |
| Lead Magnets or Entitlements or Events | Activity | Their domain events recorded as facts on the ledger |
| Assessments | LeadHub | A completed assessment becomes a contact, with `assessment.completed` and the result level on its timeline |
| Assessments | Automations | The trigger `assessments.completed`, filterable by assessment and by result level |
| Client Rooms | Payments | The first paid coaching product opens that client's room, once |
| Client Rooms | LeadHub | The room shows the contact's merged LeadHub timeline instead of its own short list |
| Products | Offers | The product picker in the offer form lists what the products table holds, brand-scoped, instead of only the config file's handles |
| Anything with figures to report | Insights | The addon's group appears on the Metrics screen, with the period, the chart and the splits supplied by Insights |

Detection is one-way and passive: the addon that *offers* the integration checks
whether the other is present. Nothing needs to be enabled on the other side.

::: warning Two addons, one event
Automations and Webhook Manager can both react to the same Statamic event. Pick
one place per concern, or you will double-fire. See
[Boundaries](/guide/boundaries).
:::
