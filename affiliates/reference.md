# Reference

<AddonHeader />

## Console

| Command | |
| --- | --- |
| `php artisan affiliates:install` | Creates the promotional material collection (`materials.collection`) with its blueprint, the image field on `materials.container` or the site's first asset container. An existing collection or blueprint is kept; an image field without a container gets one. Safe to run again. |
| `php artisan affiliates:release` | Makes every commission whose hold period is over payable. Not scheduled; see [Installation → The scheduler](/affiliates/installation#the-scheduler). |
| `php artisan affiliates:book {payment}` | Books the commissions of a paid Payments payment again, for example after a listener failed. Idempotent: what is already booked stays booked once. |

## Facade

`Goldnead\Affiliates\Facades\Affiliates`, alias `Affiliates`.

| Method | |
| --- | --- |
| `partnerFor(?User $user): ?Partner` | The partner a Statamic user is, in the current brand. |
| `apply(User $user, array $data): Partner` | Sign a user up, as the application form does. |
| `invite(Partner $partner): Partner` | Send the invitation mail. |
| `approve(Partner $partner): Partner` | Make an application active. |
| `link(Partner $partner, ?string $url = null): string` | The partner's tracking link to a page of the site. |
| `stats(Partner $partner): array` | Clicks, sales, conversion and the amounts per currency and status. |

## Events

| Event | Payload | |
| --- | --- | --- |
| `Goldnead\Affiliates\Events\CommissionEarned` | `$commission` | A sale earned a partner a commission or a JV share. Once per row: a payment booked twice dispatches nothing the second time. |
| `Goldnead\Affiliates\Events\CommissionReversed` | `$commission` | A refund, a chargeback or somebody in the Control Panel took back all or part of a commission. For one already paid out, `$commission` is the negative clawback row. |
| `Goldnead\Affiliates\Events\PartnerApplied` | `$partner` | Somebody signed up through the application form. |
| `Goldnead\Affiliates\Events\PartnerApproved` | `$partner` | A partner became active: approved in the Control Panel, or on sign-up with automatic approval. |

With [Webhook Manager](/webhook-manager/) installed, the same four moments are webhook triggers:
`affiliates.commission_earned`, `affiliates.commission_reversed`, `affiliates.partner_applied`,
`affiliates.partner_approved`. Payload and rules on [Webhooks](/affiliates/webhooks).

## What it listens to

Only when [Payments](/payments/) is installed, registered by hand once per application:

| Payments event | |
| --- | --- |
| a `Payment` being created | writes the referral of the visitor whose request creates it |
| `PaymentPaid` | books commissions and JV shares |
| `PaymentRefunded` | reverses in proportion to the refunded amount |
| `PaymentChargedBack` | the same |

No listener ever throws into Payments' fulfilment. A failure is logged, and
`affiliates:book` books the payment again.

## Routes

Front end, under `/!/affiliates/`, in the `web` group, off with `routes.enabled: false`:

| Route | |
| --- | --- |
| `GET go/{code}?to=/path` | Notes the referral and redirects to a path on this site. Not throttled. |
| `POST apply` | The application form. Throttled (`routes.throttle`). |
| `GET invite/{token}` | Accepts an invitation. Throttled. |
| `POST details` | Payout details and the mail switch. Throttled. |

The tracking parameter itself (`?ref=`) is read by a middleware pushed onto the `web` group,
on every page.

Control Panel, under `/cp/affiliates/`, off with `cp.enabled: false`: `partners`, `commissions`,
`payouts`, `rates`, `jv`, with their create and edit routes. Every controller action checks its
permission again; the route middleware is the first fence, not the only one.

## Permissions

| Permission | |
| --- | --- |
| `view affiliates` | Partners, a partner's detail, Commissions |
| `manage affiliates` | Create and edit partners, change their status, rates, JV contracts |
| `manage affiliate payouts` | Payouts, CSV, mark as paid, cancel a commission, see and edit payout details |
| `manage affiliates settings` | The Affiliates tab on the settings screen |

## Tables

Every table carries `brand_id`.

| Table | |
| --- | --- |
| `affiliate_partners` | Partner, link code, status, own percentage, coupon codes, payout method and encrypted details, invitation token. |
| `affiliate_clicks` | One row per counted click: partner, landing path, time. No IP address, no user agent. |
| `affiliate_referrals` | One per payment, unique on `payment_id`: partner, source (link or coupon), coupon code, click time, paid and refunded dates, whether it was an own purchase. |
| `affiliate_rates` | Rate per product. |
| `affiliate_jv_contracts` | Joint-venture contracts. |
| `affiliate_commissions` | Commissions, JV shares and clawbacks, with base, amount, reversed amount, currency, status, sale date, payable date and payout. Unique on a dedupe key, which is what keeps a redelivered webhook from booking twice. |
| `affiliate_payouts` | Payout lists: partner, amount, currency, status, reference, paid date. |

## Mail

| Mail | When | Switch |
| --- | --- | --- |
| Commission | per commission booked | `mail.commission`, and per partner |
| Invitation | Create Partner with the switch on, or sent again from the partner | |
| Approval | an application is approved | `mail.approved` |

Sent through [Brand Context](/brand-context/)'s sender identity of the partner's brand. The
commission mail never names the buyer.
