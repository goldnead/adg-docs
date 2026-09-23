# Troubleshooting

<AddonHeader />

## A sale through a partner link has no commission

Go through these in order.

1. **Is [Payments](/payments/) installed, 1.24 or later?** Without it nothing is listened to.
2. **Is the partner active?** A code of a pending, suspended or rejected partner is ignored at
   the click.
3. **Did the referral survive to the checkout?** Without consent there is no cookie, only the
   session of that visit. A buyer who clicked yesterday and pays today without having accepted
   the `affiliates` service in the banner is not attributed. That is the consent rule working.
   Check that the service exists in `config/statamic-consent.php`: a service the banner does not
   list is never accepted. See [Attribution → Consent](/affiliates/attribution#consent).
4. **Is the page statically cached?** With `strategy: full`, `?ref=` on a cached page never
   reaches PHP. Use the `go` link. See
   [Attribution → Static caching](/affiliates/attribution#static-caching).
5. **Was it the partner's own purchase?** Not paid unless `commissions.self_referral` is on.
6. **Does the product earn?** A product without a rate row earns the default; a bump or upsell
   only when its rate (or the default) switches bumps or upsells on.
7. **The log.** A booking that failed is logged as
   `statamic-affiliates: a paid payment could not be booked`. Fix the cause, then
   `php artisan affiliates:book {payment}`. It books once, however often it runs.

## A coupon sale went to nobody

Two partners of the brand own the same code, from older data or a direct write. The addon then
attributes the sale to neither and logs it. Remove the code from one of them.

## The commission is still "on hold" although the hold period is over

Nothing moved it yet. `affiliates:release` does, and so does opening the Commissions or Payouts
screen. Schedule the command if partners watch their area. See
[Installation → The scheduler](/affiliates/installation#the-scheduler).

## A partner is missing from the payout list

They are below `payouts.minimum_cent` in that currency, or everything they earned is still on
hold. They are carried over to the next list.

## The payout list disappeared

A refund or a cancellation drove it to zero, below zero or below the minimum, and it was
dissolved. Its commissions wait for the next list. A list is only payable while it is positive.

## A refund after the payout did not change the paid list

It never does: a paid list is history. The refund becomes a negative clawback row, and the next
list deducts it. See [Commissions → Refunds](/affiliates/commissions#refunds-and-chargebacks).

## A partner's renewal commission stopped

With renewals set to "the first *n*", *n* paid, unrefunded renewals have been reached. A plan
switch earns but does not count towards *n*.

## The JV partner got no commission for a buyer they sent

By design: a JV partner who also referred the buyer gets their JV share only.
`jv.stack_with_referral` changes that.

## Payout details show as a masked line

The user lacks `manage affiliate payouts`. The method is locked for them as well.

## The invitation link says it is no longer valid

It expired (`signup.invite_days`, 14), or the signed-in user's email is not the invited one. An
invitation only ever binds to the invited address. Send it again from the partner's detail.

## A material's image is missing in the partner area

The image field has no asset container, and the site has more than one, so Statamic cannot
tell which to read. The area leaves the image out and logs
`statamic-affiliates: a material image could not be read`. Run
`php artisan affiliates:install` again: it gives the field `materials.container` or the site's
first container. On a site with no container at all it warns and leaves the field without one;
create a container, then run it again.

## The Affiliates nav item is under Tools

Payments is not installed, so there is no shared suite section to put it in.
