# Automations

<AddonHeader />

A visual automation layer built specifically for Statamic websites. Create flows from
forms, content events, LeadHub contacts and webhooks — without writing a custom Laravel
listener for every small process.

Build with **Trigger**, **Filter**, **Branch**, **Delay** and **Action** nodes, test
them with real sample data, and inspect every run with node-by-node logs.

It is not a full n8n replacement. It is the **missing automation layer** for Statamic
websites, and it is the **orchestration** layer of this suite: multi-step workflows,
where [Webhook Manager](/webhook-manager/) is the single reliable request.

<Figure
  src="automations-builder"
  alt="The visual flow builder showing a trigger, a filter, a branch into two actions, a delay and a final action, each marked READY"
  caption="A trigger, a filter, a branch, a three-day delay and four actions. Every node reports its own validation state." />

## Why it exists

Typical website automations otherwise demand custom Laravel events and listeners,
hand-rolled webhooks, a third-party tool like Zapier or Make, or an opaque lead
pipeline nobody can explain. For most Statamic projects an external automation tool is
overkill, and custom code for every small workflow is expensive to maintain.

## What you get

- **Visual node-based flow builder** in the Control Panel
- **Triggers** for forms, entries, assets, users, leads and webhooks
- **Filter** and **Branch** nodes for logic, **Delay** for waiting
- **Actions** for email, webhooks, LeadHub updates and Statamic changes
- **A token picker** for event data: `{{ form.email }}`, `{{ lead.full_name }}`
- **Test runs** with real sample data and no real side effects
- **Node-by-node execution logs**, with redacted payloads and optional encryption at
  rest
- **Optional Webhook Manager and LeadHub integrations**, auto-detected, never required
- **Templates** that copy into user-owned automations
- **JSON export and import** for version control and cross-environment moves
- **A public developer API** for custom triggers, actions and conditions

## Quick start

1. CP → **Automations → New automation**.
2. Drag a **Trigger** onto the canvas from the node library, e.g. *Form Submitted*.
3. Add **Filter** or **Branch** nodes if you need conditions.
4. Add **Action** nodes, e.g. *Send Email*.
5. Connect nodes by dragging between handles.
6. **Validate**, then **Test** with sample data.
7. Toggle **Enabled**.

Or skip steps 2 to 5 and start from a [template](/automations/templates): the eight
most common patterns ship as one-click installs.

## Editions

| Edition | Includes |
| --- | --- |
| **Free** | The full visual builder, all triggers, all logic nodes, the core actions |
| **Pro** | Premium features: the AI action and custom node registration |

The active edition is resolved natively through Statamic's licensing system, and the
CP's licensing utility shows your status. A Free install is not crippled — the builder,
the triggers, the branches and the actions you use daily are all in it.

## What it is not for

- **A newsletter.** Its send-email action is for one transactional message.
  [Marketing](/marketing/) owns lists, consent and tracking.
- **A reliable single webhook.** That is [Webhook Manager](/webhook-manager/), which
  owns retries, signing and delivery records. An automation can delegate its HTTP
  calls to it and inherit all of that.
- **Loops or parallel execution.** Explicitly out of scope for v1, along with code
  nodes.

::: warning Do not wire the same event twice
Both this addon and Webhook Manager can react to the same Statamic event. Pick one
place per concern: if a save should just fire a webhook, configure it there; if it
should run a multi-step workflow, build it here. Wiring both double-fires, and both
configurations look individually correct. See [Boundaries](/guide/boundaries).
:::

## Next

- [Installation](/automations/installation)
- [Configuration](/automations/configuration)
- [Concepts](/automations/concepts) — the engine, the run, the token resolver
- [Building an automation](/automations/building)
- [Node catalogue](/automations/nodes) — every built-in trigger, logic node and action
- [Runs & debugging](/automations/runs) — test mode, logs, partial retry
- [Templates](/automations/templates) — the eight that ship
- [Export, import & file sync](/automations/export-import)
- [Integrations](/automations/integrations) — LeadHub and Webhook Manager
- [Extending](/automations/extending) — custom nodes with no front-end build
