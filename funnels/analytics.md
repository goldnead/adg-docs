# Where people stop

<AddonHeader />

The one number a funnel is actually judged by is not how many visits there were. It is at
which step they ran out.

Every step card in the editor carries three figures:

| Figure | Means |
| --- | --- |
| **Visitors here** | How many visitors reached this step |
| **Carried on** | How many of *those* also reached a step this one leads to |
| **Share who carried on** | The second as a percentage of the first |

There is no separate report screen. The numbers sit on the card of the step they describe,
because a drop-off number in a report somewhere else is a number nobody looks at.

## Counted per visitor

Every figure is a count of **distinct walks**, not of events. Somebody who reloads the
offer page four times looked at it once, and a rate built on page loads flatters every
step with a reload button on it.

That works because arrival is recorded once per step per walk. See
[the walk](/funnels/concepts#arrival-is-recorded-once).

## "Carried on" is measured from the edges

A visitor has carried on when they were on this step **and** also turned up on one of the
steps it points at.

Measured from the graph rather than from a timestamp comparison, which is the honest
reading: a visitor who goes back and forth has still carried on, and a visitor who took
the `declined` branch has carried on too. Declining is not leaving.

## Nothing, rather than zeroes

Two cards show fewer than three figures, on purpose:

- **A step nobody has reached shows nothing at all.** The difference between "nobody yet"
  and "everybody left here" is the only reason to put numbers on a card in the first
  place, and a fresh graph whose every card reads `0 / 0 / 0 %` looks broken rather than
  new.
- **The last step of a walk shows no rate.** A thank-you page is not converting at 0 %, it
  is the end. A step with no outgoing edge is treated as terminal and shows only its
  visitor count.

## Split results, where the test is

A step [running a split test](/funnels/deadlines-and-tests#split-tests) also shows the
same figures **per version**, in the panel beside the fields that configure it.

Only for steps actually running one. A funnel where every card sprouted an A and a B would
bury the one number that matters under two that say the same thing. And the same rule
applies inside: no visitors, no rate — two versions at 0 % would look like a decision.

Which version a visitor was shown is read off their arrival, which is why the version has
to be [recorded onto it](/funnels/deadlines-and-tests#split-tests). A test that cannot be
counted is a coin toss with extra steps.

## What is stored underneath

`funnel_step_events` holds one row per step per walk per kind of thing that happened:

| `event` | Written when |
| --- | --- |
| `entered` | A visitor arrives on a step, the first time. Carries the split variant, when there is one. |
| `submitted` | They leave an entry, page or form step |
| `accepted` | An offer was **paid for** |
| `declined` | An offer was declined |
| `completed` | The walk ended |

Everything on the cards is arithmetic over those rows. There is no counter table and
nothing to rebuild.

::: warning There is no pruning command
`funnel_visits` and `funnel_step_events` grow with traffic and nothing trims them. A funnel
with real traffic accumulates a row per visitor per step. Deleting a funnel cascades to
its visits and their events; nothing else does.
:::

## Looking at it before it is live

The editor has a **Preview**. It walks the funnel step by step: the stepper follows the
graph depth-first, one branch to its end and then the other, with the device sizes from
Statamic's own `live_preview.devices`.

Three things make it worth having:

**It shows the graph on screen, not the one in the table.** An unsaved headline is visible
immediately, and it works on a funnel that has never been published — which is the point.

**It writes nothing.** No visit, no step event, and no impression against an offer. An
editor clicking through their own funnel twenty times while building it must not move the
acceptance rate the offers screen is judged by, or decide their own split test.

**It renders through the same code as the real thing.** A preview that took a different
path through the code would be a preview of the preview. What differs is only what it is
allowed to touch, which is nothing.

The order the stepper walks is depth-first from the entry, and anything unreachable is
appended at the end rather than dropped — an orphaned step is exactly what somebody opens
the preview to notice. Breadth-first was the first attempt and reads wrong to a person:
with `Offer → (accepted: Upsell → Thanks) / (declined: Sorry)` it produces Offer, Upsell,
Sorry, Thanks, the two paths interleaved.

Behind it is a real Statamic token, mintable only by somebody with the funnels permission,
bound to one funnel, reused across an editing session rather than reissued per keystroke,
and good for fifteen minutes. See [preview passes](/funnels/reference#preview-passes).
