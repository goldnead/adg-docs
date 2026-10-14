# Encrypted messages

<AddonHeader />

Message texts are stored **encrypted** (`messages.body`, Laravel's `encrypted` cast). Someone
with access to the database, or to a backup, reads ciphertext.

## It depends on `APP_KEY`

The encryption uses your application key. Two consequences you have to plan for:

::: danger A key change loses the messages
Changing `APP_KEY` is only safe together with `APP_PREVIOUS_KEYS`. Without it, the stored
messages cannot be decrypted any more and are lost.
:::

To rotate the key, put the new one in `APP_KEY` and the old one in `APP_PREVIOUS_KEYS`
(comma-separated, as Laravel documents). Laravel then reads with either and writes with the new
one. Keep the previous key until nothing depends on it.

**Back up the key with the database.** A restore of the database onto an application with a
different key is the same loss.

## Working with encrypted rows

The database cannot read the text, so:

- **Never filter, search or sort on `body` in SQL.** Load the model and work on the decrypted
  attribute.
- **`DB::table('messages')` returns ciphertext.** Use the `Message` model.
- **A bulk `Message::query()->update(['body' => ...])` does not apply the cast.** Update through
  the model.
- **Erasing an account clears the body through the model**, so the empty text is stored
  encrypted too.

## Upgrading an install that has plain texts

Two migrations do it, in order:

1. Widen `messages.body` to `longText`, because ciphertext is longer than the text.
2. Encrypt the plain rows that are still there. It works in chunks, is safe to run twice, and
   `migrate:rollback` decrypts again.

```bash
php artisan migrate
```

Direct reads of `messages` in your own code, reports or exports now see ciphertext; change them
to go through the model.
