# Node catalogue

<AddonHeader />

Everything that ships. Nodes marked *(LeadHub)* or *(Webhook Manager)* appear only when
that addon is installed.

## Triggers

| Trigger | Group | Fires when |
| --- | --- | --- |
| Manual Trigger | Manual | You run it, for testing and ad-hoc runs |
| Form Submitted | Statamic | A Statamic form receives a submission |
| Entry Published | Statamic | An entry is saved **while published** — see below |
| Lead Created | LeadHub | A new lead is added |
| Lead Status Changed | LeadHub | A lead transitions between statuses |
| Lead Tag Added | LeadHub | A tag is added to a lead |
| Lead Note Added | LeadHub | A note is added to a lead |
| Lead Follow-up Due | LeadHub | A scheduled follow-up becomes due |
| Webhook Received | Webhook Manager | A validated inbound request arrives |

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

| Node | Purpose |
| --- | --- |
| **Filter** | Stop the flow if conditions are not met. Run status becomes `stopped`. |
| **Branch** | Split into `true` and `false` paths, both of which can act |
| **Stop** | End the flow deliberately, with status `stopped` |
| **Delay** | Wait minutes, hours or days, then continue |

`Filter` and `Branch` differ only in the false path. Use Filter for "only continue if",
Branch when both outcomes need to do something.

`Delay` persists the run and is resumed by `automations:run-due`. **It needs the
scheduler**, and without it a delayed run waits forever with no error.

Each of the three can be switched off in config (`features.filter_nodes`,
`features.branch_nodes`, `features.delay_nodes`), which is honest on a site with no
scheduler.

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

| Action | Notes |
| --- | --- |
| Create or Update Lead | Email-based upsert |
| Change Lead Status | |
| Add / Remove Lead Tag | |
| Add Lead Note | Token-resolved body |
| Create / Complete Follow-up | |

Seven LeadHub actions in total, available only when LeadHub is installed. They write
timeline entries on the lead while `integrations.leadhub.emit_timeline_events` is on,
which it is by default — so the CRM timeline shows that an automation did it, not a
person.

### Logic

| Action | Notes |
| --- | --- |
| Stop Flow | Ends the flow intentionally |

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

Named plainly, because these are the four things people ask for:

- **Loops.** Out of scope for v1.
- **Parallel execution.** Out of scope for v1.
- **Code nodes.** Out of scope for v1, and deliberately: a code node turns a visual
  flow into a place where logic hides from review. Register a custom action instead.
- **Loop detection in branches.** `max_call_depth` is a backstop, not detection.
