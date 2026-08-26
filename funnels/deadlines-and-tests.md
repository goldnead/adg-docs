# Deadlines and split tests

<AddonHeader />

Two things an offer page usually gets wrong, and both are wrong in the same way: they
happen in the browser, where nothing can be enforced and nothing can be counted.

## A deadline that holds

An offer step can carry one, and it is **enforced on the server**. Past it the step
refuses to be accepted, whatever a stale tab still shows.

A countdown that only counts is a lie told in Javascript: the number runs out, the visitor
reloads, and the offer is still there — which teaches them that every deadline on the site
is decoration.

| `countdown` | What it means |
| --- | --- |
| `none` | No deadline. The default. |
| `fixed` | One moment for everybody. A launch that closes on Friday. |
| `rolling` | A window per visitor, from the first time **they** see the step. |

### Fixed

```
countdown:        fixed
countdown_until:  2026-09-30 23:59
```

Any date the server can read. Honest, and it stops being useful on Saturday.

### Rolling

```
countdown:        rolling
countdown_hours:  72
```

The one people mean by "evergreen", and it needs saying out loud: **the deadline is per
visitor**. It is written onto their walk the first time they see the step, so a reload
does not extend it and a second device does not reset a walk already under way — but
somebody who clears their cookies gets a new one.

That is a property of the mechanism, not a bug. Enforcing it otherwise would mean
identifying people.

### What happens at the deadline

- **Accepting is refused.** Checked before anything else on the accepting path, so a late
  order cannot even start a payment. The visitor is sent back with
  `This offer has closed.`
- **Declining still works.** A closed offer is not a closed funnel, and somebody standing
  on an expired page must be able to move on rather than being stuck.
- **An unreadable date is treated as no deadline**, rather than as one that has passed. A
  typo in the Control Panel should leave an offer buyable, not close it for everybody.

### Drawing it

The shipped page draws it and ticks it with `funnels.js`: no build step, no dependency,
and loaded only on a step that actually has a clock.

A site with its own front end reads `funnel:countdown` and does its own:

```antlers
{{ if funnel:countdown }}
    <p data-funnel-countdown="{{ funnel:countdown:ends_at }}">
        {{ if funnel:countdown:expired }}
            Vorbei.
        {{ else }}
            <time data-funnel-clock>{{ funnel:countdown:seconds }}</time>
        {{ /if }}
    </p>
{{ /if }}
```

Tick from `ends_at`, not from `seconds`. A tab left open for an hour has a rendered
`seconds` that is an hour wrong.

In a [preview](/funnels/analytics#looking-at-it-before-it-is-live) there is no visitor to
time, so a rolling window starts now and is never written down.

## Split tests

Any step can run one. Set a share for B and fill in only the fields B changes.

| Field | |
| --- | --- |
| `split_share` | A whole percentage for B. |
| `variant_entry` | A different page |
| `variant_headline`, `variant_body` | Different words |

A test runs when the share is **between 1 and 99** and version B actually changes
something. A share of 0 or 100, or a B with nothing different in it, is not a test and is
not recorded as one. An empty share is read as **50**, so filling in a variant and leaving
the share blank runs an even split. Anything outside 0–100 is clamped rather than
rejected: a site that typed 150 wants more B, and a page that refused to render over a
split percentage would be a strange thing to explain.

Three properties, and each is the reason such a thing is usually worthless without it:

**Stable.** A visitor sees the same version every time. The decision is `crc32` over the
walk token and the step key — not a random number — so a reload gives the same answer
before anything has been stored. Splitting per render would show somebody A, then B, then
A, and the numbers underneath would be about nothing.

**Per step, not per funnel.** Two tests can run at once without one deciding the other,
and a token that lands in A on one step does not land in A everywhere.

**Recorded.** The version is written onto the visitor's arrival, so the drop-off numbers
can be split by it. A test that cannot be counted is a coin toss with extra steps. The
result shows in the editor, on the step where the test is set up — a split report on
another screen is a report nobody opens.

### Only what B sets is swapped

A test that changes one headline must not silently blank the body, and having to copy
every field into the variant to change one of them is how a test ends up comparing two
things that differ in ways nobody meant.

So `variant_entry`, `variant_headline` and `variant_body` are applied only where they are
filled, and only to the context handed to the template. Nothing about the saved graph
changes when somebody looks at it.

::: tip An editor is not in their own experiment
A preview has no walk, so it is always A and nothing is written. Otherwise clicking
through your own funnel while building it would decide the test.
:::
