# LeadHub

<AddonHeader />

Turn Statamic form submissions into contacts, timelines and follow-ups, directly inside
your Control Panel.

Instead of treating every form submission as an isolated event, LeadHub creates contacts,
merges repeated inquiries by email, tracks a timeline of submissions and notes, and helps
you follow up with the right leads at the right time.

It is **not** a full CRM. It is the missing layer between your website forms and your
sales tools — and it can grow into a lightweight CRM when you turn the opt-in modules on.

<Figure
  src="leadhub-contacts"
  alt="The LeadHub contact list, showing status, engagement score, tags, source, owner and follow-up columns"
  caption="Contacts, filterable by status, tag, source, owner, follow-up state and engagement score." />

## What you get out of the box

- **Contacts from forms** — every submission becomes a contact, deduplicated by email
- **Timeline per contact** — submissions, notes, status changes, tag changes and
  follow-ups in one chronological view
- **Lead status workflow** — `New → Contacted → Qualified → Won / Lost`, with history
- **Follow-ups** — one next action per contact; what is due today, what is overdue
- **Tags** — manual or rule-driven
- **Per-form mapping** — toggle LeadHub per form, map each form's fields to contact fields
- **Filterable list and CSV export**
- **Dashboard** — KPIs, latest activity, due and overdue follow-ups
- **Assignment and notifications** — an owner per lead; email the team on new leads,
  assignments, and a daily follow-up digest
- **Marketing attribution** — UTM parameters, referrer and landing page from the
  originating submission
- **CRM connectors** — push contacts to HubSpot, Brevo or any webhook, with a per-attempt
  sync log
- **A complete outbound event surface** — 25+ domain events across the contact lifecycle

## CRM-core modules, off by default

These grow LeadHub from lead capture into a lightweight CRM. All require the **eloquent**
driver; enable them under `features` in `config/leadhub.php`.

| Module | What it adds |
| --- | --- |
| `ingestion` | `LeadHub::ingest()` turns *any* source — purchases, bookings, logins, inbound webhooks — into contacts and timeline entries, deduplicated and idempotent |
| `companies` | B2B company records, deduplicated by domain or name, linked to contacts |
| `tasks` | Many tasks per contact, with priority, assignee and due date |
| `pipelines` | Multi-pipeline deal tracking with stages, won/lost outcomes, a Kanban board |
| `merge` | `LeadHub::merge()` re-parents a duplicate's timeline, notes, tasks and opportunities |
| `scoring` | An `engagement_score` per contact, with a per-brand point table |
| `segments` | Dynamic, rule-based groups, materialised and kept fresh |

Plus **consent**: `do_not_contact` is honoured by every CRM connector, and
`LeadHub::optOut()` actively removes the contact from supported destinations.

## The shortest useful path

1. CP → **LeadHub → Forms**, **Configure** the form you want to capture.
2. Toggle **Enable LeadHub for this form**.
3. Map the email field (required) and anything else you want.
4. Save.

The next submission appears in **LeadHub → Contacts**, with a timeline.

## Two storage drivers

| Driver | Config and data live in | Good for |
| --- | --- | --- |
| `eloquent` (default) | dedicated database tables | any project past ~500 contacts; required for the CRM-core modules |
| `flat` | YAML under `content/leadhub/` | ≤500 contacts and ≤10k events; git-versionable lead data |

See [Storage drivers](/leadhub/storage).

## What it deliberately does not do

- **Bidirectional CRM sync.** Contacts are pushed out; status and owner changes are not
  pulled back. On the roadmap, not shipped.
- **A manual contact merge UI.** `LeadHub::merge()` exists; the screen does not.
- **GDPR anonymisation.** Archive and delete are what exist today. See
  [Privacy & retention](/guide/privacy#what-is-not-built-yet).
- **Its own webhook-sending UI.** It fires events instead, and pairs with
  [Webhook Manager](/webhook-manager/) with no glue code.

## Next

- [Installation](/leadhub/installation)
- [Configuration](/leadhub/configuration)
- [Concepts](/leadhub/concepts) — contacts, events, the ingestion path
- [Forms & contacts](/leadhub/contacts) — mapping, dedupe, statuses
- [Timelines & events](/leadhub/timelines)
- [Assignment & notifications](/leadhub/assignment)
- [Ingestion API](/leadhub/ingestion) — any source, not just forms
- [Pipelines & tasks](/leadhub/pipelines)
- [Segments](/leadhub/segments)
- [Lead scoring](/leadhub/scoring)
- [CRM connectors](/leadhub/crm-connectors)
- [Storage drivers](/leadhub/storage)
- [Extending](/leadhub/extending)
