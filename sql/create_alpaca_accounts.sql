-- Creates the alpaca_accounts table used by the onboarding flow to cache brokerage metadata.
-- Also ensures the profiles table has the brokerage columns the client upserts.
alter table if exists public.profiles
    add column if not exists alpaca_account_id text,
    add column if not exists alpaca_account_status text;

create table if not exists public.alpaca_accounts (
    user_id uuid primary key references auth.users (id) on delete cascade,
    email text unique,
    alpaca_account_id text,
    alpaca_account_status text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Helpful indexes for lookups by Alpaca account id and email.
create index if not exists alpaca_accounts_alpaca_account_id_idx on public.alpaca_accounts (alpaca_account_id);
create index if not exists alpaca_accounts_email_idx on public.alpaca_accounts (email);
