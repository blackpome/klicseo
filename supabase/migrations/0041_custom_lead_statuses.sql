-- Migration 0041: Allow dynamic and custom lead statuses configured by Admin
-- Drop the fixed leads_status_check constraint so custom status items work seamlessly.
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
