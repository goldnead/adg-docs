# The partner area

<AddonHeader />

Partners are users of your site. Signing up, the link, the figures, the commissions, the
payouts and the promotional material are on one page you place yourself.

```antlers
{{ affiliates:dashboard }}
```

The packaged view is plain markup with class names under `.affiliates-*`, so your site styles
it with its own CSS. A visitor who is not signed in sees a sign-in notice. A signed-in user who
is not a partner sees the application form. A partner sees their area.

## Signing up

Signing up needs a signed-in user: the partner area belongs to that user. The form asks for a
name, a website and a message, all optional, and a checkbox accepting the terms of the partner
programme. The box is required. The terms themselves are yours to write and link from the page.

With `signup.approval: manual` (the default) the application waits under
**Affiliates → Partners** as "Awaiting approval". With `auto` the partner is active at once.
`signup.enabled: false` closes the form. Either way `PartnerApplied` is dispatched, and
`PartnerApproved` when the partner becomes active.

## Invitations

A partner created in the Control Panel can be sent an invitation link by mail. The link works for
`signup.invite_days` (14), and only for a signed-in user with the invited email address. A
visitor who is not signed in is sent to `routes.login_url` and comes back to the link after
signing in. An invited partner needs no approval: their status is the one set when they were created,
active by default.

## Payout details and mails

The partner enters how they want to be paid: bank transfer, PayPal or other, and the details
(IBAN and account holder, or a PayPal address). The details are stored encrypted and are not
shown back in the form; a saved entry reads "On file. Enter them again to change them." The same form
switches the mail per commission on or off for this partner.

## Promotional material

`affiliates:install` creates the `affiliate_materials` collection with a blueprint: a title, a
kind (text, banner, mail, social), a target URL, the copy and an image. The image field reads
from `materials.container`, or the site's first asset container. Every published entry
appears in the area of every active partner. `{link}` in the copy becomes that partner's
tracking link to the target URL, so a mail template or a social post can be copied as it is.

## The tags

Every part of the area is a tag of its own, for a page you build yourself.

| Tag | |
| --- | --- |
| `{{ affiliates:dashboard }}` | The whole area. `view="partials/partner"` renders another view with the same data. |
| `{{ affiliates:link url="/kurse" }}` | The signed-in partner's tracking link to any page; empty unless the partner is active. |
| `{{ affiliates:partner }}…{{ /affiliates:partner }}` | The partner's data, below. |
| `{{ affiliates:commissions limit="20" }}…{{ /affiliates:commissions }}` | Newest first, 50 by default, at most 500. |
| `{{ affiliates:payouts }}…{{ /affiliates:payouts }}` | Newest first. |
| `{{ affiliates:materials }}…{{ /affiliates:materials }}` | Published promotional material, with `{link}` replaced. Only for an active partner. |
| `{{ affiliates:apply_form }}…{{ /affiliates:apply_form }}` | Wraps its content in the application form, with CSRF field. |
| `{{ affiliates:details_form }}…{{ /affiliates:details_form }}` | The same for payout details. |

**`affiliates:partner`** gives `no_partner`, `name`, `email`, `code`, `status`, `status_label`,
`is_active`, `is_pending`, `link`, `coupon_codes`, `clicks`, `sales`, `conversion` and `money`,
a list with one row per currency of `pending` (on hold), `approved` (payable) and `paid`, each
formatted.

**`affiliates:commissions`** rows: `kind`, `kind_label`, `product`, `amount`, `amount_cent`,
`currency`, `status`, `status_label`, `date` (the sale date), `booked_at`, `available_at`.

**`affiliates:payouts`** rows: `reference`, `amount`, `status`, `status_label`, `date`,
`paid_at`.

**`affiliates:materials`** rows: `title`, `kind`, `copy`, `image`, `link`.

**The forms** give `errors`, `has_errors` and `success`; the application form also `signed_in`,
`is_partner` and `open`, the details form `is_partner`, `payout_method`, `has_details` and
`notify`.

**Sales and conversion.** `sales` counts paid first payments only, without refunded sales and
own purchases. `conversion` is link sales per click and never exceeds 100 %.

## Changing the view

```bash
php artisan vendor:publish --tag=affiliates-views
```

copies the area and the two mails into `resources/views/vendor/affiliates/`.
