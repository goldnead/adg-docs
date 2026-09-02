# Sequences

<AddonHeader />

A sequence is a series of mails a person receives after an event: after a purchase, after a
completed funnel, after a tag was set on the contact. **Marketing → Sequences**, behind
`manage marketing sequences`; reading the list is `view marketing`.

## What a sequence is

A sequence is edited as a list, and that is all it stores:

| | |
|---|---|
| **Trigger** | Any trigger `goldnead/statamic-automations` knows — `payments.paid`, `funnels.completed`, `leadhub.lead_tag_added`, `marketing.subscribed`, and whatever a sibling registers. The trigger's own fields (a product filter, a tag) are edited on the same screen. |
| **Mailing list** | Where consent comes from. A person without a subscribed subscription on this list is not mailed, whatever the trigger says. Required, because a template carries no list of its own. |
| **Steps** | One mail per step: an `et_templates` template, an optional subject, and the gap measured from the previous step (the first one from the trigger). |
| **Active** | Off keeps the automation but enrolls nobody. |

## What a sequence does

**A sequence is a view plus a generator, not a second scheduler.** Saving one writes exactly the
automation you would otherwise build by hand on the canvas:

```
trigger ─► mail_1 ─► delay_2 ─► mail_2 ─► delay_3 ─► mail_3
```

- The trigger node, with *re-entry: once per person* unless the trigger config names its own rule.
  A series is something a person goes through once.
- For every step, a `delay` node when the step has a gap, then a `marketing.send_email` node in
  template mode — the node described under [Automations](./campaigns#automations), which asks for
  consent, suppression, opt-out and the frequency cap in that order.
- Edges in one straight line, every node on the `default` output.

The engine's `automation_scheduled_jobs` is the only queue; the marketing send path is the only
sender. The sequence adds neither.

### Node keys are positional

`trigger`, `mail_1`, `delay_2`, `mail_2`, … A second save of the sequence rewrites the whole
graph — but a run that is asleep in `delay_2` wakes up on a node that still exists and still means
"the gap before mail two". Reordering steps, or changing a template, a subject or a gap, changes
what a sleeping run gets next; it does not lose the run.

::: warning Removing steps ends the runs waiting on them, and you are asked first
The keys past the new last step are gone with it, and so is a `delay_n` whose gap you set back to
zero. A run asleep on one of those has nothing left to wake up on.

The editor refuses that save and says how many people it affects: *3 people are waiting on steps
this save removes.* Take the steps back, or confirm. Nothing is written until you do — not the
steps, not the graph.

On a confirmed save those runs are **ended right there**: the wake-up call is cancelled and the run
is closed as `cancelled`, with *the sequence "…" was shortened and the step this run was waiting
for no longer exists* on it. That happens at the moment you decide, rather than days later as a
failed run in a log nobody on the marketing side reads. Everybody whose next step still exists is
unaffected.
:::

### The subject stands on the node

`marketing.send_email` in template mode takes its subject from the node and from nothing else.
So the sequence writes it there: the step's own subject if you set one, otherwise the subject the
template entry carries **at the moment the sequence is saved**. A template whose subject changes
later reaches the automation on the next save of the sequence; the editor shows which subject will
be written. A step with no subject anywhere is refused at save rather than found in an inbox.

### Marked, not locked

The automation carries `created_by = marketing.sequence:<handle>` and a description that names
the sequence. The automations addon has no read-only flag for a flow, so the canvas can still edit
it — and the next save of the sequence overwrites those edits. Both screens say so. If you want to
build something the list cannot express (a branch, a filter, a CRM write between two mails),
build it on the canvas as an ordinary automation instead of a sequence.

### Deleting

Deleting a sequence **disables** its automation and keeps it, together with its runs. They are the
record of what went to whom. An editor who wants the automation gone deletes it in Automations.

## Without automations

A sequence can be written and is kept. The list and the editor show *Automations not installed —
the sequence does not run*, and nothing is sent. Install `goldnead/statamic-automations`, save the
sequence once, and the automation is written.

## Broadcasts

The other half of the pair — one mail to many, with an A/B test — is the
[campaign](./campaigns). There is no separate broadcast object, because there is nothing a
broadcast would carry that the campaign does not: subject, body, list and segment, scheduled and
sent time, the report, and the subject-line split through `variant_subject`. The A/B test share
(`ab_share`) is described there.
