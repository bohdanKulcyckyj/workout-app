-- Deterministic test users for the E2E suite (Phase 4 signs in as the first).
-- test@example.com  / test-password-123   -- the suite's user
-- other@example.com / other-password-123  -- second user, for RLS isolation
-- No plans or exercises: tests create their own data from a clean slate.

-- The *_token columns must be '' and not NULL: GoTrue scans them into
-- non-nullable Go strings, and a NULL fails every sign-in with a 500
-- ("converting NULL to string is unsupported"), not a clean auth error.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token,
  email_change_token_new, email_change_token_current, email_change
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated', 'test@example.com',
  crypt('test-password-123', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{}',
  '', '', '', '', ''
) on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) values (
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  '{"sub":"11111111-1111-1111-1111-111111111111","email":"test@example.com","email_verified":true,"phone_verified":false}',
  'email', now(), now(), now()
) on conflict (provider_id, provider) do nothing;

-- Second user, so the RLS isolation check survives `supabase db reset`.
-- It was previously created by hand and existed only in the local database.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token,
  email_change_token_new, email_change_token_current, email_change
) values (
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-2222-2222-222222222222',
  'authenticated', 'authenticated', 'other@example.com',
  crypt('other-password-123', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{}',
  '', '', '', '', ''
) on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) values (
  '22222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222222',
  '{"sub":"22222222-2222-2222-2222-222222222222","email":"other@example.com","email_verified":true,"phone_verified":false}',
  'email', now(), now(), now()
) on conflict (provider_id, provider) do nothing;
