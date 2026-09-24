# Configuration

<AddonHeader />

```bash
php artisan vendor:publish --tag=affiliates-config
```

Publishing is optional; the defaults below are the packaged ones. Most keys can also be
changed per brand on the **Affiliates** tab of the suite's settings screen
([Brand Context → Addon settings](/brand-context/settings)). Only overrides are stored there;
everything unset keeps following `config/affiliates.php`. The last column says which.

## Tracking

| Key | Default | | Settings screen |
| --- | --- | --- | --- |
| `tracking.parameter` | `ref` | The query parameter a partner link carries. | no |
| `tracking.attribution` | `last` | `last` gives the sale to the most recent link, `first` keeps the first partner while the cookie lives. | yes |
| `tracking.cookie_days` | `30` | How long a click counts, from the click. `0`: only for the visit. | yes |
| `tracking.cookie_name` | `statamic_affiliate` | | no |
| `tracking.count_clicks` | `true` | Count a click once per visit, with the landing path only. | no |

`parameter` and `cookie_name` are not on the settings screen on purpose: they are the site's
contract with links already handed out, and changing them from a form would break every one.

## Consent

| Key | Default | | Settings screen |
| --- | --- | --- | --- |
| `consent.mode` | `auto` | `auto` asks [Consent](/consent/) for the service below, and without that addon writes no cookie at all. `always` writes the cookie because the site asks some other way. `never` writes none. | yes |
| `consent.service` | `affiliates` | The service handle in `config/statamic-consent.php`. | no |
| `consent.session_fallback` | `true` | Without consent, keep the referral in the session the visitor already has, for the rest of the visit. | yes |

See [Attribution → Consent](/affiliates/attribution#consent).

## Commissions

| Key | Default | | Settings screen |
| --- | --- | --- | --- |
| `commissions.default.type` | `percent` | `percent` or `fixed`. The rate for every product without a row of its own under Commission Rates. | no |
| `commissions.default.percent` | `30` | | yes |
| `commissions.default.amount_cent` | `null` | For `fixed`, in cents, in the payment's currency. | no |
| `commissions.default.recurring` | `none` | `none`, `limited` (the first `recurring_times` renewals) or `always`. | yes |
| `commissions.default.recurring_times` | `null` | | yes |
| `commissions.default.bumps` | `false` | Whether order bumps earn commission. | yes |
| `commissions.default.upsells` | `false` | Whether accepted follow-up offers earn commission. | yes |
| `commissions.vat_percent` | `0` | VAT taken off the amount paid to get the net base. Leave `0` when prices carry no VAT (small business, § 19 UStG). | yes |
| `commissions.hold_days` | `30` | How long a new commission waits before it is payable. | yes |
| `commissions.coupon_wins` | `true` | A partner's coupon on the order beats another partner's link. | yes |
| `commissions.self_referral` | `false` | Whether partners earn on purchases with their own address. | yes |
| `commissions.partner_rate` | `main` | A partner's own percentage replaces the `main` rate of a sale only, or `all` rates including bumps and renewals. | yes |

See [Commissions](/affiliates/commissions).

## Payouts

| Key | Default | | Settings screen |
| --- | --- | --- | --- |
| `payouts.minimum_cent` | `5000` | Partners below this wait for the next list. In cents. | yes |

## Sign-up

| Key | Default | | Settings screen |
| --- | --- | --- | --- |
| `signup.enabled` | `true` | Whether the application form accepts sign-ups. | yes |
| `signup.approval` | `manual` | `manual`: someone approves them in the Control Panel. `auto`: active on sign-up. Invited partners are always active. | yes |
| `signup.invite_days` | `14` | How long an invitation link works. `0`: it does not expire. | yes |

## Joint ventures

| Key | Default | | Settings screen |
| --- | --- | --- | --- |
| `jv.stack_with_referral` | `false` | Whether a JV partner who also sent the buyer through their own link earns the referral commission on top of the JV share. | yes |

## Mail

| Key | Default | | Settings screen |
| --- | --- | --- | --- |
| `mail.commission` | `true` | A mail to the partner for every commission. A partner can also switch it off for themselves. | yes |
| `mail.approved` | `true` | A mail when an application is approved. | yes |

## Routes, material, Control Panel

| Key | Default | |
| --- | --- | --- |
| `routes.enabled` | `true`, env `AFFILIATES_ROUTES_ENABLED` | The front-end routes under `/!/affiliates/`. |
| `routes.login_url` | `/login` | Where an invitation link sends a visitor who is not signed in. |
| `routes.throttle` | `20,1` | Throttle for sign-up, invitation and payout details. The `go` link is not throttled. |
| `materials.collection` | `affiliate_materials` | The collection partners see promotional material from. |
| `materials.container` | `null`, env `AFFILIATES_MATERIALS_CONTAINER` | The asset container `affiliates:install` gives the material's image field. Empty: the site's first container. |
| `cp.enabled` | `true` | The Control Panel screens and nav. Off hides both, and the routes are not registered. |
| `webhook_manager.enabled` | `true`, env `AFFILIATES_WEBHOOK_MANAGER` | Offer the four partner moments as [Webhook Manager](/affiliates/webhooks) triggers, where that addon is installed. |

`routes.*` and `cp.enabled` are read while routes and nav are registered, before the settings
layer applies its values, so they are config only and a change needs a route cache clear.
