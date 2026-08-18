-- Migration 0039: Lead Allocation Schedules & Audit Log (with Recurring & Queue Replenishment)

-- 1. Table: lead_allocation_schedules
CREATE TABLE IF NOT EXISTS public.lead_allocation_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'active_recurring')),
  
  -- Schedule Mode: 'once_now' | 'once_scheduled' | 'daily_recurring' | 'queue_replenish'
  schedule_mode TEXT NOT NULL DEFAULT 'once_now' CHECK (schedule_mode IN ('once_now', 'once_scheduled', 'daily_recurring', 'queue_replenish')),
  
  lead_count INTEGER NOT NULL DEFAULT 10,
  
  -- Recurring & Queue Replenish Configuration
  recurring_time TIME DEFAULT '09:30:00',
  recurring_days INTEGER[] DEFAULT '{1,2,3,4,5,6}', -- 1=Mon ... 6=Sat
  replenish_threshold INTEGER DEFAULT 5, -- Refill when active queue drops below this threshold
  
  -- Condition Criteria JSON
  conditions JSONB NOT NULL DEFAULT '{
    "areas": [],
    "pincodes": [],
    "services": [],
    "min_price": null
  }'::jsonb,
  
  -- Target Staff / Target List
  assignee_ids UUID[] NOT NULL DEFAULT '{}',
  target_list_id UUID REFERENCES public.lead_lists(id) ON DELETE SET NULL,
  
  -- Result tracking & state
  allocated_lead_ids UUID[] DEFAULT '{}',
  last_run_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_lead_allocation_schedules_status 
  ON public.lead_allocation_schedules (status, scheduled_for);

-- 2. Table: lead_allocations_log (Audit trail)
CREATE TABLE IF NOT EXISTS public.lead_allocations_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES public.lead_allocation_schedules(id) ON DELETE SET NULL,
  assigned_to_admin_user_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  assigned_to_list_id UUID REFERENCES public.lead_lists(id) ON DELETE SET NULL,
  allocation_type TEXT NOT NULL DEFAULT 'manual' CHECK (allocation_type IN ('manual', 'scheduled', 'daily_recurring', 'queue_replenish', 'manual_transfer')),
  reason TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lead_allocations_log_lead_id ON public.lead_allocations_log (lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_allocations_log_admin_id ON public.lead_allocations_log (assigned_to_admin_user_id);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
