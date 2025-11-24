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

### Investment preferences payload
Persist the investing-questions answers in the `investment_preferences` column. A flat JSON document keeps reads simple for 
the onboarding page and OpenStrategies filters. Suggested shape:

```sql
-- Example contents for investment_preferences
-- {
--   "return_target": "15%+ per year",
--   "drawdown_tolerance": "I can tolerate large swings",
--   "time_horizon": "3-5 years",
--   "guidance_style": "Hands-on coaching",
--   "objectives": "Diversified growth with tech tilt"
-- }
```

Recommended enum-style options for each field (aligned to existing OpenStrategies filters) include:

* `risk_appetite` (top-level column): `Conservative`, `Low`, `Moderate`, `High`, `High Risk`, `Very High Risk`
* `return_target`: `Preserve capital`, `5-8% per year`, `8-12% per year`, `12-15% per year`, `15%+ per year`
* `drawdown_tolerance`: `I prefer minimal drawdowns`, `I can handle moderate swings`, `I can tolerate large swings`
* `time_horizon`: `< 1 year`, `1-3 years`, `3-5 years`, `5+ years`
* `guidance_style`: `Self-directed`, `Light touch guidance`, `Hands-on coaching`
* `objectives`: free-text notes (optional)

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
