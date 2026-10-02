# Segments

<AddonHeader />

Segments are **dynamic groups of contacts defined by rules**. Membership is materialised and
kept up to date automatically: reactively when a contact changes, and via a daily sweep for
time-based rules.

Build them under **LeadHub → Segments**, with a live "matching contacts" preview.

<Figure
  src="leadhub-segments"
  alt="The segments list showing three active segments with their handles and member counts"
  caption="Member counts are materialised. A count of 0 for rules that clearly match is the symptom described below." />

There is no feature flag to turn on. Segments ship enabled on every install, on both the
eloquent and the flat driver, and are gated only by the `view leadhub segments` and
`manage leadhub segments` permissions.

## Rule vocabulary

A segment's rules are a boolean tree of `all` / `any` groups, and groups nest:

```json
{
  "match": "all",
  "conditions": [
    { "type": "field", "field": "status", "operator": "eq", "value": "qualified" },
    { "type": "tag",   "operator": "has", "value": "vip" },
    { "type": "event", "operator": "has", "event": "purchase", "within_days": 30 },
    { "match": "any", "conditions": [
      { "type": "field", "field": "source", "operator": "eq", "value": "referral" },
      { "type": "field", "field": "utm_campaign", "operator": "contains", "value": "spring" }
    ]}
  ]
}
```

### `field`

Any of: `status`, `source`, `source_form`, `assigned_to`, `engagement_score`,
`do_not_contact`, `created_at`, `last_activity_at`, `full_name`, `first_name`, `last_name`,
`email`, `company`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`.

Operators: `eq`, `neq`, `in`, `not_in`, `contains`, `starts_with`, `gt`, `gte`, `lt`, `lte`,
`is_set`, `is_empty`, `is_true`, `is_false`, `before`, `after`, `within_days`,
`older_than_days`.

### `tag`

`has` / `has_not` a tag, by id, slug or name.

### `event`

`has` / `has_not` a timeline event key, optionally `within_days`.

### `geo`

`within_km` / `outside_km` a postal code, by radius:

```json
{ "type": "geo", "operator": "within_km", "plz": "89073", "value": 50, "country": "DE" }
```

The segment editor has it as *Kontakt wohnt im Umkreis von / außerhalb von [km] um Postleitzahl
[PLZ] ([Land])*, with a live count like the other conditions. Below it the editor shows the resolved
centre (*Mittelpunkt: 89073 Ulm*) or, in red, that the postal code directory does not know the
code. Below the count it says how many contacts have no postal code. Countries come from
`leadhub.postal_codes.countries`. Without `country` the evaluator's default, DE, applies.

A contact without a postal code matches **neither** operator: not knowing where somebody is is not
the same as being far away. A postal code and country are visible on the contact (location panel,
editable in the sidebar) and are normalised on save (`" 79 098 "` becomes `79098`, `de` becomes
`DE`).

::: warning An empty rule set matches nobody
Express "everyone" as **no segment at all**, not as an empty segment. This is deliberate: a
segment that silently meant "all contacts" would be one config mistake away from mailing your
entire database.
:::

## Radius conditions and managed segments

Since 2.15 the segment editor keeps every condition shape intact on the way through the form: custom
fields, `geo` and nested groups. Before that, saving a segment turned anything that was not a tag or
an event condition into a `field` condition, and those conditions matched nobody afterwards.

A segment can be **managed** by another addon: `managed_by` holds `source`, `label` and `url`, set
through `SegmentRepository::create()` / `update()` (`null` releases it) and not settable from the
Control Panel form. The segment list shows *Verwaltet von …* with a link to `url`. Name, handle and
rules are read-only in the editor and ignored by the update on the server too, because the owner's
next sync would write them back. Description and active stay editable. The campaign series in
[Marketing](/marketing/series) manage their radius segments this way.

## How membership stays fresh

**Reactively.** A listener re-evaluates the mutated contact against every active segment on
`LeadHubContactCreated`, `LeadHubContactUpdated`, `LeadHubStatusChanged`, `LeadHubTagAdded`,
`LeadHubTagRemoved` and `LeadHubSourceIngested`.

**On a schedule.** `leadhub:segments:sweep`, registered daily, re-materialises membership for
time-based rules that no mutation would otherwise trigger.

::: danger Without the scheduler, segments go half-stale
Mutation-driven rules stay perfectly fresh. Time-based ones (`within_days`,
`older_than_days`) do not. The result is a segment that is partly correct, which is worse than
one that is obviously broken — nothing reports a problem and the numbers look plausible.

```bash
php artisan schedule:work
php artisan leadhub:segments:sweep
```
:::

On a multi-brand install the sweep iterates brands, and `--brand=` narrows it:

```bash
php artisan leadhub:segments:sweep --brand=acme
```

::: warning Before 1.10.3 the sweep silently did nothing on multi-brand
It did not iterate brands and took no `--brand`, so it met the fail-closed scope,
found no segments, and reported success:

```
Swept 0 segment(s): 0 entered, 0 left.
```

The symptom was a segment list showing **0 members** for rules that clearly matched,
and campaigns narrowed by a segment sending to nobody. Single-brand installs were
unaffected, which is why it survived four releases.

Fixed in `^1.10.3`, along with `leadhub:followups:digest` and
`leadhub:followups:due`.
:::

## Enter and leave events

Membership diffs fire events:

```
LeadHubContactEnteredSegment
LeadHubContactLeftSegment
```

Both carry `segment_handle` and `segment_id` in `metadata`, and both are exposed as Webhook
Manager triggers automatically:

```
leadhub.segment.entered
leadhub.segment.left
```

So "when somebody becomes a qualified lead, tell the CRM" is a webhook, not code.

### Loop protection

A per-contact re-evaluation depth guard (`SegmentService::MAX_DEPTH = 1`) prevents infinite
cascades when a consumer reacts to an enter or leave event by mutating the same contact.

That means a chain of segment reactions is one level deep, by design. If you need two levels,
the second one wants to be a scheduled job rather than a reactive listener.

## The consumer contract

```php
use Goldnead\Leadhub\Facades\LeadHub;

LeadHub::segments();
// [{ id, name, handle, is_active, members_count }, …]

LeadHub::segmentMemberIds('qualified-leads');
// ['<contact-uuid>', …] — resolved LIVE from the rules

LeadHub::contactInSegment($contactOrId, 'qualified-leads');
// bool, cheap reactive check
```

`segmentMemberIds()` returns contact **UUIDs** and resolves live from the segment's rules —
not from the materialised pivot — so consumers always see the current set. It returns `[]` for
an unknown or inactive segment.

Guard the integration so older LeadHub versions degrade gracefully:

```php
if (method_exists(LeadHub::getFacadeRoot(), 'segmentMemberIds')) {
    // segments are available
}
```

::: tip Check the facade **root**
`method_exists()` on a facade class returns `false` for everything it forwards through
`__callStatic`. Getting this wrong is how every LeadHub action node in Automations once failed
silently on every real install.
:::

## Both storage drivers

| Driver | How membership is stored |
| --- | --- |
| `eloquent` | materialised in the `leadhub_segment_contact` pivot |
| `flat` | segment handles mirrored onto each contact's YAML as `segment_handles` |

Segment handles are unique **per brand**.

::: warning On the flat driver, read the contact's `uuid`
Not its `id`. Casting a UUID to `int` yields `0`, which collapses every contact onto one. This
is a real trap in the flat driver's shape.
:::

## Segments and Marketing

A segment can narrow a campaign's audience, with a live member count in the CP.

**The audience is `subscribed list members ∩ segment members`, resolved at send time.**
Consent always comes from the list; the segment only narrows. No segment means the whole
list.

Requires LeadHub `^1.1`. On older versions Marketing degrades gracefully to a whole-list send
— no error, so check your version if a segment appears to be ignored.

If you find yourself wanting a segment to *be* the audience, you want a list. See
[Marketing → Sending to a segment](/marketing/segments).

## Designing segments that stay useful

**Prefer facts over states.** `tag has vip` and `event has purchase within_days 30` age well.
`status eq proposal` describes where somebody is in your pipeline today and will mean something
different after you rename a stage.

**Be careful with `engagement_score`.** Scores are a running total and are **never
recalculated** when you change the point table, so a score threshold compares contacts scored
under different rules. See [Lead scoring](/leadhub/scoring#changing-a-rule).

**Name the intent, not the rule.** `spring-campaign-referrals` survives a rule edit;
`utm-campaign-contains-spring` does not.
