# Access and purchases

<AddonHeader />

## Entitlements: a team holds access

A team is the subject `team:<id>` (`Team::MORPH_ALIAS`, registered in the morph map unless the
host already maps `team`). Grant access to a team like to anything else:

```php
Entitlements::grant(Teams::entitlementSubject($team), 'team-plan', 'manual');
```

**Teams registers itself with Entitlements as a subject expander**
(`Entitlements::extendSubjects()`). From then on Entitlements itself counts a user's teams, for
grants and for limits:

```php
Entitlements::allows($user, 'team-plan');       // true while the user is in a team holding it
Entitlements::consume($user, 'analyses');       // booked at the team: the holder of the limit
Entitlements::remaining(Teams::entitlementSubject($team), 'analyses');
```

`Teams::allows($user, $product, $personalSubject = null)` asks the same question through the
Teams facade, optionally together with a personal grant.

A subject is expanded only when its type names a user: `user`, the auth model's class and its
morph alias, plus `entitlements.user_types`. An email or a team subject is never expanded; a
team id is not a user id. Expansion applies to reads only: a refund against a person never
touches the team's grant.

Access ends for a member the moment they leave the team. The grant itself stays with the team.

## Payments: a team buys

Payments has no customer model: the buyer is `email`, `name` and `country` on the payment, and
the billing address sits in `meta.address`. `Teams::checkout()` fills exactly those from the
team's billing fields (`company`, `name`, `email`, `line1`, `line2`, `postal_code`, `city`,
`country`, `vat_id`) and names the team as `$details['for']`, so the grant, renewals, refunds
and the subscription belong to the team. It also carries `meta.team_id`, `meta.team_uuid`,
`meta.paid_by` and `meta.vat_id`.

```php
$result = Teams::checkout($team, 'team-plan-yearly', auth()->user(), url('/thanks'));

return redirect($result->checkoutUrl);
```

The same details work for `Subscriptions::start()`; `Teams::checkoutBuyer()` and
`Teams::checkoutDetails()` return them.

**The payer must be a member holding `manage billing` in the team.** Otherwise
`Teams::checkout()` throws `TeamsException` (`not_member` or `forbidden`) and no checkout
starts. Pass the signed-in user as payer; only system code (a Control Panel action, a job) may
pass none.

### The VAT ID

Stored on the team as entered and **not verified there**; the Control Panel says so. With
[Invoices](/invoices/) installed, the checkout asks its `BuyerAdmission::check()` (VIES,
cached) and freezes the answer as `meta.vat_id_check`, which the invoice prints. Without
Invoices no check is claimed.
