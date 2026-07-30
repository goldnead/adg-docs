# The suite

Ten packages, five layers. Every arrow below is a Composer dependency; anything
not drawn is optional and detected at runtime with `class_exists`, which is why
you can install any addon without the rest.

```
┌─ Foundation ──────────────────────────────────────────────┐
│  brand-context            identity-contracts              │
└──────┬──────────────────────────┬─────────────────────────┘
       │                          │
       ├──────────────┬───────────┴────────┬─────────────┐
       ▼              ▼                    ▼             ▼
  webhook-manager  automations         activity    notifications
       │              │                    ▲             ▲
       │              │                    └──── producers, sources
       ▼              ▼                          (auto-detected)
    ┌─────────────────────────────┐
    │  leadhub  ◄──── marketing   │   marketing requires leadhub
    └─────────────────────────────┘
                 ▲
                 └─── email-templates (optional both ways)

  toc — standalone, no dependencies beyond statamic/cms
```

## The ten

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
of the suite can record an actor without depending on your `User` model.

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
handling for bounces and complaints. This is the one hard inter-addon
dependency in the suite: Marketing requires LeadHub, because a subscriber *is* a
LeadHub contact.

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

### Content tooling

**[Table of Contents](/toc/)** &nbsp;·&nbsp; `goldnead/statamic-toc`

A tag and a modifier that build a nested table of contents from a Bard field, a
Markdown field or any HTML string, and add matching anchor ids to the rendered
headings. No config, no migrations, no CP screens.

## Which ones talk to each other

| If you install… | …and also | You get, with no configuration |
| --- | --- | --- |
| LeadHub | Webhook Manager | Every LeadHub lifecycle event registered as a webhook trigger (`leadhub.contact.created`, `leadhub.status.changed`, …) |
| LeadHub | Automations | Five LeadHub triggers and seven LeadHub actions in the flow builder |
| LeadHub | Notifications | Task-assignment notifications, plus open tasks contributed to the digest |
| LeadHub | Activity | `crm.*` facts recorded in the ledger |
| Marketing | Webhook Manager | Marketing events as outbound triggers, plus the `marketing.process_esp_event` inbound action for Mailgun/Postmark bounce webhooks |
| Marketing | Automations | Marketing triggers and actions in the flow builder |
| Marketing | Activity | `marketing.*` facts recorded in the ledger |
| Marketing or Automations | Email Templates | CP-authored templates available to campaigns and email actions |

Detection is one-way and passive: the addon that *offers* the integration checks
whether the other is present. Nothing needs to be enabled on the other side.

::: warning Two addons, one event
Automations and Webhook Manager can both react to the same Statamic event. Pick
one place per concern, or you will double-fire. See
[Boundaries](/guide/boundaries).
:::
