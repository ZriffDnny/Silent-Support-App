/**
 * Accounts (email sign-in + cloud backup) are off for the public no-account
 * release. Everything signed-in stays in the code, dormant: SessionProvider,
 * sync, Clear History on the server, account deletion, RLS and migrations.
 * A phone that is already signed in keeps its account controls.
 *
 * Off means: no sign-in or backup prompts, /sign-in sends you home (including
 * the silentsupport://sign-in link), and Privacy/Terms describe the
 * no-account app.
 *
 * Before turning this on: give Supabase Auth a working email provider, close
 * the password-signup hole (Custom Access Token hook + Confirm email), turn
 * "Allow new users to sign up" back on, and update the account wording in
 * Privacy/Terms (it still names the old email provider) and the store docs.
 */
export const ACCOUNTS_ENABLED = false;
