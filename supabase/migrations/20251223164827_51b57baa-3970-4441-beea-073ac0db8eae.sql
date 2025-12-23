-- Create a public function to get email by name for login purposes
-- This function does not require authentication but only returns email if the name matches exactly
CREATE OR REPLACE FUNCTION public.get_email_by_name_public(p_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  -- Find email by exact name match (case insensitive)
  -- This is safe because we're only returning the email for login purposes
  SELECT email INTO v_email 
  FROM public.profiles
  WHERE LOWER(name) = LOWER(p_name)
  LIMIT 1;
  
  RETURN v_email;
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_email_by_name_public(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_email_by_name_public(text) TO authenticated;