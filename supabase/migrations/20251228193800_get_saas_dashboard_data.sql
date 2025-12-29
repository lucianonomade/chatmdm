CREATE OR REPLACE FUNCTION public.get_saas_dashboard_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(
      to_jsonb(t) || 
      jsonb_build_object(
        'owner', jsonb_build_object(
          'name', p.name, 
          'email', p.email
        ),
        'company_settings', (
          SELECT jsonb_agg(
            jsonb_build_object(
              'name', cs.name, 
              'email', cs.email
            )
          ) 
          FROM company_settings cs 
          WHERE cs.tenant_id = t.id
        )
      )
    )
    FROM public.tenants t
    LEFT JOIN public.profiles p ON t.owner_id = p.id
    ORDER BY t.created_at DESC
  );
END;
$$;
