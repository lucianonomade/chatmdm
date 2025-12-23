-- Add active column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;

-- Update existing profiles to be active
UPDATE public.profiles SET active = true WHERE active IS NULL;