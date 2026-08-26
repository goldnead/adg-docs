# Funnels

<AddonHeader />

A funnel is a path a visitor walks: an entry page, a form, an offer, a thank-you page,
each with its own URL, drawn as a graph in the Control Panel.

Money goes through [Payments](/payments/) at the price
that lives in [Offers](/offers/), and the walk moves on
only when the payment addon says the money arrived.

<Figure
  src="funnels-editor"
  alt="The funnel editor: the node library on the left, a graph of entry, form, offer and finish steps on the canvas"
  caption="A funnel is drawn, not configured. The editor is the same one Automations runs on." />

## A funnel is not an automation

An **automation** is *event → action*: something happened, do something.

A **funnel** is a path somebody is actually standing on. That difference is small in words
and large in what it needs: **a page**, and **a memory of how far each person got**.
Neither belongs in an automation, which is why this is its own addon rather than four new
node types in [Automations](/automations/).

The editor, though, is literally the same code:
[Flow Canvas](/flow-canvas/), the canvas the automations editor runs on. One editor,
consumed twice, so the two cannot drift apart.

See [A funnel is not an automation](/funnels/concepts) for the full version.

## What you get

- **Five kinds of step** — Entry, Form, Page, Offer, Finish. Deliberately few.
- **A real URL per step** — `/f/{funnel}` and `/f/{funnel}/{slug}`, so a bookmark works,
  the back button works, and an email can link into the middle of a flow
- **Landing pages from Statamic entries** — the entry *is* the page, delivered through
  Statamic's own response, so password protection and `private` keep working
- **Two ways out of an offer** — `accepted` and `declined`, because most visitors decline
- **Deadlines enforced on the server** — one fixed moment, or a rolling window per visitor
- **Split tests per step** — stable per visitor, and recorded onto the arrival so the
  drop-off numbers can be read per version
- **Drop-off figures on the step cards** — visitors, continued, share, counted per visitor
- **A preview that writes nothing** — no visit, no step event, no offer impression
- **Order bumps and coupon codes**, both settled on the server
- **Four events** for [Automations](/automations/) to hang off, and an optional bridge to
  [LeadHub](/leadhub/)
- **Two Antlers tags**: `{{ funnels:link }}` and `{{ funnels:progress }}`

## Quick start

1. CP → **Utilities → Funnels → New funnel**. It opens with the one step every funnel must
   have, an **Entry**.
2. Click the **+** under a step, then pick the next kind from the library on the left.
3. Select a step and fill in its panel on the right: a page to point at, a form to show,
   an offer to sell.
4. An **Offer** step draws two handles. Wire both — `declined` is where most people go.
5. **Preview** walks the graph on screen, unsaved and unpublished.
6. Toggle **Live** and save.

## The Control Panel screen

Funnels live under **Utilities → Funnels**: a list of funnels with their step and visit
counts, and the editor behind each row.

There is no dashboard and no separate report. The numbers that matter sit on the step
cards in the editor, next to the step they describe — see
[Where people stop](/funnels/analytics).

## What it is not for

- **Multi-step workflows.** "Send a reminder three days after somebody reached the offer
  and did not buy" is an automation. This addon fires
  [four events](/funnels/reference#events) so one can hear about it.
- **Building landing pages.** There is no builder in here and there should not be one.
  Statamic has Bard, Replicator and the blueprint the site already uses. See
  [Landing pages from entries](/funnels/landing-pages).
- **Forms.** A Form step shows a **native Statamic form**. Submissions land where you
  already look for them.
- **Deciding what "paid" means.** The payment addon owns that answer, and this addon must
  not invent a second one.

::: warning Not site-scoped
Funnels are not scoped per site in a multi-site install. A funnel is a campaign, not
content. An entry a step points at *is* localised: it is resolved in the site being
served.
:::

## Next

- [Installation](/funnels/installation)
- [Configuration](/funnels/configuration)
- [A funnel is not an automation](/funnels/concepts) — the walk, the visit, the token
- [The five kinds of step](/funnels/steps)
- [Landing pages from entries](/funnels/landing-pages) — the `funnel` context, templates
- [Deadlines and split tests](/funnels/deadlines-and-tests)
- [Where people stop](/funnels/analytics)
- [Reference](/funnels/reference) — routes, events, tables, config
- [Troubleshooting](/funnels/troubleshooting)
