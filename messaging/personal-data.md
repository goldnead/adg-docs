# Personal data

<AddonHeader />

With [`goldnead/statamic-accounts`](/accounts/) installed, `MessagingContributor` is tagged for
the personal data **export** and **erasure**. Without Accounts nothing is tagged and nothing
runs.

## The export

What a person receives about messaging: the ids of the conversations they take part in, and the
messages they wrote (conversation, text, time). Texts are decrypted for the export through the
model.

## The erasure contract

| Situation | What erasure does |
| --- | --- |
| A conversation the account **started** | Deleted entirely. It was theirs. |
| A conversation addressed to the account (the person as recipient) | The conversation loses the recipient's key (`recipient_user_id` is cleared). The other side still reads the thread, with the sender shown as `Konto gelöscht`. |
| Messages the account wrote in a conversation someone else started | Stay for the other side, without sender and text. |
| The account's participant rows | Deleted. |

The text is cleared through the model, so the empty text is stored encrypted like any other.

There is no blocker: erasing an account is never refused because of its messages.

## What the addon does not decide

- **Messages to a team** belong to a team conversation. What happens to a team's side when the
  team itself is deleted is Teams' to say, see [Teams](/teams/).
- **Backups** contain the ciphertext of what you erased until the backup itself expires; the
  [key](/messaging/encryption) is the same one.
