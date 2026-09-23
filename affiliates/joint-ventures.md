# Joint ventures

<AddonHeader />

A joint venture shares the revenue of chosen products with a partner, with no link and no
cookie. A co-teacher of a course, a choir association that runs a workshop with you: every
sale of the product earns them their share, whoever sent the buyer.

## A contract

**Affiliates → JV Contracts → Create**. A contract has:

| Field | |
| --- | --- |
| Partner | An active partner of the brand. A suspended partner's contract books nothing. |
| Name | For your own overview. |
| Products | The products it covers, or all of them. |
| Percentage | Of the net amount, as for a [commission](/affiliates/commissions#the-rate). |
| Bump percentage, upsell percentage | For order bumps and accepted follow-up offers of a covered product. Empty: the main percentage. |
| Renewals | Whether subscription renewals count. |
| Term | A start and an end date. A sale counts when it was paid inside the term. |
| Active | |

Every covered sale books a **JV share** (`jv`) for the partner. It is settled exactly like a
commission: the same hold period, the same reversal on a refund, the same payout list.
Several contracts can cover the same sale; each books its own share.

## JV and referral on the same sale

A JV partner who also sent the buyer through their own link or coupon does **not** earn the
referral commission on top: one sale, one share. `jv.stack_with_referral` turns that on.

Other partners' referrals are booked as usual. A partner who sent the buyer earns their
commission, and the JV partner earns their share.
