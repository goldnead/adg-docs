# A funnel is not an automation

<AddonHeader />

An **automation** is *event → action*: something happened, do something. It has no
address, and it does not care where anybody is.

A **funnel** is a path somebody is actually standing on. That is the whole difference, and
it is small in words and large in what it needs:

1. **A page.** Every step is a place a visitor stands, with a URL, a template and content.
2. **A memory.** Which step each person got to, and what they did there.

Neither belongs in an automation, and that is why this is its own addon with its own
tables rather than four new node types in [Automations](/automations/).

## The editor is the same code

What the two do share is the canvas. The funnel editor is
[`goldnead/statamic-flow-canvas`](/flow-canvas/) — the same files the automations editor
runs on, not a copy of them. One editor, consumed twice, so the two cannot drift apart.

What this addon adds on top is what a funnel *means*: five kinds of step, and a panel to
configure them. See [Kinds are data](/flow-canvas/kinds) for how that split works.

## The pieces

| Term | Means |
| --- | --- |
| **Funnel** | A graph with a handle, a title and a live/draft flag. `funnels` |
| **Step** | One place on the path: a type, a label, a slug, a bag of config. `funnel_steps` |
| **Edge** | A wire from one step's output to another step. `funnel_edges` |
| **Output** | Which way out of a step an edge leaves by: `default`, or `accepted` / `declined` on an offer |
| **Walk** (a *visit*) | One browser's journey through one funnel. `funnel_visits` |
| **Step event** | One row per step per walk: `entered`, `submitted`, `accepted`, `declined`, `completed`. `funnel_step_events` |

A step's `node_key` is generated in the browser while editing, so it cannot be the database
id: a node exists on the canvas before it has ever been saved. Everything — edges, events,
countdowns, split assignments — is keyed by `node_key`.

## The walk

```
GET  /f/fruehlingskurs                  entry step   → visit created, `entered` recorded
POST /f/fruehlingskurs/{node}/advance   the form     → `submitted`, redirect to the next step
GET  /f/fruehlingskurs/angebot          offer step   → `entered`
POST /f/fruehlingskurs/{node}/advance   declined     → `declined`, redirect down that branch
```

**Who is walking is a token, not a person.** A random 32-character string in the visitor's
own cookie identifies a *walk*. A funnel has to work before anybody has said who they are,
and most visitors never do. Nothing here needs a login.

The cookie lives 30 days, `HttpOnly` and `SameSite=Lax`, and is **deliberately excluded
from Laravel's cookie encryption**. It holds nothing worth hiding, and Laravel silently
discards a cookie it cannot decrypt — a failure that looks exactly like a visitor who
never came back.

It is not a session either. A walk that survives a browser restart is the ordinary case,
because the second half of a funnel usually arrives by email.

## Arrival is recorded once

A visitor who reloads a page has not entered it twice, and a drop-off report built on
repeat views is a report about refreshing. So `entered` is written once per step per walk,
and [the numbers](/funnels/analytics) are counted per visitor throughout.

The first `entered` on a step is also where two other things are pinned down for that
visitor: the [rolling deadline's](/funnels/deadlines-and-tests#rolling) end time, and
which [split-test version](/funnels/deadlines-and-tests#split-tests) they get.

## You can only leave a step you are standing on

Every step is directly reachable by URL. It has to be: the payment provider and half the
emails link straight into the middle of a flow.

*Advancing* is different. The advance route refuses unless the walk has already `entered`
the step it is leaving — otherwise somebody could skip a form, or take the `accepted`
branch of an offer they never saw. That check is a 403.

The advance route is an ordinary form post and keeps CSRF, unlike a provider webhook: the
caller is a browser and a person, and on an offer step it is an order.

## Accepted means paid

The walk moves past an offer when the payment addon's `PaymentPaid` event fires, and
exactly once however often the provider redelivers it.

Never on the click, and never on the return from the provider. A buyer who closes the tab
has still paid; a buyer who reaches the return page has not necessarily. The provider is
told to send them back **into the funnel** — landing outside the flow is being dropped
halfway through a purchase, and everything that was meant to follow the sale never
happens.

A recurring charge usually comes back `pending`. Moving on there would be the one mistake
this family of addons is written against, so the walk waits for the webhook on that path
too.

## Declining is an answer

An offer step has two outputs, `accepted` and `declined`, and the canvas draws both. Most
visitors decline. A funnel that treats that as a failure has nowhere to send them.

An output with nothing wired to it is a legitimate shape: the walk simply ends there, and
the visit is marked complete.

## Saving the graph replaces it

The editor sends the whole graph at once, and the write is a replace inside one
transaction: steps gone from the canvas are deleted, edges are rebuilt, and either all of
it lands or none of it does. A diff of a canvas somebody has been dragging around for ten
minutes is a diff nobody can reason about.

Two rules fall out of that:

- **A step type nobody registered is dropped rather than stored.** A stored node the
  runtime cannot render is a page that 500s in the middle of somebody's purchase.
- **A slug is derived from the label once and then left alone.** A slug that followed the
  label would break every link already sent out.

## Where this addon stops

| Concern | Owner |
| --- | --- |
| What a thing costs | [Offers](/offers/) |
| Taking the money, and what "paid" means | [Payments](/payments/) |
| The form, its validation, its submissions screen | Statamic's own forms |
| The landing page | Statamic entries — see [Landing pages](/funnels/landing-pages) |
| "Do something later, because of this" | [Automations](/automations/) |
| Contacts and timelines | [LeadHub](/leadhub/) |

The four [events](/funnels/reference#events) are the seam for the fifth row. "Send the
reminder when somebody reaches the offer and does not buy" is an automation, not a funnel
feature, and that is how it hears about it.
