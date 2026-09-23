# The Control Panel

<AddonHeader />

**Affiliates** sits in the suite's shared nav section when [Payments](/payments/) provides
one, under Tools otherwise. It has five screens. Settings are not one of them: they are the
**Affiliates** tab on the suite's settings screen
([Brand Context → Addon settings](/brand-context/settings)). Every screen shows the current
brand.

<Figure
  src="affiliates-partners"
  alt="The Partners listing with name, email, code, a status of Active, Suspended or Awaiting approval, the amount earned and the creation date"
  caption="Partners in the demo. An application waits as Awaiting approval until someone approves it from the row menu." />

## Partners

Name, email, link code, status, amount earned and creation date. The row menu opens the
partner, edits them (`manage affiliates`) and approves an application. **Create Partner**
creates a partner, and sends the invitation when its switch on the form is on. The partner's
detail can send it again.

Status changes each say what they do before they happen:

| Status | |
| --- | --- |
| Awaiting approval | An application. Its link does not count yet. |
| Active | Clicks and sales count. |
| Suspended | New clicks and sales no longer count. Commissions already earned stay payable. |
| Rejected | The application is rejected. The link does not count. |

**The edit screen** holds the link code (unique on the host), the partner's own percentage,
the coupon codes they own (unique per brand; codes [Offers](/offers/) does not know are
flagged), notes, the commission mail switch, and the payout method and details. Method and
details are visible and editable only with `manage affiliate payouts`.

**A partner's detail** shows the link, the `go` short link for pages behind full static caching,
the figures (clicks, sales, conversion, amounts on hold, payable and paid out per currency),
and their commissions, payouts and JV contracts.

## Commissions

Every commission of the brand: sold on, partner, kind, product, base, rate, amount, status.
Opening the screen first makes payable whatever has finished its hold period. The row menu
cancels a commission that is on hold or payable and not yet on a list
(`manage affiliate payouts`). See [Commissions](/affiliates/commissions).

## Payouts

Needs `manage affiliate payouts`. Says what is payable right now and the minimum, creates
payout lists, exports them as CSV and marks them paid. See [Payouts](/affiliates/payouts).

## Commission Rates

Needs `manage affiliates`. One row per product with its own rate; every other product earns
the default from the settings. See [Commissions → The rate](/affiliates/commissions#the-rate).

## JV Contracts

Needs `manage affiliates`. See [Joint ventures](/affiliates/joint-ventures).

## Before the migration

A screen opened before `php artisan migrate` has run says so ("The partner programme is not set
up yet") instead of failing.
