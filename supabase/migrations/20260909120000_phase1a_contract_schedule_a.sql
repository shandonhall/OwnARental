-- Phase 1A: additive Schedule A contract fields (nullable; legacy monthlyRate untouched).
-- Safe for existing demo data: components stay NULL (unknown), not zero.

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS agreement_number TEXT,
  ADD COLUMN IF NOT EXISTS cip_amount DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS vehicle_value DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS initial_on_road_costs DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS vehicle_rental_amount DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS administration_amount DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS warranty_amount DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS service_plan_amount DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS tracking_amount DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS licence_fee_amount DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS insurance_amount DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS life_insurance_amount DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS other_monthly_amount DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS annual_km_limit INTEGER,
  ADD COLUMN IF NOT EXISTS rental_due_day INTEGER,
  ADD COLUMN IF NOT EXISTS vehicle_kept_address TEXT,
  ADD COLUMN IF NOT EXISTS life_insurance_accepted BOOLEAN,
  ADD COLUMN IF NOT EXISTS initial_registration_complete BOOLEAN,
  ADD COLUMN IF NOT EXISTS initial_licensing_complete BOOLEAN,
  ADD COLUMN IF NOT EXISTS insurance_complete BOOLEAN;

-- Unique agreement numbers (Postgres allows multiple NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS contracts_agreement_number_key
  ON public.contracts (agreement_number);

-- Keep PostgREST locked down for new columns (same table already RLS-enabled)
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.contracts FROM anon, authenticated;
