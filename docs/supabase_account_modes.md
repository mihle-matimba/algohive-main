# Supabase setup for Paper (demo) vs Live accounts

This guide outlines a minimal Supabase schema to support both **Paper (demo)** and **Live** investment flows. It keeps Live records in the existing `profiles` table and adds a dedicated `demo_profiles` table so data stays separated while still sharing the same authenticated user.

## Auth metadata and mode tracking
- Store the chosen account mode in the user's auth metadata so the client can default to the last selection.
- Suggested auth metadata fields (set during sign-up and updateable on toggle):
  - `account_mode`: `'paper' | 'live'`
  - `verification_status`: `'pending' | 'verified' | 'n/a'` (use `pending` for live until KYC completes)

Example (Node client):
```js
await supabase.auth.updateUser({
  data: { account_mode: 'paper', verification_status: 'n/a' }
});
```

## Tables
### `profiles` (Live)
Use your existing live table but ensure it contains:
- `id uuid primary key references auth.users(id)`
- `account_mode text default 'live' check (account_mode in ('live'))`
- `verification_status text default 'pending' check (verification_status in ('pending','verified'))`
- `created_at timestamptz default now()`
- Any live-only portfolio state (balances, holdings, KYC references, etc.)

### `demo_profiles` (Paper)
A parallel table for demo accounts:
```sql
create table if not exists demo_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  account_mode text default 'paper' check (account_mode in ('paper')),
  starting_balance numeric default 10000,
  created_at timestamptz default now()
);
```
- Keep simulated balances/positions here so they never mix with live data.
- Optionally add reset columns (e.g., `last_reset_at`) for paper resets.

### Optional: `account_modes` view
Expose a simple mode snapshot to the client:
```sql
create view account_modes as
select id, 'live'::text as mode, verification_status
from profiles
union
select id, 'paper'::text as mode, 'n/a'::text
from demo_profiles;
```

## RLS policies
Enable Row Level Security on both tables and restrict rows to the owning user:
```sql
alter table profiles enable row level security;
alter table demo_profiles enable row level security;

create policy "Profiles are only visible to owner" on profiles
  for select using (auth.uid() = id);
create policy "Profiles are only insertable by owner" on profiles
  for insert with check (auth.uid() = id);
create policy "Profiles are only updatable by owner" on profiles
  for update using (auth.uid() = id);

create policy "Demo profiles are only visible to owner" on demo_profiles
  for select using (auth.uid() = id);
create policy "Demo profiles are only insertable by owner" on demo_profiles
  for insert with check (auth.uid() = id);
create policy "Demo profiles are only updatable by owner" on demo_profiles
  for update using (auth.uid() = id);
```

## How the app separates Live vs Paper
- **On sign up:** create the auth user, set `account_mode` metadata, and insert into the corresponding table (`profiles` for live, `demo_profiles` for paper). Live inserts should set `verification_status = 'pending'` until KYC completes.
- **On sign in:** read `user.user_metadata.account_mode` (or the `account_modes` view) to set the active mode and route the user. If missing, default to `paper` for safety.
- **Switching modes in-app:** update auth metadata and fetch the matching table. Never join paper data with live tables; keep API calls table-specific to avoid leakage.
- **Live verification:** block trading/transfer actions when `verification_status != 'verified'` and show the "Will Require Additional Verification" messaging on sign-up when `account_mode = 'live'`.

## Safety checklist
- Enforce foreign keys to `auth.users` on both tables and cascade deletes so demo data is dropped when the user is removed.
- Use separate storage buckets (if needed) for paper vs live uploads.
- Keep distinct RPC functions or edge functions per mode to prevent cross-mode state changes.
- Default any analytics/telemetry to anonymized data for paper users if requirements differ.
