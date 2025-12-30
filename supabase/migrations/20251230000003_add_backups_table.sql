-- Create backups table for storing JSON snapshots
CREATE TABLE IF NOT EXISTS public.backups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    data JSONB NOT NULL,
    trigger_type TEXT CHECK (trigger_type IN ('manual', 'auto')) DEFAULT 'manual',
    name TEXT -- Optional name/label for the backup
);

-- Enable RLS
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see and create backups for their tenant
CREATE POLICY "Users can view own tenant backups"
    ON public.backups
    FOR SELECT
    USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create backups for own tenant"
    ON public.backups
    FOR INSERT
    WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Policy for deleting might be restricted to admins, but for now let's allow it for tenant isolation simplicity
CREATE POLICY "Users can delete own tenant backups"
    ON public.backups
    FOR DELETE
    USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Index for faster querying by tenant and date
CREATE INDEX idx_backups_tenant_created ON public.backups(tenant_id, created_at DESC);
