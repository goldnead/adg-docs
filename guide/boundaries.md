# Boundaries: who owns what

Some of these addons can do the same thing. That is a consequence of shipping
each one so it is useful alone, and it means the suite needs a stated rule rather
than an implied one:

> **One place per concern.** If two addons could handle an event, configure it in
> exactly one of them.

Nothing enforces this. Both addons will happily attach a listener to
`EntrySaved`, and the result is two emails, two webhooks, or two contacts.

## Transport vs. orchestration

| | Webhook Manager | Automations |
| --- | --- | --- |
| Owns | the HTTP request: URL, method, payload, auth, retries, delivery record, replay | the workflow: trigger, conditions, branches, delays, sequence of actions, run log |
| Good at | one reliable call to one destination | several things happening, possibly later |
| Not for | multi-step logic | transport guarantees |

If a save should fire a webhook, configure it in Webhook Manager. If a save should
run a multi-step workflow, build it in Automations, and let one of its actions be
*Send Webhook (via Webhook Manager)* so the call still inherits signing, retries
and delivery logging.

Both addons carry their own trigger and condition engines. That duplication is
known and deliberately kept: merging them would couple the transport layer to the
orchestration layer, which is the coupling the split exists to avoid.

::: danger The double-fire
The failure mode is silent, because both configurations are individually correct.
Symptom: two identical deliveries, milliseconds apart, one recorded in Webhook
Manager's delivery list and one in an automation run log. Fix: delete whichever
one you did not mean to keep.
:::

## CRM timeline vs. activity ledger

`leadhub_events` is **not** replaced by `activities`, and installing Activity
migrates nothing.

- **LeadHub's timeline** is the CRM's own record: one contact's story, in the order
  a salesperson reads it, on the contact page.
- **Activity** is the site's ledger: brand-scoped, append-only, one shape for
  every consumer, there to answer cross-domain questions no single addon's log
  can.

The bundled producers record the same facts into the ledger for a different
purpose, and the two are allowed to overlap. Do not try to make one authoritative
over the other.

## Ledger vs. analytics

Activity stores facts and computes nothing. No counts, no charts, no aggregates,
and the Control Panel screen is a read-only inspector by design.

Metrics, funnels and cohorts belong in something that reads from the ledger. This
is not a missing feature: mixing the two is how a ledger quietly becomes a
reporting tool with no schema discipline, and then neither job is done well.

## Notifications vs. mail actions

| Concern | Owner |
| --- | --- |
| "Tell this person, and let them still see it tomorrow" | Notifications |
| "Send this one email in response to this one event" | Automations' send-email action |
| "Send this to a list of subscribers, with consent and tracking" | Marketing |
| "Notify the team when a lead arrives" | LeadHub's own notifications feature |

LeadHub predates the Notifications addon and keeps its three Laravel
notifications (new lead, lead assigned, daily follow-up digest) for that reason.
When the Notifications addon is also installed, LeadHub uses it for
**task assignment** and contributes open tasks to the digest, and does not
duplicate the other three. Without it, the whole task-notification path is a
no-op rather than a fallback.

## Email bodies

Three addons can hold email content, and the ownership is layered rather than
overlapping:

- **Email Templates** owns the authored template: a Bard body, a subject, a slug.
- **Marketing** owns the campaign: audience, schedule, tracking, and which
  template wraps it.
- **Automations** owns the transactional message: a token-resolved subject and
  body on a single action node.

Email Templates is optional for both consumers, with a fallback: a managed entry
wins, and a caller-supplied file fallback keeps un-migrated slugs working. So
adding it later does not break existing sends.

## Consent vs. targeting

Stated once more here because it is the boundary with the worst failure mode:

**A list grants consent. A segment only narrows.** A campaign's audience is
`subscribed list members ∩ segment members`, resolved at send time. No segment
means the whole list. A segment can never add a recipient who is not a subscribed
member of the list.

If you find yourself wanting a segment to *be* the audience, you want a list.

## Scoping vs. membership

Brand Context isolates **Eloquent models** through a global scope. A Statamic user
is not one, and under the file users repository is not a database row at all.

So "the records of this brand" is a scope question, and "the users of this brand"
is a `BrandMembers` question. They are different mechanisms with different rules,
including the one that surprises everybody: a user with no membership at all
counts as a member of every brand. See [Brand members](/brand-context/members).

## Identity vs. authorisation

`IdentityContext` answers *who did this*. It never answers *may they*.

Likewise `BrandMembers::includes()` is brand affiliation, never authorisation.
Consumers combine it with a permission check:

```php
BrandMembers::usersOf()->filter(fn ($user) => $user->can('view leadhub'));
```

That combination — membership **and** permission — is exactly what LeadHub uses to
decide who may be offered as a lead owner.
