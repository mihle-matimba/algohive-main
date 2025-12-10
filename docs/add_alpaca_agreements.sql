-- Adds storage for Alpaca agreement acknowledgements captured during onboarding
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS alpaca_agreements jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS alpaca_agreements_updated_at timestamptz;
