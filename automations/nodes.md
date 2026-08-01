# Node catalogue

<AddonHeader />

Everything that ships. Nodes marked *(LeadHub)* or *(Webhook Manager)* appear only when
that addon is installed.

## Triggers

Eighteen triggers ship built in. Each can be switched off individually under
`builtin_nodes` in `config/automations.php`; anything not listed there is on.

| Trigger | Handle | Group | Fires when |
| --- | --- | --- | --- |
| Manual Trigger | `manual` | Manual | You run it, for testing and ad-hoc runs |
| Schedule | `scheduled` | Statamic | An interval or cron expression comes due |
| Form Submitted | `form_submitted` | Statamic | A Statamic form receives a submission |
| Entry Published | `entry_published` | Statamic | An entry is saved **while published** — see below |
| Entry Saved | `entry_saved` | Statamic | An entry is saved, created or updated |
| Entry Created | `entry_created` | Statamic | An entry is created, once, before later saves |
| Entry Saving (before save) | `entry_saving` | Statamic | Right before an entry is persisted |
| Entry Deleted | `entry_deleted` | Statamic | An entry is deleted |
| Term Saved | `term_saved` | Statamic | A taxonomy term is saved |
| Term Deleted | `term_deleted` | Statamic | A taxonomy term is deleted |
| User Registered | `user_registered` | Statamic | A new user registers |
| User Saved | `user_saved` | Statamic | A user is saved, independent of registration |
| User Deleted | `user_deleted` | Statamic | A user is deleted |
| Asset Uploaded | `asset_uploaded` | Statamic | A new file lands in an asset container |
| Asset Saved | `asset_saved` | Statamic | An asset is saved: upload, metadata edit or replace |
| Asset Deleted | `asset_deleted` | Statamic | An asset is deleted |
| Global Set Saved | `global_set_saved` | Statamic | A global set is saved |
| Navigation Saved | `nav_saved` | Statamic | A navigation is saved |

Two more arrive with the sibling addons, and six with LeadHub:

| Trigger | Handle | Group | Fires when |
| --- | --- | --- | --- |
| Webhook Received | `webhook_received` | Webhook Manager | A validated inbound request arrives |
| Lead Created | `leadhub.lead_created` | LeadHub | A new lead is added |
| Lead Status Changed | `leadhub.lead_status_changed` | LeadHub | A lead transitions between statuses |
| Lead Tag Added | `leadhub.lead_tag_added` | LeadHub | A tag is added to a lead |
| Lead Note Added | `leadhub.lead_note_added` | LeadHub | A note is added to a lead |
| Lead Follow-up Due | `leadhub.lead_follow_up_due` | LeadHub | A scheduled follow-up becomes due |
| Contact score changed | `contact_score_changed` | LeadHub | A contact's lead score changes |
| Subscriber Confirmed | `marketing.subscribed` | Marketing | A subscriber confirms |
| Subscriber Unsubscribed | `marketing.unsubscribed` | Marketing | A subscriber unsubscribes |
| Campaign Sent | `marketing.campaign_sent` | Marketing | A campaign finishes sending |

`contact_score_changed` is registered through the public `registerEventTrigger()` API
rather than as a trigger class, which is why its handle carries no `leadhub.` prefix.

::: warning Entry Published is not a transition
Statamic 6 has no `EntryPublished` event, so this trigger is `EntrySaved` gated on
`published()`. It fires on **every save of a published entry**.

An earlier release did not gate it at all and fired on every save, published or not.
If you need the draft-to-published transition, add a Filter comparing the previous
state.
:::

Anything else becomes a trigger through
[`registerEventTrigger()`](/automations/extending#turning-an-application-event-into-a-trigger)
or the `event_triggers` config map, with no listener class of your own.

## Logic

| Node | Handle | Purpose |
| --- | --- | --- |
| **Filter** | `filter` | Stop the flow if conditions are not met. Run status becomes `stopped`. |
| **Branch** | `branch` | Split into `true` and `false` paths, both of which can act |
| **Switch** | `switch` | Route to one of several outputs based on a value |
| **Stop Flow** | `stop` | End the flow deliberately, with status `stopped` |
| **Delay** | `delay` | Wait minutes, hours or days, then continue |
| **Wait Until** | `wait_until` | Pause until conditions are met, re-checking on an interval |
| **Loop (for each)** | `loop` | Iterate over a collection, then continue |
| **Parallel (fan-out / join)** | `parallel` | Fan out to every connected branch and join the results |
| **Throttle / Deduplicate** | `throttle` | Drop duplicate runs sharing a key within a time window |
| **Set Variable** | `set_variable` | Store computed values under `{{ vars.* }}` for later nodes |
| **Call Automation** | `call_automation` | Run another automation as a sub-flow |

`Filter` and `Branch` differ only in the false path. Use Filter for "only continue if",
Branch when both outcomes need to do something. `Switch` is the same idea with more than
two outcomes; its output handles follow its configured cases.

`Delay` persists the run and is resumed by `automations:run-due`. **It needs the
scheduler**, and without it a delayed run waits forever with no error. `Wait Until` works
the same way, re-evaluating its conditions each time the command runs.

`Loop` has two outputs. **For each item** runs its connected nodes once per item; when
every item has been through, the flow continues on **After loop** on its own. There is no
loop-back edge to draw.

`Parallel` fans out to every branch connected to it and joins their results before the
flow continues.

`Throttle` takes a key and a window and stops a run whose key has already been seen
inside that window. It is the node for "notify me about this lead once, not once per
save".

`Call Automation` runs a second automation as a sub-flow, optionally waiting for its
result. Nesting is capped by `max_call_depth` (default `3`); see
[Configuration](/automations/configuration#max_call_depth).

Filter, Branch and Delay can be switched off wholesale in config
(`features.filter_nodes`, `features.branch_nodes`, `features.delay_nodes`), which is
honest on a site with no scheduler. Every built-in node, trigger and action can also be
switched off individually under `builtin_nodes`.

## Actions

### Notifications and HTTP

| Action | Notes |
| --- | --- |
| Send Email Notification | Token-resolved subject and body. One transactional message, not a newsletter. |
| Send Webhook (Simple) | A direct POST, PUT or PATCH. **No retries, no signing, no delivery record.** |
| Send Webhook (via Webhook Manager) | Inherits transport, signing, retry policy and the delivery log |
| Add Log Entry | Writes to your Laravel log channel |

**Prefer the Webhook Manager variant wherever the destination matters.** The simple
action is for a fire-and-forget internal endpoint; anything you would notice failing
should go through the transport layer. See
[Boundaries](/guide/boundaries#transport-vs-orchestration).

::: tip The simple webhook takes more than POST
*Send Webhook (Simple)* accepts `POST`, `PUT` and `PATCH`. Its one-line description in
the node library still says POST only; the method select in its config form is the
authority.
:::

**Send Email Notification** can either take a subject and body you write, or pick a
template from the [Email Templates](/email-templates/) addon when that is installed. The
picker sits in the node's config form and has a **Preview** next to it that renders the
chosen template with the run's own sample data, so you see the resolved tokens rather
than the raw ones before you enable the flow.

### Statamic

| Action | Notes |
| --- | --- |
| Create / Update Entry | From token-resolved data |
| Publish / Unpublish / Delete Entry | By id |
| Create Term | Adds a taxonomy term |
| Create / Update User | Creates, or merges field data onto an existing user |
| Assign User Role · Add User to Group | Adds or removes a role or group membership |
| Set Global Value | Sets a key on a global set, per site |

::: warning These write real content
A test run does not, by default (`test_mode.persist_statamic_changes` is `false`). Once
enabled, an automation with *Delete Entry* on a broad trigger is exactly as dangerous
as it sounds. Filter early and narrowly.
:::

### LeadHub

| Action | Handle | Notes |
| --- | --- | --- |
| Create or Update Lead | `leadhub.create_or_update_lead` | Email-based upsert |
| Change Lead Status | `leadhub.change_status` | |
| Add Lead Tag | `leadhub.add_tag` | |
| Remove Lead Tag | `leadhub.remove_tag` | |
| Add Lead Note | `leadhub.add_note` | Token-resolved body |
| Create Follow-up | `leadhub.create_follow_up` | |
| Complete Follow-up | `leadhub.complete_follow_up` | |
| Create Task | `leadhub.create_task` | |
| Change Lead Score | `leadhub.change_score` | Pairs with the *Contact score changed* trigger |
| Create or Update Opportunity | `leadhub.create_or_update_opportunity` | |
| Move Opportunity Stage | `leadhub.move_stage` | |

Eleven LeadHub actions in total, available only when LeadHub is installed. They write
timeline entries on the lead while `integrations.leadhub.emit_timeline_events` is on,
which it is by default — so the CRM timeline shows that an automation did it, not a
person.

### Marketing

| Action | Handle | Notes |
| --- | --- | --- |
| Subscribe to Mailing List | `marketing.subscribe` | |
| Unsubscribe from Mailing List | `marketing.unsubscribe` | |
| Send Campaign | `marketing.send_campaign` | A real send to a real list, not a transactional email |

Available only when [Marketing](/marketing/) is installed.

### Pro

| Action | Notes |
| --- | --- |
| AI | Requires a Pro licence and an `ANTHROPIC_API_KEY`. Model configurable. |

Without a key the action is unavailable rather than failing at run time.

## Node config forms are generated

A node declares a `schema()`, and that becomes its configuration form in the Control
Panel automatically — including for nodes you register yourself, with **no front-end
build**.

This is why "extending Automations" does not mean forking it, and why a
server-registered action appears in the library with a working form the moment its
provider boots. See [Extending](/automations/extending).

## Options in a select

A schema field can declare `options_source: 'shop.products'`, and the addon calls your
registered option source to populate it:

```php
Automations::registerOptionSource('shop.products', fn ($request) =>
    Product::all()->map(fn ($p) => ['value' => $p->id, 'label' => $p->name])->all()
);
```

That is how the built-in nodes populate collection pickers, form pickers and Webhook
Manager destination pickers, and it is available to your own nodes on the same terms.

## What is deliberately missing

- **Code nodes.** Deliberately: a code node turns a visual flow into a place where logic
  hides from review. Register a custom action instead, where it is a class in your repo
  that a reviewer can read. See [Extending](/automations/extending).
- **Loop detection between automations.** `max_call_depth` caps how deep automations may
  call each other and how deep a mutation may re-trigger its own flow. It is a backstop,
  not detection: raising it lengthens a loop rather than fixing it.
