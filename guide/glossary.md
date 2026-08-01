# Glossary

Terms that mean something specific in this suite, and would be ambiguous
otherwise.

**Action** — a step that does something. In [Automations](/automations/nodes) a
node on the canvas; in [Webhook Manager](/webhook-manager/rules) the *Then* half
of a rule; in [Webhook Manager inbound](/webhook-manager/inbound) a named handler
an incoming request is routed to.

**Activity** — one immutable row in the ledger: a fact that happened, with an
actor, a subject and properties. Not a metric, and never edited.

**Anonymous id** — a pseudonymous visitor identifier stored in the session that
already exists. Sets no cookie of its own, so it adds no consent surface.

**Brand** — the tenant in [Brand Context](/brand-context/). A default brand always
exists; the machinery is invisible until multi-brand mode is on.

**Brand member** — a Control Panel user affiliated with a brand. Affiliation only,
never authorisation. A user with **no** membership anywhere counts as a member of
every brand.

**Campaign** — one send in [Marketing](/marketing/campaigns): a subject, a body, an
audience, a schedule, and its report.

**Circuit breaker** — Webhook Manager auto-disabling a hook after
`circuit_breaker.threshold` consecutive terminal failures, so a dead endpoint stops
generating deliveries.

**Contact** — a person in [LeadHub](/leadhub/contacts), deduplicated by normalised
email within a brand. A Marketing subscriber *is* a LeadHub contact; there is no
separate subscriber record.

**Dedupe key** — a caller-supplied fingerprint of a *fact*, so the same fact
reaching two producers yields one record. Scoped per brand. Distinct from
`event_id`, which guards against the same *physical* event arriving twice. See
[Idempotency](/activity/recording#two-idempotency-keys).

**Delivery** — one attempt to deliver an outbound webhook, with a full snapshot of
request, response, status, error classification, attempt count and retry schedule.

**Digest** — a periodic summary in [Notifications](/notifications/digests), covering
a real window (24 hours or 7 days) and recording that it sent, so an unread item is
not mailed again every week.

**do_not_contact** — a flag on a LeadHub contact. Every CRM connector honours it and
never pushes an opted-out contact.

**Double opt-in** — confirmation of a Marketing subscription via a tokenised link.
Per list, on by default for new lists.

**Edition** — Free or Pro, for Automations. Resolved through Statamic's own
licensing system.

**Event** — overloaded, so the docs qualify it. A *Laravel event* is a PHP class
dispatched by an addon. A *timeline event* is a row in LeadHub's per-contact log. An
*activity* is a row in the ledger. A *message event* is an open, click, bounce or
complaint in Marketing.

**Event trigger** — turning an arbitrary application event into a trigger, in either
integration addon, with one registration and no listener class of your own.

**Fail closed** — in multi-brand mode with no current brand resolved, a query on a
branded model returns **no** rows rather than all of them. The default.

**Fail-safe** — the addon catches its own exception, logs it, and returns. A CRM
write must not roll back the form submission that caused it. Where this does not
hold, the page says so.

**Flat driver** — configuration stored as YAML under `content/`, git-versionable.
Never means "no database": runtime telemetry is always Eloquent. See
[Storage drivers](/guide/storage).

**Follow-up** — in LeadHub, the single next action on a contact, with a due date.
Distinct from a **task**, of which a contact may have many.

**Identity** — a readonly bag of scalars answering "who did this?", safe to persist
and to put on a queue. See [Identity](/guide/identity).

**Inbound endpoint** — a stable HTTPS URL in Webhook Manager that receives and
validates external requests, then routes them to an action handler.

**Ingestion** — LeadHub's generic path for turning any source (a purchase, a
booking, a login, an inbound webhook) into a contact plus a timeline entry,
deduplicated and idempotent.

**Integration preset** — a guided "pick a destination, fill in a URL" setup in
Webhook Manager for Slack, Discord, Teams, Zapier, Make, n8n or generic JSON, so
you never hand-write a payload template.

**List** — a Marketing mailing list. **A list grants consent.** Compare *segment*.

**Opportunity** — a deal in a LeadHub pipeline, with a stage, a value, a confidence
and full stage-transition history.

**Pipeline** — an ordered set of stages with terminal won and lost outcomes.
Multiple pipelines are supported.

**Producer** — a mapper registered with Activity that turns a domain event into a
ledger row, without the ledger knowing your code. Registering the same event class
again replaces the mapper; it never adds a second listener.

**Replay** — re-sending a failed delivery, individually or in a batch, optionally
re-rendering the payload against current data.

**Required type** — a Notifications type marked `->required()`, which ignores
preferences. For account security and legal notices only.

**Rule** — in Webhook Manager, a `When → If → Then` flow. Distinct from an
automation, which has branches, delays and a sequence of steps.

**Run** — one execution of an automation, with node-by-node logs and redacted
payloads.

**Segment** — a dynamic group of LeadHub contacts defined by rules, materialised and
kept fresh reactively plus a daily sweep. **A segment only narrows.** A campaign
audience is `subscribed list members ∩ segment members`; a segment can never add a
recipient. An empty rule set matches nobody.

**Source** — overloaded, so the docs qualify it. An *activity source* is the
application that recorded a fact. A *digest source* contributes items nobody was
notified about. An *option source* populates a select in an Automations node form.
An *import source* feeds Email Templates.

**Storage driver** — see *flat driver*. Governs where **configuration** lives, never
runtime data.

**Subject** — the thing a fact or a notification is about, as a polymorphic model
reference. Distinct from the *actor*, who did it.

**Suppression** — an address that must not be sent to again by any addon in the
suite, typically after a hard bounce or a complaint. It is recorded once and
asked once, through the [Suppression](/suppression/) gate, so a bounce seen by
Marketing also stops a Notifications mail. Distinct from an unsubscribe, which
is the person's own decision about one list.

**Preference centre** — the public page served by
[Preference Center](/preference-center/) where a person changes what they
receive: mailing lists, notification types, cadence and block state, on one
screen and without an account. From Marketing 1.9.0 this addon owns that page
outright; Marketing keeps only the one-click unsubscribe.

**Task** — in LeadHub, one of many to-dos on a contact, with a priority, an assignee
and a due date. Requires the eloquent driver.

**Timeline** — a LeadHub contact's chronological log: submissions, notes, status
changes, tag changes, follow-ups, score changes. Not replaced by Activity; the two
overlap deliberately.

**Trigger** — the internal event that starts something. In Webhook Manager a handle
like `entry.published` or `leadhub.status.changed`; in Automations the first node on
the canvas.

**Type** — in Notifications, a registered definition of what a notification is
called, which channels it uses by default, and how it renders. Rendering is a
callback, not a template, so the host owns the wording and the URLs.

**Variable resolver** — the registry behind Webhook Manager's token renderer, which
turns `{{ entry:title }}` or `{{ system:timestamp_iso }}` into a value.
