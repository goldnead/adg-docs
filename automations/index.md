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
- **Eighteen built-in triggers** for forms, entries, terms, users, assets, globals,
  navigations and a schedule, plus lead and webhook triggers from the siblings
- **Eleven logic nodes**: Filter, Branch, Switch, Stop, Delay, Wait Until, Loop,
  Parallel, Throttle, Set Variable and Call Automation
- **Actions** for email, webhooks, LeadHub updates and Statamic changes
- **A token picker** for event data: `{{ form.email }}`, `{{ lead.full_name }}`
- **Test runs** with real sample data and no real side effects
- **Node-by-node execution logs**, with redacted payloads and optional encryption at
  rest
- **Version history and an audit log** for every automation, with one-click revert
- **Optional Webhook Manager, LeadHub and Marketing integrations**, auto-detected, never
  required
- **Eleven templates** that copy into user-owned automations, and an API to register
  your own
- **JSON export and import** for version control and cross-environment moves
- **A public developer API** for custom triggers, actions, logic nodes, option sources
  and event triggers

## Quick start

1. CP → **Automations → New automation**.
2. Click the **+** on the empty canvas, then pick a trigger from the node library on the
   left, e.g. *Form Submitted*.
3. Configure it in the panel on the right.
4. Click the **+** below the trigger and pick the next node, a **Filter** or **Branch**
   if you need conditions, then an **Action** such as *Send Email*. Each node lands where
   you clicked and is wired up for you.
5. **Validate**, then **Test** with sample data.
6. Toggle **Enabled**.

Or skip steps 2 to 4 and start from a [template](/automations/templates): eleven common
patterns ship as one-click installs.

## The Control Panel screens

The **Automations** entry in the Tools section of the CP nav opens on seven screens:

| Screen | What it is for |
| --- | --- |
| **Dashboard** | How many automations exist, how many are enabled, the success rate, a fourteen-day run trend and the most recent failures |
| **Automations** | The list, and the builder behind it |
| **Runs** | Run history with node-by-node logs and partial retry |
| **Audit log** | Who changed, enabled, disabled or deleted which automation, and when |
| **Automation templates** | The eleven starting flows, one click to install |
| **Import** | Upload an exported JSON definition |
| **Settings** | Licence status, which siblings were detected, and the resolved queue, run, test-mode, feature and redaction configuration |

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
- **Arbitrary code in a flow.** There is no code node, deliberately: it would turn a
  visual flow into a place where logic hides from review. Register a custom action
  instead.

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
- [Templates](/automations/templates) — the eleven that ship, and registering your own
- [Export, import & file sync](/automations/export-import)
- [Integrations](/automations/integrations) — LeadHub and Webhook Manager
- [Extending](/automations/extending) — custom nodes with no front-end build
