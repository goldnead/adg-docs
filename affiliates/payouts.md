# Payouts

<AddonHeader />

The addon moves no money. It keeps the books, you pay, and then you say that you paid.

<Figure
  src="affiliates-payouts"
  alt="The Payouts screen with one list: reference AFF-20260923-VXW7B, partner Clara Brandt by bank transfer, €287.65 for four commissions, paid on 9/23/2026"
  caption="A payout list after it was marked as paid. The reference goes into the bank transfer's purpose line." />

## A payout run

1. **Affiliates → Payouts → Create Payout List** gathers every payable commission, one list per
   partner and currency. Clawback rows from earlier refunds are deducted. Partners below
   `payouts.minimum_cent` (€50.00 by default) wait for the next run.
2. **Open ones as CSV** in the header downloads every open list, **As CSV** in a list's row
   menu that one list. Columns: reference, partner, email, method, payout details,
   amount, currency, number of commissions, status, created and paid dates. Semicolon-separated,
   UTF-8 with BOM, so a spreadsheet opens it with the umlauts intact. In German the amounts use a
   decimal comma. Cells a partner wrote are escaped, so a name starting with `=` is text, not a
   formula.
3. Pay, by bank transfer or PayPal, from the CSV.
4. **Mark as paid** in each list's row menu. The commissions on it move to "Paid out".

## Between creating and paying

A refund or a cancellation after a list was created recomputes the open list. Marking it paid
sums it afresh, and the CSV carries that sum, so what you pay is what is owed at that moment.

A list that this drives to zero, below zero or below the minimum is **dissolved**. Its
commissions wait for the next list. Only a positive list can be marked paid.

After a list is paid, a refund takes back exactly what went out, as a clawback row on the next
list. See [Commissions → Refunds](/affiliates/commissions#refunds-and-chargebacks).

## Payout details

Partners enter them in their [partner area](/affiliates/partner-area): the method (bank
transfer, PayPal or other) and the details, an IBAN with the account holder, or a PayPal
address. They are stored encrypted.

In the Control Panel they are shown only to users with `manage affiliate payouts`. Everyone
else sees a masked line (a PayPal address reads `cl•••@•••`), and the method is locked for them
too.

The CSV contains the details in plain text, because it is the file you pay from. Treat it like a
bank statement.
