# The suite

Fifteen packages, five layers. Every arrow below is a Composer dependency;
anything not drawn is optional and detected at runtime with `class_exists`,
which is why you can install any addon without the rest.

::: warning Three of the fifteen are unreleased
`entitlements`, `lead-magnets` and `events` are built and documented but carry
no git tag and are not on Packagist. Everything said about them below describes
their current `main`.
:::

```
Foundation ──────────────────────────────────────────────────────────

  brand-context          required by 11: webhook-manager, automations,
                                         leadhub, marketing, activity,
                                         notifications, suppression,
                                         preference-center, entitlements,
                                         lead-magnets, events

  identity-contracts     required by 4:  activity, notifications,
                                         preference-center, entitlements

  suppression            required by 2:  marketing, notifications
                         (and itself requires brand-context)

Between the domain addons ───────────────────────────────────────────

  marketing  ──requires──▶  leadhub

Standalone ──────────────────────────────────────────────────────────

  webhook-manager · automations · activity · notifications ·
  email-templates · preference-center · entitlements ·
  lead-magnets · events · toc

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

## The fifteen

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

**[Lead Magnets](/lead-magnets/)** &nbsp;·&nbsp; `goldnead/statamic-lead-magnets` &nbsp;·&nbsp; *unreleased*

Confirm-first resource delivery: a visitor asks for a file, confirms the
address, and receives a signed, time-boxed, capped and audited download link. A
repeated confirmation activates exactly once, because activation is a
conditional `UPDATE` rather than a check in PHP. It carries its own grant state
rather than building on Entitlements, which did not exist when it was written;
that deviation is documented rather than buried.

**[Email Templates](/email-templates/)** &nbsp;·&nbsp; `goldnead/statamic-email-templates`

Email templates as native Statamic entries with a Bard body, rendered to email
HTML at send time, with Statamic's own Live Preview wired up. Marketing and
Automations consume it optionally; neither depends on it.

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

**[Entitlements](/entitlements/)** &nbsp;·&nbsp; `goldnead/statamic-entitlements` &nbsp;·&nbsp; *unreleased*

Who may access what. One table of grants with a polymorphic subject, one state
machine of six states of which two are read off the clock rather than stored,
idempotency enforced by a unique index present in the first migration, and a
revocation that requires a reason. It decides access and sends nothing: the four
domain events are where a consumer hangs its mail and its account creation.

### Content tooling

**[Events](/events/)** &nbsp;·&nbsp; `goldnead/statamic-events` &nbsp;·&nbsp; *unreleased*

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

Detection is one-way and passive: the addon that *offers* the integration checks
whether the other is present. Nothing needs to be enabled on the other side.

::: warning Two addons, one event
Automations and Webhook Manager can both react to the same Statamic event. Pick
one place per concern, or you will double-fire. See
[Boundaries](/guide/boundaries).
:::
