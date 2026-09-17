-- Phase 1B: additive Role enum values for SALES and FINANCE.
-- Existing SUPER_ADMIN / ADMIN / FLEET_MANAGER values and user rows are preserved.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'Role' AND e.enumlabel = 'SALES'
  ) THEN
    ALTER TYPE "Role" ADD VALUE 'SALES';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'Role' AND e.enumlabel = 'FINANCE'
  ) THEN
    ALTER TYPE "Role" ADD VALUE 'FINANCE';
  END IF;
END $$;
