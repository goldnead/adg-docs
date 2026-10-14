# Personal data

<AddonHeader />

With [`goldnead/statamic-accounts`](/accounts/) installed, `CommunityContributor` is tagged for
the personal data **export** and **erasure**. Without Accounts nothing is tagged.

## The export

Per account: its posts (id, title, body, time), its comments (id, post, body, time), its
reactions (target and kind) and the rooms it belongs to.

## The erasure contract

Erasing an account **deletes**:

- its posts, comments, reactions and room memberships, **and**
- the comments on its posts,
- the replies to its comments,
- the reactions to all of those.

Nothing is anonymised and kept: a conversation in the middle of a thread goes with the post it
was under. Other people's posts and comments elsewhere stay.

There is no blocker; erasing an account is never refused because of its posts.
