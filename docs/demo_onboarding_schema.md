# Demo onboarding data requirements

To support the demo onboarding flow (basics, investing preferences, and OpenStrategies alignment), ensure the following Supabase tables/columns exist.

## `demo_profiles`
```sql
create table if not exists public.demo_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text,
  last_name text,
  phone text,
  avatar_url text,
  risk_appetite text, -- values aligned to OpenStrategies filters: Conservative, Low, Moderate, High, High Risk, Very High Risk
  investment_preferences jsonb default '{}'::jsonb,
  inserted_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists demo_profiles_risk_idx on public.demo_profiles (risk_appetite);
```

## `profiles` (live)
```sql
alter table public.profiles
  add column if not exists risk_appetite text,
  add column if not exists phone text,
  add column if not exists avatar_url text;
```

## `strategies`
The recommendations tab pulls from this table by `risk_level`.
```sql
create table if not exists public.strategies (
  id uuid primary key,
  name text not null,
  creator text,
  currency text,
  risk_level text,
  style text,
  unit_price numeric,
  aum numeric
);
create index if not exists strategies_risk_idx on public.strategies (risk_level);
```

These columns keep risk appetite in sync with OpenStrategies filters and allow the onboarding page to surface matching strategies with allocation links.
