# Reference

<AddonHeader />

## Front-end routes

`{prefix}` is [`route_prefix`](/funnels/configuration#route-prefix), `f` by default.

| Method | URL | Name | |
| --- | --- | --- | --- |
| GET | `{prefix}/{funnel}` | `statamic-funnels.entry` | The entry step, under the funnel's own URL |
| GET | `{prefix}/{funnel}/{slug}` | `statamic-funnels.step` | Every other step |
| GET | `{prefix}/{funnel}/_preview/{nodeKey}` | `statamic-funnels.preview` | Needs a pass. Throttled to 60/min. |
| POST | `{prefix}/{funnel}/{nodeKey}/advance` | `statamic-funnels.advance` | Moving on. Keeps CSRF. Throttled to 30/min. |

The preview route sits **above** the `{slug}` route on purpose: `_preview` would otherwise
be read as the slug of a step.

A funnel that is not live, a step that is disabled, and a preview without a valid pass all
answer **404** rather than 403. From outside, there is nothing there.

### What the advance route accepts

| Step type | Posted | Rule |
| --- | --- | --- |
| `capture` | `email` | required, email, max 191 |
| | `name` | optional, max 191 |
| `offer` | `accept` | `1` to buy, anything falsy to decline |
| | `confirmed` | must be accepted, when `accept` is truthy |
| | `bumps[]` | handles; intersected with the offer's own bumps |
| | `coupon` | a string; ignored when `coupons` is off |
| everything else | — | an ordinary continue |

Advancing from a step the walk has not `entered` is a **403**.

## Control Panel routes

Under Statamic's utility routes, all behind `access funnels utility`.

| Method | Route name | |
| --- | --- | --- |
| GET | `utilities.funnels` | The list |
| POST | `utilities.funnels.store` | New funnel, seeded with one Entry step |
| GET | `utilities.funnels.edit` | The editor |
| PATCH | `utilities.funnels.update` | Save the whole graph |
| DELETE | `utilities.funnels.destroy` | Delete the funnel, its visits and their events |
| GET | `utilities.funnels.entries` | The entry picker's search |
| POST | `utilities.funnels.preview` | Mint a preview pass, and say where to point the iframe |

## Step types

| Type | Handle | Kind | Outputs | |
| --- | --- | --- | --- | --- |
| Entry | `entry` | `entry` | `default` | Unique. One per funnel. |
| Form | `capture` | `page` | `default` (*submitted*) | |
| Page | `page` | `page` | `default` | |
| Offer | `offer` | `offer` | `accepted`, `declined` | |
| Finish | `finish` | `finish` | none | |

Shared fields on all five: `entry`, `template`, `headline`, `body`, `split_share`,
`variant_entry`, `variant_headline`, `variant_body`.

Own fields: `form` on Form; `offer`, `countdown`, `countdown_until`, `countdown_hours` on
Offer; `redirect` on Finish.

## Events

```php
use Goldnead\StatamicFunnels\Events\FunnelStepEntered;
use Goldnead\StatamicFunnels\Events\FunnelFormSubmitted;
use Goldnead\StatamicFunnels\Events\FunnelOfferAccepted;
use Goldnead\StatamicFunnels\Events\FunnelCompleted;
```

| Event | Carries | Fired when |
| --- | --- | --- |
| `FunnelStepEntered` | `$visit`, `$step` | A visitor arrives somewhere, for the first time |
| `FunnelFormSubmitted` | `$visit`, `$step`, `$values` | A form step is left. Dispatched **before** moving on. |
| `FunnelOfferAccepted` | `$visit`, `$step`, `$payment` | The payment is **paid**, not when the button was clicked |
| `FunnelCompleted` | `$visit` | The walk ended: a Finish step, or an output with nothing beyond it |

All four are plain `Dispatchable` classes with readonly public properties. None is
queued, and none is broadcast.

`FunnelStepEntered` is the seam an automation hangs off: "send the reminder when somebody
reaches the offer and does not buy" is an automation, not a funnel feature.

## Listeners this addon registers

| Listener | Listens for | |
| --- | --- | --- |
| `AdvanceOnPayment` | `PaymentPaid` | Records `accepted` and moves the walk on. Guards against redelivery: a provider redelivers by design, and a funnel that advanced per delivery would march somebody through three steps for one purchase. |
| `HandContactToLeadHub` | `FunnelFormSubmitted` | The optional LeadHub bridge. A no-op unless the addon is installed **and** `integrations.leadhub` is on. |

## In Automations

Four triggers, registered only when this addon is detected. Group **Funnels**.

| Trigger | Handle | Filters |
| --- | --- | --- |
| Funnel Step Entered | `funnels.step_entered` | `funnel`, `step` |
| Funnel Form Submitted | `funnels.form_submitted` | `funnel` |
| Funnel Offer Accepted | `funnels.offer_accepted` | `funnel` |
| Funnel Completed | `funnels.completed` | `funnel` |

Each filter is a handle, and empty means every funnel. *Step Entered* takes a step filter
as well, because it is the busiest of the four by a wide margin: an automation that ran on
every page view of every funnel is a mistake somebody makes exactly once.

The context each trigger builds:

```
visit.id            visit.email      visit.name
visit.funnel        visit.funnel_title
visit.payment_id    visit.completed_at
step.key            step.type        step.label
```

## Antlers tags

| Tag | |
| --- | --- |
| `{{ funnels:link handle="…" }}` | The funnel's entry URL, or empty when it is unknown or not live |
| `{{ funnels:progress handle="…" }}` | The current step of an existing walk: `funnel`, `title`, `step`, `url`. Falls through to `no_results`. Never starts a walk. |

For the `funnel:` context available inside a step's own template, see
[Landing pages from entries](/funnels/landing-pages#the-context-lives-under-one-key).

## Permissions

| Permission | Grants |
| --- | --- |
| `access funnels utility` | The Funnels utility: the list, the editor, saving, deleting, and minting preview passes |

One permission, because the utility is the whole Control Panel surface. Statamic's own
utility permission machinery grants it.

## Preview passes

A short-lived `Statamic\Facades\Token`, so expiry and garbage collection are the
platform's problem rather than this addon's.

| | |
| --- | --- |
| Lifetime | 15 minutes, extended on every refresh |
| Mintable by | Anyone with `access funnels utility`, and nobody else |
| Bound to | One funnel. A pass for funnel A does not open funnel B. |
| Carries | The whole **unsaved** graph, not one entry's values |
| Writes | Nothing |

Reused across an editing session rather than reissued: the editor asks for a refresh on
every keystroke, and a token is a file on disk holding a full copy of the graph.

## Database tables

| Table | Holds |
| --- | --- |
| `funnels` | `handle` (unique), `title`, `description`, `published`, `meta` |
| `funnel_steps` | `funnel_id`, `node_key`, `type`, `label`, `slug`, `config`, `disabled`. Unique per funnel on `node_key` and on `slug`. |
| `funnel_edges` | `funnel_id`, `from_node_key`, `from_output`, `to_node_key`. Unique on all four. |
| `funnel_visits` | `funnel_id`, `token`, `current_node_key`, `email`, `name`, `payment_id`, `completed_at`, `meta`. Unique on funnel + token. |
| `funnel_step_events` | `visit_id`, `node_key`, `event`, `payload` |

`funnel_visits.meta` is where the per-visitor state lives that has nowhere else to go:
`countdowns` (a rolling deadline's end time per step), `variants` (which split version they
were given per step), `payments` (which payment each offer step started) and
`pending_step`.

Deleting a funnel cascades to its steps, edges, visits and their events.

## Configuration

| Key | Default |
| --- | --- |
| `route_prefix` | `'f'` |
| `styles` | `true` |
| `coupons` | `true` |
| `template_prefix` | `''` |
| `integrations.leadhub` | `false` |
| `integrations.entitlements` | `false` |

No environment variables. See [Configuration](/funnels/configuration).

## Requirements

| | |
| --- | --- |
| PHP | 8.2+ |
| Statamic | 6.0+ |
| Database | MySQL or SQLite |
| Queue | Not needed |
| Scheduler | Not needed |

### Package dependencies

| Package | Constraint |
| --- | --- |
| `goldnead/statamic-flow-canvas` | `^1.1` |
| `goldnead/statamic-offers` | `^1.2` |
| `goldnead/statamic-payments` | `^1.6` |

Optional, detected with `class_exists` and each behind its own switch:
[LeadHub](/leadhub/), [Entitlements](/entitlements/), and
[Automations](/automations/), which detects this addon rather than the other way round.

## Not included

- **No console commands.** Nothing is deferred, scheduled or batched, so there is nothing
  to run.
- **No retention or pruning.** `funnel_visits` and `funnel_step_events` grow with traffic.
- **No brand scoping.** This addon does not depend on
  [Brand Context](/brand-context/), and its tables carry no `brand_id`.
- **No site scoping.** A funnel is a campaign, not content. The *entry* a step points at is
  localised; the funnel is not.
- **No export or import.** A funnel lives in the database only.
- **No HTTP API.**
