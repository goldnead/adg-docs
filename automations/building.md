# Building an automation

<AddonHeader />

## The loop

1. CP → **Automations → New automation**.
2. Click the **+** in the middle of the empty canvas. That arms the node library on the
   left; the next node you click there becomes the trigger.
3. Configure it. A trigger's config form is generated from its schema, so it shows only
   what that trigger actually needs.
4. Click the **+** under the trigger and pick the next node — a **Filter** or **Branch**
   if you need conditions, then your **Action** nodes.
5. **Validate**.
6. **Test** with sample data.
7. Toggle **Enabled**.

Or start from a [template](/automations/templates) and edit it, which is faster for any
of the eleven common patterns.

## The canvas places and connects nodes for you

There is no dragging. Nodes are not movable, connections are not drawn by hand, and the
layout is computed from the graph.

**Adding a node.** Every open output carries a **+**. Click it and the node library on
the left switches into pick mode with a banner naming the spot; the next node you click
lands exactly there, already connected. Clicking the same **+** again cancels.

**Inserting between two nodes.** Every connection carries its own **+** at its midpoint.
Click it, pick a node, and it is spliced in with both edges rewired.

**Everything else about a node** — rename, duplicate, remove — is in the menu on the node
card itself.

This is a deliberate trade. You cannot arrange a flow into a picture, and in exchange a
flow cannot end up with an orphan node, a dangling edge or two nodes sitting on top of
each other. Branch outputs are labelled *If true* and *If false* on the canvas, and a
Switch's outputs follow the cases you configure.

## One trigger per automation

A flow has exactly one entry point. Two triggers means two automations, which is more
verbose and much easier to reason about when one of them misbehaves.

If two events should do the same thing, put the shared work in its own automation on a
*Manual* trigger and have both callers end in a **Call Automation** node. That is the
supported way to share a subflow, and it keeps the shared part in one place. Nesting is
capped by `max_call_depth`, default `3`.

## Filter or Branch

Both evaluate conditions. The difference is what happens when they are false.

| Node | False path |
| --- | --- |
| **Filter** | The run stops, with status `stopped` |
| **Branch** | The run continues down the `false` path |

Use **Filter** for "only continue if". Use **Branch** when both outcomes need to do
something.

A `stopped` run is a normal outcome and not a failure. In the run list it is
distinguishable from `completed` and from `failed`, which matters when you are asking
"did this fire and choose not to act, or did it never fire at all".

## Delay

A Delay node persists the run and stops; `automations:run-due` resumes it. Minutes,
hours or days.

::: warning A delay needs the scheduler
Without `schedule:work` or a cron entry calling `schedule:run`, a delayed run waits
forever. No error, no failed job, no alert. This is the quietest failure mode in the
suite, and the first thing to check when "the follow-up never went out".
:::

## Using event data

Nodes take tokens:

```
{{ form.email }}          {{ lead.full_name }}
{{ entry.title }}         {{ lead.status }}
{{ user.email }}          {{ secret.slack_webhook }}
```

Use the builder's **token picker** rather than typing them. What is available depends on
the trigger, and the picker lists what the trigger actually provides.

`{{ secret.* }}` reads from the `secrets` map in `config/automations.php`. Prefer it for
credentials: an automation definition can be exported to JSON and committed, and a
literal API key in a node's config goes with it.

## Validate before you test

**Validate** checks the graph: a trigger present, no orphan nodes, no dangling
connections, required config filled in, no unknown node types.

It is worth running on an automation you have just imported or edited from a template,
because an import warns about missing integrations rather than refusing, and validation
is where that surfaces as something you can act on.

## Test, then enable

**Test** runs the real flow against sample data and, by default, performs no real side
effects:

```php
'test_mode' => [
    'send_real_webhooks' => false,
    'send_real_emails' => false,
    'persist_leadhub_changes' => false,
    'persist_statamic_changes' => false,
    'call_real_ai' => false,
],
```

So a green test proves your flow is right, not that the destination accepts the payload.
For the second question, flip the one switch you need, deliberately and temporarily.

Then toggle **Enabled**. An automation is disabled until you say otherwise, and every
imported automation starts disabled.

## Autosave

The builder autosaves as you work, so a closed tab does not lose the canvas.

Autosave is not the same as enabling: a saved automation with `Enabled` off does nothing.
That separation is why autosave is safe.

## Version history

Every save snapshots the automation's graph, so an edit is reversible.

Snapshots are stored as **Statamic Revisions** — flat-file YAML in the revisions store,
under a key that keeps automation history away from entry and term revisions. Automation
history therefore sits alongside content history and travels with it.

The builder lists the stored versions newest first, with who saved each one, and reverts
to any of them in one step. A revert is itself a save, so it is snapshotted too and can
be undone.

```php
'versioning' => [
    'enabled' => true,
    'keep' => 25,
],
```

`keep` caps how many revisions are retained per automation; older ones are pruned as new
ones are written. Set `enabled` to `false` and saves stop being snapshotted, which also
means there is nothing to revert to.

Version history is per automation and is not the same thing as the
[audit log](/automations/runs#the-audit-log), which records who did what across all of
them.

## Ordering, and what happens on failure

Nodes run along their connections, in order. A node that throws fails the run, and the
run log shows which node it was, with its input and output.

Failed runs can be retried **from the failing node** rather than from the start, which
matters when the first three nodes had side effects you do not want twice. See
[Runs & debugging](/automations/runs#partial-retry).

## Practical shape of a good automation

Three habits that keep flows debuggable:

**Filter early.** Put the cheapest, most selective condition first, so the runs you
look at in the list are the ones that did something.

**One responsibility per automation.** "New lead → notify + tag" is a flow. "New lead →
notify + tag + create opportunity + schedule follow-up + post to Slack + update the
spreadsheet" is a script that will be hard to change. Split it, and let the second one
trigger on a LeadHub event the first one caused.

**Delegate HTTP.** Use *Send Webhook (via Webhook Manager)* rather than *Send Webhook
(Simple)* wherever the destination matters. The simple action is a direct POST with no
retries, no signing and no delivery record.

## A worked example

Notify the team and tag the lead when a workshop inquiry arrives, then schedule a
follow-up for three days later.

| Node | Config |
| --- | --- |
| Trigger: Form Submitted | form `workshop-inquiry` |
| Filter | `{{ form.email }}` is set |
| Action: Create or Update Lead | email `{{ form.email }}`, name `{{ form.name }}` |
| Action: Add Lead Tag | `workshop` |
| Action: Send Email Notification | to the team, subject `Workshop inquiry: {{ form.name }}` |
| Delay | 3 days |
| Action: Create Follow-up | body `Reply to {{ form.name }}` |

This is the *Workshop Inquiry Flow* template, near enough. Installing that and editing
it is faster than building it, which is what the templates are for.
